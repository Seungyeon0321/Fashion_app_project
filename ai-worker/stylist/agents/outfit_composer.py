# ai-worker/stylist/agents/outfit_composer.py
"""
Outfit Composer — Step 37 신규 에이전트

역할:
  Bottom-up 검색이 아닌 Top-down 코디 설계.
  LLM이 사용자 컨텍스트(스타일/날씨/계절/intent/gender/앵커)를 종합해
  서로 다른 무드의 코디 3개를 한 번에 생성한다.

  이전 구조 (~Step 36):
    검색 → 검증 → 조합 (낙장불입, TOP 잘못되면 코디 전체 깨짐)
  새 구조 (Step 37~):
    조합 비전 → 검색 → 검증 (무드 일관성 보장)

출력:
  outfit_proposals: List[OutfitProposal]
    - 길이 3 (3가지 무드)
    - 각 proposal은 카테고리별 {primary, fallback} 아이템명 보유
    - item_fetcher가 이 비전을 받아 실제 네이버 상품으로 채움

앵커 처리:
  앵커가 있으면 해당 카테고리는 LLM이 "(앵커)"로 표기.
  composer가 proposal["anchor_category"]에 명시 → item_fetcher가 검색 스킵.

Fallback 정책:
  primary = 무드에 가장 맞는 아이템 (구체적, 색상 포함 가능)
  fallback = primary가 네이버에 없을 경우를 위한 더 흔하고 일반적인 대체 아이템
  → composer 프롬프트에서 이 차이를 명시적으로 지시.

다양성 정책:
  3개 proposal은 무드가 서로 달라야 함 (예: minimal/street/classic).
  레퍼런스가 가죽자켓 위주여도 매번 가죽자켓만 추천하지 않도록 LLM에 명시.

Step 38-pre 변경:
  temperature 0.6 → 0.9 (다양성 향상)
  excluded_outfits → 프롬프트에 주입 (이전 추천 반복 방지)
  _build_excluded_section 함수 추가
"""

# ai-worker/stylist/agents/outfit_composer.py
"""
Outfit Composer — Step 37 신규 에이전트

역할:
  Bottom-up 검색이 아닌 Top-down 코디 설계.
  LLM이 사용자 컨텍스트(스타일/날씨/계절/intent/gender/앵커)를 종합해
  서로 다른 무드의 코디 3개를 한 번에 생성한다.

Step 40-D 변경:
  _build_preference_section 함수 추가.
  COMPOSER_HUMAN에 {preference_section} 추가.
  outfit_composer에서 user_style_context를 state에서 읽어 프롬프트에 주입.
  Cold start(total_likes < 3)면 아무것도 주입 안 함.
"""

import json
from typing import Optional, List, Dict

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from stylist.outfit_state import OutfitState, OutfitProposal, OutfitItemSpec


# ──────────────────────────────────────────────────────────────────────────────
# LLM 설정
# ──────────────────────────────────────────────────────────────────────────────

_llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    temperature=0.9,
    max_tokens=2000,
)


# ──────────────────────────────────────────────────────────────────────────────
# 한국어 매핑
# ──────────────────────────────────────────────────────────────────────────────

INTENT_KR = {
    "casual": "캐주얼",
    "formal": "포멀",
    "sporty": "스포티",
    "date":   "데이트룩",
    "work":   "출근룩",
}

SEASON_KR = {
    "spring": "봄",
    "summer": "여름",
    "fall":   "가을",
    "winter": "겨울",
}

GENDER_KR = {
    "MALE":   "남성",
    "FEMALE": "여성",
}

CATEGORY_KR = {
    "TOP":    "상의",
    "BOTTOM": "하의",
    "OUTER":  "아우터",
    "DRESS":  "원피스",
}


# ──────────────────────────────────────────────────────────────────────────────
# LLM 프롬프트
# ──────────────────────────────────────────────────────────────────────────────

