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
            retrieved_items = search_closet(state, params)
        else:
            # progress_callback: main.py SSE 엔드포인트에서 state에 주입
            # "상의를 고르고 있어요..." 등 진행 상태를 프론트에 실시간 전달
            # closet은 pgvector 단순 조회라 진행 상태 불필요
            progress_callback = state.get("progress_callback")
            retrieved_items   = search_external(
                state, params,
                progress_callback=progress_callback,
            )

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
            "errors":           errors,
        }

    except Exception as e:
        return {
            "retrieved_items":  [],
            "relaxation_level": 0,
            "errors":           [f"retrieval 예외: {str(e)}"],
        }