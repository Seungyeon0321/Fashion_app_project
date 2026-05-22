# ai-worker/stylist/agents/query_builder.py
"""
Query Builder — Step 37 역할 축소

Step 36까지: external + closet 양쪽 쿼리 생성 (TOP만 미리 생성)
Step 37 이후: closet 전용

변경 이유:
  external은 outfit_composer가 코디 비전을 먼저 만들고,
  naver.py의 룰 기반 build_query()가 검색어를 만들어줘서
  query_builder가 external 흐름에서 할 일이 없어짐.

  closet은 pgvector 유사도 검색이라 여전히 쿼리가 필요.
  style_vector + style_keywords 기반으로 각 카테고리 쿼리 생성.
"""

from stylist.outfit_state import OutfitState

CHAIN_ORDER = ["TOP", "BOTTOM", "OUTER", "DRESS"]


def query_builder(state: OutfitState) -> dict:
    """
    LangGraph 노드 함수 — closet 전용.

    source가 "external"이면 아무것도 안 하고 통과.
    source가 "closet"이면 각 카테고리별 검색 쿼리 생성.
    """
    source = state.get("source") or "external"

    # external 흐름은 composer → item_fetcher가 처리
    if source == "external":
        return {}

    # ── closet 흐름 ───────────────────────────────────────────────────────────
    intent         = state.get("intent") or "casual"
    season         = state.get("season") or "spring"
    style_keywords = state.get("style_keywords") or []
    anchor_item    = state.get("anchor_item")

    keywords_str = " ".join(style_keywords) if style_keywords else intent

    queries: dict[str, str] = {}
    for category in CHAIN_ORDER:
        # 앵커 카테고리는 쿼리 생성 불필요 (closet에서 앵커 자체 사용)
        if anchor_item and anchor_item.get("category") == category:
            continue

        season_kr = {"spring": "봄", "summer": "여름", "fall": "가을", "winter": "겨울"}.get(season, "")
        queries[category] = f"{keywords_str} {season_kr}".strip()

    print(f"[QueryBuilder] closet 쿼리 생성: {list(queries.keys())}")
    return {"search_queries": queries}