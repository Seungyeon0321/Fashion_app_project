from .state import OutfitState

MOCK_WARDROBE = [
    {"id": 1, "name": "Navy blazer",         "category": "outer",  "season": "spring", "style": "formal"},
    {"id": 2, "name": "White dress shirt",    "category": "top",    "season": "spring", "style": "formal"},
    {"id": 3, "name": "Charcoal slacks",      "category": "bottom", "season": "spring", "style": "formal"},
    {"id": 4, "name": "White sneakers",       "category": "shoes",  "season": "spring", "style": "casual"},
    {"id": 5, "name": "Grey hoodie",          "category": "top",    "season": "spring", "style": "casual"},
    {"id": 6, "name": "Running shorts",       "category": "bottom", "season": "spring", "style": "sporty"},
    {"id": 7, "name": "Oxford leather shoes", "category": "shoes",  "season": "spring", "style": "formal"},
]


def retrieval(state: OutfitState) -> dict:
    intent         = state["intent"]
    season         = state["season"]
    excluded_items = state.get("excluded_items") or []

    # style + season 필터 + 교체 시 제외 아이템 제외
    retrieved_items = [
        item for item in MOCK_WARDROBE
        if item["season"] == season
        and item["style"] == intent
        and item["id"] not in excluded_items
    ]

    return {"retrieved_items": retrieved_items}