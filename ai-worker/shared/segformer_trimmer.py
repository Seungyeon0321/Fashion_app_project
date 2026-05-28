# ai-worker/shared/segformer_trimmer.py
"""
rembg 배경 제거 + worker /crop API 크롭 + S3 업로드

흐름:
  네이버 이미지 URL
      ↓
  이미지 다운로드
      ↓
  worker /crop API 호출 → bbox 좌표 수신 (TOP/BOTTOM만)
      ↓
  rembg 배경 제거 → RGBA
      ↓
  bbox 기준 크롭 (감지 성공 시)
      ↓
  리사이즈 → 세로 400px
      ↓
  S3 업로드
"""

import os
import io
import uuid
import httpx
import boto3
from PIL import Image
from rembg import remove, new_session

CANVAS_MAX_HEIGHT = 400
WORKER_URL        = os.getenv("WORKER_URL", "http://worker:8001")

# 크롭 적용할 카테고리 (OUTER/FULL은 전신이 맞으므로 스킵)
CROP_CATEGORIES = {"TOP", "BOTTOM"}

_rembg_session = None


def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        print("[Trimmer] rembg 세션 초기화 중 (u2net)...")
        _rembg_session = new_session("u2net")
        print("[Trimmer] rembg 세션 준비 완료")
    return _rembg_session


_s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
S3_BUCKET = os.getenv("AWS_S3_BUCKET")


def _get_crop_bbox(image_url: str, category: str) -> tuple[int, int, int, int] | None:
    """
    worker /crop API 호출 → bbox 좌표 반환.

    Returns:
        (left, top, right, bottom) or None (감지 실패 or OUTER/FULL)
    """
    if category not in CROP_CATEGORIES:
        return None

    try:
        response = httpx.post(
            f"{WORKER_URL}/crop",
            json={"image_url": image_url, "category": category},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        if not data.get("detected"):
            print(f"[Trimmer] worker bbox 감지 실패 ({category}) → 전체 이미지 사용")
            return None

        return (data["left"], data["top"], data["right"], data["bottom"])

    except Exception as e:
        print(f"[Trimmer] worker /crop 요청 실패: {e} → 전체 이미지 사용")
        return None


def trim_and_upload(
    image_url: str,
    item_id:   str,
    category:  str = "FULL",
) -> str | None:

    if not image_url:
        return None

    # 1. bbox 먼저 요청 (TOP/BOTTOM만, 이미지 다운로드 전)
    # 이유: worker도 이미지를 다운로드해서 SegFormer 돌림
    #       fastapi-stylist에서 중복 다운로드하지 않으려면
    #       worker가 먼저 처리하고 좌표만 받는 게 효율적
    bbox = _get_crop_bbox(image_url, category)

    # 2. 이미지 다운로드
    try:
        response = httpx.get(image_url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception as e:
        print(f"[Trimmer] 다운로드 실패 ({item_id}): {e}")
        return None

    # 3. rembg 배경 제거
    try:
        session = _get_rembg_session()
        trimmed = remove(image, session=session)
        print(f"[Trimmer] 배경 제거 완료 ({item_id}): {trimmed.size}")
    except Exception as e:
        print(f"[Trimmer] 배경 제거 실패 ({item_id}): {e}")
        return None

    # 4. bbox 크롭 (감지 성공 시)
    if bbox is not None:
        try:
            trimmed = trimmed.crop(bbox)
            print(f"[Trimmer] bbox 크롭 완료 ({item_id}): {bbox}")
        except Exception as e:
            print(f"[Trimmer] 크롭 실패 ({item_id}): {e}")
            # 실패해도 배경제거본으로 계속 진행

    # 5. 리사이즈
    try:
        w, h = trimmed.size
        if h > CANVAS_MAX_HEIGHT:
            ratio    = CANVAS_MAX_HEIGHT / h
            new_size = (int(w * ratio), CANVAS_MAX_HEIGHT)
            trimmed  = trimmed.resize(new_size, Image.LANCZOS)
            print(f"[Trimmer] 리사이즈: {w}×{h} → {new_size[0]}×{new_size[1]}")

        # 6. PNG 직렬화
        buf = io.BytesIO()
        trimmed.save(buf, format="PNG")
        buf.seek(0)

        # 7. S3 업로드
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
    results = []
    total   = len(items)

    for i, item in enumerate(items):
        item      = dict(item)
        item_id   = item.get("id", f"item_{i}")
        category  = item.get("category", "FULL")
        image_url = item.get("imageUrl")

        print(f"[Trimmer] 처리 중 ({i+1}/{total}): {item_id}")

        s3_key              = trim_and_upload(image_url, item_id, category)
        item["crop_s3_key"] = s3_key
        results.append(item)

    print(f"[Trimmer] 배치 완료: {total}개")
    return results