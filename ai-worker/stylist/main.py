# ai-worker/stylist/main.py
"""
Fashion Stylist FastAPI 엔드포인트

/recommend        → SSE 스트리밍 (진행 상태 실시간 전달)
/recommend/sync   → 기존 JSON 응답 (하위 호환용)
/encode/reference → CLIP 벡터 인코딩
/tryon            → Virtual Try-On (Fashn.ai)

Step 41 변경:
  asyncio import 추가.
  httpx import 추가.
  hashlib import 추가.
  TryonRequest, TryonResponse 모델 추가.
  _tryon_cache_key, _get_tryon_photo_presigned_url, _run_fashn_tryon 헬퍼 추가.
  POST /tryon 엔드포인트 추가.
"""

import os
import io
import json
import uuid
import queue
import threading
import asyncio
import hashlib
import psycopg2
import boto3
import httpx
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from .graph import graph
from shared.clip_encoder import CLIPEncoder
from shared.redis_client import pop_next_proposal, get_redis_client

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


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response 모델
# ──────────────────────────────────────────────────────────────────────────────

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


# ── Step 41: Try-On ───────────────────────────────────────────
class TryonRequest(BaseModel):
    user_id:     int
    garment_url: str
    category:    Optional[str] = "tops"
    # "tops" | "bottoms" | "one-pieces"
    # Fashn.ai가 자동 감지하지만 명시하면 더 정확


class TryonResponse(BaseModel):
    result_url: str
    cached:     bool = False  # True면 Redis 캐시에서 반환된 것


# ──────────────────────────────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────────────────────────────

TRYON_CACHE_TTL = 60 * 60 * 24  # 24시간 (Fashn CDN 72h 안에 충분히 여유)


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


def _build_initial_state(request: RecommendRequest) -> dict:
    session_id = request.session_id or f"rec_{uuid.uuid4().hex[:8]}"
    user_style_context = _get_user_style_context(request.user_id)
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
        "user_style_context":     user_style_context,
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


