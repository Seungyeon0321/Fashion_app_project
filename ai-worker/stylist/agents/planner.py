# ai-worker/stylist/nodes/planner.py
#
# Planner 노드
# 역할: 날씨 / 캘린더 / NCP 수집 → intent 확정 → conflict 감지
#
# 기존 코드(planner.py) 대비 변경된 것:
#   유지: get_weather() — 온도 기반 시즌 계산
#   유지: get_calendar() — Google Calendar OAuth
#   추가: NCP avoid_constraints 추출 (Ranker 감점용)
#   추가: log_feedback() — 조합 단위 피드백 기록
#   추가: conflict 감지 (sporty_rain, casual_meeting)
#   추가: 각 API 실패 시 fallback + errors 누적
#   추가: intent LLM fallback (버튼값 없을 때)
#   이동: anchor_ncp_conflict → Style Analyzer
#         (앵커 아이템 정보는 Planner 시점엔 아직 없음)

import os
import requests
import datetime
from typing import Dict, List
from dotenv import load_dotenv

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

from stylist.outfit_state import OutfitState

load_dotenv()

# ── LLM ──────────────────────────────────────────────────────────────
# intent가 프론트에서 안 넘어올 때만 사용 (보통은 버튼으로 직접 받음)
llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

# ── NCP: Negative Constraint Profile ─────────────────────────────────
# MVP: 메모리 dict
# 추후: PostgreSQL 테이블로 마이그레이션 예정
#
# 구조:
# {
#   "1": {  ← user_id (str)
#     "style_rejects":  {"oversized": 3, "loud_patterns": 1},
#     "season_rejects": {"winter": 2},
#     "mood_skips": 5,
#     "rejection_history": [
#       {
#         "outfit_item_ids": [1, 2, 3],  ← 조합 단위 저장
#         "reason": "style_mismatch",
#         "tag": "oversized",
#         "timestamp": "2026-05-14T10:00:00",
#         "ttl_days": 90
#       }
#     ]
#   }
# }
USER_PREFERENCE_PROFILE: Dict[str, Dict] = {}


def get_user_profile(user_id: str) -> dict:
    """유저 NCP 프로필 반환 (없으면 초기화)"""
    if user_id not in USER_PREFERENCE_PROFILE:
        USER_PREFERENCE_PROFILE[user_id] = {
            "style_rejects": {},
            "season_rejects": {},
            "mood_skips": 0,
            "rejection_history": [],
        }
    return USER_PREFERENCE_PROFILE[user_id]


def expire_old_constraints(user_id: str, ttl_days: int = 90) -> int:
    """90일 TTL: 오래된 거절 기록 자동 만료"""
    profile = get_user_profile(user_id)
    now     = datetime.datetime.now()
    cutoff  = now - datetime.timedelta(days=ttl_days)

    fresh_history = []
    expired_tags  = []

    for record in profile["rejection_history"]:
        record_time = datetime.datetime.fromisoformat(record["timestamp"])
        if record_time >= cutoff:
            fresh_history.append(record)
        else:
            expired_tags.append(record.get("tag"))

    profile["rejection_history"] = fresh_history

    for tag in expired_tags:
        if tag and tag in profile["style_rejects"]:
            profile["style_rejects"][tag] = max(0, profile["style_rejects"][tag] - 1)
            if profile["style_rejects"][tag] == 0:
                del profile["style_rejects"][tag]

    return len(expired_tags)


