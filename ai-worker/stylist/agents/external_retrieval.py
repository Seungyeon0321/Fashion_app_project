# ai-worker/stylist/agents/external_retrieval.py
"""
External Retrieval — Step 37 리팩토링

새 흐름:
  composer → outfit_proposals (3개 코디 비전)
       ↓
  item_fetcher (이 파일)
    - 3개 proposal 병렬 처리 (asyncio.gather)
    - 각 proposal의 카테고리별로:
        1. primary 검색 → CLIP 검증
        2. 실패 시 fallback 검색 → CLIP 검증
        3. 앵커 카테고리는 스킵 (state["anchor_item"] 사용)
    - 검색 성공 시 즉시 rembg 트리밍 → S3 업로드
       ↓
  outfit_proposals 채워진 상태로 반환
  retrieved_items (평면 list)로도 ranker에 전달 (기존 호환)

이전 구조 (~Step 36)와의 차이:
  - hop1 후보 30개 풀 검색 제거 (composer가 이미 아이템명 확정)
  - 스택 LLM (confirmed_items) 제거 (proposal이 독립적)
  - 카테고리 순차 처리 제거 (proposal 병렬)
  - filter=naverpay 유지 (단독컷 비율 ↑)
  - CLIP 임계값 0.25 유지

병렬 처리 안전장치:
  - 네이버 API 동시 호출 제한 (Semaphore 3)
  - 한 proposal 실패해도 다른 proposal 영향 없음 (return_exceptions)
  - rembg 트리밍은 동기 호출이므로 to_thread로 감쌈

Step 38 변경:
  - nest_asyncio.apply() 추가
    Uvicorn은 자체 asyncio 루프 위에서 동작함.
    그 안에서 asyncio.run()을 호출하면
    "이미 이벤트 루프가 실행 중" 에러가 발생함.
    nest_asyncio는 루프 중첩을 허용해서 이 문제를 해결함.
"""

import os
import re
import io
import asyncio
import nest_asyncio          # Step 38 추가: asyncio 루프 중첩 허용
from typing import Callable, Optional
import numpy as np
import httpx
from PIL import Image as PILImage
from dotenv import load_dotenv

from stylist.outfit_state import OutfitState, OutfitProposal, OutfitItemSpec
from stylist.query_strategies.naver import NaverQueryStrategy
from shared.clip_encoder import CLIPEncoder
from shared.segformer_trimmer import trim_and_upload

load_dotenv()

# Step 38: Uvicorn 루프 안에서 asyncio.run() 호출 허용
# 앱 import 시점에 한 번만 적용되면 충분함
nest_asyncio.apply()

_clip = CLIPEncoder()
_REF_VECTORS: dict[str, np.ndarray] = {}

# CLIP 점수 임계값 (Step 36과 동일)
CLIP_SCORE_THRESHOLD = 0.25

# 검색당 결과 수 (composer가 이미 아이템명 확정해줘서 적게 가져와도 됨)
SEARCH_DISPLAY = 10

# 네이버 API 동시 호출 제한 (레이트 리밋 방어)
NAVER_SEMAPHORE = asyncio.Semaphore(3)

# rembg 트리밍 동시 호출 제한 (CPU/메모리 보호)
TRIM_SEMAPHORE = asyncio.Semaphore(2)

PROGRESS_MESSAGES = {
    "COMPOSE_START":  "코디 비전을 그리고 있어요...",
    "PROPOSAL_START": "{mood} 무드의 아이템을 찾는 중...",
    "PROPOSAL_DONE":  "{mood} 무드 코디 완성!",
    "TRIM":           "이미지를 다듬고 있어요...",
    "DONE":           "코디를 완성하고 있어요...",
}


# ──────────────────────────────────────────────────────────────────────────────
# CLIP 기준 벡터 (단독컷 vs 착용샷 판별용, Step 36과 동일)
# ──────────────────────────────────────────────────────────────────────────────

def _get_ref_vectors() -> dict[str, np.ndarray]:
    global _REF_VECTORS
    if not _REF_VECTORS:
        print("[ItemFetcher] CLIP 기준 벡터 초기화...")
        _REF_VECTORS = {
            "hanger":   _clip.encode_free_text("clothes on hanger white background"),
            "flatlay":  _clip.encode_free_text("flat lay clothing top view"),
            "noperson": _clip.encode_free_text("clothing product shot no person"),
        }
    return _REF_VECTORS


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ──────────────────────────────────────────────────────────────────────────────
# 네이버 검색 + 파싱
# ──────────────────────────────────────────────────────────────────────────────

def _parse_naver_item(raw: dict, category: str) -> Optional[dict]:
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


