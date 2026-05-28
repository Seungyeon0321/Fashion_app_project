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
    session_id:          Optional[str] = None   # ← Step 38-pre 추가


# BaseModel로 정의된 응답 스키마는 FastAPI의 response_model로 활용되어
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
    # Step 38-pre:
    # 기존 session_id가 있으면 재사용, 없으면 새로 발급.
    # 소진 후 새 파이프라인 실행 시에는 recommend_sync에서
    # session_id=None으로 초기화한 뒤 넘겨주므로 여기선 그냥 받은 값 사용.
    session_id = request.session_id or f"rec_{uuid.uuid4().hex[:8]}"

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
        session_id=result.get("session_id", ""),
        intent=result.get("intent"),
        calendar_events=result.get("calendar_events") or [],
        weather=result.get("weather"),
        ranked_items=ranked_items,
        final_response=result["final_response"],
        conflict_warning=result.get("conflict_warning"),
        relaxation_level=result.get("relaxation_level"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /recommend  — SSE 스트리밍
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
            # model_dump()은 _build_response에서 받은 결과물에서 사용하는 pydantic의 내장 기능이다.
            # .model_dump()은 pydantic 모델 인스턴스를 dict로 변환해준다. FastAPI의 StreamingResponse로 보낼 때 JSON 직렬화가 가능하도록 하기 위해 사용한다.
            msg_queue.put({"type": "result", "data": response_data.model_dump()})

        except Exception as e:
            msg_queue.put({"type": "error", "message": str(e)})
        finally:
            msg_queue.put(None)

    # graph 실행을 별도 스레드에서 수행하여 SSE 스트리밍과 병행 처리 (해당 graph는 메인 스레드가 아닌 별도 스레드에서 실행됨)
    # daemon=True로 설정하여 메인 스레드 종료 시 자동으로 종료되도록 함
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
# POST /recommend/sync  — JSON 응답
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/recommend/sync", response_model=RecommendResponse)
def recommend_sync(request: RecommendRequest):
    """
    기존 방식 (JSON 응답).
    Postman 테스트 또는 SSE 미지원 환경용.

    Step 38-pre:
      session_id 있음 → Redis 캐시 조회 먼저 시도
      캐시 HIT       → 파이프라인 실행 없이 즉시 반환 (~0.5초)
      캐시 MISS/소진  → 새 파이프라인 실행
      Redis 장애      → 파이프라인으로 자동 fallback
    """
    user_id = str(request.user_id)

    # ── Step 38-pre: Redis 캐시 분기 ──────────────────────────────────────
    if request.session_id:
        try:
            cached = pop_next_proposal(user_id, request.session_id)

            if cached is not None:
                # 캐시 HIT: Redis에서 꺼낸 proposal을 바로 응답으로 변환
                print(f"[Cache HIT] session={request.session_id}")
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
                    session_id=request.session_id,
                    intent=cached.get("intent"),
                    calendar_events=cached.get("calendar_events") or [],
                    weather=cached.get("weather"),
                    ranked_items=ranked_items,
                    final_response=cached.get("final_response") or "코디를 준비했어요!",
                    conflict_warning=cached.get("conflict_warning"),
                    relaxation_level=cached.get("relaxation_level"),
                )

            # 캐시 MISS (소진): session_id 초기화 후 새 파이프라인 실행
            print(f"[Cache MISS] session={request.session_id} 소진 → 새 파이프라인 실행")
            request = request.model_copy(update={"session_id": None})

        except Exception as e:
            # Redis 장애: 파이프라인으로 fallback (서비스 중단 방지)
            print(f"[Cache ERROR] Redis 조회 실패, fallback to pipeline: {e}")
            request = request.model_copy(update={"session_id": None})
    # ── 캐시 분기 끝 ──────────────────────────────────────────────────────

    # 파이프라인 실행 (첫 요청 or 소진 or Redis 장애)
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


# ──────────────────────────────────────────────────────────────────────────────
# POST /encode/reference
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