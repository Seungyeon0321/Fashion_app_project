# AI Fashion Coordinator - Backend

AI 기반 패션 코디네이터 애플리케이션의 백엔드 서버입니다.

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL (with pgvector extension)
- **ORM**: Prisma
- **Package Manager**: npm

## 프로젝트 구조

```
backend/
├── src/
│   ├── config/          # 설정 파일들
│   │   └── database.ts  # Prisma 클라이언트
│   ├── middleware/      # 미들웨어
│   │   └── errorHandler.ts
│   ├── routes/          # API 라우트
│   │   └── index.ts
│   └── index.ts         # 서버 진입점
├── prisma/
│   └── schema.prisma    # 데이터베이스 스키마
├── doc/                 # 문서
├── package.json
├── tsconfig.json
└── .env                 # 환경 변수 (생성 필요)
```

## 시작하기

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fashion_coordinator?schema=public"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Prisma 설정

데이터베이스에 pgvector 확장이 설치되어 있어야 합니다:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Prisma 클라이언트 생성:

```bash
npm run prisma:generate
```

데이터베이스 마이그레이션:

```bash
npm run prisma:migrate
```

또는 스키마를 직접 푸시:

```bash
npm run prisma:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 사용 가능한 스크립트

- `npm run dev` - 개발 모드로 서버 실행 (nodemon + ts-node)
- `npm run build` - TypeScript 컴파일
- `npm start` - 빌드된 파일로 프로덕션 서버 실행
- `npm run prisma:generate` - Prisma 클라이언트 생성
- `npm run prisma:migrate` - 데이터베이스 마이그레이션
- `npm run prisma:push` - 스키마를 데이터베이스에 직접 푸시
- `npm run prisma:studio` - Prisma Studio 실행 (데이터베이스 GUI)

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### Root
- `GET /` - API 정보

## 데이터베이스 스키마

자세한 데이터베이스 스키마는 `doc/DATABASE_SCHEMA.md`를 참조하세요.

주요 모델:
- `User` - 사용자 정보
- `ClosetItem` - 옷장 아이템 (벡터 임베딩 포함)
- `StyleReference` - 스타일 참조 이미지
- `Outfit` - 코디 조합
- `OutfitItem` - 코디-아이템 연결
- `WishlistItem` - 위시리스트 아이템

## 개발 가이드

### 새 라우트 추가

1. `src/routes/` 폴더에 새 라우트 파일 생성
2. `src/routes/index.ts`에서 라우트 등록
3. `src/index.ts`에서 라우트 사용

### 에러 처리

모든 에러는 `src/middleware/errorHandler.ts`에서 처리됩니다.

## 라이선스

ISC