def _get_user_style_context(user_id: int) -> Optional[dict]:
    """
    UserStylePreference에서 취향 데이터를 읽어 outfit_composer 프롬프트용으로 반환.
    cold start (total_likes < 3): None 반환
    실패 시: None 반환 (피드백 장애가 추천 전체를 멈추지 않도록)
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

        if (total_likes or 0) < 3:
            print(f"[StyleContext] cold start (likes={total_likes}) → 미반영")
            return None

        print(f"[StyleContext] 로드 완료: top_mood={top_mood}, likes={total_likes}")
        return {
            "top_mood":         top_mood,
            "preferred_colors": preferred_colors or [],
            "preferred_brands": preferred_brands or [],
            "total_likes":      total_likes,
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


# ── Step 41: Try-On 헬퍼 ──────────────────────────────────────

def _tryon_cache_key(user_id: int, garment_url: str) -> str:
    """
    캐시 키 생성.
    garment_url이 길어서 MD5 해시 앞 12자리로 줄임.
    형식: tryon:{user_id}:{url_hash}
    예시: tryon:1:a3f2b8c1d9e0
    """
    url_hash = hashlib.md5(garment_url.encode()).hexdigest()[:12]
    return f"tryon:{user_id}:{url_hash}"


def _get_tryon_photo_presigned_url(s3_key: str) -> str:
    """
    S3 key → presigned URL (유효시간 1시간)

    Fashn.ai는 외부 서비스라서 프라이빗 S3 URL에 직접 접근 불가.
    presigned URL로 변환해야 Fashn.ai가 이미지를 읽을 수 있음.
    유효시간 1시간: Fashn.ai 처리 5~17초보다 충분히 여유있음.
    """
    s3     = get_s3_client()
    bucket = os.getenv("AWS_S3_BUCKET")
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=3600,
    )


async def _run_fashn_tryon(
    model_image_url: str,
    garment_url:     str,
    category:        str,
) -> str:
    """
    Fashn.ai API 호출 → polling → 결과 URL 반환.

    동작 순서:
      1. POST /v1/run → prediction_id 즉시 반환 (예약 완료)
      2. GET /v1/status/{id} 반복 (2초 간격, 최대 30회 = 60초)
      3. completed → output[0] URL 반환
      4. failed    → HTTPException 발생
      5. 60초 초과 → 504 타임아웃
    """
    api_key = os.getenv("FASHN_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="FASHN_API_KEY가 설정되지 않았습니다")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }

    # 1. 생성 요청
    async with httpx.AsyncClient(timeout=30) as client:
        run_res = await client.post(
            "https://api.fashn.ai/v1/run",
            headers=headers,
            json={
                "model_name": "tryon-v1.6",
                "inputs": {
                    "model_image":   model_image_url,
                    "garment_image": garment_url,
                    "category":      category,
                },
            },
        )
        run_res.raise_for_status()
        prediction_id = run_res.json()["id"]
        print(f"[Fashn] 요청 완료 prediction_id={prediction_id}")

    # 2. polling (최대 60초)
    for attempt in range(30):
        await asyncio.sleep(2)

        async with httpx.AsyncClient(timeout=10) as client:
            status_res = await client.get(
                f"https://api.fashn.ai/v1/status/{prediction_id}",
                headers=headers,
            )
            status_res.raise_for_status()
            data   = status_res.json()
            status = data.get("status")

        print(f"[Fashn] polling {attempt + 1}/30 → {status}")

        if status == "completed":
            result_url = data["output"][0]
            print(f"[Fashn] 완료 result_url={result_url}")
            return result_url

        if status == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Fashn.ai 생성 실패: {data.get('error')}",
            )

    raise HTTPException(status_code=504, detail="Fashn.ai 응답 시간 초과 (60초)")


# ──────────────────────────────────────────────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/recommend")
def recommend(request: RecommendRequest):
    # ── Redis 캐시 분기 ───────────────────────────────────────────
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


@app.post("/tryon", response_model=TryonResponse)
async def tryon(request: TryonRequest):
    """
    Virtual Try-On 엔드포인트 (Step 41)

    1. Redis 캐시 확인 → HIT이면 즉시 반환 (비용 0)
    2. MISS → DB에서 tryonPhotoUrl 조회
    3. S3 key 추출 → presigned URL 생성 (Fashn.ai 접근용)
    4. Fashn.ai 호출 + polling (5~17초)
    5. 결과 URL → Redis 저장 (TTL 24h)
    6. 결과 반환
    """
    redis  = get_redis_client()
    cache_key = _tryon_cache_key(request.user_id, request.garment_url)

    # 1. 캐시 확인
    try:
        cached_url = redis.get(cache_key)
        if cached_url:
            print(f"[TryOn Cache HIT] user={request.user_id} key={cache_key}")
            return TryonResponse(result_url=cached_url, cached=True)
    except Exception as e:
        print(f"[TryOn Cache ERROR] 조회 실패, 계속 진행: {e}")

    # 2. DB에서 tryonPhotoUrl 조회
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(
        'SELECT tryon_photo_url FROM "User" WHERE id = %s',
        (request.user_id,),
)
        row = cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 조회 실패: {e}")

    if not row or not row[0]:
        raise HTTPException(
            status_code=400,
            detail="Try-On 사진이 없습니다. 먼저 사진을 등록해주세요.",
        )

    tryon_photo_url = row[0]
    # URL에서 S3 key 추출
    # "https://bucket.s3.region.amazonaws.com/tryon/1.jpg" → "tryon/1.jpg"
    s3_key = "/".join(tryon_photo_url.split("/")[-2:])
    print(f"[TryOn] user={request.user_id} s3_key={s3_key}")

    # 3. presigned URL 생성
    try:
        presigned_url = _get_tryon_photo_presigned_url(s3_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"presigned URL 생성 실패: {e}")

    # 4. Fashn.ai 호출
    result_url = await _run_fashn_tryon(
        model_image_url=presigned_url,
        garment_url=request.garment_url,
        category=request.category or "tops",
    )

    # 5. Redis 캐시 저장
    try:
        redis.setex(cache_key, TRYON_CACHE_TTL, result_url)
        print(f"[TryOn Cache SET] key={cache_key} ttl={TRYON_CACHE_TTL}s")
    except Exception as e:
        print(f"[TryOn Cache ERROR] 저장 실패, 무시하고 계속: {e}")

    return TryonResponse(result_url=result_url, cached=False)