def log_feedback(
    user_id: str,
    outfit_item_ids: List[int],  # ← 조합 단위 (개별 item_id 아님)
    item_tag: str,
    reason: str,
) -> dict:
    """싫어요 피드백 기록
    reason: "style_mismatch" | "season_mismatch" | "mood_skip"

    ⚠️ outfit_item_ids는 코디 조합 전체
       "이 조합이 싫다"는 의미
       같은 아이템이 다른 조합에서 재등장하는 건 허용됨
    """
    profile = get_user_profile(user_id)
    now     = datetime.datetime.now().isoformat()

    if reason == "style_mismatch":
        profile["style_rejects"][item_tag] = (
            profile["style_rejects"].get(item_tag, 0) + 1
        )
        profile["rejection_history"].append({
            "outfit_item_ids": outfit_item_ids,
            "reason":          reason,
            "tag":             item_tag,
            "timestamp":       now,
            "ttl_days":        90,
        })

    elif reason == "season_mismatch":
        profile["season_rejects"][item_tag] = (
            profile["season_rejects"].get(item_tag, 0) + 1
        )
        profile["rejection_history"].append({
            "outfit_item_ids": outfit_item_ids,
            "reason":          reason,
            "tag":             item_tag,
            "timestamp":       now,
            "ttl_days":        90,
        })

    elif reason == "mood_skip":
        # mood_skip은 NCP 영향 없음
        profile["mood_skips"] += 1

    return profile


def build_avoid_constraints(user_id: str, threshold: int = 2) -> List[str]:
    """NCP에서 avoid 텍스트 제약 추출
    threshold 이상 거절된 태그만 포함
    → Planner 프롬프트 주입 + Ranker 감점에 사용

    ⚠️ avoid_item_ids 없음
       조합 단위 필터는 excluded_outfits(Retrieval)로 처리
    """
    expire_old_constraints(user_id)
    profile = get_user_profile(user_id)

    avoid = []
    for tag, count in profile["style_rejects"].items():
        if count >= threshold:
            avoid.append(f"avoid {tag} silhouette")
    for tag, count in profile["season_rejects"].items():
        if count >= threshold:
            avoid.append(f"avoid {tag}-season items")

    return avoid


# ── 날씨 ─────────────────────────────────────────────────────────────
def get_weather() -> dict:
    """OpenWeatherMap API 호출
    온도 기반으로 시즌 계산 (기존 코드 유지)
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    lat     = os.getenv("WEATHER_LAT", "49.2827")   # 기본값: 밴쿠버
    lon     = os.getenv("WEATHER_LON", "-123.1207")

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    )
    res  = requests.get(url, timeout=5)
    data = res.json()

    temp      = data["main"]["temp"]
    condition = data["weather"][0]["main"].lower()

    # 온도 기반 시즌 계산 (기존 로직 유지)
    if temp >= 20:   season = "summer"
    elif temp >= 10: season = "spring"
    elif temp >= 0:  season = "fall"
    else:            season = "winter"

    return {
        "temperature": temp,
        "condition":   condition,
        "season":      season,
    }


# ── 캘린더 ───────────────────────────────────────────────────────────
def get_calendar() -> list[str]:
    """Google Calendar OAuth 호출 (기존 코드 유지)"""
    token_path = os.path.join(os.path.dirname(__file__), "..", "token.json")
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as token_file:
            token_file.write(creds.to_json())

    service = build("calendar", "v3", credentials=creds)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    events_result = service.events().list(
        calendarId="primary",
        timeMin=now,
        maxResults=5,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = events_result.get("items", [])
    return [event.get("summary", "No title") for event in events]


# ── Conflict 감지 ────────────────────────────────────────────────────
def detect_conflict(
    intent: str,
    weather_str: str,
    calendar_events: List[str],
) -> str | None:
    """intent + 날씨/캘린더 충돌 감지
    반환: "sporty_rain" | "casual_meeting" | None

    ⚠️ "anchor_ncp_conflict"는 Style Analyzer에서 처리
    """
    if intent == "sporty" and any(
        w in weather_str.lower() for w in ["rain", "snow", "storm"]
    ):
        return "sporty_rain"

    if intent == "casual" and any(
        kw in evt.lower()
        for evt in calendar_events
        for kw in ["client", "interview", "presentation", "meeting"]
    ):
        return "casual_meeting"

    return None


# ── Intent LLM fallback 프롬프트 ─────────────────────────────────────
PLANNER_SYSTEM_PROMPT = """You are a fashion stylist AI.
Based on the user's message, weather, and schedule, classify the intent
into exactly one of: formal, casual, sporty.{avoid_text}

