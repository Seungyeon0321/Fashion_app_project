# ai-worker/stylist/nodes/retrieval.py
"""
Retrieval 노드

역할:
  Style Analyzer가 계산한 style_vector를 기반으로
  실제 아이템을 가져온다.

파이프라인에서의 위치:
  Style Analyzer → [Retrieval] → Ranker

두 가지 데이터 소스:
  closet   → 사용자 옷장에서 pgvector 코사인 유사도 검색
  external → 네이버 쇼핑 API (현재 Mock)

4가지 경우의 수:
  source=closet   + anchor O → 앵커 고정 + 옷장 pgvector 검색
  source=closet   + anchor X → 옷장 전체 pgvector 검색
  source=external + anchor O → 앵커(내 옷) 고정 + 네이버 쇼핑 Mock
  source=external + anchor X → 네이버 쇼핑 Mock만

relaxation_level:
  Validator가 결과 부족 판단 시 retry_count를 올리고 Retrieval로 돌아옴.
  retry_count를 보고 검색 조건을 단계적으로 완화함.

  level 0: 유사도 0.85 이상, 카테고리 엄격
  level 1: 유사도 0.70 이상, 카테고리 엄격
  level 2: 유사도 0.70 이상, 카테고리 완화
  level 3: 유사도 없음, 태그/카테고리 기반 fallback

presigned URL:
  보안상 S3 URL을 직접 노출하지 않음.
  presigned URL 생성은 Response 노드에서 최종 아이템 확정 후 처리.
  (Ranker/Validator 과정에서 버려질 아이템 URL을 미리 만들 필요 없음)

DB 접근 방식:
  psycopg2 직접 연결 (기존 retrieval.py 패턴과 통일)
"""

import os
import psycopg2
import numpy as np
from typing import Optional
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState

load_dotenv()


# ──────────────────────────────────────────────────────────────────────────────
# 상수 정의
# ──────────────────────────────────────────────────────────────────────────────

MAX_RETRIEVE = 20

# relaxation_level별 검색 파라미터
RELAXATION_PARAMS = {
    0: {"similarity_threshold": 0.85, "relax_category": False},
    1: {"similarity_threshold": 0.70, "relax_category": False},
    2: {"similarity_threshold": 0.70, "relax_category": True},
    3: {"similarity_threshold": 0.00, "relax_category": True},
}


def get_connection():
    """psycopg2 DB 연결. 기존 retrieval.py와 동일한 패턴."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def retrieval(state: OutfitState) -> dict:
    """
    Retrieval 노드 메인 함수.

    retry_count를 보고 relaxation_level을 결정한 뒤
    source에 따라 closet 또는 external 검색을 수행.
    """
    errors = []

    try:
        # retry_count → relaxation_level 결정
        retry_count      = state.get("retry_count") or 0
        relaxation_level = min(retry_count, max(RELAXATION_PARAMS.keys()))
        params           = RELAXATION_PARAMS[relaxation_level]

        print(f"[Retrieval] retry_count={retry_count}, level={relaxation_level}, "
              f"threshold={params['similarity_threshold']}")

        source = state.get("source") or "closet"

        if source == "closet":
            retrieved_items = _search_closet(state, params)
        else:
            retrieved_items = _search_external_mock(state, params)

        # NCP 필터: 싫어요 조합 아이템 제거 (앵커 예외)
        if state.get("excluded_outfits"):
            retrieved_items = _filter_ncp(
                items=retrieved_items,
                excluded_outfits=state["excluded_outfits"],
                anchor_item_id=state.get("anchor_item_id"),
            )

        # 앵커 강제 포함: 유사도 임계값 때문에 검색 결과에서 빠질 수 있으므로
        if state.get("anchor_item") and state.get("anchor_item_id"):
            retrieved_items = _ensure_anchor_included(
                items=retrieved_items,
                anchor_item=state["anchor_item"],
                anchor_item_id=state["anchor_item_id"],
            )

        print(f"[Retrieval] 검색 완료: {len(retrieved_items)}개")

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


# ──────────────────────────────────────────────────────────────────────────────
# closet 검색 (pgvector)
# ──────────────────────────────────────────────────────────────────────────────

def _search_closet(state: OutfitState, params: dict) -> list[dict]:
    """
    사용자 옷장에서 pgvector 코사인 유사도 검색.

    has_style_context = True  → style_vector 기반 유사도 검색
    has_style_context = False → 카테고리/wearCount 기반 fallback

    pgvector 코사인 거리 연산자 <=>:
        0에 가까울수록 유사 (완전히 같으면 0, 완전히 다르면 2)
        유사도 = 1 - 코사인거리
        threshold=0.85 → 거리 <= 0.15인 것만 검색

    presigned URL 미생성:
        crop_s3_key만 저장하고 URL은 Response 노드에서 생성.
    """
    user_id           = int(state["user_id"])
    has_style_context = state.get("has_style_context", False)
    style_vector      = state.get("style_vector")
    threshold         = params["similarity_threshold"]
    relax_category    = params["relax_category"]

    target_categories = _get_target_categories(
        intent=state.get("intent"),
        relax=relax_category,
    )

    conn = get_connection()
    cur  = conn.cursor()

    try:
        if has_style_context and style_vector and threshold > 0:
            # ── 벡터 유사도 검색 ──────────────────────────────────────────
            # style_vector → "[0.1,0.2,...]" 문자열 변환
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
                  AND category = ANY(%s)
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
            # ── 카테고리 기반 fallback (level 3 또는 has_style_context=False) ──
            # 벡터 없이 카테고리 + 최근 착용 순으로 검색
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
                  AND category = ANY(%s)
                ORDER BY "wearCount" DESC
                LIMIT %s
            """, (user_id, target_categories, MAX_RETRIEVE))

        rows = cur.fetchall()

    finally:
        cur.close()
        conn.close()

    return [_row_to_closet_item(row) for row in rows]


