# ai-worker/stylist/nodes/style_analyzer.py
"""
Style Analyzer 노드

역할:
  Planner가 파악한 의도/날씨/캘린더 정보를 바탕으로,
  실제 pgvector 검색에 사용할 '기준 벡터'를 계산한다.

파이프라인에서의 위치:
  Planner → [Style Analyzer] → Retrieval → Ranker → Validator → Response

왜 별도 노드인가?
  Planner  = "무엇을 추천할지" 결정 (의도, 날씨, 캘린더)
  Retrieval = "실제 아이템 가져오기" (pgvector 검색)
  이 둘 사이에 "어떤 벡터로 검색할지"를 계산하는 단계가 필요함.
  → Style Analyzer가 그 역할을 담당.

처리 순서:
  ① 앵커 아이템 로드 (anchor_item_id가 있으면 DB 조회)
  ② 스타일 레퍼런스 벡터 계산 (style_reference_ids가 있으면)
     - CUSTOM 레퍼런스 우선 사용
     - CUSTOM 없으면 PRESET 사용
     - PRESET embedding이 null이면 즉석 encode_text() + DB 저장 (lazy)
  ③ 가중 합산으로 최종 style_vector 계산
     - 앵커 O + 레퍼런스 O → 앵커 70% + 레퍼런스 30%
     - 앵커 O + 레퍼런스 X → 앵커 100%
     - 앵커 X + 레퍼런스 O → 레퍼런스 100%
     - 앵커 X + 레퍼런스 X → has_style_context = False (태그 fallback)
  ④ NCP conflict 체크
     - 앵커 아이템이 excluded_outfits(싫어요 조합)에 포함돼 있으면
       conflict_warning 세팅 (앵커는 무조건 포함하되 경고만)
  ⑤ style_keywords 추출 (Retrieval/Response 노드에서 텍스트 힌트로 활용)

DB 접근 방식:
  SQLAlchemy 동기 세션 사용 (ai-worker/app/db/database.py 기존 패턴 따름)
  embedding 필드는 Prisma Unsupported("vector(512)") 타입이므로
  raw SQL로 조회/저장
"""

import numpy as np
from typing import Optional
from sqlalchemy import text

from stylist.outfit_state import OutfitState
from app.db.database import get_db
from stylist.clip_encoder import CLIPEncoder


# 싱글톤 패턴: 모듈 로드 시 한 번만 인스턴스 생성
# encode_text() 호출 시점에 모델이 lazy load됨
_clip_encoder = CLIPEncoder()


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# LangGraph는 노드 함수가 State를 받아서 업데이트할 딕셔너리를 반환하는 구조
# ──────────────────────────────────────────────────────────────────────────────

