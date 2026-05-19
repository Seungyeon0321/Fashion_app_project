# ai-worker/stylist/main.py
"""
Fashion Stylist FastAPI 엔드포인트

역할:
  NestJS backend에서 /recommend로 POST 요청을 받아
  LangGraph 파이프라인을 실행하고 결과를 반환한다.

  추가: /encode/reference
  NestJS StyleReferenceService에서 CUSTOM 레퍼런스 업로드 후
  fire-and-forget으로 호출.
  S3 이미지 → CLIP 벡터 → StyleReference.embedding 업데이트.
"""

import os
import io
import psycopg2
import boto3
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from .graph import graph
from shared.clip_encoder import CLIPEncoder

load_dotenv()

app = FastAPI(title="Fashion Stylist API")

# CLIP 인코더 싱글톤
# 모듈 로드 시 한 번만 생성 — 매 요청마다 모델 로드하면 느림
_clip_encoder = CLIPEncoder()


# ──────────────────────────────────────────────────────────────────────────────
# 공통 헬퍼
# ──────────────────────────────────────────────────────────────────────────────

def get_db_connection():
    """psycopg2 DB 연결. style_analyzer.py와 동일한 패턴."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def get_s3_client():
    """S3 클라이언트. pipeline.py와 동일한 패턴."""
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# /recommend 스키마 (기존 유지)
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


# ──────────────────────────────────────────────────────────────────────────────
# /encode/reference 스키마 (신규)
# ──────────────────────────────────────────────────────────────────────────────

class EncodeReferenceRequest(BaseModel):
    """
    NestJS StyleReferenceService._requestEncoding()에서 전달.

    reference_id:
        StyleReference 테이블의 PK.
        CLIP 벡터를 저장할 대상 row.

    s3_key:
        레퍼런스 전용 S3 버킷 내 이미지 경로.
        예: "42/references/2026-05-19_a3f8b2c1.jpg"
        NestJS가 업로드 후 반환한 key 그대로 전달.
    """
    reference_id: int
    s3_key:       str


class EncodeReferenceResponse(BaseModel):
    """
    reference_id: 처리된 StyleReference ID
    status:       "ok" (성공) / "error" (실패)
    message:      에러 시 상세 메시지
    """
    reference_id: int
    status:       str
    message:      Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# 헬스체크
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """헬스체크. Docker Compose의 healthcheck에서 사용."""
    return {"status": "ok"}


# ──────────────────────────────────────────────────────────────────────────────
# POST /recommend (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    """
    코디 추천 엔드포인트.
    LangGraph 파이프라인 실행 후 결과 반환.
    """
    initial_state = {
        "user_message":        request.user_message,
        "user_id":             str(request.user_id),
        "source":              request.source,
        "anchor_item_id":      request.anchor_item_id,
        "style_reference_ids": request.style_reference_ids or [],
        "intent":              request.intent,
        "weather":             None,
        "calendar_events":     None,
        "season":              None,
        "avoid_constraints":   None,
        "conflict_warning":    None,
        "anchor_item":         None,
        "style_vector":        None,
        "style_keywords":      None,
        "has_style_context":   None,
        "retrieved_items":     None,
        "relaxation_level":    None,
        "ranked_items":        None,
        "guardrail_passed":    None,
        "retry_count":         0,
        "failure_reason":      None,
        "final_response":      None,
        "recommended_outfit_ids": None,
        "session_history":     [],
        "excluded_outfits":    request.excluded_outfits or [],
        "errors":              [],
    }

    config = {"configurable": {"thread_id": str(request.user_id)}}

    try:
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph 실행 오류: {str(e)}")

    if not result.get("final_response"):
        raise HTTPException(status_code=500, detail="추천 결과를 생성하지 못했습니다.")

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
# POST /encode/reference (신규)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/encode/reference", response_model=EncodeReferenceResponse)
def encode_reference(request: EncodeReferenceRequest):
    """
    CUSTOM 레퍼런스 이미지 → CLIP 벡터 → DB 저장.

    NestJS StyleReferenceService가 업로드 직후 fire-and-forget으로 호출.
    사용자 응답과 무관하게 백그라운드에서 처리됨.

    처리 순서:
      ① 레퍼런스 전용 S3 버킷에서 이미지 다운로드
      ② CLIP으로 이미지 전체 → 512차원 벡터 생성
         (SegFormer crop 없음 — 전체 무드/스타일 분석)
      ③ StyleReference.embedding DB 업데이트

    실패해도 HTTP 200 반환:
      NestJS가 fire-and-forget이라 응답을 확인하지 않음.
      에러는 status="error"로 응답 + 서버 로그에 기록.
      embedding이 null로 남으면 다음 추천에서 이 레퍼런스 무시됨.
    """
    reference_id = request.reference_id
    s3_key       = request.s3_key

    print(f"[EncodeReference] 시작 reference_id={reference_id}, s3_key={s3_key}")

    try:
        # ── ① S3에서 이미지 다운로드 ──────────────────────────────────
        # 레퍼런스 전용 버킷에서 다운로드
        s3     = get_s3_client()
        bucket = os.getenv("AWS_S3_REFERENCE_BUCKET")

        response    = s3.get_object(Bucket=bucket, Key=s3_key)
        image_bytes = response["Body"].read()
        image       = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        print(f"[EncodeReference] 이미지 다운로드 완료: {image.size}")

        # ── ② CLIP 인코딩 ─────────────────────────────────────────────
        # encode_image() — 이미지 전체를 벡터로
        # encode_text()  — 텍스트를 벡터로 (PRESET용)
        # 레퍼런스는 이미지 전체 무드를 잡아야 하므로 encode_image() 사용
        vector = _clip_encoder.encode_image(image)

        print(f"[EncodeReference] CLIP 인코딩 완료: shape={vector.shape}")

        # ── ③ DB 업데이트 ─────────────────────────────────────────────
        # numpy → "[0.1,0.2,...]" 문자열 변환 후 ::vector 캐스팅
        # style_analyzer.py의 _save_preset_embedding()과 동일한 패턴
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
            print(f"[EncodeReference] DB 업데이트 완료 reference_id={reference_id}")
        finally:
            cur.close()
            conn.close()

        return EncodeReferenceResponse(
            reference_id=reference_id,
            status="ok",
        )

    except Exception as e:
        # 실패해도 NestJS에 500 던지지 않음
        # fire-and-forget이라 NestJS는 이미 응답 완료 상태
        print(f"[EncodeReference] 실패 reference_id={reference_id}: {e}")
        return EncodeReferenceResponse(
            reference_id=reference_id,
            status="error",
            message=str(e),
        )