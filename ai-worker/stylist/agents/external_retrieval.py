# ai-worker/stylist/agents/external_retrieval.py
"""
External Retrieval — 네이버 쇼핑 API 검색 + 비동기 이미지 품질 선별

색상 체인 설계:
  카테고리를 순서대로 검색하면서
  이미 선택된 아이템 색상 정보를 다음 쿼리에 반영.
  예: TOP(블랙 자켓) 선택 → BOTTOM 쿼리에 "블랙과 어울리는" 맥락 전달

결과 0개 재시도:
  LLM 쿼리로 결과 없으면 단순 쿼리("남성 상의")로 자동 재시도.
"""

import os
import re
import io
import asyncio
import concurrent.futures
import numpy as np
import httpx
from PIL import Image as PILImage
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState
from stylist.query_strategies.naver import NaverQueryStrategy
from shared.clip_encoder import CLIPEncoder

load_dotenv()

_clip = CLIPEncoder()
_REF_VECTORS: dict[str, np.ndarray] = {}

# 색상 체인 순서 (이 순서로 검색하면서 앞 결과를 뒤에 반영)
CHAIN_ORDER = ["TOP", "BOTTOM", "OUTER"]


def _get_ref_vectors() -> dict[str, np.ndarray]:
    global _REF_VECTORS
    if not _REF_VECTORS:
        print("[ExternalRetrieval] 기준 벡터 초기화...")
        _REF_VECTORS = {
            "hanger":   _clip.encode_free_text("clothes on hanger white background"),
            "flatlay":  _clip.encode_free_text("flat lay clothing top view"),
            "noperson": _clip.encode_free_text("clothing product shot no person"),
        }
        print("[ExternalRetrieval] 기준 벡터 초기화 완료")
    return _REF_VECTORS


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


async def _score_one_image(
    client: httpx.AsyncClient,
    image_url: str,
    ref_vectors: dict[str, np.ndarray],
) -> tuple[str, float]:
    try:
        response = await client.get(image_url, timeout=5.0)
        response.raise_for_status()
        image     = PILImage.open(io.BytesIO(response.content)).convert("RGB")
        image_vec = _clip.encode_image(image)
        score = max(
            _cosine_sim(image_vec, ref_vectors["hanger"]),
            _cosine_sim(image_vec, ref_vectors["flatlay"]),
            _cosine_sim(image_vec, ref_vectors["noperson"]),
        )
        print(f"[ExternalRetrieval] 이미지 점수: {score:.3f}")
        return image_url, score
    except Exception as e:
        print(f"[ExternalRetrieval] 이미지 점수 실패: {e}")
        return image_url, 0.0