COMPOSER_SYSTEM = """당신은 한국의 시니어 패션 스타일리스트입니다.

사용자의 스타일 컨텍스트(스타일 키워드, 날씨, 계절, 의도, 성별, 앵커 아이템)를 종합해
서로 다른 무드의 코디 3개를 한 번에 설계하세요.

반드시 지켜야 할 규칙:

1. 다양성 (가장 중요)
   - 3개 코디는 무드가 명확히 달라야 합니다.
   - 사용자가 등록한 레퍼런스에 같은 종류 옷이 많아도, 매번 같은 아이템을 반복하지 마세요.
   - 무드 예시: minimal, street, classic, rocker, preppy, sporty, vintage, athleisure, smart_casual
   - 3개 모두 다른 mood 키를 사용하세요.

2. 아이템명 작성 규칙
   - 한국어로 작성
   - 색상 + (선택: 핏/소재) + 아이템명 형식
   - 예: "화이트 옥스포드 셔츠" / "베이지 와이드 데님" / "네이비 가디건"
   - 금지: 성별 단어("남성/여성"), 계절 단어("봄/여름"), 카테고리 단어("상의/하의/아우터") 포함 금지
     ※ 시스템이 검색 시 자동으로 추가하므로 중복됩니다.
   - 브랜드명 포함 금지

3. primary와 fallback 차이
   - primary: 그 무드에 가장 잘 맞는 아이템 (구체적이고 특징적이어도 좋음)
   - fallback: primary가 네이버 쇼핑에 없을 경우를 대비한 "더 흔하고 일반적인" 대체 아이템
     예시: primary="버건디 코듀로이 블레이저" → fallback="다크 레드 블레이저"
           primary="아이보리 와플 니트"      → fallback="베이지 니트"
   - fallback은 primary의 무드를 유지하되 더 구하기 쉬운 형태여야 합니다.

4. 앵커 아이템 처리
   - 앵커가 주어지면 모든 proposal에 앵커가 포함되도록 설계합니다.
   - 앵커 카테고리에는 primary와 fallback 모두 정확히 "(앵커)" 문자열을 넣으세요.
   - 다른 카테고리는 앵커와 자연스럽게 어울리도록 추천하세요.

5. 출력 형식
   - 반드시 아래 JSON 스키마만 출력. 설명/주석/마크다운 코드펜스 없이 순수 JSON.
   - 카테고리 키는 영문 대문자 ("TOP", "BOTTOM", "OUTER", "DRESS" 중)
   - 남성은 TOP/BOTTOM/OUTER, 여성은 추가로 DRESS 사용 가능
   - 한 proposal은 최소 TOP+BOTTOM (또는 DRESS+OUTER) 조합이어야 함

출력 JSON 스키마:
{
  "proposals": [
    {
      "mood": "minimal",
      "items": {
        "TOP":    {"primary": "...", "fallback": "..."},
        "BOTTOM": {"primary": "...", "fallback": "..."},
        "OUTER":  {"primary": "...", "fallback": "..."}
      }
    },
    {
      "mood": "street",
      "items": { ... }
    },
    {
      "mood": "classic",
      "items": { ... }
    }
  ]
}"""


