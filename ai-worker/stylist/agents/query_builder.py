# ai-worker/stylist/agents/query_builder.py
"""
Query Builder 노드

역할:
  Style Analyzer가 추출한 style_keywords, 앵커 정보, intent, season을 받아
  플랫폼에 최적화된 검색 쿼리를 카테고리별로 생성한다.

파이프라인에서의 위치:
  Style Analyzer → [Query Builder] → Retrieval

설계 원칙:
  - 플랫폼별 전략을 QueryStrategy 서브클래스로 분리
  - source("naver", "google" 등)에 따라 전략 자동 선택
  - 새 플랫폼 추가 시 query_strategies/ 에 파일만 추가하면 됨

출력:
  search_queries: {
    "TOP":    "오버핏 베이지 미니멀 캐주얼 티셔츠 봄",
    "BOTTOM": "와이드 슬랙스 베이지 캐주얼 봄",
    "OUTER":  "린넨 자켓 미니멀 캐주얼 봄",
  }

source="closet"일 때:
  pgvector 검색은 style_vector를 직접 사용하므로
  search_queries 생성을 건너뜀 (빈 dict 반환).
  Query Builder는 external 전용 노드.
"""

# ai-worker/stylist/agents/query_builder.py

from stylist.outfit_state import OutfitState
from stylist.query_strategies.naver import NaverQueryStrategy
from stylist.query_strategies.base import QueryStrategy

SEARCH_CATEGORIES = ["TOP", "BOTTOM", "OUTER"]

STRATEGY_MAP: dict[str, QueryStrategy] = {
    "naver": NaverQueryStrategy(),
}

SOURCE_TO_PLATFORM: dict[str, str] = {
    "external": "naver",
    "naver":    "naver",
}


def query_builder(state: OutfitState) -> dict:
    errors = []

    try:
        source = state.get("source") or "closet"

        # closet은 pgvector 검색 → 쿼리 불필요
        if source == "closet":
            print("[QueryBuilder] source=closet, 쿼리 생성 스킵")
            return {"search_queries": {}, "errors": errors}

        platform = SOURCE_TO_PLATFORM.get(source, "naver")
        strategy = STRATEGY_MAP.get(platform)

        if not strategy:
            errors.append(f"[QueryBuilder] 알 수 없는 플랫폼: {platform}, naver로 fallback")
            strategy = STRATEGY_MAP["naver"]

        print(f"[QueryBuilder] platform={platform}, strategy={strategy.platform_name}")

        intent             = state.get("intent") or "casual"
        season             = state.get("season") or "spring"
        style_keywords     = state.get("style_keywords") or []
        anchor_item        = state.get("anchor_item")
        user_brand_profile = state.get("user_brand_profile") or {}
        gender             = state.get("gender") or "MALE"   # ← 추가

        search_queries: dict[str, str] = {}

        for category in SEARCH_CATEGORIES:
            query = strategy.build_query(
                category=category,
                intent=intent,
                season=season,
                style_keywords=style_keywords,
                anchor_item=anchor_item,
                user_brand_profile=user_brand_profile,
                gender=gender,                               # ← 추가
            )
            search_queries[category] = query

        print(f"[QueryBuilder] 쿼리 생성 완료: {search_queries}")

        return {
            "search_queries": search_queries,
            "errors":         errors,
        }

    except Exception as e:
        return {
            "search_queries": {},
            "errors":         [f"query_builder 예외: {str(e)}"],
        }