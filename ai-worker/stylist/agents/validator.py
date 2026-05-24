# ai-worker/stylist/nodes/validator.py
"""
Validator 노드

역할:
  Ranker가 선출한 최종 조합이 충분한지 판단하고,
  부족하면 Retrieval로 retry 신호를 보낸다.

파이프라인에서의 위치:
  Ranker → [Validator] → response_agent (pass)
                       → retrieval      (retry)
                       → default_response (fallback)

두 가지 역할:
  ① guardrail 판단
  ② is_anchor 보존 확인

  Step 37 추가:
  ③ external 흐름 시 outfit_proposals 단위 검증
     유효 proposal(resolved/partial)이 1개 이상이면 통과.

check_guardrail():
  graph.py의 conditional edge 라우터 함수.
  반환값:
    "pass"     → response_agent
    "retry"    → retrieval (retry_count < 4)
    "fallback" → default_response (retry_count >= 4)
"""

from stylist.outfit_state import OutfitState

MAX_RETRY = 4


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def validator(state: OutfitState) -> dict:
    """
    Validator 노드 메인 함수.

    Step 37: source가 external이면 proposals 단위 검증 추가.
    closet은 기존 로직 유지.
    """
    source      = state.get("source") or "closet"
    retry_count = state.get("retry_count") or 0

    # Step 37: external 흐름
    if source == "external":
        return _validate_external(state, retry_count)

    # closet 흐름: 기존 로직 유지
    return _validate_closet(state, retry_count)


# ──────────────────────────────────────────────────────────────────────────────
# Step 37: external 흐름 검증
# ──────────────────────────────────────────────────────────────────────────────

def _validate_external(state: OutfitState, retry_count: int) -> dict:
    """
    External 흐름 검증.

    유효 proposal(resolved/partial)이 1개 이상 + ranked_items 있으면 통과.
    모두 failed면 guardrail 실패.
    """
    proposals = state.get("outfit_proposals") or []
    ranked    = state.get("ranked_items") or []

    valid_count = sum(
        1 for p in proposals
        if p.get("proposal_status") in ("resolved", "partial")
    )

    if valid_count > 0 and ranked:
        print(f"[Validator] external 통과: {valid_count}개 유효 proposal")
        return {
            "guardrail_passed": True,
            "failure_reason":   None,
        }

    print(f"[Validator] external 실패: 유효 proposal 없음")
    return {
        "guardrail_passed": False,
        "failure_reason":   "no_valid_proposals",
    }


# ──────────────────────────────────────────────────────────────────────────────
# 기존: closet 흐름 검증 (변경 없음)
# ──────────────────────────────────────────────────────────────────────────────

def _validate_closet(state: OutfitState, retry_count: int) -> dict:
    """
    기존 closet 검증 로직 그대로 유지.

    처리 순서:
      ① is_anchor 보존 확인 + 필요시 강제 복구
      ② guardrail 판단
    """
    ranked_items = state.get("ranked_items") or []

    try:
        # ① is_anchor 보존 확인
        ranked_items = _ensure_anchor_preserved(
            ranked_items=ranked_items,
            anchor_item=state.get("anchor_item"),
            anchor_item_id=state.get("anchor_item_id"),
        )

        # ② guardrail 판단
        guardrail_passed, failure_reason = _evaluate_guardrail(ranked_items)

        return {
            "ranked_items":     ranked_items,
            "guardrail_passed": guardrail_passed,
            "failure_reason":   failure_reason,
        }

    except Exception as e:
        return {
            "guardrail_passed": False,
            "failure_reason":   f"validator 예외: {str(e)}",
            "errors":           [f"validator 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# LangGraph conditional edge 라우터 (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

def check_guardrail(state: OutfitState) -> str:
    """
    graph.py의 conditional edge에서 사용하는 라우터 함수.

    반환값:
        "pass"     → response_agent로 이동
        "retry"    → retrieval로 이동 (조건 완화해서 재검색)
        "fallback" → default_response로 이동 (포기)
    """
    guardrail_passed = state.get("guardrail_passed", False)
    retry_count      = state.get("retry_count") or 0

    if guardrail_passed:
        return "pass"

    if retry_count >= MAX_RETRY:
        print(f"[Validator] retry_count={retry_count} → fallback")
        return "fallback"

    print(f"[Validator] guardrail 실패 ({state.get('failure_reason')}) "
          f"→ retry (retry_count={retry_count})")
    return "retry"


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들 (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_anchor_preserved(
    ranked_items: list[dict],
    anchor_item: dict | None,
    anchor_item_id: int | None,
) -> list[dict]:
    """
    앵커 아이템이 ranked_items에 있는지 확인하고, 없으면 강제 복구.

    왜 필요한가?
        Ranker의 NCP 필터 또는 예외 상황으로
        앵커가 ranked_items에서 빠질 수 있음.
        앵커는 사용자가 직접 지정한 아이템이므로
        어떤 상황에서도 최종 결과에 포함돼야 함.
    """
    if not anchor_item_id or not anchor_item:
        return ranked_items

    existing_ids = {item.get("id") for item in ranked_items}

    if anchor_item_id in existing_ids:
        return ranked_items

    print(f"[Validator] 앵커 누락 감지 → 강제 복구: item_id={anchor_item_id}")

    recovered_anchor = {
        **anchor_item,
        "is_anchor":   True,
        "similarity":  1.0,
        "source":      "closet",
        "is_external": False,
        "crop_s3_key": None,
    }

    return [recovered_anchor] + ranked_items


def _evaluate_guardrail(items: list[dict]) -> tuple[bool, str | None]:
    """
    ranked_items가 추천 가능한 조합인지 판단.

    통과 조건:
        DRESS 있으면 → 통과 (원피스 단독 착용 가능)
        DRESS 없으면 → TOP + BOTTOM 둘 다 있어야 통과
    """
    if not items:
        return False, "no_items"

    categories = {item.get("category") for item in items}

    has_dress  = "DRESS" in categories
    has_top    = "TOP" in categories
    has_bottom = "BOTTOM" in categories

    if has_dress:
        return True, None

    if not has_top and not has_bottom:
        return False, "missing_top_and_bottom"

    if not has_top:
        return False, "missing_top"

    if not has_bottom:
        return False, "missing_bottom"

    return True, None