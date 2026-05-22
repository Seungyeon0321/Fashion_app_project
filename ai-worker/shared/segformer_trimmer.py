# ai-worker/shared/segformer_trimmer.py
"""
rembg 배경 제거 + S3 업로드 (공통 모듈)

SegFormer → rembg 교체 이유:
  SegFormer: 옷 카테고리 분리 목적 (TOP/BOTTOM 구분)
             착용샷에서 사람 몸통이 남는 문제 있음
  rembg:     배경 제거 전용
             착용샷에서도 사람+옷 통째로 깔끔하게 분리
             네이버 쇼핑 이미지(착용샷 위주) 처리에 적합

app/models/segformer.py는 유저 옷 등록용 (카테고리 분리 필요)
→ 이 파일과 완전히 독립, 건드리지 않음

흐름:
  네이버 이미지 URL
      ↓
  이미지 다운로드 (httpx)
      ↓
  rembg 배경 제거 → RGBA 이미지
      ↓
  리사이즈 → 세로 400px (캔버스 표시용)
      ↓
  S3 업로드 (PNG)
      ↓
  crop_s3_key 반환
"""

import os
import io
import uuid
import httpx
import boto3
from PIL import Image
from rembg import remove, new_session

# ──────────────────────────────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────────────────────────────

# 캔버스 표시용 세로 기준 최대 px (가로 비율 유지)
CANVAS_MAX_HEIGHT = 400

# ──────────────────────────────────────────────────────────────────────────────
# rembg 세션 싱글톤
# ──────────────────────────────────────────────────────────────────────────────
# new_session()은 모델을 로드하므로 모듈 레벨에서 한 번만 생성
# u2net: 범용 배경 제거 모델 (기본값, 옷에 잘 맞음)
# u2net_cloth_seg: 옷 전용이지만 착용샷보다 단독컷에 최적화
# → u2net이 네이버 쇼핑 착용샷에 더 안정적
_rembg_session = None

def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        print("[Trimmer] rembg 세션 초기화 중 (u2net)...")
        _rembg_session = new_session("u2net")
        print("[Trimmer] rembg 세션 준비 완료")
    return _rembg_session


# ──────────────────────────────────────────────────────────────────────────────
# S3 클라이언트
# ──────────────────────────────────────────────────────────────────────────────

_s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
S3_BUCKET = os.getenv("AWS_S3_BUCKET")


# ──────────────────────────────────────────────────────────────────────────────
# 공개 함수
# ──────────────────────────────────────────────────────────────────────────────

def trim_and_upload(
    image_url: str,
    item_id: str,
    category: str = "FULL",
) -> str | None:
    """
    외부 이미지 URL → 배경 제거 → S3 업로드 → crop_s3_key 반환.

    Args:
        image_url: 네이버 쇼핑 이미지 URL
        item_id:   아이템 고유 ID (예: "naver_90118806196")
        category:  카테고리 (S3 key 구분용, 배경 제거 로직엔 미사용)

    Returns:
        S3 key 문자열. 실패 시 None.
        예: "external/naver_90118806196_TOP_a3f2.png"
    """
    if not image_url:
        return None

    # 1. 이미지 다운로드
    try:
        response = httpx.get(image_url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception as e:
        print(f"[Trimmer] 다운로드 실패 ({item_id}): {e}")
        return None

    # 2. rembg 배경 제거
    try:
        session = _get_rembg_session()
        # remove()는 PIL Image → RGBA PIL Image 반환
        # 배경이 투명(alpha=0), 전경(사람+옷)이 불투명(alpha=255)
        trimmed = remove(image, session=session)
        print(f"[Trimmer] 배경 제거 완료 ({item_id}): {trimmed.size}")
    except Exception as e:
        print(f"[Trimmer] 배경 제거 실패 ({item_id}): {e}")
        return None

    # 3. 캔버스 표시용 리사이즈 (세로 400px 기준, 비율 유지)
    try:
        w, h = trimmed.size
        if h > CANVAS_MAX_HEIGHT:
            ratio    = CANVAS_MAX_HEIGHT / h
            new_size = (int(w * ratio), CANVAS_MAX_HEIGHT)
            trimmed  = trimmed.resize(new_size, Image.LANCZOS)
            print(f"[Trimmer] 리사이즈: {w}×{h} → {new_size[0]}×{new_size[1]}")

        # 4. PNG 직렬화 (투명도 유지)
        buf = io.BytesIO()
        trimmed.save(buf, format="PNG")
        buf.seek(0)

        # 5. S3 업로드
        short_id = uuid.uuid4().hex[:4]
        s3_key   = f"external/{item_id}_{category}_{short_id}.png"

        _s3.upload_fileobj(
            buf,
            S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": "image/png"},
        )
        print(f"[Trimmer] S3 업로드 완료: {s3_key}")
        return s3_key

    except Exception as e:
        print(f"[Trimmer] S3 업로드 실패 ({item_id}): {e}")
        return None


def batch_trim_and_upload(items: list[dict]) -> list[dict]:
    """
    아이템 목록에 대해 trim_and_upload 순차 실행.

    각 아이템의 crop_s3_key 필드를 업데이트해서 반환.
    실패한 아이템은 crop_s3_key=None 유지 (imageUrl fallback).

    순차 처리 이유:
        rembg도 CPU 연산이 있어서 동시 처리 시 메모리 부담.
        3개 이하라 순차 처리로 충분.
    """
    results = []
    total   = len(items)

    for i, item in enumerate(items):
        item      = dict(item)
        item_id   = item.get("id", f"item_{i}")
        category  = item.get("category", "FULL")
        image_url = item.get("imageUrl")

        print(f"[Trimmer] 처리 중 ({i+1}/{total}): {item_id}")

        s3_key           = trim_and_upload(image_url, item_id, category)
        item["crop_s3_key"] = s3_key
        results.append(item)

    print(f"[Trimmer] 배치 완료: {total}개")
    return results