def style_analyzer(state: OutfitState) -> dict:
    """
    Style Analyzer 노드 메인 함수.

    동기 함수로 구현한 이유:
        ai-worker의 DB 세션이 SQLAlchemy 동기 방식이므로
        async def로 만들면 이벤트 루프 충돌 가능성이 있음.
        LangGraph는 동기/비동기 노드 모두 지원함.

    Args:
        state: 현재 OutfitState (Planner가 채운 상태)

    Returns:
        dict: State에 병합될 업데이트 딕셔너리
              LangGraph가 자동으로 기존 State와 합쳐줌
    """

    errors = []

    try:
        # ──────────────────────────────────────────────────────────────────
        # ① 앵커 아이템 로드
        #
        # 앵커 = 사용자가 "이 옷 기반으로 추천해줘"라고 지정한 특정 옷
        # anchor_item_id가 있으면 DB에서 실제 아이템 데이터를 가져옴
        # ──────────────────────────────────────────────────────────────────
        anchor_item = None
        anchor_vector: Optional[np.ndarray] = None

        if state.get("anchor_item_id"):
            anchor_item, anchor_vector = _load_anchor_item(
                anchor_item_id=state["anchor_item_id"],
                user_id=int(state["user_id"]),
            )
            if anchor_item is None:
                errors.append(f"anchor_item_id={state['anchor_item_id']} 로드 실패")

        # ──────────────────────────────────────────────────────────────────
        # ② 스타일 레퍼런스 벡터 계산
        #
        # style_reference_ids = 사용자가 저장한 스타일 레퍼런스 ID 목록
        # CUSTOM(직접 올린 사진) 우선 → 없으면 PRESET(앱 제공 스타일 카드)
        # 여러 개면 평균 벡터 → "자주 저장한 스타일로 자연 수렴"
        # ──────────────────────────────────────────────────────────────────
        reference_vector: Optional[np.ndarray] = None
        style_keywords: list[str] = []

        if state.get("style_reference_ids"):
            reference_vector, style_keywords = _compute_reference_vector(
                style_reference_ids=state["style_reference_ids"],
                user_id=int(state["user_id"]),
            )

        # ──────────────────────────────────────────────────────────────────
        # ③ 가중 합산으로 최종 style_vector 계산
        #
        # 4가지 경우의 수:
        #   앵커 O + 레퍼런스 O → 앵커 70% + 레퍼런스 30%
        #   앵커 O + 레퍼런스 X → 앵커 100%
        #   앵커 X + 레퍼런스 O → 레퍼런스 100%
        #   앵커 X + 레퍼런스 X → has_style_context = False
        # ──────────────────────────────────────────────────────────────────
        style_vector, has_style_context = _compute_style_vector(
            anchor_vector=anchor_vector,
            reference_vector=reference_vector,
        )

        # ──────────────────────────────────────────────────────────────────
        # ④ NCP conflict 체크
        #
        # NCP = Negative Combo Preference (싫어요 조합)
        # 앵커 아이템이 사용자가 "싫어요"한 조합에 포함돼 있으면 conflict
        #
        # 왜 여기서 체크하는가?
        #   Planner 단계에선 anchor_item_id 숫자만 알고 실제 아이템 데이터가 없음.
        #   Style Analyzer에서 anchor_item을 DB에서 처음 로드하므로
        #   여기서 체크하는 게 구조적으로 맞음.
        #
        # conflict여도 앵커는 무조건 포함 (사용자가 지정했으니까)
        # conflict_warning만 세팅 → Response 노드에서 메시지 활용
        # ──────────────────────────────────────────────────────────────────
        conflict_warning = None

        if anchor_item and state.get("excluded_outfits"):
            conflict_warning = _check_ncp_conflict(
                anchor_item_id=state["anchor_item_id"],
                excluded_outfits=state["excluded_outfits"],
            )

        # ──────────────────────────────────────────────────────────────────
        # ⑤ State 업데이트 반환
        #
        # LangGraph 규칙: 노드 함수는 변경할 필드만 딕셔너리로 반환
        # 반환하지 않은 필드는 기존 State 값 유지
        # ──────────────────────────────────────────────────────────────────
        return {
            "anchor_item":       anchor_item,
            "style_vector":      style_vector.tolist() if style_vector is not None else None,
            "style_keywords":    style_keywords,
            "has_style_context": has_style_context,
            "conflict_warning":  conflict_warning,
            "errors":            errors,  # Annotated[List, add] → 기존 errors에 append됨
        }

    except Exception as e:
        # 노드 자체가 크래시나면 파이프라인 전체가 멈추므로
        # 예외는 잡아서 errors에 기록하고 fallback 상태로 계속 진행
        return {
            "has_style_context": False,
            "errors":            [f"style_analyzer 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들
# ──────────────────────────────────────────────────────────────────────────────

def _load_anchor_item(
    anchor_item_id: int,
    user_id: int,
) -> tuple[Optional[dict], Optional[np.ndarray]]:
    """
    앵커 아이템을 DB에서 로드하고 embedding 벡터를 반환.

    왜 raw SQL인가?
        Prisma 스키마에서 embedding이 Unsupported("vector(512)")로 정의됨.
        SQLAlchemy ORM으로는 이 타입을 직접 읽을 수 없어서 raw SQL 사용.
        embedding을 text로 캐스팅해서 "[0.1,0.2,...]" 문자열로 받아옴.

    보안:
        user_id 검증 포함 → 다른 유저의 아이템 접근 차단

    Returns:
        (anchor_item_dict, embedding_numpy_array) 또는 (None, None)
    """
    with get_db() as db:
        row = db.execute(
            text("""
                SELECT
                    id,
                    "userId",
                    name,
                    category,
                    "subCategory",
                    colors,
                    brand,
                    material,
                    fit,
                    style,
                    embedding::text AS embedding_text
                FROM closet_items
                WHERE id = :item_id
                  AND "userId" = :user_id
                  AND "isArchived" = false
            """),
            {"item_id": anchor_item_id, "user_id": user_id},
        ).fetchone()

    if row is None:
        return None, None

    # embedding_text: "[0.1,0.2,...]" 형태 문자열 → numpy 배열
    embedding_vector = None
    if row.embedding_text:
        embedding_vector = np.array(
            [float(x) for x in row.embedding_text.strip("[]").split(",")],
            dtype=np.float32,
        )

    anchor_item = {
        "id":          row.id,
        "name":        row.name,
        "category":    row.category,
        "subCategory": row.subCategory,
        "colors":      row.colors,
        "brand":       row.brand,
        "material":    row.material,
        "fit":         row.fit,
        "style":       row.style,
    }

    return anchor_item, embedding_vector


def _compute_reference_vector(
    style_reference_ids: list[int],
    user_id: int,
) -> tuple[Optional[np.ndarray], list[str]]:
    """
    스타일 레퍼런스 목록에서 대표 벡터와 키워드를 계산.

    CUSTOM 우선 정책:
        CUSTOM이 하나라도 있으면 CUSTOM만 사용
        CUSTOM이 없으면 PRESET 사용
        이유: 사용자가 직접 올린 사진이 앱 제공 카드보다 더 정확한 신호

    Lazy 임베딩:
        PRESET의 embedding이 null이면 즉석 encode_text() 후 DB에 저장
        다음 요청부터는 DB에서 바로 읽음 (첫 요청만 느림)

    Returns:
        (평균_벡터, 키워드_리스트)
    """
    with get_db() as db:
        rows = db.execute(
            text("""
                SELECT
                    id,
                    type,
                    "presetKey",
                    embedding::text AS embedding_text
                FROM "StyleReference"
                WHERE id = ANY(:ids)
                  AND "userId" = :user_id
            """),
            {"ids": style_reference_ids, "user_id": user_id},
        ).fetchall()

    if not rows:
        return None, []

    # CUSTOM / PRESET 분리 후 CUSTOM 우선 선택
    custom_rows = [r for r in rows if r.type == "CUSTOM"]
    preset_rows  = [r for r in rows if r.type == "PRESET"]
    active_rows  = custom_rows if custom_rows else preset_rows

    vectors  = []
    keywords = []

    for row in active_rows:
        vec = None

        if row.embedding_text:
            # DB에 embedding 있음 → 파싱해서 바로 사용
            vec = np.array(
                [float(x) for x in row.embedding_text.strip("[]").split(",")],
                dtype=np.float32,
            )
        elif row.type == "PRESET" and row.presetKey:
            # PRESET인데 embedding null → lazy encode + DB 저장
            vec = _clip_encoder.encode_text(row.presetKey)
            _save_preset_embedding(row.id, vec)
            print(f"[StyleAnalyzer] PRESET '{row.presetKey}' lazy 임베딩 완료")

        if vec is not None:
            vectors.append(vec)

        # 키워드: PRESET이면 presetKey를 키워드로 활용
        # Retrieval 노드에서 태그 기반 검색 보조로 사용
        if row.type == "PRESET" and row.presetKey:
            keywords.append(row.presetKey)

    if not vectors:
        return None, keywords

    # 평균 벡터 계산 후 L2 정규화
    # 왜 다시 정규화?
    #   encode()와 encode_text()가 이미 정규화된 벡터를 반환하지만
    #   평균을 내면 벡터 크기(norm)가 1보다 작아지므로 다시 정규화 필요
    avg_vector = np.mean(vectors, axis=0)
    norm = np.linalg.norm(avg_vector)
    if norm > 0:
        avg_vector = avg_vector / norm

    return avg_vector, keywords


def _save_preset_embedding(reference_id: int, vector: np.ndarray) -> None:
    """
    PRESET의 embedding을 DB에 저장 (lazy 업데이트).

    vector → "[0.1,0.2,...]" 문자열 변환 후 PostgreSQL vector 타입으로 캐스팅.
    다음 요청부터 이 embedding을 DB에서 바로 읽어서 encode_text() 호출 불필요.
    """
    vector_str = "[" + ",".join(str(float(x)) for x in vector) + "]"

    with get_db() as db:
        db.execute(
            text("""
                UPDATE "StyleReference"
                SET embedding = :vec::vector
                WHERE id = :ref_id
            """),
            {"vec": vector_str, "ref_id": reference_id},
        )
        db.commit()


def _compute_style_vector(
    anchor_vector: Optional[np.ndarray],
    reference_vector: Optional[np.ndarray],
) -> tuple[Optional[np.ndarray], bool]:
    """
    앵커 벡터와 레퍼런스 벡터를 가중 합산해서 최종 style_vector 계산.

    가중치 설계 이유:
        앵커 70%: 사용자가 직접 지정한 옷 → 가장 강한 신호
        레퍼런스 30%: 평소 좋아하는 스타일 → 보조 신호
        앵커만 있으면 100%: 레퍼런스 없어도 벡터 검색 가능
        둘 다 없으면 has_style_context = False → Retrieval이 태그 기반 fallback

    Returns:
        (style_vector, has_style_context)
    """
    has_anchor    = anchor_vector is not None
    has_reference = reference_vector is not None

    if has_anchor and has_reference:
        combined = anchor_vector * 0.7 + reference_vector * 0.3
    elif has_anchor:
        combined = anchor_vector
    elif has_reference:
        combined = reference_vector
    else:
        return None, False

    # 최종 L2 정규화
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm

    return combined, True


def _check_ncp_conflict(
    anchor_item_id: int,
    excluded_outfits: list[dict],
) -> Optional[str]:
    """
    앵커 아이템이 NCP(싫어요 조합)에 포함돼 있는지 확인.

    NCP는 조합 단위:
        excluded_outfits = [
            {"item_ids": [1, 2, 3], "intent": "formal"},
            {"item_ids": [4, 5],    "intent": "casual"},
        ]
        앵커 ID가 어떤 조합에든 포함돼 있으면 conflict.

    conflict여도 앵커는 무조건 포함 (사용자가 지정했으니까)
    conflict_warning만 반환 → Response 노드에서 메시지 활용

    Returns:
        "anchor_ncp_conflict" 또는 None
    """
    for outfit in excluded_outfits:
        if anchor_item_id in outfit.get("item_ids", []):
            return "anchor_ncp_conflict"

    return None