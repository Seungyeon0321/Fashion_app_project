"""
YOLO 기반 의류/스타일 이미지 분석 Lambda Handler

- S3 트리거: uploads/ 에 파일 업로드 시 자동 실행 → 분석 후 백엔드 웹훅 호출
- 직접 호출(테스트): event['image_bytes'] (base64 또는 raw bytes) 지원
"""
import io
import json
import logging
import os
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

import boto3
import numpy as np
from PIL import Image
from ultralytics import YOLO

# 로거 생성 - 일반적인 파이썬 환경에서는 로그 설정을 위해 직접 basicConfig를 호출하지않는다
logger = logging.getLogger(__name__)
## 로거 레벨 생성 - INFo면 일반적인 작동 확인 정도
logger.setLevel(logging.INFO)

# Lambda cold start 시 한 번만 로드 (레이어 또는 /tmp 에 yolov8n.pt 배치)
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "/opt/python/yolov8n.pt")  # 레이어: /opt/python
model = None

# AWS 콘솔의 설정창에 접속해서 저장되어 있는 YOLO_CONF_THRESHOLD값을 가지고 온다
# 만약 저장되어 있지 않다면 두번째 인자인 기본값을 받는다
CONF_THRESHOLD = float(os.environ.get("YOLO_CONF_THRESHOLD", "0.45"))
PADDING_RATIO = float(os.environ.get("CROP_PADDING_RATIO", "0.1"))
BACKEND_WEBHOOK_URL = os.environ.get("BACKEND_WEBHOOK_URL", "")
WEBHOOK_SECRET = os.environ.get("BACKEND_WEBHOOK_SECRET", "")


def get_model():
    global model
    if model is None:
        model = YOLO(MODEL_PATH)
    return model


def get_image_bytes_from_event(event):
    """
    S3 트리거 이벤트면 S3에서 다운로드, 아니면 event['image_bytes'] 또는 event['body'] 사용.
    """
    # S3 Put 이벤트
    # event의 생김새는 아래와 같다, 즉 if "Records"을 통해서 이게 S3가 보낸 공식적인 트리거인지를 확인할 수 있다.
#    "Records": [
#     {
#       "eventVersion": "2.1",
#       "eventSource": "aws:s3",
#       "awsRegion": "us-east-1",
#       "s3": {
#         "bucket": { "name": "my-fashion-bucket" },
#         "object": { "key": "uploads/my-style.jpg" }
#       }
#     }
#   ]



    if "Records" in event and len(event["Records"]) > 0:
        record = event["Records"][0]
        if record.get("eventSource") == "aws:s3":
            bucket = record["s3"]["bucket"]["name"]
            key = record["s3"]["object"]["key"]
            #boto3는 python 코드로 AWS 서비스를 생성, 조회, 수정, 삭제할 수 있게 해주는 라이브러리
            s3 = boto3.client("s3") #이 과정에서는 아직 아무 요청도 안 보냈음
            obj = s3.get_object(Bucket=bucket, Key=key) #여기서 해당 s3를 호출하게 됨
            return obj["Body"].read(), bucket, key

    # 직접 호출: raw bytes - 백엔드에서 즉시 분석이 필요할 때 - S3를 호출하지 않고 바로 분석을 할 수 있게 해줌
    if "image_bytes" in event:
        #이미지 입력이 어디서 왔든 하나의 형식으로 정규화 하는 로직이야
        raw = event["image_bytes"]
        # raw가 base64 문자열이면 디코딩하고, 아니면 그대로 반환
        if isinstance(raw, str):
            import base64
            raw = base64.b64decode(raw)
        return raw, None, event.get("s3_key", "direct-invoke")

    # API Gateway 등: body에 base64 - 사용자가 만든 백엔드나 외부 클라이언트가 HTTP 요청으로
    # Lambda를 호출할 때, 중간에 API Gateway가 넣어주는 데이터, body로 한번 감싸서 보냄
    if "body" in event:
        import base64
        body = event["body"] if isinstance(event["body"], str) else event["body"].decode()
        payload = json.loads(body) if body.strip().startswith("{") else {"image_bytes": body}
        raw = payload.get("image_bytes", payload.get("image"))
        if isinstance(raw, str):
            raw = base64.b64decode(raw)
        return raw, None, payload.get("s3_key", "direct-invoke")

    raise ValueError("event must contain S3 Records or image_bytes/body")


