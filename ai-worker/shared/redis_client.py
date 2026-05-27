# ai-worker/shared/redis_client.py
"""
Redis 클라이언트 헬퍼 — Step 38-pre 코디 순차 반환용

역할:
  outfit_composer가 생성한 3개 proposal을 Redis에 저장하고,
  같은 세션의 후속 요청에 1순위 → 2순위 → 3순위 순으로 꺼내 반환.

키 구조:
  key:   stylist:proposals:{user_id}:{session_id}
  value: JSON 직렬화된 dict
         {
           "proposals": [proposal_minimal, proposal_street, proposal_preppy],
           "cursor":    0,                              # 다음 반환 인덱스
           "created_at": "2026-05-27T14:32:00Z"
         }
  TTL:   3600초 (1시간)

사용 예:
  # 파이프라인 끝에서 (response_agent.py)
  save_proposals(user_id="2", session_id="rec_a3f2b8c1", proposals=[...])

  # 다음 요청에서 (main.py)
  next_proposal = pop_next_proposal(user_id="2", session_id="rec_a3f2b8c1")
  if next_proposal is None:
      # 세션 소진 → 새 파이프라인 실행

설계 결정 — 왜 cursor 방식인가:
  대안 A: 본 인덱스를 list로 저장 ([0], [0,1], [0,1,2])
  대안 B: 정수 cursor 하나만 저장 (0 → 1 → 2 → 3)
  → B 선택: 더 단순, "다음 것" 의미가 명확, 소진 판단 = (cursor >= 3)

설계 결정 — 왜 user_id + session_id 둘 다 키에 넣나:
  보안: 다른 사용자가 session_id를 알게 되어도 자기 user_id로는 조회 안 됨.
  격리: 사용자별 세션이 명확하게 분리됨.
"""

import os
import json
from datetime import datetime, timezone
from typing import Optional

import redis
from dotenv import load_dotenv

load_dotenv()


# ──────────────────────────────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────────────────────────────

# 세션 TTL: 사용자가 1시간 안에 후속 요청을 보내지 않으면 캐시 만료
# 너무 짧으면 화장실 다녀온 사이 만료, 너무 길면 메모리 낭비
SESSION_TTL_SECONDS = 3600

# 한 세션의 proposal 개수 (composer가 항상 3개 생성)
PROPOSALS_PER_SESSION = 3


# ──────────────────────────────────────────────────────────────────────────────
# Redis 연결 (싱글톤)
# ──────────────────────────────────────────────────────────────────────────────

# 모듈 레벨에서 한 번만 생성. 매 함수 호출마다 연결을 새로 만들면 비효율.
# decode_responses=True → bytes가 아닌 str로 반환받음 (json.loads에 바로 넘기기 편함)
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """
    Redis 클라이언트 싱글톤 반환.

    REDIS_URL 환경변수에서 연결 정보 로드.
    예: REDIS_URL=redis://redis:6379

    연결 실패 시 예외 발생.
    호출 시점에 연결 실패하면 즉시 알 수 있도록 ping() 호출.
    """
    global _redis_client

    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        _redis_client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,  # bytes 대신 str 반환
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        # 연결 확인 (실패 시 redis.exceptions.ConnectionError)
        _redis_client.ping()
        print(f"[Redis] 연결 성공: {redis_url}")

    return _redis_client


# ──────────────────────────────────────────────────────────────────────────────
# 키 생성
# ──────────────────────────────────────────────────────────────────────────────

def _make_key(user_id: str, session_id: str) -> str:
    """
    Redis 키 생성.

    형식: stylist:proposals:{user_id}:{session_id}
    예시: stylist:proposals:2:rec_a3f2b8c1
    """
    return f"stylist:proposals:{user_id}:{session_id}"


# ──────────────────────────────────────────────────────────────────────────────
# 저장 (파이프라인 끝에서 호출)
# ──────────────────────────────────────────────────────────────────────────────

