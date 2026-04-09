# Fashion App — AI Worker 진행 상황 (2026-04-07 업데이트)

## 프로젝트 개요

패션 앱의 AI 분석 파이프라인 구축 프로젝트.
사용자가 착용샷을 올리면 AI가 옷을 분리하고 벡터로 저장해 유사 스타일을 매칭한다.

### 전체 아키텍처
```
Mobile (React Native)
    ↓ 이미지 업로드
NestJS — validation + S3 저장 + BullMQ job 생성 → 200 즉시 반환
    ↓ (비동기)
BullMQ (Redis) — 작업 대기열
    ↓
Python Worker — SegFormer + CLIP 분석
    ↓
PostgreSQL + pgvector — 벡터 저장
    ↓
클라이언트 polling → 완료 수신
```

### 인프라 (MVP)
| 서버 | 역할 | 비용 |
|------|------|------|
| EC2 t4g.medium | NestJS API 서버 | ~$24/월 |
| EC2 t4g.xlarge | Python Worker + PostgreSQL + Redis | ~$98/월 |
| S3 | 이미지 저장 (ap-northeast-2) | ~$1/월 |

---

## 현재 완료 상태

| 단계 | 내용 | 상태 |
|------|------|------|
| Step 1 | Python 가상환경 (.venv) 생성 | ✅ |
| Step 2 | PostgreSQL + pgvector 컨테이너 확인 | ✅ |
| Step 3 | Redis 컨테이너 확인 | ✅ |
| Step 3-1 | config.py 작성 (접속 정보 설정) | ✅ |
| Step 3-2 | DB + Redis 연결 테스트 통과 | ✅ |
| Step 4 | SegFormer 모델 로드 + 실제 착용샷 추론 성공 | ✅ |
| Step 5 | CLIP 벡터 추출 구현 + 테스트 통과 | ✅ |
| Step 6 | 전체 파이프라인 연결 + DB 저장 테스트 통과 | ✅ |
| Step 7 | BullMQ job consumer 연결 + end-to-end 테스트 통과 | ✅ |
| Step 8 | Docker Compose | 🔜 |

---

## 폴더 구조 (현재)

```
fashion_app/
├── backend/
│   └── lambda/
│       └── yolo_analysis/     ← ⚠️ 건드리지 말 것 (MobileNetV4, 옷 validation용)
├── frontend/
└── ai-worker/
    ├── .venv/
    ├── app/
    │   ├── core/
    │   │   └── config.py          ← 환경변수 관리 ✅
    │   ├── db/
    │   │   ├── __init__.py
    │   │   └── database.py        ← SQLAlchemy ORM + clothing_items 테이블 ✅
    │   ├── models/
    │   │   ├── segformer.py       ← SegFormer 래퍼 ✅
    │   │   └── clip_encoder.py    ← CLIP 벡터 추출 ✅
    │   └── workers/
    │       ├── __init__.py
    │       ├── pipeline.py        ← 전체 파이프라인 연결 ✅
    │       └── clothing_worker.py ← BullMQ consumer ✅
    ├── test_connections.py    ← 배포 제외
    ├── test_segformer.py      ← 배포 제외
    ├── test_clip.py           ← 배포 제외
    ├── test_pipeline.py       ← 배포 제외
    ├── test_worker.py         ← 배포 제외
    ├── .env                   ← 실제 환경변수 (git 제외)
    └── .env.example
```

---

## 컨테이너 정보

### clothing_db (PostgreSQL + pgvector)
```
이미지:  ankane/pgvector (PostgreSQL 15)
포트:    5433 (로컬 PostgreSQL 17과 충돌 방지를 위해 5433 사용)
DB:      clothing_db
유저:    user
비번:    password
URL:     postgresql://user:password@localhost:5433/clothing_db
pgvector: 활성화됨
```

### clothing_redis (Redis)
```
이미지:  redis:alpine
포트:    6379
URL:     redis://localhost:6379
```

### Docker 명령어
```powershell
docker ps
docker start clothing_db
docker start clothing_redis
docker inspect clothing_db --format "{{json .Config.Env}}"  # 접속 정보 확인

# Redis 큐 상태 확인
docker exec -it clothing_redis redis-cli
LRANGE bull:clothing:wait 0 -1
LRANGE bull:clothing:active 0 -1
ZRANGE bull:clothing:failed 0 -1
```

---

## .env 파일 내용

```
DB_URL=postgresql://user:password@localhost:5433/clothing_db
REDIS_URL=redis://localhost:6379
S3_BUCKET=your-bucket-name
S3_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SEGFORMER_MODEL_NAME=mattmdjaga/segformer_b2_clothes
CLIP_MODEL_NAME=openai/clip-vit-base-patch32
IMAGE_PATH=
```

---

## 설치된 패키지

