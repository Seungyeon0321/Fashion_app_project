# ai-worker/stylist/outfit_state.py
"""
LangGraph 파이프라인의 중앙 상태 객체.

Step 37 변경:
  - OutfitItemSpec, OutfitProposal 타입 추가
  - outfit_proposals 필드 추가 (composer 출력 → item_fetcher 입력)
  - 기존 필드는 모두 유지 (closet 흐름, ranker, validator 호환성)
"""

from typing import TypedDict, Optional, List, Dict, Annotated
from operator import add


# ──────────────────────────────────────────────────────────────────────────────
# Step 37: 코디 비전 데이터 구조
# ──────────────────────────────────────────────────────────────────────────────

class OutfitItemSpec(TypedDict, total=False):
    """
    Composer가 만든 한 카테고리의 아이템 사양.

    primary:       composer가 추천한 1차 아이템명 (네이버 검색에 우선 사용)
    fallback:      primary 검색 실패 시 시도할 2차 아이템명
                   composer 프롬프트에서 "더 흔하고 일반적인 아이템"으로 생성됨
    resolved_item: 검색·트리밍 완료된 실제 상품 dict (item_fetcher가 채움)
                   None이면 아직 검색 안 됐거나 실패
    status:        "pending" | "resolved" | "failed" | "skipped"
                   skipped는 앵커 카테고리처럼 검색 자체를 건너뛴 경우
    """
    primary:       str
    fallback:      str
    resolved_item: Optional[dict]
    status:        str


class OutfitProposal(TypedDict, total=False):
    """
    Composer가 만든 코디 한 세트의 설계도.

    mood:            "minimal" | "street" | "classic" | "rocker" | ...
                     영어 키 (composer 프롬프트에서 정의된 무드 집합 중 하나)
    items:           카테고리별 아이템 사양 dict
                     예: {"TOP": OutfitItemSpec, "BOTTOM": OutfitItemSpec, ...}
    anchor_category: 앵커 아이템이 차지하는 카테고리 (없으면 None)
                     예: "OUTER" → item_fetcher가 OUTER 검색 스킵하고 앵커 그대로 사용
    proposal_status: "pending" | "resolved" | "partial" | "failed"
                     모든 카테고리 resolved → "resolved"
                     일부만 resolved        → "partial"
                     하나도 resolved 안 됨  → "failed"
    """
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
    source:              Optional[str]                # "closet" | "external"
    anchor_item_id:      Optional[int]
    style_reference_ids: Optional[List[int]]
    gender:              Optional[str]                # "MALE" | "FEMALE"

    # ── Planner ──────────────────────────────────────────────────────────────
    weather:           Optional[str]
    calendar_events:   Optional[List[str]]
    season:            Optional[str]
    avoid_constraints: Optional[List[str]]
    conflict_warning:  Optional[str]

    # ── Style Analyzer ───────────────────────────────────────────────────────
    anchor_item:        Optional[dict]
    style_vector:       Optional[List[float]]         # 512차원, L2 정규화
    style_keywords:     Optional[List[str]]
    has_style_context:  Optional[bool]

    # ── Query Builder (closet 흐름 전용으로 축소됨) ──────────────────────────
    search_queries:     Optional[dict]
    user_brand_profile: Optional[dict]

    # ── Outfit Composer (Step 37 신규, external 흐름) ────────────────────────
    outfit_proposals:   Optional[List[OutfitProposal]]
    # 비고: Annotated[..., add] 처리 안 함.
    # composer가 통째로 set하고 item_fetcher가 같은 list를 in-place로 채워서 반환.

    # ── Retrieval (closet + external 공통 출력) ──────────────────────────────
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

    # ── Memory (LangGraph 자동 병합) ─────────────────────────────────────────
    session_history:    Annotated[List[dict], add]
    excluded_outfits:   Annotated[List[dict], add]

    # ── Observability ────────────────────────────────────────────────────────
    errors:             Annotated[List[str], add]