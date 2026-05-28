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
        2. 실패 시 fallback 검색 → 동일 검증
        3. 앵커 카테고리는 스킵 (state["anchor_item"] 사용)
    - 검색 성공 시 즉시 rembg 트리밍 → S3 업로드
       ↓
  outfit_proposals 채워진 상태로 반환
  retrieved_items (평면 list)로도 ranker에 전달 (기존 호환)

Step 38 변경:
  nest_asyncio.apply() 추가

Step 38-pre 변경:
  검색 결과 상위 3개 중 랜덤 선택 (매번 다른 상품 추천)
  import random 추가
"""

import os
import re
import io
import random        # Step 38-pre 추가: 검색 결과 랜덤화
import asyncio
import nest_asyncio
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

nest_asyncio.apply()

_clip = CLIPEncoder()
_REF_VECTORS: dict[str, np.ndarray] = {}

CLIP_SCORE_THRESHOLD = 0.25
SEARCH_DISPLAY       = 10
NAVER_SEMAPHORE      = asyncio.Semaphore(3)
TRIM_SEMAPHORE       = asyncio.Semaphore(2)

PROGRESS_MESSAGES = {
    "COMPOSE_START":  "코디 비전을 그리고 있어요...",
    "PROPOSAL_START": "{mood} 무드의 아이템을 찾는 중...",
    "PROPOSAL_DONE":  "{mood} 무드 코디 완성!",
    "TRIM":           "이미지를 다듬고 있어요...",
    "DONE":           "코디를 완성하고 있어요...",
}


# ──────────────────────────────────────────────────────────────────────────────
# CLIP 기준 벡터
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
    client:   httpx.AsyncClient,
    category: str,
    query:    str,
    headers:  dict,
) -> list[dict]:
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
    if not image_url:
        return 0.0
    try:
        response  = await client.get(image_url, timeout=5.0)
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
    if not items:
        return items
    tasks  = [_score_image_async(client, item.get("imageUrl", "")) for item in items]
    scores = await asyncio.gather(*tasks, return_exceptions=True)
    for item, score in zip(items, scores):
        item["imageScore"] = score if isinstance(score, (int, float)) else 0.0
    return items


# ──────────────────────────────────────────────────────────────────────────────
# 한 아이템 해결 (primary → fallback 순차 시도)
# ──────────────────────────────────────────────────────────────────────────────

async def _resolve_item(
    client:    httpx.AsyncClient,
    category:  str,
    item_spec: OutfitItemSpec,
    gender:    str,
    season:    str,
    headers:   dict,
    strategy:  NaverQueryStrategy,
) -> Optional[dict]:
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

        # Step 38-pre: 임계값 통과한 아이템 필터링 후 상위 3개 중 랜덤 선택
        # 이전: 항상 1위 고정 → 매번 같은 상품
        # 변경: 상위 3개 풀에서 랜덤 → 매번 다른 상품
        valid_items = [
            it for it in items
            if (it.get("imageScore") or 0.0) >= CLIP_SCORE_THRESHOLD
        ]

        if not valid_items:
            top_score = max((it.get("imageScore", 0) for it in items), default=0)
            print(f"[ItemFetcher] {category}/{attempt_name} 임계값 미달 (최고 {top_score:.3f})")
            continue

        valid_items.sort(key=lambda x: x.get("imageScore") or 0.0, reverse=True)
        pool = valid_items[:3]   # 상위 3개 풀
        best = random.choice(pool)

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

    tasks   = [_resolve_one_category(cat, spec) for cat, spec in items_dict.items()]
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