def save_proposals(
    user_id: str,
    session_id: str,
    proposals: list[dict],
) -> bool:
    """
    composer가 만든 proposal 3개를 Redis에 저장.

    Args:
        user_id:    사용자 ID
        session_id: 추천 세션 ID (예: "rec_a3f2b8c1")
        proposals:  outfit_proposals (3개의 OutfitProposal dict)

    Returns:
        bool: 저장 성공 여부 (False면 Redis 장애 등)

    Note:
        cursor는 0으로 초기화 (아직 아무것도 안 봄).
        TTL은 SESSION_TTL_SECONDS (1시간).
    """
    if not proposals:
        print(f"[Redis] save_proposals: proposals 비어있음 (user={user_id})")
        return False

    try:
        client = get_redis_client()
        key    = _make_key(user_id, session_id)

        payload = {
            "proposals":  proposals,
            "cursor":     0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # setex: 값 저장 + TTL 설정을 원자적으로
        client.setex(
            name=key,
            time=SESSION_TTL_SECONDS,
            value=json.dumps(payload, ensure_ascii=False),
        )

        print(f"[Redis] 세션 저장: {key} ({len(proposals)}개 proposal)")
        return True

    except Exception as e:
        print(f"[Redis] 저장 실패: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# 조회 + cursor 증가 (다음 proposal 꺼내기)
# ──────────────────────────────────────────────────────────────────────────────

def pop_next_proposal(
    user_id: str,
    session_id: str,
) -> Optional[dict]:
    """
    현재 cursor 위치의 proposal을 반환하고 cursor를 1 증가.

    Args:
        user_id:    사용자 ID
        session_id: 추천 세션 ID

    Returns:
        - dict: 다음 proposal
        - None: 세션이 존재하지 않거나 이미 소진됨

    동작 예시:
        세션에 [minimal, street, preppy] 저장, cursor=0
        호출 1: minimal 반환, cursor=1
        호출 2: street  반환, cursor=2
        호출 3: preppy  반환, cursor=3
        호출 4: None    반환 (소진)

    Note:
        cursor 증가는 같은 요청 안에서 read-modify-write로 처리.
        동시 요청에 대한 race condition은 일단 무시 (한 사용자가 동시에
        같은 세션으로 여러 요청 보내는 시나리오는 드뭄).
        엄격한 동시성 보장이 필요하면 Redis Lua 스크립트 또는 WATCH 사용.
    """
    try:
        client = get_redis_client()
        key    = _make_key(user_id, session_id)

        raw = client.get(key)
        if raw is None:
            print(f"[Redis] 세션 없음: {key}")
            return None

        payload   = json.loads(raw)
        proposals = payload.get("proposals", [])
        cursor    = payload.get("cursor", 0)

        # 소진 체크
        if cursor >= len(proposals):
            print(f"[Redis] 세션 소진: {key} (cursor={cursor})")
            return None

        # 현재 cursor의 proposal 꺼냄
        next_proposal = proposals[cursor]

        # cursor 증가하여 재저장 (TTL 유지)
        payload["cursor"] = cursor + 1
        # 남은 TTL 유지를 위해 keepttl=True (Redis 6.0+)
        client.set(
            name=key,
            value=json.dumps(payload, ensure_ascii=False),
            keepttl=True,
        )

        print(f"[Redis] proposal 반환: {key} (cursor {cursor}→{cursor + 1})")
        return next_proposal

    except Exception as e:
        print(f"[Redis] pop_next_proposal 실패: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# 소진 확인
# ──────────────────────────────────────────────────────────────────────────────

def is_session_exhausted(
    user_id: str,
    session_id: str,
) -> bool:
    """
    세션의 모든 proposal을 다 봤는지 확인.

    Returns:
        True:  세션이 존재하지 않거나 cursor >= 3 (소진)
        False: 아직 안 본 proposal이 남아있음

    Note:
        세션이 아예 없으면 True 반환 (없는 것도 사실상 "더 볼 게 없음").
        main.py에서 "세션 없음 또는 소진 → 새 파이프라인 실행"
        분기로 묶어 처리하기 편함.
    """
    try:
        client = get_redis_client()
        key    = _make_key(user_id, session_id)

        raw = client.get(key)
        if raw is None:
            return True

        payload   = json.loads(raw)
        proposals = payload.get("proposals", [])
        cursor    = payload.get("cursor", 0)

        return cursor >= len(proposals)

    except Exception as e:
        print(f"[Redis] is_session_exhausted 실패: {e}")
        # 에러 시 보수적으로 True 반환 (새 파이프라인 실행으로 폴백)
        return True


# ──────────────────────────────────────────────────────────────────────────────
# 삭제 (디버깅용)
# ──────────────────────────────────────────────────────────────────────────────

def delete_session(user_id: str, session_id: str) -> bool:
    """
    세션 강제 삭제. 주로 디버깅/테스트 용도.

    Returns:
        True:  삭제 성공
        False: 세션이 없거나 에러
    """
    try:
        client = get_redis_client()
        key    = _make_key(user_id, session_id)
        deleted = client.delete(key)
        print(f"[Redis] 세션 삭제: {key} (deleted={deleted})")
        return bool(deleted)

    except Exception as e:
        print(f"[Redis] 삭제 실패: {e}")
        return False