# ai-worker/stylist/outfit_state.py
# OutfitState — LangGraph 전체 파이프라인이 공유하는 상태 객체

from typing import TypedDict, Optional, List, Annotated
from operator import add


class OutfitState(TypedDict):
    # ── Input (프론트에서 전달) ──────────────────────────────────
    user_message: str
    user_id: str
    intent: Optional[str]           # "formal" | "casual" | "sporty"
    source: Optional[str]           # "closet" | "external"
    anchor_item_id: Optional[int]   # 고정 아이템 ID (없으면 None)
    style_reference_ids: Optional[List[int]]  # StyleReference PK 목록

    # ── Filled by Planner ────────────────────────────────────────
    weather: Optional[str]
    calendar_events: Optional[List[str]]
    season: Optional[str]
    avoid_constraints: Optional[List[str]]  # NCP → ["avoid oversized silhouette", ...]
    avoid_item_ids: Optional[List[int]]     # NCP → DB item ID 목록 (Retrieval 사전 필터용)
    conflict_warning: Optional[str]         # "sporty_rain" | "casual_meeting" | "anchor_ncp_conflict" | None

    # ── Filled by Style Analyzer (신규) ─────────────────────────
    anchor_item: Optional[dict]         # DB에서 조회한 앵커 아이템 전체 정보
    style_vector: Optional[List[float]] # pgvector 검색용 최종 벡터 (512차원)
    style_keywords: Optional[List[str]] # PRESET 레퍼런스 → LLM 추출 키워드
    has_style_context: Optional[bool]   # 벡터 검색 가능 여부 (False면 태그 fallback)

    # ── Filled by Retrieval ──────────────────────────────────────
    retrieved_items: Optional[List[dict]]
    relaxation_level: Optional[int]

    # ── Filled by Ranker ─────────────────────────────────────────
    scored_items: Optional[List[dict]]

    # ── Filled by Validator ──────────────────────────────────────
    ranked_items: Optional[List[dict]]
    guardrail_passed: Optional[bool]
    failure_reason: Optional[str]
    retry_count: Optional[int]

    # ── Filled by Response ───────────────────────────────────────
    final_response: Optional[str]
    recommended_outfit_ids: Optional[List[int]]

    # ── Short-term Memory (Annotated → 자동 누적) ────────────────
    session_history: Annotated[List[dict], add]
    excluded_outfits: Annotated[List[dict], add]   # 싫어요 누른 코디

    # ── Observability ────────────────────────────────────────────
    errors: Annotated[List[str], add]