# ai-worker/stylist/agents/closet_retrieval.py
"""
Closet Retrieval — 내 옷장 검색

역할:
  사용자 옷장(closet_items)에서 pgvector 코사인 유사도로 아이템 검색.

파이프라인에서의 위치:
  retrieval.py 가 source=closet일 때 호출

두 가지 검색 모드:
  has_style_context=True  → style_vector 기반 벡터 유사도 검색
  has_style_context=False → wearCount 기반 인기순 fallback

relaxation_level:
  level 0: 유사도 0.85 이상
  level 1: 유사도 0.70 이상
  level 2: 유사도 0.70 이상 + 카테고리 완화
  level 3: 유사도 없음 → wearCount 기반 fallback

presigned URL:
  crop_s3_key만 저장. URL은 Response 노드에서 생성.
"""

import os
import psycopg2
from typing import Optional
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState
from stylist.agents.retrieval_utils import get_connection, get_target_categories

load_dotenv()

MAX_RETRIEVE = 20


def search_closet(state: OutfitState, params: dict) -> list[dict]:
    """
    옷장에서 pgvector 코사인 유사도 검색.

    pgvector 코사인 거리 연산자 <=>:
        0에 가까울수록 유사 (완전히 같으면 0, 완전히 다르면 2)
        유사도 = 1 - 코사인거리
        threshold=0.85 → 거리 <= 0.15인 것만 검색
    """
    user_id           = int(state["user_id"])
    has_style_context = state.get("has_style_context", False)
    style_vector      = state.get("style_vector")
    threshold         = params["similarity_threshold"]
    relax_category    = params["relax_category"]

    target_categories = get_target_categories(
        intent=state.get("intent"),
        relax=relax_category,
    )

    conn = get_connection()
    cur  = conn.cursor()

    try:
        if has_style_context and style_vector and threshold > 0:
            # ── 벡터 유사도 검색 ──────────────────────────────────────────
            vector_str         = "[" + ",".join(str(float(x)) for x in style_vector) + "]"
            distance_threshold = 1.0 - threshold

            cur.execute("""
                SELECT
                    id,
                    category,
                    "subCategory",
                    colors,
                    brand,
                    material,
                    fit,
                    style,
                    name,
                    crop_s3_key,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM closet_items
                WHERE user_id = %s
                  AND "isArchived" = false
                  AND "isWashing" = false
                  AND category = ANY(%s::"Category"[])
                  AND embedding IS NOT NULL
                  AND (embedding <=> %s::vector) <= %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (
                vector_str,
                user_id,
                target_categories,
                vector_str,
                distance_threshold,
                vector_str,
                MAX_RETRIEVE,
            ))

        else:
            # ── wearCount 기반 fallback ────────────────────────────────────
            # level 3 이거나 style_vector 없을 때
            # 많이 입은 옷 = 유저가 자주 선택한 옷 → 선호도 반영
            cur.execute("""
                SELECT
                    id,
                    category,
                    "subCategory",
                    colors,
                    brand,
                    material,
                    fit,
                    style,
                    name,
                    crop_s3_key,
                    0.5 AS similarity
                FROM closet_items
                WHERE user_id = %s
                  AND "isArchived" = false
                  AND "isWashing" = false
                  AND category = ANY(%s::"Category"[])
                ORDER BY "wearCount" DESC
                LIMIT %s
            """, (user_id, target_categories, MAX_RETRIEVE))

        rows = cur.fetchall()

    finally:
        cur.close()
        conn.close()

    return [_row_to_item(row) for row in rows]


def _row_to_item(row: tuple) -> dict:
    """
    psycopg2 row 튜플을 표준 dict로 변환.

    SELECT 순서:
        0=id, 1=category, 2=subCategory, 3=colors, 4=brand,
        5=material, 6=fit, 7=style, 8=name, 9=crop_s3_key, 10=similarity
    """
    return {
        "id":          row[0],
        "source":      "closet",
        "category":    row[1],
        "subCategory": row[2],
        "colors":      row[3],
        "brand":       row[4],
        "material":    row[5],
        "fit":         row[6],
        "style":       row[7],
        "name":        row[8],
        "crop_s3_key": row[9],
        "imageUrl":    None,   # Response 노드에서 presigned URL 생성
        "imageScore":  None,   # closet은 이미지 점수 불필요
        "similarity":  float(row[10]),
        "is_anchor":   False,
        "is_external": False,
    }