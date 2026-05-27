# ai-worker/stylist/query_strategies/naver.py
"""
네이버 쇼핑 검색어 빌더 — Step 38 단순화 버전

Step 36까지: 2-hop LLM 호출
  hop1 (LLM): "어울리는 아이템 3개 추천"
  hop2 (LLM): "아이템명 → 검색어 변환"

Step 37: outfit_composer가 hop1 흡수, hop2는 룰 기반
  - 형식: "{성별} {아이템명} {카테고리 키워드} {계절}"
  - 문제: 키워드가 7~9개로 너무 많아 검색 결과 0건이 빈번
  - 예: "남성 베이지 와이드 치노 팬츠 바지 봄" → 검색 0건

Step 38 단순화: 성별 + 아이템명만
  - 형식: "{성별} {아이템명}"
  - 예: "남성 베이지 와이드 치노" → 풍부한 결과

설계 근거:
  1. 계절 키워드 제거
     - 네이버 상품명에 '봄' 같은 단어는 드뭄 (S/S, 2026 봄/여름 등으로 표기)
     - 계절은 composer가 이미 고려한 정보 (봄용 아이템을 만들어줌)
     - 검색어에 또 넣으면 노이즈만 증가
  2. 카테고리 키워드 제거
     - composer가 만든 아이템명에 이미 카테고리 정보 포함 ("치노" → 자동으로 팬츠)
     - "팬츠 바지" 같은 키워드 추가는 AND 검색 결과를 좁히기만 함
  3. 성별 유지
     - 한국 쇼핑몰은 성별 분리가 명확
     - "치노 팬츠"만 검색하면 여성 제품이 섞여 나옴
     - "남성 치노 팬츠"는 카테고리 분리 효과 명확
"""

from .base import QueryStrategy


# ──────────────────────────────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────────────────────────────

GENDER_KR = {
    "MALE":   "남성",
    "FEMALE": "여성",
}


# ──────────────────────────────────────────────────────────────────────────────
# Strategy
# ──────────────────────────────────────────────────────────────────────────────

class NaverQueryStrategy(QueryStrategy):
    """
    네이버 쇼핑 검색어 생성 전략 — 단순 룰 기반.

    composer가 만든 아이템명을 받아서 다음 형식으로 변환:
      "{성별} {아이템명}"

    예시:
      build_query("화이트 옥스포드 셔츠", category="TOP", gender="MALE")
        → "남성 화이트 옥스포드 셔츠"

      build_query("베이지 와이드 치노", category="BOTTOM", gender="MALE")
        → "남성 베이지 와이드 치노"

      build_query("카키 MA-1 봄버 재킷", category="OUTER", gender="MALE")
        → "남성 카키 MA-1 봄버 재킷"
    """

    @property
    def platform_name(self) -> str:
        return "naver"

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
                       (현재 구현에서는 사용 안 함. 인터페이스 호환용)
            gender:    "MALE" | "FEMALE"
            season:    "spring" | "summer" | "fall" | "winter"
                       (현재 구현에서는 사용 안 함. 인터페이스 호환용)

        Returns:
            검색어 문자열 (네이버 쇼핑 API의 query 파라미터로 사용)

        Note:
            category와 season은 base.py 인터페이스 유지를 위해 받지만
            현재 검색어 빌더는 사용하지 않음.
            추후 카테고리별 검색 전략 분기가 필요해지면 활용 가능.
        """
        item_name = (item_name or "").strip()
        if not item_name:
            return ""

        gender_kr = GENDER_KR.get(gender, "남성")
        return f"{gender_kr} {item_name}"