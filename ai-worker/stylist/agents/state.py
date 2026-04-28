from typing import TypedDict, Optional, List


class OutfitState(TypedDict):
    # Input
    user_message: str
    intent: Optional[str]              # "formal" / "casual" / "sporty" — UI 버튼으로 받음
    excluded_items: Optional[List[int]] # 교체 시 제외할 아이템 ID 목록

    # Filled by Planner
    weather: Optional[str]             # "12°C, clear"
    calendar_events: Optional[List[str]]
    season: Optional[str]              # "spring" / "summer" / "fall" / "winter"

    # Filled by Retrieval
    retrieved_items: Optional[List[dict]]

    # Filled by Ranker
    ranked_items: Optional[List[dict]]
    guardrail_passed: Optional[bool]
    retry_count: Optional[int]

    # Filled by Response
    final_response: Optional[str]