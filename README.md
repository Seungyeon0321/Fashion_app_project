# AI Fashion Coordinator (MVP)

AI 기반 패션 코디네이터 앱으로, 사용자의 옷장(Closet)을 사진으로 등록하고(CV: YOLO, 임베딩: CLIP), 스타일북과 날씨를 반영해 “오늘의 코디”를 추천합니다.  
또한 스타일북에 보이는 아이템 중 사용자의 옷장에 없는 “빠진 조합(what’s missing)”을 찾아 제휴 링크로 연결하는 것을 목표로 합니다.

---

## 주요 기능

1. **디지털 옷장 (AI Closet)**
   - 사진 업로드 기반 자동 카테고리 분류 (YOLO 기반)
   - CLIP 임베딩(768-dim) 추출 및 저장(pgvector)
   - isWashing / isArchived 상태를 반영해 추천 품질 향상
   - 아이템별 착용 온도 범위(minTemp / maxTemp) 기반 날씨 적응

2. **스타일북 (Reference Gallery)**
   - 매거진/핀터레스트/인스타 스크린샷 등에서 “Goal Style” 저장
   - 이미지 분해 후 임베딩(스타일 무드 벡터) 저장
   - 스타일북의 무드를 학습해 추천 필터를 정교화

3. **데일리 코디 (Weather-Adaptive Suggestion)**
   - 위치 기반 날씨 API로 실시간 온도/강수 조건 동기화
   - 1차 필터링(현재 온도에 맞는 아이템만)
   - 벡터 검색(코사인 유사도)으로 랭킹하여 코디 추천

4. **모네타이즈: “The Missing Piece”(Affiliate Marketing)**
   - 스타일북 이미지에서 사용자의 옷장에 없는 아이템 탐지(갭 분석)
   - 유사 아이템 탐색(외부 커머스 DB 연동 가정)
   - WishlistItem을 통해 제휴 링크 제공 및 “Shop the Look” CTA 지원

---

## 전체 아키텍처

이 프로젝트는 “서빙(웹/API)과 무거운 AI 연산(워커)”을 분리하는 비동기 구조를 지향합니다.

### 구성 요소

- **Frontend (React Native / Expo)**
  - 카메라 촬영 및 UI(프레임 오버레이, 타이머, 미리보기)
  - 업로드 요청 → 백엔드로부터 S3 업로드 권한을 얻고, 이후 S3에 직접 업로드

- **Core Backend (NestJS)**
  - 사용자 인증/세션, API 게이트웨이 역할
  - PostgreSQL + Prisma로 도메인 데이터 관리
  - BullMQ + Redis로 AI 작업을 비동기로 오케스트레이션

- **AI Worker (Python / FastAPI)**
  - 고비용 작업 처리: 이미지 처리, 임베딩(CLIP), YOLO 기반 크롭/분석
  - ONNX Runtime에서 **ONNX Int8(Quantized CPU)** 추론 수행
  - 분석 결과를 DB에 반영하고 작업 상태를 완료로 업데이트

- **Storage & 배포 구성**
  - 이미지 및 크롭 결과: AWS S3 + CloudFront
  - YOLO 분석은 Lambda 이벤트 흐름(S3 트리거)과 웹훅 콜백 계약을 기준으로 운영 가능

---

## 기술 스택

- **Frontend**: Expo SDK, `expo-router`, `expo-camera`, `react-native-svg`
- **Backend**: NestJS (TypeScript), Express 기반
- **AI**: Python(FastAPI) + ONNX Runtime (CLIP ONNX Int8)
- **DB**: PostgreSQL + `pgvector`
- **ORM**: Prisma
- **Queue/Cache**: Redis + BullMQ
- **Storage**: AWS S3 (presigned URL 업로드)

---

## 레포 구조

- `frontend/`: 모바일 앱(Expo) 소스
- `backend/`: Core Backend(NestJS) 및 DB/아키텍처/배포 문서
- `backend/doc/`: 시스템 아키텍처, DB 스키마, 업로드 전략, AI 배포 전략, YOLO 분석 평가 등 설계 문서

---

## 로컬 개발(예시)

> 실행 환경/세부 스크립트는 문서 및 `package.json` 기준으로 맞춰주세요.

### Backend

1. `backend/`로 이동
2. 의존성 설치
   ```bash
   npm install
   ```
3. `.env` 생성
   - `backend/README.md` 또는 `backend/doc/System_architecture & Environment_specification.md`의 템플릿을 기반으로 작성
4. Prisma 및 DB 준비
   - `pgvector` 확장 활성화(`CREATE EXTENSION IF NOT EXISTS vector;`)
   - `npm run prisma:generate`
   - `npm run prisma:migrate` 또는 `npm run prisma:push`
5. 서버 실행
   ```bash
   npm run start:dev
   ```
6. Health check
   - `GET /health`

### Frontend

1. `frontend/`로 이동
2. 의존성 설치
   ```bash
   npm install
   ```
3. 개발 실행
   ```bash
   npm run start
   ```

---

## 업로드 & AI 처리 흐름(요약)

1. 클라이언트가 “이미지 업로드 URL 요청”을 백엔드에 전달(인증 토큰 포함)
2. 백엔드는 유효한 사용자 확인 후 S3에 업로드 가능한 **presigned URL**을 발급
3. 클라이언트가 해당 URL로 S3에 이미지를 업로드
4. S3 트리거(또는 큐 기반 워커)에서 YOLO 크롭/분석 → CLIP 임베딩 생성
5. 분석 결과/상태를 백엔드에 반영(웹훅 또는 큐 상태)
6. 추천 API가 pgvector 기반 유사도 검색 결과를 활용

---

## 문서

- `backend/doc/README.md`: 백엔드 핵심 설계 문서 인덱스
- DB 스키마/벡터 검색: `backend/doc/Database_schema.md`
- 업로드 전략(S3 presigned URL): `backend/doc/Strategy_upload_image_to_S3.md`
- AI 배포 전략(ONNX Int8 Quantized CPU): `backend/doc/AI_DEPLOYMENT_STRATEGY.md`
- YOLO 분석 평가/웹훅 계약: `backend/doc/Lambda_YOLO_evaluation.md`

---

## 라이선스

백엔드 `package.json`의 기본 설정 기준으로 `UNLICENSED`로 표시되어 있습니다.
