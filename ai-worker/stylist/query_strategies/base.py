# ai-worker/stylist/query_strategies/base.py
"""
Query Strategy 추상 클래스

역할:
  플랫폼별 검색 쿼리 생성 전략의 공통 인터페이스.
  네이버, 구글, 무신사 등 새 플랫폼 추가 시 이 클래스를 상속.

확장 방법:
  1. query_strategies/ 아래 새 파일 생성 (예: musinsa.py)
  2. QueryStrategy 상속
  3. build_query() 구현
  4. external_retrieval.py에서 인스턴스화하여 사용

Step 37 변경:
  build_query 시그니처가 변경됨.
  옛 시그니처: (category, intent, season, style_keywords, anchor_item, user_brand_profile)
    → composer가 없었을 때는 검색 전략이 직접 아이템명을 추론해야 했음
  새 시그니처: (item_name, category, gender, season)
    → outfit_composer가 이미 아이템명을 만들어주므로,
      검색 전략은 단순히 그 이름을 플랫폼 검색어로 변환만 함
"""

from abc import ABC, abstractmethod


class QueryStrategy(ABC):
    """
    플랫폼별 검색 쿼리 전략 추상 클래스.

    build_query()를 구현하면 external_retrieval.py에서 호출함.
    """

    @abstractmethod
    def build_query(
        self,
        item_name: str,
        category: str,
        gender: str = "MALE",
        season: str = "spring",
    ) -> str:
        """
        composer가 만든 아이템명을 플랫폼별 검색어로 변환.

        Args:
            item_name: outfit_composer가 만든 아이템명
                       예: "화이트 옥스포드 셔츠"
            category:  검색 카테고리 ("TOP", "BOTTOM", "OUTER", "DRESS")
            gender:    "MALE" | "FEMALE"
            season:    "spring" | "summer" | "fall" | "winter"

        Returns:
            str: 플랫폼에 최적화된 검색 쿼리
                 예(네이버): "남성 화이트 옥스포드 셔츠 티셔츠 니트 봄"
                 예(구글):   "men white oxford shirt spring"
        """
        pass

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """플랫폼 이름 (로깅용). 예: 'naver', 'google'"""
        pass