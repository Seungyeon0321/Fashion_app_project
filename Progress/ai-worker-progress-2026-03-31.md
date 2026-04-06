# Fashion App — AI Worker 진행 상황 (2026-03-31 업데이트)

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
| Step 5 | CLIP 벡터 추출 구현 | 🔜 |
| Step 6 | 전체 파이프라인 연결 | 🔜 |
| Step 7 | Docker Compose | 🔜 |

---

## 폴더 구조 (현재)

```
fashion_app/
├── backend/
│   └── lambda/
│       └── yolo_analysis/     ← ⚠️ 건드리지 말 것 (MobileNetV4, 옷 validation용)
├── frontend/
└── ai-worker/
    ├── .venv/                 ← 패키지 설치 공간 (건드리지 않음)
    ├── app/
    │   ├── core/
    │   │   └── config.py      ← 환경변수 관리 ✅
    │   ├── models/
    │   │   ├── segformer.py   ← SegFormer 래퍼 ✅
    │   │   └── clip_encoder.py  ← 구현 예정
    │   └── workers/
    │       ├── clothing_worker.py  ← 구현 예정
    │       └── pipeline.py         ← 구현 예정
    ├── test_connections.py    ← 연결 테스트용 (배포 제외)
    ├── test_segformer.py      ← SegFormer 테스트용 (배포 제외)
    ├── .env                   ← 실제 환경변수 (git 제외)
    └── .env.example           ← 환경변수 템플릿
```

---

## 컨테이너 정보

### clothing_db (PostgreSQL)
```
이미지:  ankane/pgvector (PostgreSQL 15)
포트:    5432
DB:      clothing_db
유저:    user
비번:    password
URL:     postgresql://user:password@localhost:5432/clothing_db
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
docker ps                        # 실행 중 컨테이너 확인
docker start clothing_db         # DB 시작
docker start clothing_redis      # Redis 시작
```

---

## 설치된 패키지

```powershell
# 가상환경 활성화
cd fashion_app/ai-worker
.venv\Scripts\activate

# 전체 설치 명령어 (재설치 필요 시)
pip install redis pydantic pydantic-settings python-dotenv psycopg2-binary pgvector sqlalchemy boto3 transformers torch Pillow numpy
```

| 패키지 | 역할 |
|--------|------|
| redis | BullMQ job 수신 |
| pydantic | 데이터 형식 검사 |
| pydantic-settings | .env → Python 클래스 변환 |
| python-dotenv | .env 파일 로드 |
| psycopg2-binary | PostgreSQL 드라이버 |
| pgvector | pgvector Python 타입 지원 |
| sqlalchemy | ORM (Prisma의 Python 버전) |
| boto3 | AWS S3 다운로드 |
| transformers | HuggingFace 모델 로드 |
| torch | 딥러닝 연산 엔진 |
| Pillow | 이미지 처리 |
| numpy | 숫자 배열 연산 |

---

## 모델 선택 근거

### SegFormer-B2 선택 이유
| 후보 | 방식 | 문제점 |
|------|------|--------|
| YOLO (MobileNetV4) | Bounding Box | 박스 안에 배경/피부 포함 → CLIP 품질 저하 |
| SAM2 (Meta) | 픽셀 단위 분리 | 수GB, CPU에서 현실적으로 불가 |
| SegFormer-B2 ✅ | 픽셀 단위 분리 | 400MB, CPU 가능, 패션 특화 fine-tuning |

### CLIP 선택 이유
- 이미지를 512차원 벡터로 변환
- 벡터 간 코사인 유사도로 비슷한 옷 검색 가능
- pgvector의 `<=>` 연산자와 조합

---

## Step 4 테스트 결과

실제 착용샷 (4000×3000) 추론 결과:
```
[1] Upper-clothes (label_id=4)  mask_ratio: 37.4%
[2] Dress (label_id=7)          mask_ratio: 2.0%
[3] Bag (label_id=16)           mask_ratio: 1.4%  ← 핸드폰을 가방으로 인식 (정상)
```
크롭 이미지 test_output/ 폴더에 저장 확인.

---

## 다음 세션 시작 방법

```powershell
# 1. 컨테이너 시작 확인
docker ps

# 2. 가상환경 활성화
cd fashion_app/ai-worker
.venv\Scripts\activate

# 3. Step 5 시작
# clip_encoder.py 구현
```

## Step 5에서 할 것 — CLIP 벡터 추출

1. `app/models/clip_encoder.py` 구현
2. SegFormer 크롭 이미지 → 512차원 벡터 변환
3. pgvector DB에 저장 테스트

---

## 주의사항

- `backend/lambda/yolo_analysis/model.onnx` → 절대 건드리지 말 것
- `test_*.py` 파일은 배포 시 Dockerfile COPY 대상에서 제외할 것
- `.env` 파일은 git에 올리지 말 것 (.gitignore 확인)
- Windows에서 HuggingFace 심볼릭 링크 경고는 무시해도 됨 (EC2에서는 안 나옴)
- S3에 올라가는 이미지는 1280px 버전 (224×224 validation 버퍼는 S3에 올라가지 않음)
