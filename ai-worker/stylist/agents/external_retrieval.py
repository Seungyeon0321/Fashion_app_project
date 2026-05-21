# ai-worker/stylist/agents/external_retrieval.py
"""
External Retrieval — 네이버 쇼핑 API 검색 + 비동기 이미지 품질 선별

역할:
  1. 네이버 쇼핑 API로 카테고리별 아이템 검색
  2. 검색 결과 이미지를 CLIP으로 비동기 동시 분석
  3. 옷걸이샷/플랫레이에 가까운 이미지 순으로 정렬

파이프라인에서의 위치:
  retrieval.py 가 source=external일 때 호출

이미지 선별 원리:
  CLIP은 이미지와 텍스트를 같은 벡터 공간에 임베딩.
  "clothes on hanger white background" 텍스트 벡터와
  실제 상품 이미지 벡터의 코사인 유사도를 비교.
  유사도 높을수록 옷걸이샷/상품컷에 가까운 이미지.

비동기 처리:
  asyncio.gather()로 9개 이미지 동시 다운로드 + CLIP 점수 계산.
  순차 처리(18초) → 동시 처리(2~3초)로 단축.

FastAPI 이벤트 루프 충돌 방지:
  FastAPI는 이미 async 이벤트 루프가 돌고 있음.
  asyncio.run()을 그냥 쓰면 "이미 루프 실행 중" 에러 발생.
  ThreadPoolExecutor로 별도 스레드에서 asyncio.run() 실행.
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
from shared.clip_encoder import CLIPEncoder

load_dotenv()

# ── 싱글톤 CLIP 인코더 ────────────────────────────────────────────────
# 매 요청마다 모델 로드하면 느림 → 모듈 로드 시 1번만 생성
_clip = CLIPEncoder()

# ── 기준 벡터 캐시 ───────────────────────────────────────────────────
# "clothes on hanger" 는 항상 같은 벡터
# 앱 시작 후 첫 요청 때 계산하고 이후 재사용
_REF_VECTORS: dict[str, np.ndarray] = {}


def _get_ref_vectors() -> dict[str, np.ndarray]:
    """
    이미지 선별용 기준 텍스트 벡터 캐싱.
    최초 1회만 CLIP encode_text() 호출, 이후 dict에서 꺼냄.
    """
    global _REF_VECTORS
    if not _REF_VECTORS:
        print("[ExternalRetrieval] 기준 벡터 초기화...")
        _REF_VECTORS = {
            "hanger":   _clip.encode_text("clothes on hanger white background"),
            "flatlay":  _clip.encode_text("flat lay clothing top view"),
            "noperson": _clip.encode_text("clothing product shot no person"),
        }
        print("[ExternalRetrieval] 기준 벡터 초기화 완료")
    return _REF_VECTORS


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """코사인 유사도 계산."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ── 비동기 이미지 점수 계산 ───────────────────────────────────────────