# ──────────────────────────────────────────────────────────────────────────────
# external 검색 (네이버 쇼핑 API Mock)
# ──────────────────────────────────────────────────────────────────────────────

def _search_external_mock(state: OutfitState, params: dict) -> list[dict]:
    """
    네이버 쇼핑 API Mock.

    실제 API 연동 시 이 함수 내부만 교체하면 됨.
    반환 구조는 closet 아이템과 동일하게 맞춰둠.

    실제 API 연동 시 교체 포인트:
        1. 네이버 쇼핑 검색 쿼리 = style_keywords + intent + 카테고리
        2. API 응답 파싱 후 동일한 dict 구조로 변환
        3. crop_s3_key 대신 imageUrl 직접 사용 (외부 URL)
    """
    style_keywords = state.get("style_keywords") or []
    intent         = state.get("intent") or "casual"

    mock_items = [
        {
            "id":           "mock_ext_001",
            "source":       "naver_shopping",
            "name":         f"[Mock] {intent} 미니멀 화이트 티셔츠",
            "brand":        "Mock Brand A",
            "category":     "TOP",
            "subCategory":  "T_SHIRT_SHORT",
            "colors":       ["white"],
            "material":     "cotton",
            "fit":          "REGULAR",
            "style":        None,
            "price":        29000,
            "imageUrl":     "https://mock.example.com/image1.jpg",   # 외부 아이템은 imageUrl 직접 사용
            "purchaseUrl":  "https://mock.example.com/purchase1",
            "crop_s3_key":  None,                                     # 외부 아이템은 S3 없음
            "styleKeywords": style_keywords or ["casual", "minimal"],
            "similarity":   0.80,
            "is_anchor":    False,
            "is_external":  True,
        },
        {
            "id":           "mock_ext_002",
            "source":       "naver_shopping",
            "name":         f"[Mock] {intent} 슬림 블랙 슬랙스",
            "brand":        "Mock Brand B",
            "category":     "BOTTOM",
            "subCategory":  "SLACKS",
            "colors":       ["black"],
            "material":     "polyester",
            "fit":          "SLIM",
            "style":        None,
            "price":        49000,
            "imageUrl":     "https://mock.example.com/image2.jpg",
            "purchaseUrl":  "https://mock.example.com/purchase2",
            "crop_s3_key":  None,
            "styleKeywords": style_keywords or ["casual", "minimal"],
            "similarity":   0.78,
            "is_anchor":    False,
            "is_external":  True,
        },
        {
            "id":           "mock_ext_003",
            "source":       "naver_shopping",
            "name":         f"[Mock] {intent} 오버핏 베이지 코트",
            "brand":        "Mock Brand C",
            "category":     "OUTER",
            "subCategory":  "COAT",
            "colors":       ["beige"],
            "material":     "wool",
            "fit":          "OVERSIZED",
            "style":        None,
            "price":        129000,
            "imageUrl":     "https://mock.example.com/image3.jpg",
            "purchaseUrl":  "https://mock.example.com/purchase3",
            "crop_s3_key":  None,
            "styleKeywords": style_keywords or ["minimal", "quiet_luxury"],
            "similarity":   0.75,
            "is_anchor":    False,
            "is_external":  True,
        },
    ]

    print(f"[Retrieval] Mock external 검색: {len(mock_items)}개 반환")
    return mock_items


