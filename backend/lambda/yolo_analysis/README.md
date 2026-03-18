# YOLO 분석 Lambda

S3 `uploads/` 업로드 시 트리거되어 YOLO로 객체 검출 → 크롭 + 색상 추출 → S3에 크롭 저장 → 백엔드 웹훅 호출.

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `YOLO_MODEL_PATH` | - | 기본 `/opt/python/yolov8n.pt` (레이어에 둘 경우) |
| `YOLO_CONF_THRESHOLD` | - | 기본 `0.45` |
| `CROP_PADDING_RATIO` | - | 기본 `0.1` (10% 패딩) |
| `BACKEND_WEBHOOK_URL` | 권장 | 예: `https://api.example.com/api/ai/callback` |
| `BACKEND_WEBHOOK_SECRET` | 권장 | 웹훅 검증용 시크릿 |

## 배포 참고

- **모델**: `yolov8n.pt` 를 Lambda Layer (`/opt/python/`) 또는 `/tmp` 에 포함.
- **의존성**: `ultralytics`, `Pillow`, `numpy` 를 레이어 또는 패키지에 포함. `boto3` 는 런타임 기본 제공.
- **메모리/타임아웃**: YOLO 사용 시 메모리 1024MB 이상, 타임아웃 60초 이상 권장.
- **S3 트리거**: 버킷 이벤트에 `uploads/` prefix 로 Put 설정.

## 테스트 (직접 호출)

```json
{
  "image_bytes": "<base64 인코딩된 이미지 문자열>",
  "s3_key": "uploads/test/sample.jpg"
}
```

또는 로컬에서 S3 이벤트 형태로 테스트 시뮬레이션 가능.
