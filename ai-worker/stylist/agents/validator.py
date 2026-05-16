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
     ranked_items가 실제로 추천 가능한 조합인지 최종 확인.
     Ranker의 _check_guardrail()과 동일한 기준 재확인.
     (Ranker에서 이미 했지만 Validator가 공식 판단자)

  ② is_anchor 보존 확인
     앵커 아이템이 ranked_items에 살아있는지 체크.
     없으면 state의 anchor_item으로 강제 복구.
     앵커는 어떤 상황에서도 최종 결과에 포함돼야 함.

check_guardrail():
  graph.py의 conditional edge 라우터 함수.
  validator 노드 실행 후 LangGraph가 이 함수를 호출해서
  다음 노드를 결정함.

  반환값:
    "pass"     → response_agent
    "retry"    → retrieval (retry_count < 4)
    "fallback" → default_response (retry_count >= 4)
"""

from stylist.outfit_state import OutfitState


# retry 최대 횟수
# 이 횟수를 넘으면 fallback (default_response)으로 이동
MAX_RETRY = 4


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def validator(state: OutfitState) -> dict:
    """
    Validator 노드 메인 함수.

    처리 순서:
      ① is_anchor 보존 확인 + 필요시 강제 복구
      ② guardrail 판단 (pass / retry / fallback)
      ③ failure_reason 세팅 (retry/fallback일 때 왜 실패했는지 기록)
    """
    ranked_items = state.get("ranked_items") or []
    retry_count  = state.get("retry_count") or 0

    try:
        # ──────────────────────────────────────────────────────────────────
        # ① is_anchor 보존 확인
        #
        # 앵커 아이템이 ranked_items에 있는지 확인.
        # Ranker에서 앵커를 맨 앞에 삽입했지만
        # NCP 필터나 예외 상황으로 빠졌을 수 있음.
        #
        # 없으면 state["anchor_item"]으로 강제 복구.
        # ──────────────────────────────────────────────────────────────────
        ranked_items = _ensure_anchor_preserved(
            ranked_items=ranked_items,
            anchor_item=state.get("anchor_item"),
            anchor_item_id=state.get("anchor_item_id"),
        )

        # ──────────────────────────────────────────────────────────────────
        # ② guardrail 판단
        #
        # 통과 조건:
        #   DRESS 있으면 → 단독 통과
        #   DRESS 없으면 → TOP + BOTTOM 둘 다 있어야 통과
        # ──────────────────────────────────────────────────────────────────
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
# LangGraph conditional edge 라우터
# ──────────────────────────────────────────────────────────────────────────────

def check_guardrail(state: OutfitState) -> str:
    """
    graph.py의 conditional edge에서 사용하는 라우터 함수.

    LangGraph가 validator 노드 실행 후 이 함수를 호출해서
    다음 노드를 결정함.

    반환값:
        "pass"     → response_agent로 이동
        "retry"    → retrieval로 이동 (조건 완화해서 재검색)
        "fallback" → default_response로 이동 (포기)

    retry vs fallback 기준:
        retry_count < MAX_RETRY(4) → retry
        retry_count >= MAX_RETRY   → fallback
        (retry_count는 Ranker에서 매 실행마다 +1됨)
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
# 헬퍼 함수들
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

    복구 방식:
        state["anchor_item"]에 Style Analyzer가 로드한 앵커 데이터가 있음.
        이를 is_anchor=True로 세팅해서 맨 앞에 삽입.
    """
    if not anchor_item_id or not anchor_item:
        return ranked_items

    existing_ids = {item.get("id") for item in ranked_items}

    if anchor_item_id in existing_ids:
        return ranked_items

    # 앵커가 없음 → 강제 복구
    print(f"[Validator] 앵커 누락 감지 → 강제 복구: item_id={anchor_item_id}")

    recovered_anchor = {
        **anchor_item,
        "is_anchor":   True,
        "similarity":  1.0,
        "source":      "closet",
        "is_external": False,
        "crop_s3_key": None,  # Response 노드에서 DB 재조회
    }

    return [recovered_anchor] + ranked_items


def _evaluate_guardrail(items: list[dict]) -> tuple[bool, str | None]:
    """
    ranked_items가 추천 가능한 조합인지 판단.

    통과 조건:
        DRESS 있으면 → 통과 (원피스 단독 착용 가능)
        DRESS 없으면 → TOP + BOTTOM 둘 다 있어야 통과

    실패 이유 기록:
        retry 시 Retrieval이 어떤 카테고리를 보완해야 하는지 알 수 있음.
        현재는 로그/디버깅용. 추후 Retrieval이 failure_reason을 보고
        부족한 카테고리만 집중 검색하는 로직으로 확장 가능.

    Returns:
        (guardrail_passed, failure_reason)
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