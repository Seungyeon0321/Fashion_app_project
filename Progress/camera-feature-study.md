# Fashion App — AI Worker 세팅 진행 상황

## 프로젝트 컨텍스트

### 앱 개요
- 패션 앱 (옷 등록 + 코디 추천)
- 핵심 기능: 착용 사진 업로드 → AI가 옷 분리 → 벡터 저장 → 유사 스타일 매칭

### 최종 목표 기능
1. 옷 착용 사진 → SegFormer로 옷 영역 분리 → CLIP 벡터 추출 → DB 저장
2. 인스타/잡지 사진 업로드 → 내 옷장에서 비슷한 옷으로 코디 추천
3. 비슷한 옷이 없으면 구매 권유

---

## 기술 스택

### 전체 아키텍처 (시나리오 B — BullMQ + Python Worker)
```
Mobile (React Native)
    ↓ 이미지 업로드
Node.js API (NestJS) — validation + S3 저장 + BullMQ job 생성 → 200 즉시 반환
    ↓ (비동기)
BullMQ (Redis) — 작업 대기열
    ↓
Python Worker (FastAPI) — SegFormer + CLIP 분석
    ↓
PostgreSQL + pgvector — 벡터 저장
    ↓
클라이언트 polling → 완료 수신
```

### 모델 선택
- **Segmentation**: SegFormer-B2 (`mattmdjaga/segformer_b2_clothes`) — HuggingFace, 패션 fine-tuned, 17개 카테고리
- **벡터 추출**: CLIP (`openai/clip-vit-base-patch32`) — 512차원 벡터, 유사도 검색용
- **나중에**: YOLOv8 + SAM2 (복잡한 스타일 매칭 시 교체)

### 인프라 (MVP 단순화 버전)
```
EC2 t4g.medium   → API 서버 (Node.js)           ~$24/월
EC2 t4g.xlarge   → Worker + PostgreSQL + Redis   ~$98/월
S3               → 이미지 저장                   ~$1/월
────────────────────────────────────────────────────────
합계                                             ~$122/월
```

---

## 프로젝트 폴더 구조

```
fashion_app/
├── backend/                    ← NestJS API 서버 (기존)
│   ├── src/
│   │   ├── config/
│   │   ├── posts/
│   │   ├── prisma/
│   │   ├── s3/
│   │   └── generated/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── lambda/
│   │   └── yolo_analysis/      ← MobileNetV4 model.onnx (옷 validation용, 건드리지 말 것)
│   ├── models/
│   ├── Dockerfile.dev          ← 생성됨
│   └── package.json
├── frontend/                   ← React Native (기존)
├── ai-worker/                  ← Python Worker (새로 생성)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             ← Worker 진입점
│   │   ├── api/
│   │   │   └── __init__.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py       ← 환경변수 관리
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── segformer.py    ← SegFormer 래퍼 (구현 예정)
│   │   │   └── clip_encoder.py ← CLIP 래퍼 (구현 예정)
│   │   └── workers/
│   │       ├── __init__.py
│   │       ├── clothing_worker.py ← BullMQ job 처리
│   │       └── pipeline.py        ← 분석 파이프라인 (구현 예정)
│   ├── db/
│   │   └── init.sql            ← pgvector 테이블 초기화 SQL
│   ├── models/                 ← 모델 파일 저장 디렉토리
│   ├── Dockerfile              ← Worker 컨테이너
│   ├── requirements.txt        ← Python 의존성
│   └── .env.example
└── docker-compose.yml          ← 전체 서비스 오케스트레이션 (Step 7에서 사용)
```

---

## 현재 완료된 것

### Step 1 — Python 가상환경 세팅 ✅

**위치**: `fashion_app/ai-worker/`

**실행한 명령어**:
```powershell
# 가상환경 생성
python -m venv .venv

# 가상환경 활성화
.venv\Scripts\activate

# pip 최신화
python -m pip install --upgrade pip

# 핵심 의존성 설치
pip install redis pydantic pydantic-settings python-dotenv
```

**설치된 패키지 (확정 버전)**:
```
redis==7.4.0
pydantic==2.12.5
pydantic-settings==2.13.1
python-dotenv==1.2.2
```

**각 패키지 역할**:
- `redis` — Python에서 Redis 서버와 통신. BullMQ job을 꺼내올 때 사용
- `pydantic` — 데이터 유효성 검사. NestJS의 DTO 개념과 유사
- `pydantic-settings` — `.env` 파일을 Python 클래스로 자동 변환 (`config.py`에서 사용)
- `python-dotenv` — `.env` 파일 로드. pydantic-settings가 내부적으로 사용

---

