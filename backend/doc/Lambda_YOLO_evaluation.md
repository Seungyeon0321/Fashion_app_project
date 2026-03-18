# Lambda YOLO 분석 코드 평가 및 개선

## 1. 현재 코드 평가

### ✅ 적합한 점
- **YOLO + Crop**: 옷 영역 검출 후 10% 패딩으로 크롭하는 흐름은 UI에서 bbox 표시·개별 아이템 분석에 적합함.
- **신뢰도 임계값(0.45)**: 노이즈 검출을 줄이는 데 도움됨.
- **반환 구조**: `label`, `box`, `data`(바이트)로 백엔드에서 활용 가능한 형태.

### ⚠️ 아키텍처와 맞지 않는 부분

| 항목 | 현재 코드 | 실제 흐름 (S3 트리거) |
|------|-----------|------------------------|
| **입력** | `event['image_bytes']` | S3 이벤트(`bucket`, `key`) → Lambda가 S3에서 이미지 **다운로드** 필요 |
| **출력** | `body`에 crop **바이트** 포함 | 응답 크기 제한(6MB 등) + 웹훅으로 **백엔드 API 호출** 필요 |
| **연동** | 없음 | 분석 완료 후 `POST /api/ai/callback` 등으로 결과 전송 |

### ⚠️ DB 스키마와의 정합성
- **StyleReference.analysisResult**: `{ "top": { "bbox": [x,y,w,h], "color": "red" }, "bottom": ... }` 형태 기대.
  - 현재는 `label`(YOLO 클래스명), `box`(left, top, right, bottom)만 있음 → **color** 필드 없음.
- **ClosetItem.colors**: `String[]` → 크롭별 **주요 색상** 추출이 있으면 DB 저장에 유리함.

### ⚠️ YOLO 모델 한계
- **YOLOv8n (COCO)**: person, car, tie, handbag 등 80클래스 → **옷 카테고리(TOP/BOTTOM/OUTER 등)**와 1:1 대응되지 않음.
- **권장**:  
  - 단기: COCO 클래스 → 앱 `Category`/`SubCategory` 매핑 테이블 사용.  
  - 중장기: 패션 데이터로 **Fine-tuning** 또는 패션 전용 detection 모델 검토.

### ⚠️ 기타
- **에러 처리**: S3/이미지/YOLO 예외 처리 없음 → 실패 시 로그·재시도 정책 필요.
- **상관 ID**: 백엔드가 “어떤 업로드”에 대한 결과인지 알려면 `styleRefId` 또는 `s3_key`(경로에 id 포함) 등 **correlation id**가 웹훅 본문에 포함되어야 함.
- **Lambda 리소스**: `yolov8n.pt`는 레이어 또는 `/tmp`에 두고, 메모리·타임아웃 충분히 할당 필요.

---

## 2. 아키텍처 흐름에 맞는 개선 방향

1. **입력**: S3 이벤트 파싱 → `bucket`/`key`로 이미지 다운로드. (선택) 직접 테스트용으로 `event['image_bytes']` 유지.
2. **처리**: 기존 YOLO + 패딩 크롭 유지. 크롭별 **주요 색상** 추출 추가(예: PIL + 간단 색상 양자화).
3. **출력**:
   - 크롭 이미지는 **S3에 업로드** (예: `crops/{original_key}/{index}.jpg`) → 응답은 경로만 전달.
   - `analysisResult` 형태로 정리: `{ "<label_or_position>": { "bbox": [x,y,w,h], "color": "#hex" }, ... }`.
4. **연동**: 환경 변수 `BACKEND_WEBHOOK_URL`, `BACKEND_WEBHOOK_SECRET` 등으로 백엔드 `POST /api/ai/callback` 호출. 본문에 `correlation_id`(S3 key 또는 메타데이터), `original_s3_key`, `detections`(analysisResult), `crop_s3_keys` 포함.
5. **에러**: try/except, 로깅, 실패 시 웹훅으로 `status: "failed"` 전송하면 백엔드에서 재시도·알림 정책 구현 가능.

---

## 3. 백엔드 웹훅 API 계약 (권장)

Lambda가 호출할 백엔드 엔드포인트 예시:

- **URL**: `POST {BACKEND_URL}/api/ai/callback`
- **Headers**: `Content-Type: application/json`, `X-Webhook-Secret: {BACKEND_WEBHOOK_SECRET}`
- **Body**:
```json
{
  "correlationId": "uploads/user123/style-ref-456.jpg",
  "originalS3Key": "uploads/user123/style-ref-456.jpg",
  "status": "success",
  "analysisResult": {
    "top": { "bbox": [10, 20, 200, 300], "color": "#8B4513" },
    "bottom": { "bbox": [10, 310, 200, 600], "color": "#000080" }
  },
  "cropS3Keys": [
    "crops/uploads/user123/style-ref-456/0.jpg",
    "crops/uploads/user123/style-ref-456/1.jpg"
  ]
}
```
- **실패 시**: `"status": "failed", "error": "메시지"` 등.

백엔드에서는 `correlationId`(또는 key 파싱)로 해당 StyleReference/ClosetItem을 찾아 `analysisResult` 등을 DB에 저장하면 됨.

---

## 4. 개선된 Lambda 코드 위치

- **핸들러**: `backend/lambda/yolo_analysis/handler.py`
- **의존성**: `backend/lambda/yolo_analysis/requirements.txt`
- **동작 요약**:
  - S3 트리거 시 해당 객체 다운로드 후 YOLO + 크롭 + 크롭별 dominant color 추출.
  - 크롭 이미지는 S3 `crops/{original_key}/0.jpg`, `1.jpg`, ... 로 업로드.
  - `BACKEND_WEBHOOK_URL` 이 설정되면 위 계약대로 POST 로 결과 전송.
  - 직접 호출 시 `event['image_bytes']` (또는 body 내 base64) 지원.
  - 실패 시 웹훅으로 `status: "failed"` 전송.