def dominant_color_hex(pil_image, size=50, top_n=1):
    """
    크롭 이미지에서 대표 색상 1~2개를 hex 문자열로 반환.
    StyleReference.analysisResult / ClosetItem.colors 에 활용.
    """
    img = pil_image.copy()
    img = img.convert("RGB").resize((size, size))
    pixels = list(img.getdata())
    if not pixels:
        return "#808080"

    # 빈도 상위 색상 (대략적으로 양자화해 그룹화)
    q = 32  # 256/32 = 8 bins per channel
    buckets = {}
    for r, g, b in pixels:
        key = (r // q, g // q, b // q)
        buckets[key] = buckets.get(key, 0) + 1
    sorted_buckets = sorted(buckets.items(), key=lambda x: -x[1])

    colors = []
    # bucket에 담을 때 값을 32로 나눠서 그룹화 했으니, 다시 0~255 사이의 숫자로 되돌려야
    # 앱에서 쓸 수 있는 Hex 코드를 만들 수 있습니다.
    for (rq, gq, bq), _ in sorted_buckets[:top_n]:
        r, g, b = (rq * q + q // 2), (gq * q + q // 2), (bq * q + q // 2)
        colors.append("#{:02x}{:02x}{:02x}".format(min(255, r), min(255, g), min(255, b)))
    return colors[0] if colors else "#808080"


def run_yolo_and_crop(image_bytes, bucket, s3_key):
    """
    YOLO 추론 → bbox별 크롭(10% 패딩) + 색상 추출.
    반환: (analysis_result, crop_images, crop_boxes)
    - analysis_result: { "label_or_index": { "bbox": [x,y,w,h], "color": "#hex" }, ... }
    - crop_images: [ (bytes, content_type), ... ]
    - crop_boxes: [ [left, top, right, bottom], ... ] (원본 좌표)
    """
    # io.BytesIO - 실제 파일은 아니지만, 파일처럼 동작하는 바이너리 객체를 생성
    # 즉 이미지를 분석하거나 변환할 때 하드 디스크에 저장하지 않고 바로 처리하고 싶을 때 사용
    # 하드 디스크를 거치지 않고 메모리에서 처리하는 방식
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    yolo = get_model()
    results = yolo.predict(source=img, conf=CONF_THRESHOLD, verbose=False)

    analysis_result = {}
    crop_images = []
    crop_boxes_list = []

    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()
        clss = result.boxes.cls.cpu().numpy()
        names = result.names

        for idx, (box, cls) in enumerate(zip(boxes, clss)):
            label = names[int(cls)]
            xmin, ymin, xmax, ymax = map(float, box)
            w, h = xmax - xmin, ymax - ymin
            padding_w = w * PADDING_RATIO
            padding_h = h * PADDING_RATIO
            left = max(0, xmin - padding_w)
            top = max(0, ymin - padding_h)
            right = min(img.width, xmax + padding_w)
            bottom = min(img.height, ymax + padding_h)

            cropped = img.crop((left, top, right, bottom))
            buffer = io.BytesIO()
            cropped.save(buffer, format="JPEG", quality=95)
            crop_bytes = buffer.getvalue()

            color_hex = dominant_color_hex(cropped)
            # bbox: [x, y, w, h] (DB 스키마 및 UI bbox 관례)
            bbox = [round(left, 2), round(top, 2), round(right - left, 2), round(bottom - top, 2)]
            key = label if label not in analysis_result else f"{label}_{idx}"
            analysis_result[key] = {"bbox": bbox, "color": color_hex}

            crop_images.append((crop_bytes, "image/jpeg"))
            crop_boxes_list.append([left, top, right, bottom])

    return analysis_result, crop_images, crop_boxes_list


def upload_crops_to_s3(bucket, original_key, crop_images):
    """크롭 이미지들을 S3 crops/{original_key_no_ext}/0.jpg, 1.jpg, ... 로 업로드."""
    s3 = boto3.client("s3")
    base_key = "crops/" + original_key.rsplit(".", 1)[0] if "." in original_key else "crops/" + original_key
    keys = []
    for i, (data, _) in enumerate(crop_images):
        key = f"{base_key}/{i}.jpg"
        s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType="image/jpeg")
        keys.append(key)
    return keys


def notify_backend(correlation_id, original_s3_key, status, analysis_result=None, crop_s3_keys=None, error_message=None):
    """백엔드 웹훅 POST /api/ai/callback 호출."""
    if not BACKEND_WEBHOOK_URL:
        logger.warning("BACKEND_WEBHOOK_URL not set, skip webhook")
        return
    payload = {
        "correlationId": correlation_id,
        "originalS3Key": original_s3_key,
        "status": status,
        "analysisResult": analysis_result or {},
        "cropS3Keys": crop_s3_keys or [],
    }
    if error_message:
        payload["error"] = error_message
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        BACKEND_WEBHOOK_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": WEBHOOK_SECRET,
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            logger.info("webhook success status=%s", resp.status)
    except (URLError, HTTPError) as e:
        logger.exception("webhook failed: %s", e)
        raise


def handler(event, context):
    correlation_id = None
    original_s3_key = None
    bucket = None

    try:
        image_bytes, bucket, s3_key = get_image_bytes_from_event(event)
        correlation_id = s3_key
        original_s3_key = s3_key

        analysis_result, crop_images, _ = run_yolo_and_crop(image_bytes, bucket, s3_key)

        crop_s3_keys = []
        if bucket and crop_images:
            crop_s3_keys = upload_crops_to_s3(bucket, s3_key, crop_images)

        if BACKEND_WEBHOOK_URL:
            notify_backend(
                correlation_id=correlation_id,
                original_s3_key=original_s3_key,
                status="success",
                analysis_result=analysis_result,
                crop_s3_keys=crop_s3_keys,
            )
        else:
            # 로컬/테스트: body에 결과 그대로 반환 (crop은 S3 key만)
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "correlationId": correlation_id,
                    "originalS3Key": original_s3_key,
                    "status": "success",
                    "analysisResult": analysis_result,
                    "cropS3Keys": crop_s3_keys,
                }, ensure_ascii=False),
            }

        return {"statusCode": 200, "body": json.dumps({"status": "success", "detections": len(analysis_result)})}

    except Exception as e:
        logger.exception("handler failed: %s", e)
        if BACKEND_WEBHOOK_URL and correlation_id:
            try:
                notify_backend(
                    correlation_id=correlation_id or "unknown",
                    original_s3_key=original_s3_key or "",
                    status="failed",
                    error_message=str(e),
                )
            except Exception:
                pass
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "error": str(e)}),
        }