```powershell
cd fashion_app/ai-worker
.venv\Scripts\activate
pip install redis pydantic pydantic-settings python-dotenv psycopg2-binary pgvector sqlalchemy boto3 transformers torch Pillow numpy
```

---

## 주요 파일 설명

### app/core/config.py
pydantic-settings로 `.env` 파일을 Python 클래스로 변환.
`settings.DB_URL` 같은 형태로 어디서든 접근 가능.

### app/models/segformer.py
- 모델: `mattmdjaga/segformer_b2_clothes` (HuggingFace, ~400MB)
- 역할: 착용샷 → 픽셀 단위 세그멘테이션 → 옷 종류별 크롭 이미지 반환
- 패턴: Lazy loading (처음 segment() 호출 시 모델 로드)
- 출력: `[{"label": "Upper-clothes", "label_id": 4, "image": PIL, "bbox": [x,y,w,h], "mask_ratio": 0.37}, ...]`
- mask_ratio 임계값: 0.01 (전체의 1% 미만이면 노이즈로 스킵)

### app/models/clip_encoder.py
- 모델: `openai/clip-vit-base-patch32` (HuggingFace, ~600MB)
- 역할: 크롭 이미지 → 512차원 벡터 변환
- 패턴: Lazy loading + L2 정규화 필수
- 주의: transformers 5.x에서 `get_image_features()` 반환 타입이
  `BaseModelOutputWithPooling`으로 바뀜 → `.pooler_output`으로 꺼내야 함
- 출력: `np.ndarray, shape=(512,), dtype=float32, norm=1.0`

```python
# 핵심 패턴 — 버전 방어 코드
def _extract_features(self, pixel_values):
    output = self._model.get_image_features(pixel_values=pixel_values)
    if isinstance(output, torch.Tensor):
        return output
    else:
        return output.pooler_output  # transformers 5.x 이상
```

### app/db/database.py
- SQLAlchemy ORM으로 `clothing_items` 테이블 정의
- `Vector(512)` 타입 = pgvector 전용, numpy array → DB 벡터 자동 변환
- `init_db()`: Worker 시작 시 1회 실행 (pgvector 확장 활성화 + 테이블 생성)
- `get_session()`: DB 세션 반환, 반드시 `try/finally`로 close() 보장

```python
class ClothingItem(Base):
    __tablename__ = "clothing_items"
    id         = Column(Integer, primary_key=True)
    label      = Column(String)           # "Upper-clothes"
    label_id   = Column(Integer)
    source_s3_key = Column(String)
    bbox       = Column(JSON)             # [x, y, w, h]
    mask_ratio = Column(Float)
    embedding  = Column(Vector(512))      # 핵심 벡터 컬럼
    created_at = Column(DateTime, server_default=func.now())
```

### app/workers/pipeline.py
- SegFormer + CLIP + DB 저장을 end-to-end로 연결
- `run(image=PIL)` 또는 `run(s3_key="...")` 중 하나로 호출
- 반환: 저장된 `ClothingItem` id 리스트

```python
# 핵심 흐름
crops = self.segmenter.segment(image)          # SegFormer
for crop in crops:
    vector = self.encoder.encode(crop["image"]) # CLIP
    item = ClothingItem(embedding=vector.tolist(), ...)
    session.add(item)
session.commit()
```

### app/workers/clothing_worker.py
- BullMQ(Redis) job consumer
- `BLMOVE`로 wait → active atomic 이동 (redis-py 7.x: 위치 인자로 호출)
- BullMQ 버전에 따라 두 가지 job 구조 모두 처리:
  - 케이스 A: wait 리스트에 JSON 전체 저장 (구버전 BullMQ v1~2)
  - 케이스 B: wait 리스트에 job ID만 저장, 데이터는 `bull:clothing:{id}` Hash (신버전 v3~5)
- 성공 시: active에서 삭제
- 실패 시: failed ZSet으로 이동 (score = timestamp)
- SIGINT/SIGTERM graceful shutdown 처리

```python
# 핵심 루프
while not shutdown["flag"]:
    raw = r.blmove(WAIT_KEY, ACTIVE_KEY, 5, "RIGHT", "LEFT")
    if raw is None:
        continue
    process_job(r, pipeline, raw)
```

#### 실패한 job 재시도 방법
```python
# test_worker.py의 retry_failed() 함수 사용
def retry_failed():
    failed_jobs = r.zrange(FAILED_KEY, 0, -1)
    for job in failed_jobs:
        r.lpush(WAIT_KEY, job)
        r.zrem(FAILED_KEY, job)
```

---

## 테스트 결과 요약

### Step 4
```
[1] Upper-clothes (label_id=4)  mask_ratio: 37.4%
[2] Dress (label_id=7)          mask_ratio: 2.0%
[3] Bag (label_id=16)           mask_ratio: 1.4%  ← 핸드폰 오인식 (정상)
```

