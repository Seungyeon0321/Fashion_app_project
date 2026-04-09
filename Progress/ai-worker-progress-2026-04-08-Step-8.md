# Fashion App — AI Worker 진행 상황 (2026-04-08 업데이트)

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
| Step 8 | Docker Compose 컨테이너화 완료 | ✅ |

---

## 폴더 구조 (현재)

```
fashion_app/
├── docker-compose.yml          ← 세 서비스를 하나로 묶는 설정 ✅
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
    ├── Dockerfile                 ← ai-worker 이미지 빌드 방법 ✅
    ├── requirements.txt           ← 설치할 패키지 목록 ✅
    ├── test_connections.py    ← 배포 제외
    ├── test_segformer.py      ← 배포 제외
    ├── test_clip.py           ← 배포 제외
    ├── test_pipeline.py       ← 배포 제외
    ├── test_worker.py         ← 배포 제외
    ├── .env                   ← 로컬 개발용 환경변수 (git 제외)
    ├── .env.docker            ← Docker 실행용 환경변수 (git 제외)
    └── .env.example
```

---

## Docker Compose가 왜 필요한가?

### 기존 방식의 문제

Step 7까지는 이렇게 실행했다:
- `docker start clothing_db` — 수동으로
- `docker start clothing_redis` — 수동으로
- `.venv\Scripts\activate` 후 `python -m app.workers.clothing_worker` — 수동으로

세 개를 각각 켜야 하고, 순서도 지켜야 하고, EC2에 배포할 때도 같은 수동 작업을 반복해야 한다.

### Docker Compose로 해결

`docker compose up` 명령어 하나로:
1. clothing_db (PostgreSQL) 시작
2. clothing_redis (Redis) 시작
3. 두 개가 healthy 상태가 되면 → clothing_worker (Python AI Worker) 자동 시작

순서 보장, 자동화, EC2에서도 동일하게 동작한다.

### .env vs .env.docker — 왜 두 개인가?

Docker Compose로 묶인 컨테이너끼리는 같은 가상 네트워크 안에 있다.
이때 `localhost`는 "자기 자신 컨테이너"를 가리키기 때문에 다른 컨테이너에 접근할 수 없다.
대신 **서비스 이름**이 호스트 주소가 된다.

```
# 로컬 개발 (.env)
DB_URL=postgresql://user:password@localhost:5433/clothing_db
REDIS_URL=redis://localhost:6379

# Docker 내부 (.env.docker)
DB_URL=postgresql://user:password@db:5432/clothing_db
REDIS_URL=redis://redis:6379
```

포트도 달라지는 이유:
- 로컬에서 `5433`을 쓴 건 Windows PC의 PostgreSQL 17과 충돌 방지용 외부 포트 매핑
- Docker 내부 네트워크에서는 컨테이너 내부 포트 `5432`로 직접 접속

---

## 최종 파일 내용

### docker-compose.yml

```yaml
services:
  db:
    image: ankane/pgvector:latest
    container_name: clothing_db
    environment:
      POSTGRES_DB: clothing_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d clothing_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    container_name: clothing_redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  worker:
    build:
      context: ./ai-worker
      dockerfile: Dockerfile
    container_name: clothing_worker
    env_file:
      - ./ai-worker/.env.docker
    volumes:
      - model_cache:/root/.cache/huggingface
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  model_cache:
```

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch==2.11.0 torchvision==0.26.0

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

COPY .env.docker .env

CMD ["python", "-m", "app.workers.clothing_worker"]
```

### requirements.txt

```
psycopg2-binary==2.9.11
pgvector==0.4.2
SQLAlchemy==2.0.48
redis==7.4.0
boto3==1.42.80
transformers==5.4.0
Pillow==12.1.1
numpy==2.4.4
pydantic==2.12.5
pydantic-settings==2.13.1
python-dotenv==1.2.2
```

---

## 트러블슈팅 기록

### 1. 파일 인코딩 문제 (UnicodeDecodeError)

**증상**
```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xfd in position 1958
```

**원인**
Windows에서 파일을 저장할 때 UTF-8이 아닌 다른 인코딩(UTF-16, ANSI 등)으로 저장됨.
Docker 컨테이너 안의 pip는 순수 UTF-8만 읽을 수 있어서 에러 발생.
Dockerfile의 한글 주석도 같은 문제로 깨짐 (`ì»¨í…Œì´ë„ˆ` 형태로 출력).

**해결**
Python으로 파일을 새로 생성 (인코딩 명시):
```python
with open('requirements.txt', 'w', encoding='utf-8') as f:
    f.write(content)