async def _score_one_image(
    client: httpx.AsyncClient,
    image_url: str,
    ref_vectors: dict[str, np.ndarray],
) -> tuple[str, float]:
    """
    이미지 1개를 비동기로 다운로드 + CLIP 점수 계산.

    Returns:
        (image_url, score) — score 높을수록 상품컷에 가까움
    """
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
    """
    전체 아이템 이미지를 asyncio.gather()로 동시 처리.

    asyncio.gather():
      여러 코루틴을 한꺼번에 시작 → 전부 완료될 때까지 대기.
      순차 처리 대비 N배 빠름 (N = 이미지 개수).
    """
    ref_vectors = _get_ref_vectors()

    async with httpx.AsyncClient() as client:
        tasks = [
            _score_one_image(client, item["imageUrl"], ref_vectors)
            for item in items
            if item.get("imageUrl")
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # 결과를 url → score 매핑으로 변환
    url_to_score: dict[str, float] = {}
    for result in results:
        if isinstance(result, tuple):
            url, score = result
            url_to_score[url] = score

    # 아이템에 점수 반영
    for item in items:
        item["imageScore"] = url_to_score.get(item.get("imageUrl", ""), 0.0)

    return items


def _run_async_in_thread(coro) -> list[dict]:
    """
    FastAPI 이벤트 루프 충돌 방지.

    FastAPI는 이미 async 이벤트 루프가 실행 중.
    asyncio.run()을 직접 호출하면 RuntimeError 발생.
    → ThreadPoolExecutor로 별도 스레드에서 asyncio.run() 실행.

    왜 별도 스레드인가?
        스레드는 각자 독립적인 이벤트 루프를 가짐.
        새 스레드에서 asyncio.run() 하면 충돌 없음.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(asyncio.run, coro)
        return future.result()


# ── 네이버 아이템 파싱 ────────────────────────────────────────────────

def _parse_naver_item(raw: dict, category: str) -> dict | None:
    """
    네이버 쇼핑 API 응답을 내부 표준 dict로 변환.

    네이버 응답 주요 필드:
        title:     상품명 (HTML <b> 태그 포함 → 제거 필요)
        brand:     브랜드명
        image:     상품 이미지 URL (썸네일)
        link:      상품 상세 페이지 URL
        lprice:    최저가
        mallName:  쇼핑몰명
        productId: 상품 고유 ID
    """
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
        "imageScore":  None,     # 비동기 점수 계산 후 채워짐
        "purchaseUrl": raw.get("link", ""),
        "crop_s3_key": None,
        "similarity":  0.75,     # 네이버 API 유사도 없음 → 고정값, Ranker에서 imageScore로 보완
        "is_anchor":   False,
        "is_external": True,
    }


# ── 메인 함수 ─────────────────────────────────────────────────────────

def search_external(state: OutfitState, params: dict) -> list[dict]:
    """
    네이버 쇼핑 API 검색 + 비동기 이미지 품질 점수 계산.

    처리 순서:
      1. 네이버 API 카테고리별 호출 (동기)
      2. 전체 이미지 CLIP 점수 계산 (비동기 동시 처리)
      3. imageScore 높은 순 정렬
         → Ranker가 카테고리별 상위 1개 선택 시 자연스럽게 상품컷 선택
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

    all_items: list[dict] = []

    # ── 1단계: 네이버 API 호출 (동기) ──────────────────────────────
    for category, query in search_queries.items():
        try:
            response = httpx.get(
                "https://openapi.naver.com/v1/search/shop.json",
                headers=headers,
                params={"query": query, "display": 3, "sort": "sim"},
                timeout=5.0,
            )
            response.raise_for_status()
            data = response.json()

            for item in data.get("items", []):
                parsed = _parse_naver_item(item, category)
                if parsed:
                    all_items.append(parsed)

            print(f"[ExternalRetrieval] {category}: '{query}' → {len(data.get('items', []))}개")

        except Exception as e:
            print(f"[ExternalRetrieval] 네이버 검색 실패 ({category}): {e}")
            continue

    if not all_items:
        return _fallback(state)

    # ── 2단계: 이미지 품질 점수 (비동기 동시 처리) ──────────────────
    print(f"[ExternalRetrieval] 이미지 점수 계산: {len(all_items)}개 동시 처리")
    try:
        all_items = _run_async_in_thread(_score_all_images_async(all_items))
    except Exception as e:
        print(f"[ExternalRetrieval] 이미지 점수 계산 실패, 원본 유지: {e}")

    # ── 3단계: imageScore 높은 순 정렬 ──────────────────────────────
    # Ranker가 카테고리별 similarity 높은 것 1개 선택
    # → imageScore가 similarity 역할을 대신함
    all_items.sort(key=lambda x: x.get("imageScore") or 0.0, reverse=True)

    print(f"[ExternalRetrieval] 완료: {len(all_items)}개, 이미지 점수 반영")
    return all_items


def _fallback(state: OutfitState) -> list[dict]:
    """API 키 없거나 전체 실패 시 최소 fallback. 개발/테스트 환경용."""
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