# ai-worker/stylist/outfit_state.py
"""
LangGraph 파이프라인의 중앙 상태 객체.

Step 37 변경:
  - OutfitItemSpec, OutfitProposal 타입 추가
  - outfit_proposals 필드 추가 (composer 출력 → item_fetcher 입력)
  - 기존 필드는 모두 유지 (closet 흐름, ranker, validator 호환성)

Step 38 변경:
  - session_id 필드 추가 (추천 세션 추적, /feedback/like 연동용)
  - progress_callback 필드 추가 (SSE 주입값 타입 명시)

Step 40-D 변경:
  - user_style_context 필드 추가 (피드백 선호도 → composer 프롬프트 주입용)
    main.py의 _build_initial_state에서 DB 조회 후 주입.
    Cold start(total_likes < 3)면 None → composer가 주입 스킵.
"""

from typing import TypedDict, Optional, List, Dict, Annotated, Callable
from operator import add


# ──────────────────────────────────────────────────────────────────────────────
# Step 37: 코디 비전 데이터 구조
# ──────────────────────────────────────────────────────────────────────────────

class OutfitItemSpec(TypedDict, total=False):
    primary:       str
    fallback:      str
    resolved_item: Optional[dict]
    status:        str


class OutfitProposal(TypedDict, total=False):
    mood:            str
    items:           Dict[str, OutfitItemSpec]
    anchor_category: Optional[str]
    proposal_status: str


# ──────────────────────────────────────────────────────────────────────────────
# 메인 State
# ──────────────────────────────────────────────────────────────────────────────

class OutfitState(TypedDict):
    # ── Input ────────────────────────────────────────────────────────────────
    user_message:        str
    user_id:             str
    intent:              Optional[str]
    source:              Optional[str]
    anchor_item_id:      Optional[int]
    style_reference_ids: Optional[List[int]]
    gender:              Optional[str]

    # ── Step 38 추가 ─────────────────────────────────────────────────────────
    session_id:          Optional[str]
    progress_callback:   Optional[Callable]

    # ── Step 40-D 추가 ───────────────────────────────────────────────────────
    # main.py의 _build_initial_state에서 UserStylePreference를 조회해 주입.
    # outfit_composer가 읽어서 프롬프트 힌트로 활용.
    # 구조: { top_mood, preferred_colors, preferred_brands, total_likes }
    # None이면 cold start 또는 조회 실패 → composer가 아무것도 주입 안 함.
    user_style_context:  Optional[dict]                          # ← 추가

    # ── Planner ──────────────────────────────────────────────────────────────
    weather:           Optional[str]
    calendar_events:   Optional[List[str]]
    season:            Optional[str]
    avoid_constraints: Optional[List[str]]
    conflict_warning:  Optional[str]

    # ── Style Analyzer ───────────────────────────────────────────────────────
    anchor_item:        Optional[dict]
    style_vector:       Optional[List[float]]
    style_keywords:     Optional[List[str]]
    has_style_context:  Optional[bool]

    # ── Query Builder ────────────────────────────────────────────────────────
    search_queries:     Optional[dict]
    user_brand_profile: Optional[dict]

    # ── Outfit Composer (Step 37 신규) ───────────────────────────────────────
    outfit_proposals:   Optional[List[OutfitProposal]]

    # ── Retrieval ────────────────────────────────────────────────────────────
    retrieved_items:    Optional[List[dict]]
    relaxation_level:   Optional[int]

    # ── Ranker ───────────────────────────────────────────────────────────────
    scored_items:       Optional[List[dict]]

    # ── Validator ────────────────────────────────────────────────────────────
    ranked_items:       Optional[List[dict]]
    guardrail_passed:   Optional[bool]
    failure_reason:     Optional[str]
    retry_count:        Optional[int]

    # ── Response ─────────────────────────────────────────────────────────────
    final_response:           Optional[str]
    recommended_outfit_ids:   Optional[List[int]]

    # ── Memory ───────────────────────────────────────────────────────────────
    session_history:    Annotated[List[dict], add]
    excluded_outfits:   Annotated[List[dict], add]

    # ── Observability ────────────────────────────────────────────────────────
    errors:             Annotated[List[str], add]