async def _score_all_images_async(items: list[dict]) -> list[dict]:
    ref_vectors = _get_ref_vectors()
    async with httpx.AsyncClient() as client:
        tasks = [
            _score_one_image(client, item["imageUrl"], ref_vectors)
            for item in items
            if item.get("imageUrl")
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    url_to_score: dict[str, float] = {}
    for result in results:
        if isinstance(result, tuple):
            url, score = result
            url_to_score[url] = score

    for item in items:
        item["imageScore"] = url_to_score.get(item.get("imageUrl", ""), 0.0)

    return items


def _run_async_in_thread(coro) -> list[dict]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(asyncio.run, coro)
        return future.result()


def _parse_naver_item(raw: dict, category: str) -> dict | None:
    title = re.sub(r"<[^>]+>", "", raw.get("title", "")).strip()
    if not title:
        return None
    return {
        "id":          f"naver_{raw.get('productId', '')}",
        "source":      "naver_shopping",
        "name":        title,
        "brand":       raw.get("brand") or raw.get("mallName", ""),
        "category":    category,
        "subCategory": None,
        "colors":      [],
        "material":    None,
        "fit":         None,
        "style":       None,
        "price":       int(raw.get("lprice", 0)),
        "imageUrl":    raw.get("image", ""),
        "imageScore":  None,
        "purchaseUrl": raw.get("link", ""),
        "crop_s3_key": None,
        "similarity":  0.75,
        "is_anchor":   False,
        "is_external": True,
    }


def _search_naver(
    category: str,
    query: str,
    headers: dict,
    display: int = 3,
) -> list[dict]:
    """
    네이버 API 단일 카테고리 검색.
    결과 0개면 빈 리스트 반환.
    """
    try:
        response = httpx.get(
            "https://openapi.naver.com/v1/search/shop.json",
            headers=headers,
            params={"query": query, "display": display, "sort": "sim"},
            timeout=5.0,
        )
        response.raise_for_status()
        data  = response.json()
        items = []
        for item in data.get("items", []):
            parsed = _parse_naver_item(item, category)
            if parsed:
                items.append(parsed)
        print(f"[ExternalRetrieval] {category}: '{query}' → {len(items)}개")
        return items
    except Exception as e:
        print(f"[ExternalRetrieval] 네이버 검색 실패 ({category}): {e}")
        return []


def search_external(state: OutfitState, params: dict) -> list[dict]:
    """
    네이버 쇼핑 API 검색 + 색상 체인 + 비동기 이미지 품질 점수.

    색상 체인 흐름:
      TOP 검색 → 결과 확정
          ↓ (TOP 색상 정보를 selected_items에 추가)
      BOTTOM 검색 (TOP 색상 참고해서 쿼리 생성)
          ↓
      OUTER 검색 (TOP+BOTTOM 색상 참고)

    결과 0개 재시도:
      LLM 쿼리 → 결과 없으면 → 단순 쿼리("남성 상의")로 재시도
    """
    client_id     = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("[ExternalRetrieval] 네이버 API 키 없음 — fallback")
        return _fallback(state)

    search_queries = state.get("search_queries") or {}
    if not search_queries:
        print("[ExternalRetrieval] search_queries 없음 — fallback")
        return _fallback(state)

    headers = {
        "X-Naver-Client-Id":     client_id,
        "X-Naver-Client-Secret": client_secret,
    }

    gender          = state.get("gender") or "MALE"
    all_items:      list[dict] = []
    selected_items: list[dict] = []  # 색상 체인: 확정된 아이템 누적

    # ── 1단계: 색상 체인으로 카테고리별 검색 ────────────────────────
    # CHAIN_ORDER 순서로 검색하면서 앞 결과를 뒤 쿼리에 반영
    strategy = NaverQueryStrategy()

    for category in CHAIN_ORDER:
        query = search_queries.get(category)
        if not query:
            continue

        # 이미 선택된 아이템이 있으면 색상 체인 쿼리 재생성
        if selected_items:
            query = strategy.build_query(
                category=category,
                intent=state.get("intent") or "casual",
                season=state.get("season") or "spring",
                style_keywords=state.get("style_keywords") or [],
                anchor_item=state.get("anchor_item"),
                user_brand_profile=state.get("user_brand_profile") or {},
                gender=gender,
                selected_items=selected_items,  # ← 앞에서 확정된 아이템 전달
            )
            print(f"[ExternalRetrieval] 색상 체인 쿼리 ({category}): '{query}'")

        # 1차 검색
        items = _search_naver(category, query, headers)

        # 결과 0개면 단순 쿼리로 재시도
        if not items:
            simple_query = strategy.build_simple_query(category, gender)
            print(f"[ExternalRetrieval] {category} 결과 없음 → 단순 쿼리 재시도: '{simple_query}'")
            items = _search_naver(category, simple_query, headers, display=5)

        all_items.extend(items)

        # 이번 카테고리 결과 중 최상위 1개를 색상 체인에 추가
        # (이미지 점수 계산 전이므로 첫 번째 아이템 사용)
        if items:
            selected_items.append(items[0])

    if not all_items:
        return _fallback(state)

    # ── 2단계: 이미지 품질 점수 (비동기 동시 처리) ──────────────────
    print(f"[ExternalRetrieval] 이미지 점수 계산: {len(all_items)}개 동시 처리")
    try:
        all_items = _run_async_in_thread(_score_all_images_async(all_items))
    except Exception as e:
        print(f"[ExternalRetrieval] 이미지 점수 계산 실패, 원본 유지: {e}")

    # ── 3단계: imageScore 높은 순 정렬 ──────────────────────────────
    all_items.sort(key=lambda x: x.get("imageScore") or 0.0, reverse=True)

    print(f"[ExternalRetrieval] 완료: {len(all_items)}개, 색상 체인 + 이미지 점수 반영")
    return all_items


def _fallback(state: OutfitState) -> list[dict]:
    intent = state.get("intent") or "casual"
    return [{
        "id":          "fallback_ext_001",
        "source":      "naver_shopping",
        "name":        f"[Fallback] {intent} 기본 티셔츠",
        "brand":       "",
        "category":    "TOP",
        "subCategory": None,
        "colors":      [],
        "material":    None,
        "fit":         None,
        "style":       None,
        "price":       0,
        "imageUrl":    None,
        "imageScore":  None,
        "purchaseUrl": None,
        "crop_s3_key": None,
        "similarity":  0.5,
        "is_anchor":   False,
        "is_external": True,
    }]