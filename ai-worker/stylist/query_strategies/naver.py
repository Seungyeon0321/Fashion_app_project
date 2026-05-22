# ai-worker/stylist/query_strategies/naver.py
"""
네이버 쇼핑 검색어 빌더 — Step 37 단순화 버전

Step 36까지: 2-hop LLM 호출
  hop1 (LLM): "어울리는 아이템 3개 추천"
  hop2 (LLM): "아이템명 → 검색어 변환"

Step 37 이후: outfit_composer가 hop1 흡수, hop2는 룰 기반
  - composer가 만든 아이템명을 받음 (예: "화이트 옥스포드 셔츠")
  - 성별/카테고리/계절 키워드를 단순 문자열 조합으로 추가
  - 결과: "남성 화이트 옥스포드 셔츠 셔츠 봄"  (← 카테고리 키워드 중복 시 정리)

장점:
  - LLM 호출 9회 제거 (3 proposals × 3 categories)
  - 응답 약 9초 단축
  - 결정론적 (디버깅 쉬움)
  - 비용 절감

중복 키워드 처리:
  composer 프롬프트에서 성별/계절/카테고리 단어 제외하도록 지시하지만,
  방어적으로 중복 검사 후 제거.
"""

from typing import Optional
from .base import QueryStrategy


# ──────────────────────────────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────────────────────────────

GENDER_KR = {
    "MALE":   "남성",
    "FEMALE": "여성",
}

SEASON_KR = {
    "spring": "봄",
    "summer": "여름",
    "fall":   "가을",
    "winter": "겨울",
}

# 성별 × 카테고리 검색 시 강제로 추가할 키워드
# 카테고리만 봐도 어떤 상품인지 명확해지도록 보조
CATEGORY_REQUIRED_KEYWORDS: dict[str, dict[str, str]] = {
    "MALE": {
        "TOP":    "셔츠 티셔츠 니트",  # OR 검색 효과를 노린 공백 구분
        "BOTTOM": "팬츠 바지",
        "OUTER":  "자켓 코트 가디건",
    },
    "FEMALE": {
        "TOP":    "블라우스 셔츠 니트",
        "BOTTOM": "스커트 팬츠",
        "OUTER":  "자켓 코트 가디건",
        "DRESS":  "원피스 드레스",
    },
}

# composer가 만든 아이템명에 이미 들어있을 수 있는 단어들 (중복 방지용)
# 예: composer가 "화이트 셔츠"를 만들었으면 카테고리 키워드 "셔츠"는 중복
COMMON_CATEGORY_WORDS = {
    "셔츠", "티셔츠", "니트", "맨투맨", "후드",
    "팬츠", "바지", "데님", "청바지", "슬랙스", "조거", "치노",
    "자켓", "코트", "가디건", "블레이저", "점퍼", "패딩",
    "스커트", "원피스", "드레스",
    "블라우스",
}


# ──────────────────────────────────────────────────────────────────────────────
# Strategy
# ──────────────────────────────────────────────────────────────────────────────

class NaverQueryStrategy(QueryStrategy):
    """
    네이버 쇼핑 검색어 생성 전략 — 룰 기반.

    composer가 만든 아이템명을 받아서 다음 형식으로 변환:
      "{성별} {아이템명} {카테고리 키워드} {계절}"

    예시:
      build_query("화이트 옥스포드 셔츠", category="TOP", gender="MALE", season="spring")
        → "남성 화이트 옥스포드 셔츠 티셔츠 니트 봄"
        ※ 아이템명에 "셔츠"가 이미 있으면 카테고리 키워드에서 "셔츠" 제거
    """

    def build_query(
        self,
        item_name: str,
        category: str,
        gender: str = "MALE",
        season: str = "spring",
    ) -> str:
        """
        composer가 만든 아이템명을 네이버 검색어로 변환.

        Args:
            item_name: composer 출력 아이템명 (예: "화이트 옥스포드 셔츠")
            category:  "TOP" | "BOTTOM" | "OUTER" | "DRESS"
            gender:    "MALE" | "FEMALE"
            season:    "spring" | "summer" | "fall" | "winter"

        Returns:
            검색어 문자열 (네이버 쇼핑 API의 query 파라미터로 사용)
        """
        item_name = (item_name or "").strip()
        if not item_name:
            return ""

        # 1. 카테고리 키워드 가져오기
        category_keywords = (
            CATEGORY_REQUIRED_KEYWORDS
            .get(gender, CATEGORY_REQUIRED_KEYWORDS["MALE"])
            .get(category, "")
        )

        # 2. 아이템명에 이미 있는 카테고리 단어는 키워드에서 제거 (중복 방지)
        if category_keywords:
            keyword_tokens = category_keywords.split()
            filtered = [tok for tok in keyword_tokens if tok not in item_name]
            category_keywords = " ".join(filtered)

        # 3. 최종 조합
        parts = [
            GENDER_KR.get(gender, "남성"),
            item_name,
            category_keywords,
            SEASON_KR.get(season, ""),
        ]
        return " ".join(p for p in parts if p).strip()