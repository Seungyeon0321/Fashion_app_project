# ai-worker/stylist/main.py
"""
Fashion Stylist FastAPI 엔드포인트

/recommend      → SSE 스트리밍 (진행 상태 실시간 전달)
/recommend/sync → 기존 JSON 응답 (하위 호환용)
/encode/reference → CLIP 벡터 인코딩

Step 37 변경:
  _build_initial_state에 outfit_proposals 초기값 추가.
  recommend_sync 응답에 proposal_statuses debug 필드 추가.

Step 38 변경:
  uuid import 추가.
  _build_initial_state에 session_id 생성 및 state 포함.
  _build_response에서 session_id를 응답에 포함.

Step 38-pre 변경:
  RecommendRequest에 session_id Optional 필드 추가.
  recommend_sync에 Redis 캐시 분기 로직 추가.
  _build_initial_state에서 기존 session_id 있으면 재사용.
  redis_client import 추가 (pop_next_proposal).
"""

import os
import io
import json
import uuid
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
from shared.redis_client import pop_next_proposal

load_dotenv()

app = FastAPI(title="Fashion Stylist API")
_clip_encoder = CLIPEncoder()


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def get_s3_client():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


class RecommendRequest(BaseModel):
    user_id:             int
    user_message:        Optional[str] = ""
    intent:              Optional[str] = None
    source:              str = "closet"
    anchor_item_id:      Optional[int] = None
    style_reference_ids: Optional[List[int]] = []
    excluded_outfits:    Optional[List[dict]] = []
    session_id:          Optional[str] = None


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
    session_id:       str
    intent:           Optional[str] = None
    proposal_mood:    Optional[str] = None
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


@app.get("/health")
def health():
    return {"status": "ok"}


def _build_initial_state(request: RecommendRequest) -> dict:
    session_id = request.session_id or f"rec_{uuid.uuid4().hex[:8]}"
    user_style_context = _get_user_style_context(request.user_id)  # ← 추가
    return {
        "session_id":             session_id,
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
        "outfit_proposals":       None,
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
        "progress_callback":      None,
        "user_style_context":     user_style_context,   # ← 추가
    }


def _build_response(result: dict) -> RecommendResponse:
    outfit_proposals = result.get("outfit_proposals") or []
    proposal_mood = (
        outfit_proposals[0].get("mood") if outfit_proposals else None
    ) or result.get("intent")

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
        session_id=result.get("session_id", ""),
        intent=result.get("intent"),
        proposal_mood=proposal_mood,
        calendar_events=result.get("calendar_events") or [],
        weather=result.get("weather"),
        ranked_items=ranked_items,
        final_response=result["final_response"],
        conflict_warning=result.get("conflict_warning"),
        relaxation_level=result.get("relaxation_level"),
    )

# ──────────────────────────────────────────────────────────────────────────────
# 유저 스타일 선호도 조회 (Step 40-D 추가)
# ──────────────────────────────────────────────────────────────────────────────

def _get_user_style_context(user_id: int) -> Optional[dict]:
    """
    UserStylePreference에서 취향 데이터를 읽어 outfit_composer 프롬프트용으로 반환.

    Cold start 처리:
      total_likes < 3이면 None 반환 → composer가 아무것도 주입 안 함.
      데이터가 충분히 쌓이기 전에 잘못된 힌트를 주지 않기 위함.

    실패 처리:
      DB 조회 실패 시 None 반환 → 피드백 반영 없이 기본 추천으로 폴백.
      피드백 시스템 장애가 추천 서비스 전체를 멈추지 않도록.
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            SELECT top_mood, preferred_colors, preferred_brands, total_likes
            FROM user_style_preferences
            WHERE user_id = %s
        """, (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return None

        top_mood, preferred_colors, preferred_brands, total_likes = row

        # cold start: 최소 3번 이상 좋아요가 쌓여야 반영
        if (total_likes or 0) < 3:
            print(f"[StyleContext] cold start (likes={total_likes}) → 미반영")
            return None

        print(f"[StyleContext] 로드 완료: top_mood={top_mood}, likes={total_likes}")
        return {
            "top_mood":          top_mood,
            "preferred_colors":  preferred_colors or [],
            "preferred_brands":  preferred_brands or [],
            "total_likes":       total_likes,
        }

    except Exception as e:
        print(f"[StyleContext] 조회 실패, 기본 추천으로 폴백: {e}")
        return None


def _build_cached_response(session_id: str, cached: dict) -> RecommendResponse:
    """Redis 캐시에서 꺼낸 proposal로 RecommendResponse 구성"""
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
        for item in (cached.get("ranked_items") or [])
    ]
    return RecommendResponse(
        session_id=session_id,
        intent=cached.get("intent"),
        proposal_mood=cached.get("proposal_mood"),
        calendar_events=cached.get("calendar_events") or [],
        weather=cached.get("weather"),
        ranked_items=ranked_items,
        final_response=cached.get("final_response") or "Next look ready!",
        conflict_warning=cached.get("conflict_warning"),
        relaxation_level=cached.get("relaxation_level"),
    )


@app.post("/recommend")
def recommend(request: RecommendRequest):
    # ── Redis 캐시 분기 (NO 재요청 시 파이프라인 없이 즉시 반환) ──────────
    if request.session_id:
        try:
            cached = pop_next_proposal(str(request.user_id), request.session_id)
            if cached is not None:
                print(f"[SSE Cache HIT] session={request.session_id}")
                response_data = _build_cached_response(request.session_id, cached)

                def cached_stream():
                    yield f"data: {json.dumps({'type': 'result', 'data': response_data.model_dump()}, ensure_ascii=False)}\n\n"

                return StreamingResponse(
                    cached_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control":               "no-cache",
                        "X-Accel-Buffering":           "no",
                        "Access-Control-Allow-Origin": "*",
                    },
                )
            print(f"[SSE Cache MISS] session={request.session_id} → 파이프라인 실행")
        except Exception as e:
            print(f"[SSE Cache ERROR] fallback to pipeline: {e}")
    # ── 캐시 분기 끝 ──────────────────────────────────────────────────────

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


@app.post("/recommend/sync", response_model=RecommendResponse)
def recommend_sync(request: RecommendRequest):
    user_id = str(request.user_id)

    if request.session_id:
        try:
            cached = pop_next_proposal(user_id, request.session_id)
            if cached is not None:
                print(f"[Cache HIT] session={request.session_id}")
                return _build_cached_response(request.session_id, cached)
            print(f"[Cache MISS] session={request.session_id} 소진 → 새 파이프라인 실행")
            request = request.model_copy(update={"session_id": None})
        except Exception as e:
            print(f"[Cache ERROR] Redis 조회 실패, fallback to pipeline: {e}")
            request = request.model_copy(update={"session_id": None})

    initial_state = _build_initial_state(request)
    config        = {"configurable": {"thread_id": str(request.user_id)}}

    try:
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph 실행 오류: {str(e)}")

    if not result.get("final_response"):
        raise HTTPException(status_code=500, detail="추천 결과를 생성하지 못했습니다.")

    proposals_raw = result.get("outfit_proposals") or []
    if proposals_raw:
        for p in proposals_raw:
            print(f"[Debug] proposal({p.get('mood')}): {p.get('proposal_status')}")

    return _build_response(result)


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