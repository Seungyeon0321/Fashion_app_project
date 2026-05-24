# ai-worker/stylist/main.py
"""
Fashion Stylist FastAPI 엔드포인트

/recommend      → SSE 스트리밍 (진행 상태 실시간 전달)
/recommend/sync → 기존 JSON 응답 (하위 호환용)
/encode/reference → CLIP 벡터 인코딩

Step 37 변경:
  _build_initial_state에 outfit_proposals 초기값 추가.
  recommend_sync 응답에 proposal_statuses debug 필드 추가.
"""

import os
import io
import json
import queue
import threading
import psycopg2
import boto3
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from .graph import graph
from shared.clip_encoder import CLIPEncoder

load_dotenv()

app = FastAPI(title="Fashion Stylist API")
_clip_encoder = CLIPEncoder()


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────────────────────────────────────────

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def get_s3_client():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# 스키마
# ──────────────────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    user_id:             int
    user_message:        Optional[str] = ""
    intent:              Optional[str] = None
    source:              str = "closet"
    anchor_item_id:      Optional[int] = None
    style_reference_ids: Optional[List[int]] = []
    excluded_outfits:    Optional[List[dict]] = []


class RecommendItemResponse(BaseModel):
    id:          object
    category:    str
    subCategory: Optional[str] = None
    name:        Optional[str] = None
    brand:       Optional[str] = None
    colors:      Optional[List[str]] = []
    material:    Optional[str] = None
    fit:         Optional[str] = None
    imageUrl:    Optional[str] = None
    purchaseUrl: Optional[str] = None
    similarity:  Optional[float] = None
    is_anchor:   bool = False
    is_external: bool = False


class RecommendResponse(BaseModel):
    intent:           Optional[str] = None
    calendar_events:  Optional[List[str]] = []
    weather:          Optional[str] = None
    ranked_items:     List[RecommendItemResponse] = []
    final_response:   str
    conflict_warning: Optional[str] = None
    relaxation_level: Optional[int] = None


class EncodeReferenceRequest(BaseModel):
    reference_id: int
    s3_key:       str


class EncodeReferenceResponse(BaseModel):
    reference_id: int
    status:       str
    message:      Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# 헬스체크
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ──────────────────────────────────────────────────────────────────────────────
# 공통: initial_state 생성
# ──────────────────────────────────────────────────────────────────────────────

def _build_initial_state(request: RecommendRequest) -> dict:
    return {
        "user_message":           request.user_message,
        "user_id":                str(request.user_id),
        "source":                 request.source,
        "anchor_item_id":         request.anchor_item_id,
        "style_reference_ids":    request.style_reference_ids or [],
        "intent":                 request.intent,
        "weather":                None,
        "calendar_events":        None,
        "season":                 None,
        "avoid_constraints":      None,
        "conflict_warning":       None,
        "anchor_item":            None,
        "style_vector":           None,
        "style_keywords":         None,
        "has_style_context":      None,
        "outfit_proposals":       None,   # Step 37 추가
        "retrieved_items":        None,
        "relaxation_level":       None,
        "ranked_items":           None,
        "guardrail_passed":       None,
        "retry_count":            0,
        "failure_reason":         None,
        "final_response":         None,
        "recommended_outfit_ids": None,
        "session_history":        [],
        "excluded_outfits":       request.excluded_outfits or [],
        "errors":                 [],
        "progress_callback":      None,  # SSE 엔드포인트에서 주입
    }


def _build_response(result: dict) -> RecommendResponse:
    ranked_items = [
        RecommendItemResponse(
            id=item.get("id"),
            category=item.get("category", ""),
            subCategory=item.get("subCategory"),
            name=item.get("name"),
            brand=item.get("brand"),
            colors=item.get("colors") or [],
            material=item.get("material"),
            fit=item.get("fit"),
            imageUrl=item.get("imageUrl"),
            purchaseUrl=item.get("purchaseUrl"),
            similarity=item.get("similarity"),
            is_anchor=item.get("is_anchor", False),
            is_external=item.get("is_external", False),
        )
        for item in (result.get("ranked_items") or [])
    ]
    return RecommendResponse(
        intent=result.get("intent"),
        calendar_events=result.get("calendar_events") or [],
        weather=result.get("weather"),
        ranked_items=ranked_items,
        final_response=result["final_response"],
        conflict_warning=result.get("conflict_warning"),
        relaxation_level=result.get("relaxation_level"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /recommend  — SSE 스트리밍 (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/recommend")
def recommend(request: RecommendRequest):
    """
    SSE 스트리밍 코디 추천 엔드포인트.

    이벤트 형식:
      data: {"type": "progress", "message": "상의를 고르고 있어요..."}
      data: {"type": "result",   "data": { ...RecommendResponse... }}
      data: {"type": "error",    "message": "..."}
    """
    msg_queue: queue.Queue = queue.Queue()

    def progress_callback(message: str):
        msg_queue.put({"type": "progress", "message": message})

    def run_graph():
        try:
            initial_state = _build_initial_state(request)
            initial_state["progress_callback"] = progress_callback

            config = {"configurable": {"thread_id": str(request.user_id)}}
            result = graph.invoke(initial_state, config=config)

            if not result.get("final_response"):
                msg_queue.put({"type": "error", "message": "추천 결과를 생성하지 못했습니다."})
                return

            response_data = _build_response(result)
            msg_queue.put({"type": "result", "data": response_data.model_dump()})

        except Exception as e:
            msg_queue.put({"type": "error", "message": str(e)})
        finally:
            msg_queue.put(None)

    thread = threading.Thread(target=run_graph, daemon=True)
    thread.start()

    def event_stream():
        while True:
            item = msg_queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /recommend/sync  — JSON 응답 (기존 유지 + Step 37 debug 필드 추가)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/recommend/sync", response_model=RecommendResponse)
def recommend_sync(request: RecommendRequest):
    """
    기존 방식 (JSON 응답).
    Postman 테스트 또는 SSE 미지원 환경용.

    Step 37: X-Debug-Proposals 헤더로 proposal 상태 확인 가능.
    """
    initial_state = _build_initial_state(request)
    config        = {"configurable": {"thread_id": str(request.user_id)}}

    try:
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph 실행 오류: {str(e)}")

    if not result.get("final_response"):
        raise HTTPException(status_code=500, detail="추천 결과를 생성하지 못했습니다.")

    # Step 37 debug: proposal 상태를 로그로 확인
    proposals_raw = result.get("outfit_proposals") or []
    if proposals_raw:
        for p in proposals_raw:
            print(f"[Debug] proposal({p.get('mood')}): {p.get('proposal_status')}")

    return _build_response(result)


# ──────────────────────────────────────────────────────────────────────────────
# POST /encode/reference (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/encode/reference", response_model=EncodeReferenceResponse)
def encode_reference(request: EncodeReferenceRequest):
    reference_id = request.reference_id
    s3_key       = request.s3_key
    print(f"[EncodeReference] 시작 reference_id={reference_id}")

    try:
        s3     = get_s3_client()
        bucket = os.getenv("AWS_S3_REFERENCE_BUCKET")

        response    = s3.get_object(Bucket=bucket, Key=s3_key)
        image_bytes = response["Body"].read()
        image       = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        vector     = _clip_encoder.encode_image(image)
        vector_str = "[" + ",".join(str(float(x)) for x in vector) + "]"

        conn = get_db_connection()
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

        return EncodeReferenceResponse(reference_id=reference_id, status="ok")

    except Exception as e:
        print(f"[EncodeReference] 실패: {e}")
        return EncodeReferenceResponse(
            reference_id=reference_id,
            status="error",
            message=str(e),
        )