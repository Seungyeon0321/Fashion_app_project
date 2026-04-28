from .state import OutfitState


def ranker(state: OutfitState) -> dict:
    retrieved_items = state["retrieved_items"]
    retry_count     = state.get("retry_count") or 0

    # 카테고리당 하나만 유지 (중복 제거)
    seen_categories = set()
    deduplicated    = []
    for item in retrieved_items:
        if item["category"] not in seen_categories:
            deduplicated.append(item)
            seen_categories.add(item["category"])

    # 환각 체크 — id 있는 아이템만 통과
    verified_items = [item for item in deduplicated if item.get("id")]

    # Guardrail: 최소 2개 이상이어야 통과
    guardrail_passed = len(verified_items) >= 2

    return {
        "ranked_items":     verified_items,
        "guardrail_passed": guardrail_passed,
        "retry_count":      retry_count + 1,
    }