# ──────────────────────────────────────────────────────────────────────────────
# NCP 필터
# ──────────────────────────────────────────────────────────────────────────────

def _filter_ncp(
    items: list[dict],
    excluded_outfits: list[dict],
    anchor_item_id: Optional[int],
) -> list[dict]:
    """
    NCP(싫어요 조합)에 등장하는 아이템을 검색 결과에서 제거.

    조합 단위 필터:
        "이 아이템이 싫어요"가 아니라 "이 조합이 싫어요"이므로
        excluded_outfits에 등장하는 아이템 ID를 개별 제거하는 방식.
        (Ranker에서 최종 조합 구성 시 조합 단위 필터 추가 적용)

    앵커 예외:
        앵커는 NCP에 있어도 제거하지 않음.
        conflict_warning은 Style Analyzer에서 이미 세팅됨.
    """
    excluded_ids: set[int] = set()
    for outfit in excluded_outfits:
        for item_id in outfit.get("item_ids", []):
            excluded_ids.add(item_id)

    if anchor_item_id:
        excluded_ids.discard(anchor_item_id)

    filtered = []
    for item in items:
        item_id = item.get("id")
        if isinstance(item_id, int) and item_id in excluded_ids:
            print(f"[Retrieval] NCP 필터: item_id={item_id} 제거")
            continue
        filtered.append(item)

    return filtered


# ──────────────────────────────────────────────────────────────────────────────
# 앵커 강제 포함
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_anchor_included(
    items: list[dict],
    anchor_item: dict,
    anchor_item_id: int,
) -> list[dict]:
    """
    앵커 아이템이 검색 결과에 포함돼 있는지 확인하고, 없으면 맨 앞에 삽입.

    왜 필요한가?
        유사도 임계값 때문에 앵커가 검색 결과에서 빠질 수 있음.
        앵커는 사용자가 직접 지정한 아이템이므로 무조건 포함.
        Ranker에서 is_anchor=True인 아이템을 최우선으로 처리.
    """
    existing_ids = {item.get("id") for item in items}

    if anchor_item_id in existing_ids:
        # 이미 있으면 is_anchor 플래그만 True로 세팅
        for item in items:
            if item.get("id") == anchor_item_id:
                item["is_anchor"] = True
        return items

    # 없으면 맨 앞에 삽입
    anchor_entry = {
        **anchor_item,
        "source":      "closet",
        "crop_s3_key": None,      # Response 노드에서 DB 재조회로 처리
        "is_anchor":   True,
        "similarity":  1.0,       # 앵커는 유사도 1.0으로 고정
        "is_external": False,
    }

    print(f"[Retrieval] 앵커 강제 삽입: item_id={anchor_item_id}")
    return [anchor_entry] + items


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들
# ──────────────────────────────────────────────────────────────────────────────

def _get_target_categories(
    intent: Optional[str],
    relax: bool,
) -> list[str]:
    """
    검색할 카테고리 목록 결정.
    MVP: TOP, BOTTOM, OUTER 기본 검색.
    relax=True: DRESS 추가.
    """
    categories = ["TOP", "BOTTOM", "OUTER", "SHOES", "BAG", "ACC"]
    if relax:
        categories.append("DRESS")
    return categories


def _row_to_closet_item(row: tuple) -> dict:
    """
    psycopg2 row 튜플을 Retrieval 표준 dict로 변환.

    SELECT 순서:
        0=id, 1=category, 2=subCategory, 3=colors, 4=brand,
        5=material, 6=fit, 7=style, 8=name, 9=crop_s3_key, 10=similarity

    crop_s3_key 보존:
        presigned URL은 Response 노드에서 생성.
        여기서는 S3 키만 저장해둠.
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
        "crop_s3_key": row[9],    # presigned URL은 Response 노드에서 생성
        "similarity":  float(row[10]),
        "is_anchor":   False,     # _ensure_anchor_included()에서 True로 업데이트
        "is_external": False,
    }