```
VS Code에서 저장 시: 오른쪽 하단 인코딩 클릭 → Save with Encoding → UTF-8 선택.

**교훈**
Windows에서 Docker용 파일을 만들 때는 항상 UTF-8 인코딩 확인 필요.
PowerShell의 `Out-File -Encoding utf8NoBOM`은 구버전 PowerShell에서 지원 안 됨.

---

### 2. numpy 버전 호환 문제

**증상**
```
ERROR: Could not find a version that satisfies the requirement numpy==2.4.4
Ignored the following versions that require a different python version:
2.3.0 Requires-Python >=3.11; ...
```

**원인**
numpy 2.3.0 이상은 Python 3.11 이상에서만 설치 가능.
Dockerfile에 `python:3.10-slim`을 사용했는데, 로컬 venv는 Python 3.11 환경이라
`pip freeze` 결과에 numpy 2.4.4가 찍혔음.

**해결**
Dockerfile 첫 줄 변경:
```
FROM python:3.10-slim  →  FROM python:3.11-slim
```

**교훈**
`pip freeze`를 그대로 requirements.txt에 쓰면 안 됨.
로컬 환경과 Docker 환경의 Python 버전이 다를 수 있음.
직접 설치한 패키지만 버전 명시하고, 의존성은 pip가 자동으로 해결하게 둬야 함.

---

### 3. pydantic Settings 필드명 대소문자 불일치

**증상**
```
pydantic_core.ValidationError: 1 validation error for Settings
db_url
  Extra inputs are not permitted [type=extra_forbidden]
```

**원인**
`config.py`의 Settings 클래스 필드명과 `.env.docker`의 환경변수명이 대소문자로 불일치.
pydantic-settings는 환경변수를 읽을 때 대소문자를 구분함.

**해결**
config.py의 Settings 클래스 필드명과 .env.docker 환경변수명을 일치시킴.

---

### 4. clothing_items 테이블 없음

**증상**
```
psycopg2.errors.UndefinedTable: relation "clothing_items" does not exist
```

**원인**
Docker Compose로 새 volume이 생성되면서 DB가 완전히 빈 상태.
로컬 테스트 때는 이미 테이블이 있었지만, 새 컨테이너는 테이블이 없음.
`clothing_worker.py`의 `run_worker()`에서 `init_db()` 호출이 빠져 있었음.

**해결**
`clothing_worker.py`의 `run_worker()` 함수 시작 부분에 추가:
```python
def run_worker() -> None:
    from app.db.database import init_db
    init_db()  # Worker 시작 시 테이블 자동 생성
    ...
```

**교훈**
Worker가 새 환경에서 시작될 때 항상 DB 초기화를 먼저 실행해야 함.
`init_db()`는 테이블이 이미 있으면 건너뛰기 때문에 중복 실행해도 안전함 (CREATE TABLE IF NOT EXISTS).

---

### 5. AWS 키 노출

**증상**
`.env.docker` 파일 내용을 대화창에 붙여넣으면서 AWS Access Key와 Secret Key가 노출됨.

**해결**
IAM 콘솔에서 해당 키 즉시 비활성화(Deactivate) 후 삭제, 새 키 발급.

**교훈**
민감한 정보(.env 파일 내용, API 키, 비밀번호)는 절대 대화창에 붙여넣지 않을 것.
AWS 키가 노출되면 봇이 자동으로 수집해서 EC2 인스턴스를 수백 개 띄우는 사고가 발생할 수 있음.

---

## 최종 테스트 결과

```
[DB] 테이블 초기화 완료
[INFO] Worker 시작 | queue=clothing
[INFO] 처리 시작 | job_id=test-001 user_id=test-user-123
[Pipeline] 이미지 크기: (4000, 3000)
[SegFormer] 모델 로드 완료
[Pipeline] 검출된 옷: 3개
[CLIP] 모델 로드 완료
[Pipeline] CLIP 인코딩: Upper-clothes (mask_ratio=0.3736)
[Pipeline] CLIP 인코딩: Dress (mask_ratio=0.0201)
[Pipeline] CLIP 인코딩: Bag (mask_ratio=0.014)
[Pipeline] DB 저장 완료: ids=[1, 2, 3]
[INFO] 처리 완료 | job_id=test-001 | 저장된 clothing_item ids: [1, 2, 3]
```

`docker compose up` 하나로 전체 파이프라인이 동작하는 구조 완성.

---

## 다음 세션 시작 방법

```powershell
# 1. Docker Compose로 전체 실행
cd C:\Coding\personal_projects\fashion_app
docker compose up

# 2. 로그 확인
docker logs clothing_worker --follow

# 3. 테스트 job 투입 (새 터미널)
cd ai-worker
.venv\Scripts\activate
python test_worker.py
```

---

## 다음 단계 후보

- **EC2 배포** — Docker Compose 그대로 t4g.xlarge에 올리기
- **모델 캐시 최적화** — 컨테이너 시작마다 HuggingFace에서 재다운로드 방지
- **NestJS 연동 테스트** — 실제 백엔드에서 job 투입 시 worker 처리 확인

---

## 주의사항

- `backend/lambda/yolo_analysis/model.onnx` → 절대 건드리지 말 것
- `test_*.py` 파일은 Dockerfile COPY 대상에서 제외됨
- `.env`, `.env.docker` 파일은 git에 올리지 말 것
- Windows에서 파일 생성 시 항상 UTF-8 인코딩 확인
- 민감한 정보는 절대 대화창에 붙여넣지 말 것
- 로컬 PostgreSQL 17이 5432를 쓰므로 Docker clothing_db는 외부 포트 5433 사용
- transformers 5.4.0 환경 — CLIP pooler_output 이슈 해결됨
- redis-py 7.x — `blmove()` 위치 인자로 호출해야 함
