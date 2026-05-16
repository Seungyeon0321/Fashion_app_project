# ai-worker/stylist/outfit_state.py
from typing import TypedDict, Optional, List, Annotated
from operator import add

class OutfitState(TypedDict):
    # Input
    user_message: str
    user_id: str
    intent: Optional[str]
    source: Optional[str]                    # "closet" | "external"
    anchor_item_id: Optional[int]
    style_reference_ids: Optional[List[int]]

    # Planner
    weather: Optional[str]
    calendar_events: Optional[List[str]]
    season: Optional[str]
    avoid_constraints: Optional[List[str]]
    conflict_warning: Optional[str]

    # Style Analyzer
    anchor_item: Optional[dict]
    style_vector: Optional[List[float]]      # 512차원, L2 정규화
    style_keywords: Optional[List[str]]
    has_style_context: Optional[bool]

    # Retrieval
    retrieved_items: Optional[List[dict]]
    relaxation_level: Optional[int]

    # Ranker
    scored_items: Optional[List[dict]]

    # Validator
    ranked_items: Optional[List[dict]]
    guardrail_passed: Optional[bool]
    failure_reason: Optional[str]
    retry_count: Optional[int]

    # Response
    final_response: Optional[str]
    recommended_outfit_ids: Optional[List[int]]

    # Memory (Annotated → LangGraph 자동 병합)
    session_history: Annotated[List[dict], add]
    excluded_outfits: Annotated[List[dict], add]  # 조합 단위

    # Observability
    errors: Annotated[List[str], add]