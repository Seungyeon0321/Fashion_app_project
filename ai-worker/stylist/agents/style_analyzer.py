# ai-worker/stylist/nodes/style_analyzer.py
"""
Style Analyzer 노드

역할:
  Planner가 파악한 의도/날씨/캘린더 정보를 바탕으로,
  실제 pgvector 검색에 사용할 '기준 벡터'를 계산한다.

파이프라인에서의 위치:
  Planner → [Style Analyzer] → Retrieval → Ranker → Validator → Response

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

DB 접근 방식:
  psycopg2 직접 연결 (기존 retrieval.py 패턴과 통일)
  embedding 필드는 vector 타입이므로 ::text 캐스팅으로 문자열로 읽어옴
"""

import os
import numpy as np
import psycopg2
from typing import Optional
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState
from stylist.clip_encoder import CLIPEncoder

load_dotenv()


# 싱글톤 패턴: 모듈 로드 시 한 번만 인스턴스 생성
# encode_text() 호출 시점에 모델이 lazy load됨
_clip_encoder = CLIPEncoder()


def get_connection():
    """psycopg2 DB 연결. 기존 retrieval.py와 동일한 패턴."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def style_analyzer(state: OutfitState) -> dict:
    """
    Style Analyzer 노드 메인 함수.

    Args:
        state: 현재 OutfitState (Planner가 채운 상태)

    Returns:
        dict: State에 병합될 업데이트 딕셔너리
    """
    errors = []

    try:
        # ──────────────────────────────────────────────────────────────────
        # ① 앵커 아이템 로드
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
        # ──────────────────────────────────────────────────────────────────
        reference_vector: Optional[np.ndarray] = None
        style_keywords: list[str] = []

        if state.get("style_reference_ids"):
            reference_vector, style_keywords = _compute_reference_vector(
                style_reference_ids=state["style_reference_ids"],
                user_id=int(state["user_id"]),
            )

        # ──────────────────────────────────────────────────────────────────
        # ③ 가중 합산
        # ──────────────────────────────────────────────────────────────────
        style_vector, has_style_context = _compute_style_vector(
            anchor_vector=anchor_vector,
            reference_vector=reference_vector,
        )

        # ──────────────────────────────────────────────────────────────────
        # ④ NCP conflict 체크
        # ──────────────────────────────────────────────────────────────────
        conflict_warning = None

        if anchor_item and state.get("excluded_outfits"):
            conflict_warning = _check_ncp_conflict(
                anchor_item_id=state["anchor_item_id"],
                excluded_outfits=state["excluded_outfits"],
            )

        return {
            "anchor_item":       anchor_item,
            "style_vector":      style_vector.tolist() if style_vector is not None else None,
            "style_keywords":    style_keywords,
            "has_style_context": has_style_context,
            "conflict_warning":  conflict_warning,
            "errors":            errors,
        }

    except Exception as e:
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

    embedding::text 캐스팅:
        pgvector의 vector 타입은 psycopg2가 기본적으로 파싱 못함.
        ::text로 캐스팅하면 "[0.1,0.2,...]" 문자열로 받아올 수 있음.
        이후 numpy 배열로 변환.

    보안:
        user_id 검증 포함 → 다른 유저의 아이템 접근 차단

    Returns:
        (anchor_item_dict, embedding_numpy_array) 또는 (None, None)
    """
    conn = get_connection()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                id,
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
            WHERE id = %s
              AND user_id = %s
              AND "isArchived" = false
        """, (anchor_item_id, user_id))

        row = cur.fetchone()

    finally:
        cur.close()
        conn.close()

    if row is None:
        return None, None

    # embedding_text: "[0.1,0.2,...]" 문자열 → numpy 배열
    # psycopg2는 vector 타입을 모르므로 text로 받아서 직접 파싱
    embedding_vector = None
    if row[9]:
        embedding_vector = np.array(
            [float(x) for x in row[9].strip("[]").split(",")],
            dtype=np.float32,
        )

    anchor_item = {
        "id":          row[0],
        "name":        row[1],
        "category":    row[2],
        "subCategory": row[3],
        "colors":      row[4],
        "brand":       row[5],
        "material":    row[6],
        "fit":         row[7],
        "style":       row[8],
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

    Lazy 임베딩:
        PRESET embedding이 null이면 즉석 encode_text() + DB 저장
        다음 요청부터 DB에서 바로 읽음 (첫 요청만 느림)

    ANY(%s) 사용법:
        psycopg2에서 리스트를 IN 조건으로 넘길 때
        WHERE id = ANY(%s) + 파라미터를 tuple로 감싸면 됨
    """
    conn = get_connection()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                id,
                type,
                "presetKey",
                embedding::text AS embedding_text
            FROM "StyleReference"
            WHERE id = ANY(%s)
              AND "userId" = %s
        """, (style_reference_ids, user_id))

        rows = cur.fetchall()

    finally:
        cur.close()
        conn.close()

    if not rows:
        return None, []

    # CUSTOM / PRESET 분리 후 CUSTOM 우선 선택
    # row 인덱스: 0=id, 1=type, 2=presetKey, 3=embedding_text
    custom_rows = [r for r in rows if r[1] == "CUSTOM"]
    preset_rows  = [r for r in rows if r[1] == "PRESET"]
    active_rows  = custom_rows if custom_rows else preset_rows

    vectors  = []
    keywords = []

    for row in active_rows:
        ref_id         = row[0]
        ref_type       = row[1]
        preset_key     = row[2]
        embedding_text = row[3]

        vec = None

        if embedding_text:
            # DB에 embedding 있음 → 파싱해서 바로 사용
            vec = np.array(
                [float(x) for x in embedding_text.strip("[]").split(",")],
                dtype=np.float32,
            )
        elif ref_type == "PRESET" and preset_key:
            # PRESET인데 embedding null → lazy encode + DB 저장
            vec = _clip_encoder.encode_text(preset_key)
            _save_preset_embedding(ref_id, vec)
            print(f"[StyleAnalyzer] PRESET '{preset_key}' lazy 임베딩 완료")

        if vec is not None:
            vectors.append(vec)

        # 키워드: PRESET이면 presetKey를 키워드로 활용
        if ref_type == "PRESET" and preset_key:
            keywords.append(preset_key)

    if not vectors:
        return None, keywords

    # 평균 벡터 계산 후 L2 정규화
    avg_vector = np.mean(vectors, axis=0)
    norm = np.linalg.norm(avg_vector)
    if norm > 0:
        avg_vector = avg_vector / norm

    return avg_vector, keywords


def _save_preset_embedding(reference_id: int, vector: np.ndarray) -> None:
    """
    PRESET의 embedding을 DB에 저장 (lazy 업데이트).

    vector → "[0.1,0.2,...]" 문자열 변환 후 ::vector 캐스팅으로 저장.
    """
    vector_str = "[" + ",".join(str(float(x)) for x in vector) + "]"

    conn = get_connection()
    cur  = conn.cursor()

    try:
        cur.execute("""
            UPDATE "StyleReference"
            SET embedding = %s::vector
            WHERE id = %s
        """, (vector_str, reference_id))
        conn.commit()

    finally:
        cur.close()
        conn.close()


def _compute_style_vector(
    anchor_vector: Optional[np.ndarray],
    reference_vector: Optional[np.ndarray],
) -> tuple[Optional[np.ndarray], bool]:
    """
    앵커 벡터와 레퍼런스 벡터를 가중 합산해서 최종 style_vector 계산.

    앵커 70% + 레퍼런스 30%:
        앵커 = 사용자가 직접 지정한 옷 → 가장 강한 신호
        레퍼런스 = 평소 좋아하는 스타일 → 보조 신호
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

    conflict여도 앵커는 무조건 포함.
    conflict_warning만 반환 → Response 노드에서 메시지 활용.
    """
    for outfit in excluded_outfits:
        if anchor_item_id in outfit.get("item_ids", []):
            return "anchor_ncp_conflict"

    return None
