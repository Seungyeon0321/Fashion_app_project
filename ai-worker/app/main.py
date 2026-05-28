# ai-worker/app/main.py
"""
Worker FastAPI 앱

역할:
  1. /crop 엔드포인트 — fastapi-stylist에서 bbox 좌표 요청
  2. Redis 큐 워커 — BullMQ job 처리 (기존 clothing_worker)

두 가지를 동시에 실행:
  uvicorn으로 FastAPI 서버 실행
  background thread로 Redis 큐 워커 실행
"""

import threading
from contextlib import asynccontextmanager

import httpx
import io
from PIL import Image
from fastapi import FastAPI
from pydantic import BaseModel

from app.core.config import settings
from app.models.segformer import SegFormerSegmenter
from app.workers.clothing_worker import run_worker

# ──────────────────────────────────────────────────────────────────────────────
# SegFormer 싱글톤
# ──────────────────────────────────────────────────────────────────────────────

_segmenter = SegFormerSegmenter()


# ──────────────────────────────────────────────────────────────────────────────
# 큐 워커 background thread
# ──────────────────────────────────────────────────────────────────────────────

def _start_queue_worker():
    """Redis 큐 워커를 별도 스레드에서 실행."""
    t = threading.Thread(target=run_worker, daemon=True)
    t.start()
    print("[Worker] Redis 큐 워커 background thread 시작")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI 앱
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 큐 워커 thread 실행
    _start_queue_worker()
    yield
    # 서버 종료 시 별도 cleanup 없음 (daemon thread라 자동 종료)


app = FastAPI(title="AI Worker API", lifespan=lifespan)


# ──────────────────────────────────────────────────────────────────────────────
# 스키마
# ──────────────────────────────────────────────────────────────────────────────

class CropRequest(BaseModel):
    image_url: str      # 네이버 이미지 URL
    category:  str      # TOP / BOTTOM / OUTER / FULL


class BBoxResponse(BaseModel):
    left:     int
    top:      int
    right:    int
    bottom:   int
    detected: bool      # False면 감지 실패 → 전체 이미지 사용


# ──────────────────────────────────────────────────────────────────────────────
# 헬스체크
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ──────────────────────────────────────────────────────────────────────────────
# /crop 엔드포인트
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/crop", response_model=BBoxResponse)
def crop(request: CropRequest):
    """
    이미지 URL + category → SegFormer bbox 좌표 반환.

    fastapi-stylist가 호출:
      1. 이미지 다운로드
      2. SegFormer로 카테고리 영역 감지
      3. bbox 좌표 반환

    fastapi-stylist가 받은 좌표로:
      rembg 배경제거 후 해당 영역만 크롭

    감지 실패 시:
      detected=False 반환
      → fastapi-stylist가 전체 이미지 사용
    """
    # OUTER는 전신이 맞으므로 크롭 불필요
    if request.category in ("OUTER", "FULL"):
        return BBoxResponse(left=0, top=0, right=0, bottom=0, detected=False)

    # 이미지 다운로드
    try:
        response = httpx.get(request.image_url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception as e:
        print(f"[CropAPI] 이미지 다운로드 실패: {e}")
        return BBoxResponse(left=0, top=0, right=0, bottom=0, detected=False)

    # SegFormer 추론
    try:
        results = _segmenter.segment(image, category=request.category)
    except Exception as e:
        print(f"[CropAPI] SegFormer 실패: {e}")
        return BBoxResponse(left=0, top=0, right=0, bottom=0, detected=False)

    if not results:
        print(f"[CropAPI] {request.category} 영역 감지 실패")
        return BBoxResponse(left=0, top=0, right=0, bottom=0, detected=False)

    # 가장 큰 마스크 영역 선택 (mask_ratio 기준)
    best = max(results, key=lambda x: x.get("mask_ratio", 0))
    bbox = best["bbox"]  # [left, top, width, height]

    left   = bbox[0]
    top    = bbox[1]
    right  = bbox[0] + bbox[2]
    bottom = bbox[1] + bbox[3]

    print(f"[CropAPI] {request.category} bbox: ({left},{top}) → ({right},{bottom})")

    return BBoxResponse(
        left=left,
        top=top,
        right=right,
        bottom=bottom,
        detected=True,
    )