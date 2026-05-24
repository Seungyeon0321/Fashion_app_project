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

  ③ NCP 조합 단위 필터

  Step 37 추가:
  ④ external 흐름 시 outfit_proposals 기반 처리
     proposal별로 resolved_item들을 ranked_items로 평면화.
     failed proposal 제거, proposal_status 기반 필터.

guardrail 기준:
  TOP 또는 DRESS 중 하나 이상 필수
  BOTTOM 필수 (DRESS면 면제)
"""

from typing import Optional
from stylist.outfit_state import OutfitState, OutfitProposal


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def ranker(state: OutfitState) -> dict:
    """
    Ranker 노드 메인 함수.

    Step 37: source가 external이면 outfit_proposals 기반 처리.
    closet은 기존 retrieved_items 기반 처리 유지.
    """
    source = state.get("source") or "closet"

    # Step 37: external 흐름은 proposals 기반
    if source == "external":
        return _rank_external(state)

    # closet 흐름: 기존 로직 유지
    return _rank_closet(state)


# ──────────────────────────────────────────────────────────────────────────────
# Step 37: external 흐름 랭킹
# ──────────────────────────────────────────────────────────────────────────────

def _rank_external(state: OutfitState) -> dict:
    """
    External 흐름 랭킹.

    outfit_proposals의 resolved_item들을 평면화 → ranked_items.
    failed proposal 제거.
    proposal_status가 resolved/partial인 것만 통과.
    """
    proposals: list[OutfitProposal] = state.get("outfit_proposals") or []
    retry_count = state.get("retry_count") or 0

    valid_proposals = []
    ranked_items: list[dict] = []

    for prop in proposals:
        status = prop.get("proposal_status", "failed")
        if status == "failed":
            print(f"[Ranker] proposal({prop.get('mood')}) failed → 제거")
            continue

        items_in_proposal = []
        for cat, spec in prop.get("items", {}).items():
            resolved = spec.get("resolved_item")
            if not resolved:
                continue
            items_in_proposal.append(resolved)
            ranked_items.append(resolved)

        if items_in_proposal:
            valid_proposals.append(prop)

    guardrail_passed = _check_guardrail(ranked_items)

    print(f"[Ranker] external: {len(valid_proposals)}개 유효 proposal, "
          f"{len(ranked_items)}개 아이템, guardrail={guardrail_passed}")

    return {
        "outfit_proposals": valid_proposals,
        "ranked_items":     ranked_items,
        "guardrail_passed": guardrail_passed,
        "retry_count":      retry_count + 1,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 기존: closet 흐름 랭킹 (변경 없음)
# ──────────────────────────────────────────────────────────────────────────────

def _rank_closet(state: OutfitState) -> dict:
    """
    기존 closet 랭킹 로직 그대로 유지.

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
        # ① 앵커 분리
        anchor_items     = [item for item in retrieved_items if item.get("is_anchor")]
        non_anchor_items = [item for item in retrieved_items if not item.get("is_anchor")]

        # ② similarity 기준 내림차순 정렬
        sorted_items = sorted(
            non_anchor_items,
            key=lambda x: x.get("similarity", 0),
            reverse=True,
        )

        # ③ 카테고리별 대표 선출
        seen_categories: set[str] = set()

        # 앵커가 차지한 카테고리는 미리 seen에 등록
        for anchor in anchor_items:
            if anchor.get("category"):
                seen_categories.add(anchor["category"])

        best_items: list[dict] = []
        for item in sorted_items:
            if not item.get("id"):
                continue
            category = item.get("category")
            if category and category not in seen_categories:
                best_items.append(item)
                seen_categories.add(category)

        # ④ NCP 조합 단위 필터
        if state.get("excluded_outfits"):
            best_items = _filter_ncp_combo(
                items=best_items,
                anchor_items=anchor_items,
                excluded_outfits=state["excluded_outfits"],
            )

        # ⑤ 앵커 재삽입
        ranked_items = anchor_items + best_items

        # ⑥ guardrail 판단
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
# 헬퍼 함수들 (기존 유지)
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

    앵커 예외:
        앵커는 제거 불가. 앵커를 포함한 조합이 NCP와 일치해도
        앵커는 유지하고 non_anchor 아이템을 교체 시도.
    """
    all_item_ids = (
        {item["id"] for item in anchor_items if isinstance(item.get("id"), int)}
        | {item["id"] for item in items if isinstance(item.get("id"), int)}
    )

    for excluded in excluded_outfits:
        excluded_ids = set(excluded.get("item_ids", []))

        if excluded_ids and excluded_ids.issubset(all_item_ids):
            print(f"[Ranker] NCP 조합 충돌 감지: {excluded_ids}")

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
    """
    categories = {item.get("category") for item in items}

    has_dress  = "DRESS" in categories
    has_top    = "TOP" in categories
    has_bottom = "BOTTOM" in categories

    if has_dress:
        return True

    return has_top and has_bottom
