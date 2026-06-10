# ai-worker/shared/segformer_trimmer.py  ← 기존 파일 수정

import os
import io
import uuid
import threading
import httpx
import boto3
from PIL import Image
from rembg import remove, new_session

CANVAS_MAX_HEIGHT = 400
WORKER_URL        = os.getenv("WORKER_URL", "http://worker:8001")
CROP_CATEGORIES   = {"TOP", "BOTTOM"}

_rembg_session = None
_rembg_lock    = threading.Lock()

# ── S3 클라이언트도 lazy init으로 변경 ──────────────────────────
# 모듈 import 시점이 아닌 첫 사용 시점에 초기화
# 이유: import 시 환경변수가 아직 없을 수 있음 → region=None으로 굳어버리는 버그 방지
_s3      = None
_s3_lock = threading.Lock()

S3_BUCKET = None  # 마찬가지로 첫 사용 시점에 읽음


def _get_s3_client():
    """
    S3 클라이언트를 lazy + thread-safe하게 초기화.
    rembg 세션과 동일한 double-checked locking 패턴 사용.
    """
    global _s3, S3_BUCKET

    if _s3 is not None:
        return _s3

    with _s3_lock:
        if _s3 is None:
            _s3 = boto3.client(
                "s3",
                region_name=os.getenv("AWS_REGION"),
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            )
            S3_BUCKET = os.getenv("AWS_S3_BUCKET")
            print(f"[Trimmer] S3 클라이언트 초기화 완료 (bucket={S3_BUCKET})")
        return _s3


def _get_rembg_session():
    global _rembg_session

    if _rembg_session is not None:
        return _rembg_session

    with _rembg_lock:
        if _rembg_session is None:
            print("[Trimmer] rembg 세션 초기화 중 (u2net)...")
            _rembg_session = new_session("u2net")
            print("[Trimmer] rembg 세션 준비 완료")
        return _rembg_session


def _get_crop_bbox(image_url: str, category: str) -> tuple[int, int, int, int] | None:
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

    bbox = _get_crop_bbox(image_url, category)

    try:
        response = httpx.get(image_url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception as e:
        print(f"[Trimmer] 다운로드 실패 ({item_id}): {e}")
        return None

    try:
        session = _get_rembg_session()
        trimmed = remove(image, session=session)
        print(f"[Trimmer] 배경 제거 완료 ({item_id}): {trimmed.size}")
    except Exception as e:
        print(f"[Trimmer] 배경 제거 실패 ({item_id}): {e}")
        return None

    if bbox is not None:
        try:
            trimmed = trimmed.crop(bbox)
            print(f"[Trimmer] bbox 크롭 완료 ({item_id}): {bbox}")
        except Exception as e:
            print(f"[Trimmer] 크롭 실패 ({item_id}): {e}")

    try:
        w, h = trimmed.size
        if h > CANVAS_MAX_HEIGHT:
            ratio    = CANVAS_MAX_HEIGHT / h
            new_size = (int(w * ratio), CANVAS_MAX_HEIGHT)
            trimmed  = trimmed.resize(new_size, Image.LANCZOS)
            print(f"[Trimmer] 리사이즈: {w}×{h} → {new_size[0]}×{new_size[1]}")

        buf = io.BytesIO()
        trimmed.save(buf, format="PNG")
        buf.seek(0)

        short_id = uuid.uuid4().hex[:4]
        s3_key   = f"external/{item_id}_{category}_{short_id}.png"

        # ← _s3 직접 사용 대신 _get_s3_client() 호출
        s3     = _get_s3_client()
        bucket = S3_BUCKET

        s3.upload_fileobj(
            buf,
            bucket,
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