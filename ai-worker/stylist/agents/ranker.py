# ai-worker/stylist/nodes/ranker.py
"""
Ranker 노드

역할:
  Retrieval이 가져온 아이템 풀에서 최적의 코디 조합을 선택한다.

파이프라인에서의 위치:
  Retrieval → [Ranker] → Validator

기존 코드 대비 추가된 것:
  ① is_anchor 고정 처리
     앵커 아이템은 점수 계산 대상이 아님.
     무조건 최종 결과에 포함, 맨 앞에 위치.

  ② similarity 기반 정렬 + 카테고리 대표 선출
     같은 카테고리 여러 개 → similarity 높은 것 1개만 선택.
     (기존: 먼저 나온 것 선택 → 개선: 점수 높은 것 선택)

  ③ NCP 조합 단위 필터
     Retrieval: 개별 아이템 ID 필터
     Ranker: 최종 조합이 excluded_outfits와 일치하는지 체크
     둘 다 해야 완전한 NCP 필터가 됨.

guardrail 기준:
  TOP 또는 DRESS 중 하나 이상 필수
  BOTTOM 필수 (DRESS면 면제)
  → 최소한 입을 수 있는 조합이어야 통과
"""

from typing import Optional
from stylist.outfit_state import OutfitState


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def ranker(state: OutfitState) -> dict:
    """
    Ranker 노드 메인 함수.

    처리 순서:
      ① 앵커 분리 (is_anchor=True 아이템을 별도 보관)
      ② 나머지 아이템 similarity 기준 정렬
      ③ 카테고리별 대표 아이템 선출 (similarity 높은 것 1개)
      ④ NCP 조합 단위 필터
      ⑤ 앵커 재삽입 (맨 앞)
      ⑥ guardrail 판단
    """
    retrieved_items = state.get("retrieved_items") or []
    retry_count     = state.get("retry_count") or 0

    try:
        # ──────────────────────────────────────────────────────────────────
        # ① 앵커 분리
        #
        # 앵커 아이템은 점수 경쟁 대상이 아님.
        # 별도 보관 후 최종 결과 맨 앞에 무조건 삽입.
        # ──────────────────────────────────────────────────────────────────
        anchor_items    = [item for item in retrieved_items if item.get("is_anchor")]
        non_anchor_items = [item for item in retrieved_items if not item.get("is_anchor")]

        # ──────────────────────────────────────────────────────────────────
        # ② similarity 기준 내림차순 정렬
        #
        # 기존 코드: 먼저 나온 아이템이 카테고리 대표
        # 개선: similarity 높은 아이템이 카테고리 대표
        # ──────────────────────────────────────────────────────────────────
        sorted_items = sorted(
            non_anchor_items,
            key=lambda x: x.get("similarity", 0),
            reverse=True,
        )

        # ──────────────────────────────────────────────────────────────────
        # ③ 카테고리별 대표 선출
        #
        # 같은 카테고리에서 similarity 가장 높은 것 1개만 선택.
        # id 검증도 함께 수행 (기존 환각 체크 유지).
        #
        # 앵커가 차지하는 카테고리는 이미 분리됐으므로
        # non_anchor 아이템끼리만 카테고리 경쟁.
        # ──────────────────────────────────────────────────────────────────
        seen_categories: set[str] = set()

        # 앵커가 차지한 카테고리는 미리 seen에 등록
        # → 같은 카테고리 non_anchor 아이템이 중복 선출되지 않도록
        for anchor in anchor_items:
            if anchor.get("category"):
                seen_categories.add(anchor["category"])

        best_items: list[dict] = []
        for item in sorted_items:
            # id 없는 아이템 제거 (환각 체크)
            if not item.get("id"):
                continue

            category = item.get("category")
            if category and category not in seen_categories:
                best_items.append(item)
                seen_categories.add(category)

        # ──────────────────────────────────────────────────────────────────
        # ④ NCP 조합 단위 필터
        #
        # Retrieval: 개별 아이템 ID 필터 (excluded_outfits에 등장하는 ID 제거)
        # Ranker:    최종 조합 단위 필터
        #            현재 선출된 조합의 item_ids가
        #            excluded_outfits 중 하나와 완전히 일치하면 제거
        #
        # 왜 두 단계로 나누는가?
        #   Retrieval 필터: "이 아이템이 NCP 조합에 있으면 아예 후보에서 제거"
        #   Ranker 필터:    "Retrieval을 통과했어도 조합이 NCP와 일치하면 다른 조합으로"
        #   → 완전한 NCP 보장
        # ──────────────────────────────────────────────────────────────────
        if state.get("excluded_outfits"):
            best_items = _filter_ncp_combo(
                items=best_items,
                anchor_items=anchor_items,
                excluded_outfits=state["excluded_outfits"],
            )

        # ──────────────────────────────────────────────────────────────────
        # ⑤ 앵커 재삽입
        #
        # 앵커는 무조건 맨 앞.
        # Validator, Response 노드에서 is_anchor=True를 보고
        # 앵커 아이템을 특별 처리함.
        # ──────────────────────────────────────────────────────────────────
        ranked_items = anchor_items + best_items

        # ──────────────────────────────────────────────────────────────────
        # ⑥ guardrail 판단
        #
        # 최소 조건: 입을 수 있는 조합인가?
        #   DRESS 있으면 → 단독으로 통과 (원피스는 TOP+BOTTOM 불필요)
        #   DRESS 없으면 → TOP + BOTTOM 둘 다 있어야 통과
        #
        # 기존 코드(2개 이상)보다 더 의미있는 기준.
        # ──────────────────────────────────────────────────────────────────
        guardrail_passed = _check_guardrail(ranked_items)

        return {
            "ranked_items":     ranked_items,
            "guardrail_passed": guardrail_passed,
            "retry_count":      retry_count + 1,
        }

    except Exception as e:
        return {
            "ranked_items":     [],
            "guardrail_passed": False,
            "retry_count":      retry_count + 1,
            "errors":           [f"ranker 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들
# ──────────────────────────────────────────────────────────────────────────────

def _filter_ncp_combo(
    items: list[dict],
    anchor_items: list[dict],
    excluded_outfits: list[dict],
) -> list[dict]:
    """
    현재 선출된 조합이 NCP(싫어요 조합)와 일치하는지 체크.

    조합 일치 판단:
        현재 조합의 item_ids와 excluded_outfit의 item_ids가
        완전히 일치(subset)하면 충돌.

    예시:
        현재 조합: [앵커(1), TOP(2), BOTTOM(3)]
        excluded:  {"item_ids": [1, 2, 3], "intent": "casual"}
        → 완전 일치 → best_items에서 similarity 낮은 것 제거 시도

    앵커 예외:
        앵커는 제거 불가. 앵커를 포함한 조합이 NCP와 일치해도
        앵커는 유지하고 non_anchor 아이템을 교체 시도.
        (교체할 아이템이 없으면 그냥 진행 — conflict_warning이 이미 세팅됨)

    MVP 구현:
        NCP 조합과 완전 일치 시 best_items 중
        similarity 가장 낮은 non_anchor 아이템 1개 제거.
        → Validator가 부족하다고 판단 → retry → 다른 아이템 선출
    """
    all_item_ids = (
        {item["id"] for item in anchor_items if isinstance(item.get("id"), int)}
        | {item["id"] for item in items if isinstance(item.get("id"), int)}
    )

    for excluded in excluded_outfits:
        excluded_ids = set(excluded.get("item_ids", []))

        # 현재 조합이 excluded 조합을 포함하는지 체크
        if excluded_ids and excluded_ids.issubset(all_item_ids):
            print(f"[Ranker] NCP 조합 충돌 감지: {excluded_ids}")

            # non_anchor 아이템 중 similarity 가장 낮은 것 제거
            if items:
                items_sorted = sorted(
                    items,
                    key=lambda x: x.get("similarity", 0),
                )
                removed = items_sorted[0]
                items   = items_sorted[1:]
                print(f"[Ranker] NCP 충돌 해소: item_id={removed.get('id')} 제거")

    return items


def _check_guardrail(items: list[dict]) -> bool:
    """
    최종 조합이 최소 조건을 만족하는지 판단.

    통과 조건:
        DRESS가 있으면 → 단독 통과 (원피스는 상하의 불필요)
        DRESS가 없으면 → TOP + BOTTOM 둘 다 있어야 통과

    왜 기존(2개 이상)보다 나은가?
        기존: SHOES 2개여도 통과
        개선: 실제로 입을 수 있는 조합인지 의미적으로 판단
    """
    categories = {item.get("category") for item in items}

    has_dress  = "DRESS" in categories
    has_top    = "TOP" in categories
    has_bottom = "BOTTOM" in categories

    if has_dress:
        return True

    return has_top and has_bottom