Examples:
- "I have a client presentation" → formal
- "Just grabbing coffee with friends" → casual
- "Going for a morning run" → sporty
- "Date night at a nice restaurant" → formal
- "Working from home today" → casual

Reply with ONLY one lowercase word. No explanation, no punctuation."""


def build_planner_prompt(
    user_message: str,
    weather_str: str,
    calendar: List[str],
    avoid: List[str],
) -> tuple:
    avoid_text = f"\nUser dislikes: {', '.join(avoid)}" if avoid else ""
    system = PLANNER_SYSTEM_PROMPT.format(avoid_text=avoid_text)
    human  = f"""User request: {user_message}
Weather: {weather_str}
Schedule: {', '.join(calendar) if calendar else 'no events'}

Intent:"""
    return system, human


# ── 메인 노드 함수 ────────────────────────────────────────────────────
def planner(state: OutfitState) -> dict:
    """
    Planner 노드

    입력:  user_id, user_message, intent (있으면 LLM 스킵)
    출력:  weather, season, calendar_events,
           avoid_constraints, conflict_warning, intent, errors
    """
    errors  = []
    user_id = state.get("user_id", "")

    # ── 1. 날씨 (이미 있으면 재호출 스킵) ───────────────────────────
    if state.get("weather") and state.get("season"):
        weather_str = state["weather"]
        season      = state["season"]
    else:
        try:
            weather_data = get_weather()
            weather_str  = f"{weather_data['temperature']}°C, {weather_data['condition']}"
            season       = weather_data["season"]
        except Exception as e:
            errors.append(f"[planner] Weather API failed: {e}")
            # fallback: 현재 월 기반 시즌
            month = datetime.datetime.now().month
            if 3 <= month <= 5:   season = "spring"
            elif 6 <= month <= 8: season = "summer"
            elif 9 <= month <= 11:season = "fall"
            else:                 season = "winter"
            weather_str = f"unknown (API failed)"

    # ── 2. 캘린더 (이미 있으면 재호출 스킵) ─────────────────────────
    if state.get("calendar_events") is not None:
        calendar_events = state["calendar_events"]
    else:
        try:
            calendar_events = get_calendar()
        except Exception as e:
            errors.append(f"[planner] Calendar API failed: {e}")
            calendar_events = []

    # ── 3. NCP avoid_constraints (매번 호출 — 피드백으로 바뀔 수 있음) ──
    try:
        avoid_constraints = build_avoid_constraints(user_id, threshold=2)
    except Exception as e:
        errors.append(f"[planner] NCP build failed: {e}")
        avoid_constraints = []

    # ── 4. Intent (버튼값 우선, 없으면 LLM 분류) ────────────────────
    if state.get("intent"):
        intent = state["intent"]
    else:
        try:
            system, human = build_planner_prompt(
                state.get("user_message", ""),
                weather_str,
                calendar_events,
                avoid_constraints,
            )
            response = llm.invoke([
                SystemMessage(content=system),
                HumanMessage(content=human),
            ])
            intent = response.content.strip().lower()
            if intent not in ["formal", "casual", "sporty"]:
                errors.append(
                    f"[planner] Unexpected intent '{intent}', defaulting to casual"
                )
                intent = "casual"
        except Exception as e:
            errors.append(f"[planner] LLM intent classification failed: {e}")
            intent = "casual"

    # ── 5. Conflict 감지 ─────────────────────────────────────────────
    conflict_warning = detect_conflict(intent, weather_str, calendar_events)
    if conflict_warning:
        errors.append(f"[planner] Conflict detected: {conflict_warning}")

    return {
        "weather":           weather_str,
        "season":            season,
        "calendar_events":   calendar_events,
        "intent":            intent,
        "avoid_constraints": avoid_constraints,
        "conflict_warning":  conflict_warning,
        "errors":            errors,
    }