### Step 2 — PostgreSQL + pgvector ✅

**기존에 만들어진 컨테이너를 그대로 사용** (8주 전 생성)

**컨테이너 정보**:
```
컨테이너 이름: clothing_db
이미지:       ankane/pgvector:latest (pgvector 포함 PostgreSQL 15)
포트:         5432 (내 노트북 5432 → 컨테이너 5432)
DB 이름:      clothing_db
유저:         user
비밀번호:     password
pgvector:     활성화됨 ✅
```

**pgvector 활성화 확인 명령어**:
```powershell
# 접속 테스트
docker exec -it clothing_db psql -U user -d clothing_db -c "\l"

# pgvector 확장 확인
docker exec -it clothing_db psql -U user -d clothing_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# pgvector 활성화 (이미 완료됨)
docker exec -it clothing_db psql -U user -d clothing_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Python 접속 URL**:
```
postgresql://user:password@localhost:5432/clothing_db
```

---

### Step 3 — Redis ✅

**기존에 만들어진 컨테이너를 그대로 사용**

**컨테이너 정보**:
```
컨테이너 이름: clothing_redis
이미지:       redis:alpine
포트:         6379 (내 노트북 6379 → 컨테이너 6379)
```

**Python 접속 URL**:
```
redis://localhost:6379
```

---

## 다음 단계

### Step 3-1 — config.py 수정 (즉시 시작 가능)

`ai-worker/app/core/config.py`의 DB 접속 정보를 기존 컨테이너에 맞게 수정해야 함.

현재 config.py 내용:
```python
DATABASE_URL: str = "postgresql://fashion_user:fashion_pass@localhost:5432/fashion_db"
```

수정해야 할 내용:
```python
DATABASE_URL: str = "postgresql://user:password@localhost:5432/clothing_db"
REDIS_URL: str = "redis://localhost:6379"
```

### Step 3-2 — Python에서 DB + Redis 연결 테스트

```powershell
# 가상환경 활성화 상태에서
# DB 연결 패키지 설치
pip install psycopg2-binary pgvector sqlalchemy

# 연결 테스트 스크립트 실행 (Claude가 만들어줄 예정)
python test_connections.py
```

### Step 4 — SegFormer 모델 로드 및 segmentation 구현
- `pip install transformers torch Pillow numpy`
- `app/models/segformer.py` 구현
- 실제 이미지로 옷 영역 분리 테스트

### Step 5 — CLIP 벡터 추출 구현
- `app/models/clip_encoder.py` 구현
- 크롭 이미지 → 512차원 벡터 → DB 저장 확인

### Step 6 — 전체 파이프라인 연결
- `app/workers/pipeline.py` 구현
- S3 fetch → segment → encode → DB까지 end-to-end 확인

### Step 7 — Docker Compose로 묶기
- 동작 확인된 코드를 컨테이너화
- `docker-compose.yml` 활용

---

## 중요 참고사항

### 건드리지 말아야 할 것
- `backend/lambda/yolo_analysis/model.onnx` — MobileNetV4, 현재 옷 validation에 사용 중

### 컨테이너 구조 이해
- 컨테이너 1개 = 프로그램 1개
- `clothing_db` (PostgreSQL) + `clothing_redis` (Redis) = 완전히 별개의 컨테이너
- 이미지(Image) = 설계도, 컨테이너(Container) = 실제 실행 중인 것

### Docker 명령어 요약
```powershell
docker ps                          # 실행 중인 컨테이너 목록
docker start clothing_db           # 컨테이너 시작
docker stop clothing_db            # 컨테이너 중지
docker inspect clothing_db         # 컨테이너 상세 정보
docker exec -it clothing_db bash   # 컨테이너 안으로 들어가기
```

### 가상환경 재활성화 (새 터미널 열 때마다)
```powershell
cd fashion_app/ai-worker
.venv\Scripts\activate
# (.venv) 표시 확인
```

---

## 핵심 개념 요약

| 기술 | 역할 | 접속 주소 |
|---|---|---|
| PostgreSQL (clothing_db) | 분석 결과 + CLIP 벡터 영구 저장 | localhost:5432 |
| Redis (clothing_redis) | BullMQ 작업 대기열 (임시) | localhost:6379 |
| SegFormer-B2 | 착용 사진에서 옷 영역 분리 | HuggingFace 모델 |
| CLIP | 옷 이미지 → 512차원 벡터 변환 | HuggingFace 모델 |
| pgvector | 벡터 유사도 검색 (`<=>` 연산자) | PostgreSQL 확장 |
| BullMQ | Node.js → Python 비동기 작업 전달 | Redis 기반 |