async def _search_naver_async(
    client: httpx.AsyncClient,
    category: str,
    query: str,
    headers: dict,
) -> list[dict]:
    """네이버 쇼핑 비동기 검색. 세마포어로 동시 호출 제한."""
    async with NAVER_SEMAPHORE:
        try:
            response = await client.get(
                "https://openapi.naver.com/v1/search/shop.json",
                headers=headers,
                params={
                    "query":   query,
                    "display": SEARCH_DISPLAY,
                    "sort":    "sim",
                    "filter":  "naverpay",
                },
                timeout=5.0,
            )
            response.raise_for_status()
            items = [
                parsed for item in response.json().get("items", [])
                if (parsed := _parse_naver_item(item, category))
            ]
            return items
        except Exception as e:
            print(f"[ItemFetcher] 네이버 검색 실패 ({category}, '{query}'): {e}")
            return []


# ──────────────────────────────────────────────────────────────────────────────
# CLIP 점수
# ──────────────────────────────────────────────────────────────────────────────

async def _score_image_async(client: httpx.AsyncClient, image_url: str) -> float:
    """단일 이미지 CLIP 점수 (단독컷 가능성)."""
    if not image_url:
        return 0.0
    try:
        response = await client.get(image_url, timeout=5.0)
        response.raise_for_status()
        image     = PILImage.open(io.BytesIO(response.content)).convert("RGB")
        image_vec = _clip.encode_image(image)
        ref       = _get_ref_vectors()
        return max(
            _cosine_sim(image_vec, ref["hanger"]),
            _cosine_sim(image_vec, ref["flatlay"]),
            _cosine_sim(image_vec, ref["noperson"]),
        )
    except Exception:
        return 0.0


async def _score_items(client: httpx.AsyncClient, items: list[dict]) -> list[dict]:
    """여러 이미지 CLIP 점수 동시 계산."""
    if not items:
        return items
    tasks = [_score_image_async(client, item.get("imageUrl", "")) for item in items]
    scores = await asyncio.gather(*tasks, return_exceptions=True)
    for item, score in zip(items, scores):
        item["imageScore"] = score if isinstance(score, (int, float)) else 0.0
    return items


# ──────────────────────────────────────────────────────────────────────────────
# 한 아이템 해결 (primary → fallback 순차 시도)
# ──────────────────────────────────────────────────────────────────────────────

async def _resolve_item(
    client:     httpx.AsyncClient,
    category:   str,
    item_spec:  OutfitItemSpec,
    gender:     str,
    season:     str,
    headers:    dict,
    strategy:   NaverQueryStrategy,
) -> Optional[dict]:
    """
    한 카테고리의 아이템을 검색·검증·트리밍해서 resolved_item dict를 반환.

    순서:
      1. primary 검색 → CLIP 점수 ≥ 0.25면 채택
      2. 실패 시 fallback 검색 → 동일 검증
      3. 둘 다 실패 시 None
    """
    for attempt_name, query_text in [
        ("primary",  item_spec.get("primary",  "")),
        ("fallback", item_spec.get("fallback", "")),
    ]:
        if not query_text or query_text == "(앵커)":
            continue

        query = strategy.build_query(
            item_name=query_text,
            category=category,
            gender=gender,
            season=season,
        )

        items = await _search_naver_async(client, category, query, headers)
        if not items:
            print(f"[ItemFetcher] {category}/{attempt_name} 검색 0건: '{query}'")
            continue

        items = await _score_items(client, items)
        items.sort(key=lambda x: x.get("imageScore") or 0.0, reverse=True)

        best = next(
            (it for it in items if (it.get("imageScore") or 0.0) >= CLIP_SCORE_THRESHOLD),
            None,
        )

        if not best:
            top_score = items[0].get("imageScore", 0) if items else 0
            print(f"[ItemFetcher] {category}/{attempt_name} 임계값 미달 (최고 {top_score:.3f})")
            continue

        score = best.get("imageScore", 0)
        print(
            f"[ItemFetcher] {category}/{attempt_name} 단독컷 확정: "
            f"{best.get('name','')[:25]} ({score:.3f})"
        )

        async with TRIM_SEMAPHORE:
            s3_key = await asyncio.to_thread(
                trim_and_upload,
                image_url=best.get("imageUrl", ""),
                item_id=best.get("id", ""),
                category=category,
            )

        if not s3_key:
            print(f"[ItemFetcher] {category}/{attempt_name} 트리밍 실패")
            continue

        best = dict(best)
        best["crop_s3_key"] = s3_key
        return best

    return None


# ──────────────────────────────────────────────────────────────────────────────
# 한 proposal 해결 (모든 카테고리 동시 처리)
# ──────────────────────────────────────────────────────────────────────────────