### Step 5
```
벡터 shape:  (512,)
벡터 dtype:  float32
L2 norm:     1.000000
```

### Step 6
```
id=1 | Upper-clothes | mask_ratio=0.4064 | vector[:3]=[ 0.003  0.037 -0.024]
id=2 | Dress         | mask_ratio=0.0883 | vector[:3]=[-0.003  0.027 -0.020]
id=3 | Bag           | mask_ratio=0.0241 | vector[:3]=[ 0.004  0.012 -0.005]
```

### Step 7
```
[INFO] Worker 시작 | queue=clothing
[INFO] 처리 시작 | job_id=test-001 user_id=test-user-123 s3_key=uploads/test-photo.jpg
[Pipeline] 검출된 옷: 3개
[Pipeline] DB 저장 완료: ids=[4, 5, 6]
[INFO] 처리 완료 | job_id=test-001 | 저장된 clothing_item ids: [4, 5, 6]
```

NestJS → Redis → Python Worker → DB까지 전체 비동기 파이프라인 end-to-end 완료.

---

## 다음 세션 시작 방법

```powershell
# 1. 컨테이너 시작 확인
docker ps

# 2. 가상환경 활성화
cd fashion_app/ai-worker
.venv\Scripts\activate

# 3. Step 8 시작
# Docker Compose로 전체 컨테이너화
```

---

## Step 8에서 할 것 — Docker Compose

ai-worker 전체를 Docker 이미지로 만들고,
기존 clothing_db + clothing_redis 컨테이너와 함께 `docker-compose.yml`로 묶기.

```yaml
# docker-compose.yml 예상 구조
services:
  db:        # clothing_db (ankane/pgvector)
  redis:     # clothing_redis (redis:alpine)
  worker:    # ai-worker (Python, Dockerfile 새로 작성)
```

주의사항:
- `test_*.py` 파일은 Dockerfile COPY 대상에서 제외
- `.env` 파일은 docker-compose의 `env_file`로 주입
- 모델 캐시 (~1GB) 는 volume으로 마운트해서 컨테이너 재시작 시 재다운로드 방지

---

## 주의사항

- `backend/lambda/yolo_analysis/model.onnx` → 절대 건드리지 말 것
- `test_*.py` 파일은 Dockerfile COPY 대상에서 제외할 것
- `.env` 파일은 git에 올리지 말 것
- Windows에서 HuggingFace 심볼릭 링크 경고는 무시 (EC2에서는 안 나옴)
- S3에 올라가는 이미지는 1280px 버전 (224×224 validation 버퍼는 S3 미업로드)
- 로컬 PostgreSQL 17이 5432를 쓰므로 Docker clothing_db는 5433 사용
- transformers 5.4.0 환경 — CLIP pooler_output 이슈 해결됨
- redis-py 7.x — `blmove()` 키워드 인자 없이 위치 인자로 호출해야 함

---

## 트러블슈팅 기록

### 1. CLIP pooler_output 에러 (transformers 5.x)
- 증상: `AttributeError: 'BaseModelOutputWithPooling' object has no attribute 'norm'`
- 원인: transformers 5.x에서 `get_image_features()` 반환 타입 변경
- 해결: `isinstance(output, torch.Tensor)`로 분기 후 `.pooler_output` 추출

### 2. Python 출력이 안 보이는 문제
- 원인: Windows에서 출력 버퍼링
- 해결: `print(..., flush=True)` 또는 `python -u` 옵션 사용

### 3. DB 포트 충돌 (로컬 PostgreSQL vs Docker)
- 증상: `clothing_db` 연결 시 로컬 PostgreSQL로 접속됨
- 원인: 둘 다 5432 포트 사용
- 해결: Docker 컨테이너 외부 포트를 5433으로 변경, DB_URL도 업데이트

### 4. pixel_values 전달 방식
- 증상: `get_image_features(**inputs)` 호출 시 예상치 못한 동작
- 원인: CLIPProcessor 반환 딕셔너리에 텍스트 처리용 키가 섞여 있음
- 해결: `pixel_values = inputs["pixel_values"]`만 명시적으로 추출해서 전달

### 5. blmove() 키워드 인자 에러 (redis-py 7.x)
- 증상: `TypeError: BasicKeyCommands.blmove() got an unexpected keyword argument 'direction'`
- 원인: redis-py 7.x에서 파라미터 이름 변경
- 해결: `r.blmove(WAIT_KEY, ACTIVE_KEY, 5, "RIGHT", "LEFT")` — 위치 인자로 호출

### 6. Settings S3_REGION 속성 에러
- 증상: `AttributeError: 'Settings' object has no attribute 'S3_REGION'`
- 원인: config.py에서 변수명이 `AWS_REGION`으로 정의됨
- 해결: pipeline.py에서 `settings.S3_REGION` → `settings.AWS_REGION` 으로 수정
