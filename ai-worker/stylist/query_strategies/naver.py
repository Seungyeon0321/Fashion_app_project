# ai-worker/stylist/query_strategies/naver.py

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from .base import QueryStrategy

CATEGORY_KR = {
    "TOP":    "상의",
    "BOTTOM": "하의",
    "OUTER":  "아우터",
    "SHOES":  "신발",
    "BAG":    "가방",
    "ACC":    "액세서리",
    "DRESS":  "원피스",
}

INTENT_KR = {
    "casual":  "캐주얼",
    "formal":  "포멀",
    "sporty":  "스포티",
}

SEASON_KR = {
    "spring": "봄",
    "summer": "여름",
    "fall":   "가을",
    "winter": "겨울",
}

GENDER_KR = {
    "MALE":   "남성",
    "FEMALE": "여성",
}

NAVER_QUERY_SYSTEM = """당신은 한국 패션 쇼핑몰 검색 전문가입니다.
주어진 정보를 바탕으로 네이버 쇼핑에서 스타일리한 상품을 찾기 위한 최적의 검색어를 만들어주세요.

규칙:
- 반드시 한국어로 작성
- 10단어 이내로 간결하게
- 브랜드명 포함 금지
- 성별을 반드시 첫 단어로 포함 (남성 or 여성)
- 색상, 핏, 스타일 키워드 자연스럽게 조합
- 너무 구체적인 소재 표현 지양 ("라이트톤", "얇은 소재" 같은 표현은 검색 결과가 없을 수 있음)
- 실제 네이버 쇼핑에서 검색 결과가 많이 나올 법한 대중적인 단어 선택
- 검색어만 출력, 설명 없이"""

NAVER_QUERY_HUMAN = """성별: {gender_kr}
카테고리: {category_kr}
스타일 의도: {intent_kr}
계절: {season_kr}
스타일 키워드: {style_keywords}
앵커 아이템 정보: {anchor_info}
선호 정보: {brand_profile}
이미 선택된 아이템: {selected_items}

위 정보를 바탕으로 네이버 쇼핑 검색어를 만들어주세요.
이미 선택된 아이템이 있다면 색상/스타일이 어울리는 아이템을 찾을 수 있는 검색어를 만들어주세요."""


class NaverQueryStrategy(QueryStrategy):

    def __init__(self):
        self._llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=64)

    @property
    def platform_name(self) -> str:
        return "naver"

    def build_query(
        self,
        category: str,
        intent: str,
        season: str,
        style_keywords: list[str],
        anchor_item: dict | None,
        user_brand_profile: dict | None,
        gender: str = "MALE",
        selected_items: list[dict] | None = None,  # ← 색상 체인용 추가
    ) -> str:
        try:
            return self._build_with_llm(
                category, intent, season,
                style_keywords, anchor_item, user_brand_profile,
                gender, selected_items or [],
            )
        except Exception as e:
            print(f"[NaverQueryStrategy] LLM 실패, fallback 사용: {e}")
            return self._fallback_query(category, intent, season, style_keywords, gender)

    def _build_with_llm(
        self,
        category: str,
        intent: str,
        season: str,
        style_keywords: list[str],
        anchor_item: dict | None,
        user_brand_profile: dict | None,
        gender: str,
        selected_items: list[dict],
    ) -> str:
        anchor_info = "없음"
        if anchor_item:
            parts = []
            if anchor_item.get("colors"):
                parts.append(f"색상: {', '.join(anchor_item['colors'])}")
            if anchor_item.get("fit"):
                parts.append(f"핏: {anchor_item['fit']}")
            if anchor_item.get("material"):
                parts.append(f"소재: {anchor_item['material']}")
            if anchor_item.get("style"):
                parts.append(f"스타일: {anchor_item['style']}")
            anchor_info = " / ".join(parts) if parts else "없음"

        brand_profile = "없음"
        if user_brand_profile:
            parts = []
            if user_brand_profile.get("preferred_colors"):
                parts.append(f"선호 색상: {', '.join(user_brand_profile['preferred_colors'][:3])}")
            if user_brand_profile.get("preferred_fit"):
                parts.append(f"선호 핏: {', '.join(user_brand_profile['preferred_fit'][:2])}")
            brand_profile = " / ".join(parts) if parts else "없음"

        # 이미 선택된 아이템 색상/카테고리 요약 (색상 체인)
        selected_summary = "없음"
        if selected_items:
            parts = []
            for item in selected_items:
                cat = item.get("category", "")
                colors = item.get("colors") or []
                name = item.get("name", "")
                if colors:
                    parts.append(f"{cat}({', '.join(colors[:2])})")
                elif name:
                    parts.append(f"{cat}({name[:10]})")
            selected_summary = ", ".join(parts) if parts else "없음"

        human_text = NAVER_QUERY_HUMAN.format(
            gender_kr=GENDER_KR.get(gender, "남성"),
            category_kr=CATEGORY_KR.get(category, category),
            intent_kr=INTENT_KR.get(intent, intent),
            season_kr=SEASON_KR.get(season, season),
            style_keywords=", ".join(style_keywords) if style_keywords else "없음",
            anchor_info=anchor_info,
            brand_profile=brand_profile,
            selected_items=selected_summary,
        )

        response = self._llm.invoke([
            SystemMessage(content=NAVER_QUERY_SYSTEM),
            HumanMessage(content=human_text),
        ])

        query = response.content.strip()
        print(f"[NaverQueryStrategy] 생성된 쿼리 ({category}, {gender}): {query}")
        return query

    def _fallback_query(
        self,
        category: str,
        intent: str,
        season: str,
        style_keywords: list[str],
        gender: str = "MALE",
    ) -> str:
        """
        LLM 실패 시 규칙 기반 fallback.
        단순하게 "남성 캐주얼 상의 봄" 형태로.
        """
        parts = [
            GENDER_KR.get(gender, "남성"),
            INTENT_KR.get(intent, "캐주얼"),
            CATEGORY_KR.get(category, category),
            SEASON_KR.get(season, ""),
        ]
        return " ".join(p for p in parts if p)

    def build_simple_query(self, category: str, gender: str) -> str:
        """
        결과 0개일 때 사용하는 단순 fallback 쿼리.
        예: "남성 상의"
        """
        return f"{GENDER_KR.get(gender, '남성')} {CATEGORY_KR.get(category, category)}"