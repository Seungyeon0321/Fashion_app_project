# ai-worker/stylist/agents/retrieval.py
"""
Retrieval 노드 — 라우터

역할:
  source에 따라 closet_retrieval 또는 external_retrieval로 라우팅.
  NCP 필터, 앵커 강제 포함 등 공통 후처리 담당.

파이프라인에서의 위치:
  Query Builder → [Retrieval] → Ranker

분리된 파일:
  closet_retrieval.py   ← 옷장 pgvector 검색
  external_retrieval.py ← 네이버 API + 비동기 이미지 점수
  retrieval_utils.py    ← NCP 필터, 앵커 처리 공통 함수

relaxation_level:
  Validator가 결과 부족 판단 시 retry_count 증가 → Retrieval 재호출.
  level 0: 유사도 0.85 이상, 카테고리 엄격
  level 1: 유사도 0.70 이상, 카테고리 엄격
  level 2: 유사도 0.70 이상, 카테고리 완화
  level 3: 유사도 없음, wearCount 기반 fallback

Step 38 변경:
  반환 dict에 outfit_proposals 추가.
  search_external이 proposals를 in-place로 수정하므로,
  수정된 proposals를 state에 다시 반영해야 Ranker/ResponseAgent가 참조 가능.
"""

from dotenv import load_dotenv
from stylist.outfit_state import OutfitState
from stylist.agents.closet_retrieval   import search_closet
from stylist.agents.external_retrieval import search_external
from stylist.agents.retrieval_utils    import filter_ncp, ensure_anchor_included

load_dotenv()

RELAXATION_PARAMS = {
    0: {"similarity_threshold": 0.85, "relax_category": False},
    1: {"similarity_threshold": 0.70, "relax_category": False},
    2: {"similarity_threshold": 0.70, "relax_category": True},
    3: {"similarity_threshold": 0.00, "relax_category": True},
}


def retrieval(state: OutfitState) -> dict:
    errors = []

    try:
        retry_count      = state.get("retry_count") or 0
        relaxation_level = min(retry_count, max(RELAXATION_PARAMS.keys()))
        params           = RELAXATION_PARAMS[relaxation_level]

        print(f"[Retrieval] retry={retry_count}, level={relaxation_level}, "
              f"threshold={params['similarity_threshold']}")

        source = state.get("source") or "closet"

        # ── 소스별 검색 ──────────────────────────────────────────────
        if source == "closet":
            retrieved_items  = search_closet(state, params)
            # closet은 outfit_proposals 없음 → 기존 값 유지
            outfit_proposals = state.get("outfit_proposals")
        else:
            # progress_callback: main.py SSE 엔드포인트에서 state에 주입
            progress_callback = state.get("progress_callback")

            # ── Step 38 핵심 수정 ─────────────────────────────────────
            # search_external은 proposals를 in-place로 수정(resolved_item 채움)
            # + 평면 list(retrieved_items)를 반환함.
            # 수정된 proposals를 반환 dict에 포함해야
            # Ranker / ResponseAgent가 mood별로 접근할 수 있음.
            # 포함하지 않으면 LangGraph가 이전 state 값을 유지 →
            # retry 시 빈 리스트로 덮어써지는 버그 발생.
            retrieved_items = search_external(
                state, params,
                progress_callback=progress_callback,
            )
            # search_external 호출 후 state["outfit_proposals"]는
            # in-place 수정이 완료된 상태이므로 그대로 꺼내서 반환
            outfit_proposals = state.get("outfit_proposals")

        # ── NCP 필터 ─────────────────────────────────────────────────
        if state.get("excluded_outfits"):
            retrieved_items = filter_ncp(
                items=retrieved_items,
                excluded_outfits=state["excluded_outfits"],
                anchor_item_id=state.get("anchor_item_id"),
            )

        # ── 앵커 강제 포함 ───────────────────────────────────────────
        if state.get("anchor_item") and state.get("anchor_item_id"):
            retrieved_items = ensure_anchor_included(
                items=retrieved_items,
                anchor_item=state["anchor_item"],
                anchor_item_id=state["anchor_item_id"],
            )

        print(f"[Retrieval] 완료: {len(retrieved_items)}개")

        return {
            "retrieved_items":  retrieved_items,
            "relaxation_level": relaxation_level,
            # ── Step 38 추가 ──────────────────────────────────────────
            # search_external이 in-place로 채운 proposals를 state에 반영.
            # closet 흐름에선 기존 값(None or list) 그대로 유지.
            "outfit_proposals": outfit_proposals,
            "errors":           errors,
        }

    except Exception as e:
        import traceback
        print(f"[Retrieval] 예외 발생!")
        traceback.print_exc()    # ← 추가: 전체 스택트레이스 출력
        return {
            "retrieved_items":  [],
            "relaxation_level": 0,
            "outfit_proposals": state.get("outfit_proposals"),
            "errors":           [f"retrieval 예외: {str(e)}"],
        }