async def _resolve_proposal(
    client:      httpx.AsyncClient,
    proposal:    OutfitProposal,
    anchor_item: Optional[dict],
    gender:      str,
    season:      str,
    headers:     dict,
    strategy:    NaverQueryStrategy,
    notify:      Callable[[str], None],
) -> OutfitProposal:
    mood = proposal.get("mood", "?")
    notify(PROGRESS_MESSAGES["PROPOSAL_START"].format(mood=mood))

    anchor_cat = proposal.get("anchor_category")
    items_dict = proposal.get("items", {})

    async def _resolve_one_category(category: str, spec: OutfitItemSpec):
        if anchor_cat and category == anchor_cat and anchor_item:
            resolved = dict(anchor_item)
            resolved["is_anchor"]   = True
            resolved["is_external"] = False
            resolved["source"]      = "closet"
            return category, resolved, "skipped"

        resolved = await _resolve_item(
            client=client,
            category=category,
            item_spec=spec,
            gender=gender,
            season=season,
            headers=headers,
            strategy=strategy,
        )

        status = "resolved" if resolved else "failed"
        return category, resolved, status

    tasks = [_resolve_one_category(cat, spec) for cat, spec in items_dict.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    success_count = 0
    fail_count    = 0
    for res in results:
        if isinstance(res, Exception):
            print(f"[ItemFetcher] proposal({mood}) 카테고리 예외: {res}")
            fail_count += 1
            continue
        category, resolved, status = res
        spec = items_dict.get(category, {})
        spec["resolved_item"] = resolved
        spec["status"]        = status

        if status in ("resolved", "skipped"):
            success_count += 1
        else:
            fail_count += 1

    if fail_count == 0:
        proposal["proposal_status"] = "resolved"
    elif success_count == 0:
        proposal["proposal_status"] = "failed"
    else:
        proposal["proposal_status"] = "partial"

    notify(PROGRESS_MESSAGES["PROPOSAL_DONE"].format(mood=mood))
    print(
        f"[ItemFetcher] proposal({mood}) 완료: "
        f"{success_count} 성공 / {fail_count} 실패 → {proposal['proposal_status']}"
    )

    return proposal


# ──────────────────────────────────────────────────────────────────────────────
# 메인 진입점 (LangGraph 노드에서 호출)
# ──────────────────────────────────────────────────────────────────────────────

def search_external(
    state:             OutfitState,
    params:            dict,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> list[dict]:
    """
    외부(네이버) 검색 + 트리밍 진입점.

    composer가 만든 outfit_proposals를 받아 병렬 처리.
    반환값은 평면 list (기존 호환).
    state["outfit_proposals"]는 in-place로 수정되어
    retrieval.py가 꺼내서 state에 반영함.
    """
    def _notify(msg: str):
        print(f"[ItemFetcher] {msg}")
        if progress_callback:
            progress_callback(msg)

    client_id     = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("[ItemFetcher] 네이버 키 없음 → fallback")
        return _fallback(state)

    proposals: list[OutfitProposal] = state.get("outfit_proposals") or []
    if not proposals:
        print("[ItemFetcher] outfit_proposals 비어있음 → fallback")
        return _fallback(state)

    headers = {
        "X-Naver-Client-Id":     client_id,
        "X-Naver-Client-Secret": client_secret,
    }
    gender      = state.get("gender") or "MALE"
    season      = state.get("season") or "spring"
    anchor_item = state.get("anchor_item")
    strategy    = NaverQueryStrategy()

    # Step 38: nest_asyncio.apply() 덕분에 이미 실행 중인 루프 안에서도 동작함
    resolved_proposals = asyncio.run(_run_all_proposals(
        proposals=proposals,
        anchor_item=anchor_item,
        gender=gender,
        season=season,
        headers=headers,
        strategy=strategy,
        notify=_notify,
    ))

    flat_items: list[dict] = []
    for prop in resolved_proposals:
        for cat, spec in prop.get("items", {}).items():
            resolved = spec.get("resolved_item")
            if resolved:
                flat_items.append(resolved)

    if not flat_items:
        print("[ItemFetcher] 모든 proposal 실패 → fallback")
        return _fallback(state)

    _notify(PROGRESS_MESSAGES["DONE"])
    print(f"[ItemFetcher] 완료: 총 {len(flat_items)}개 아이템 (proposals {len(resolved_proposals)}개)")
    return flat_items


async def _run_all_proposals(
    proposals:   list[OutfitProposal],
    anchor_item: Optional[dict],
    gender:      str,
    season:      str,
    headers:     dict,
    strategy:    NaverQueryStrategy,
    notify:      Callable[[str], None],
) -> list[OutfitProposal]:
    """3개 proposal을 asyncio.gather로 동시 실행."""
    async with httpx.AsyncClient() as client:
        tasks = [
            _resolve_proposal(
                client=client,
                proposal=prop,
                anchor_item=anchor_item,
                gender=gender,
                season=season,
                headers=headers,
                strategy=strategy,
                notify=notify,
            )
            for prop in proposals
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    final = []
    for prop, res in zip(proposals, results):
        if isinstance(res, Exception):
            print(f"[ItemFetcher] proposal 예외: {res}")
            prop["proposal_status"] = "failed"
            final.append(prop)
        else:
            final.append(res)
    return final


# ──────────────────────────────────────────────────────────────────────────────
# Fallback
# ──────────────────────────────────────────────────────────────────────────────

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