COMPOSER_HUMAN = """다음 컨텍스트로 코디 3개를 설계해주세요.

성별: {gender_kr}
계절: {season_kr}
스타일 의도: {intent_kr}
스타일 키워드: {style_keywords_str}
날씨: {weather}
일정: {calendar_str}
{anchor_section}
{preference_section}
{excluded_section}

위 컨텍스트에 맞는 서로 다른 무드의 코디 3개를 JSON으로 출력하세요."""


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def outfit_composer(state: OutfitState) -> dict:
    try:
        gender              = state.get("gender") or "MALE"
        intent              = state.get("intent") or "casual"
        season              = state.get("season") or "spring"
        style_keywords      = state.get("style_keywords") or []
        weather             = state.get("weather") or "정보 없음"
        calendar            = state.get("calendar_events") or []
        anchor_item         = state.get("anchor_item")
        excluded            = state.get("excluded_outfits") or []
        user_style_context  = state.get("user_style_context")   # ← Step 40-D 추가

        gender_kr          = GENDER_KR.get(gender, "남성")
        intent_kr          = INTENT_KR.get(intent, intent)
        season_kr          = SEASON_KR.get(season, season)
        style_keywords_str = ", ".join(style_keywords) if style_keywords else "특정 키워드 없음"
        calendar_str       = ", ".join(calendar) if calendar else "특별한 일정 없음"
        anchor_section     = _build_anchor_section(anchor_item)
        excluded_section   = _build_excluded_section(excluded)
        preference_section = _build_preference_section(user_style_context)  # ← Step 40-D 추가

        human_prompt = COMPOSER_HUMAN.format(
            gender_kr=gender_kr,
            season_kr=season_kr,
            intent_kr=intent_kr,
            style_keywords_str=style_keywords_str,
            weather=weather,
            calendar_str=calendar_str,
            anchor_section=anchor_section,
            preference_section=preference_section,   # ← Step 40-D 추가
            excluded_section=excluded_section,
        )

        print("[OutfitComposer] LLM 코디 생성 시작")
        response = _llm.invoke([
            SystemMessage(content=COMPOSER_SYSTEM),
            HumanMessage(content=human_prompt),
        ])
        raw_output = response.content if isinstance(response.content, str) else str(response.content)

        proposals = _parse_llm_output(raw_output, anchor_item)

        if not proposals:
            return {
                "outfit_proposals": [],
                "errors": ["composer: LLM 출력 파싱 실패 또는 빈 결과"],
            }

        for i, prop in enumerate(proposals):
            mood = prop.get("mood", "?")
            items_summary = ", ".join(
                f"{cat}={spec.get('primary', '?')[:15]}"
                for cat, spec in prop.get("items", {}).items()
            )
            print(f"[OutfitComposer] proposal[{i}] ({mood}): {items_summary}")

        return {"outfit_proposals": proposals}

    except Exception as e:
        print(f"[OutfitComposer] 예외: {e}")
        return {
            "outfit_proposals": [],
            "errors": [f"composer 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼: 앵커 섹션 빌드
# ──────────────────────────────────────────────────────────────────────────────

def _build_anchor_section(anchor_item: Optional[dict]) -> str:
    if not anchor_item:
        return "앵커 아이템: 없음 (모든 카테고리 자유롭게 추천)"

    name        = anchor_item.get("name", "이름 없음")
    category    = anchor_item.get("category", "?")
    colors      = anchor_item.get("colors") or []
    material    = anchor_item.get("material") or ""
    fit         = anchor_item.get("fit") or ""
    category_kr = CATEGORY_KR.get(category, category)
    color_str   = ", ".join(colors) if colors else ""
    details     = " ".join(filter(None, [color_str, material, fit, name]))

    return (
        f"앵커 아이템: {details} (카테고리: {category_kr}, 키: {category})\n"
        f"  → 모든 proposal의 {category} 자리에는 정확히 \"(앵커)\"를 primary와 fallback에 넣으세요.\n"
        f"  → 다른 카테고리는 이 앵커와 자연스럽게 어울리도록 설계하세요."
    )


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼: 유저 선호도 섹션 빌드 (Step 40-D 추가)
# ──────────────────────────────────────────────────────────────────────────────

def _build_preference_section(user_style_context: Optional[dict]) -> str:
    """
    UserStylePreference 데이터를 프롬프트 텍스트로 변환.

    None이면 빈 문자열 반환 (cold start 또는 조회 실패 시).

    Exploration 방지:
      "힌트로만 활용, 새로운 조합도 포함" 문구를 명시해서
      LLM이 좋아요 데이터만 반복 추천하는 것을 방지.
      (같은 색상/무드만 계속 나오면 유저가 질림)

    색상 상위 5개, 브랜드 상위 3개만 주입:
      너무 많은 힌트는 LLM 판단을 방해함.
    """
    if not user_style_context:
        return ""

    lines = ["사용자 취향 정보 (이전 좋아요 이력 기반):"]

    top_mood = user_style_context.get("top_mood")
    if top_mood:
        lines.append(f"  - 선호 무드: {top_mood}")

    colors = user_style_context.get("preferred_colors", [])
    if colors:
        lines.append(f"  - 선호 색상: {', '.join(colors[:5])}")

    brands = user_style_context.get("preferred_brands", [])
    if brands:
        lines.append(f"  - 선호 브랜드: {', '.join(brands[:3])}")

    # Exploration 방지 지시문
    lines.append("→ 위 취향을 참고하되 힌트로만 활용하세요. 3개 코디 중 1개는 새로운 무드로 구성하세요.")

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼: 제외 코디 섹션 빌드
# ──────────────────────────────────────────────────────────────────────────────

def _build_excluded_section(excluded_outfits: list) -> str:
    if not excluded_outfits:
        return "이전 추천 이력: 없음"

    lines = ["이전에 추천한 코디 (절대 반복 금지):"]
    for i, outfit in enumerate(excluded_outfits):
        if isinstance(outfit, dict):
            items = outfit.get("items", {})
            if items:
                combo = " + ".join(
                    f"{cat}: {name}"
                    for cat, name in items.items()
                    if name
                )
                lines.append(f"  {i+1}. {combo}")

    if len(lines) == 1:
        return "이전 추천 이력: 없음"

    lines.append("→ 위 아이템 조합과 겹치지 않는 완전히 새로운 코디를 만드세요.")
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼: LLM 출력 파싱
# ──────────────────────────────────────────────────────────────────────────────

def _parse_llm_output(raw: str, anchor_item: Optional[dict]) -> List[OutfitProposal]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines   = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if len(lines) >= 3 else cleaned

    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start == -1 or end == -1:
        print(f"[OutfitComposer] JSON 경계 없음: {cleaned[:100]}")
        return []

    json_str = cleaned[start:end + 1]

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"[OutfitComposer] JSON 파싱 실패: {e}")
        print(f"[OutfitComposer] 원본: {json_str[:300]}")
        return []

    raw_proposals = parsed.get("proposals", [])
    if not isinstance(raw_proposals, list):
        return []

    anchor_category = anchor_item.get("category") if anchor_item else None

    proposals: List[OutfitProposal] = []
    for raw_prop in raw_proposals:
        if not isinstance(raw_prop, dict):
            continue

        mood      = raw_prop.get("mood", "general")
        raw_items = raw_prop.get("items", {})
        if not isinstance(raw_items, dict):
            continue

        items: Dict[str, OutfitItemSpec] = {}
        for cat, spec in raw_items.items():
            if not isinstance(spec, dict):
                continue
            primary  = str(spec.get("primary", "")).strip()
            fallback = str(spec.get("fallback", primary)).strip() or primary

            items[cat] = OutfitItemSpec(
                primary=primary,
                fallback=fallback,
                resolved_item=None,
                status="pending",
            )

        if not items:
            continue

        proposals.append(OutfitProposal(
            mood=mood,
            items=items,
            anchor_category=anchor_category,
            proposal_status="pending",
        ))

    return proposals