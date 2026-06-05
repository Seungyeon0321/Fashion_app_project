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
"""

import os
import numpy as np
import psycopg2
from typing import Optional
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState
from shared.clip_encoder import CLIPEncoder

load_dotenv()

_clip_encoder = CLIPEncoder()


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def style_analyzer(state: OutfitState) -> dict:
    print(f"[StyleAnalyzer] anchor_item_id: {state.get('anchor_item_id')}", flush=True)
    errors = []

    try:
        # ① 앵커 아이템 로드
        anchor_item = None
        anchor_vector: Optional[np.ndarray] = None

        if state.get("anchor_item_id"):
            anchor_item, anchor_vector = _load_anchor_item(
                anchor_item_id=state["anchor_item_id"],
                user_id=int(state["user_id"]),
            )
            if anchor_item is None:
                errors.append(f"anchor_item_id={state['anchor_item_id']} 로드 실패")
            else:
                print(f"[StyleAnalyzer] 앵커 로드 완료: id={anchor_item['id']}, "
                      f"category={anchor_item['category']}, is_anchor=True", flush=True)

        # ② 스타일 레퍼런스 벡터 계산
        reference_vector: Optional[np.ndarray] = None
        style_keywords: list[str] = []

        if state.get("style_reference_ids"):
            reference_vector, style_keywords = _compute_reference_vector(
                style_reference_ids=state["style_reference_ids"],
                user_id=int(state["user_id"]),
            )

        # ③ 가중 합산
        style_vector, has_style_context = _compute_style_vector(
            anchor_vector=anchor_vector,
            reference_vector=reference_vector,
        )

        return {
            "anchor_item":       anchor_item,
            "style_vector":      style_vector.tolist() if style_vector is not None else None,
            "style_keywords":    style_keywords,
            "has_style_context": has_style_context,
            "errors":            errors,
        }

    except Exception as e:
        print(f"[StyleAnalyzer] 예외 발생: {e}", flush=True)
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
    conn = get_connection()
    cur  = conn.cursor()

    try:
        # ── 메인 쿼리: 기존 쿼리 그대로 유지 (SQL 변경 없음) ──────────────
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

        if row is None:
            return None, None

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
            "is_anchor":   True,   # ← 앵커 식별 플래그
        }

        # ── cropS3Key 별도 조회: 실패해도 앵커 기능에 영향 없음 ────────────
        # 성공하면 response_agent에서 presigned URL 생성에 사용
        # 컬럼명이 다를 경우를 대비해 두 가지 형식 모두 시도
        try:
            cur.execute(
                'SELECT "cropS3Key" FROM closet_items WHERE id = %s',
                (anchor_item_id,)
            )
            crop_row = cur.fetchone()
            if crop_row and crop_row[0]:
                anchor_item["crop_s3_key"] = crop_row[0]
                print(f"[StyleAnalyzer] 앵커 cropS3Key 조회 성공: {crop_row[0]}", flush=True)
        except Exception:
            try:
                # snake_case 컬럼명 fallback
                conn2 = get_connection()
                cur2  = conn2.cursor()
                cur2.execute(
                    'SELECT crop_s3_key FROM closet_items WHERE id = %s',
                    (anchor_item_id,)
                )
                crop_row = cur2.fetchone()
                if crop_row and crop_row[0]:
                    anchor_item["crop_s3_key"] = crop_row[0]
                    print(f"[StyleAnalyzer] 앵커 cropS3Key(snake) 조회 성공: {crop_row[0]}", flush=True)
                cur2.close()
                conn2.close()
            except Exception as e2:
                print(f"[StyleAnalyzer] cropS3Key 조회 실패 (무시): {e2}", flush=True)

        return anchor_item, embedding_vector

    finally:
        cur.close()
        conn.close()


def _compute_reference_vector(
    style_reference_ids: list[int],
    user_id: int,
) -> tuple[Optional[np.ndarray], list[str]]:
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

    custom_rows = [r for r in rows if r[1] == "CUSTOM"]
    preset_rows = [r for r in rows if r[1] == "PRESET"]
    active_rows = custom_rows if custom_rows else preset_rows

    vectors  = []
    keywords = []

    for row in active_rows:
        ref_id         = row[0]
        ref_type       = row[1]
        preset_key     = row[2]
        embedding_text = row[3]

        vec = None

        if embedding_text:
            vec = np.array(
                [float(x) for x in embedding_text.strip("[]").split(",")],
                dtype=np.float32,
            )
        elif ref_type == "PRESET" and preset_key:
            vec = _clip_encoder.encode_text(preset_key)
            _save_preset_embedding(ref_id, vec)
            print(f"[StyleAnalyzer] PRESET '{preset_key}' lazy 임베딩 완료")

        if vec is not None:
            vectors.append(vec)

        if ref_type == "PRESET" and preset_key:
            keywords.append(preset_key)

    if not vectors:
        return None, keywords

    avg_vector = np.mean(vectors, axis=0)
    norm = np.linalg.norm(avg_vector)
    if norm > 0:
        avg_vector = avg_vector / norm

    return avg_vector, keywords


def _save_preset_embedding(reference_id: int, vector: np.ndarray) -> None:
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