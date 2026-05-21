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
  4. query_builder.py의 STRATEGY_MAP에 등록
"""

from abc import ABC, abstractmethod


class QueryStrategy(ABC):
    """
    플랫폼별 검색 쿼리 전략 추상 클래스.

    build_query()를 구현하면 Query Builder 노드에서 자동으로 호출됨.
    """

    @abstractmethod
    def build_query(
        self,
        category: str,
        intent: str,
        season: str,
        style_keywords: list[str],
        anchor_item: dict | None,
        user_brand_profile: dict | None,
    ) -> str:
        """
        플랫폼에 최적화된 검색 쿼리 문자열 반환.

        Args:
            category:           검색 카테고리 ("TOP", "BOTTOM", "OUTER" 등)
            intent:             스타일 의도 ("casual", "formal", "sporty")
            season:             계절 ("spring", "summer", "fall", "winter")
            style_keywords:     Style Analyzer가 추출한 스타일 키워드
                                예: ["minimal", "quiet_luxury"]
            anchor_item:        앵커 아이템 정보 (색상, 핏, 브랜드 참고용)
                                없으면 None
            user_brand_profile: 좋아요 코디에서 누적된 브랜드/색상/핏 선호도
                                MVP에서는 빈 dict

        Returns:
            str: 플랫폼에 최적화된 검색 쿼리
                 예(네이버): "오버핏 베이지 미니멀 캐주얼 티셔츠 봄"
                 예(구글):   "overfit beige minimal casual t-shirt spring"
        """
        pass

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """플랫폼 이름 (로깅용). 예: 'naver', 'google'"""
        pass