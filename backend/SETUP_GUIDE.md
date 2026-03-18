# NestJS 프로젝트 설정 가이드

## ✅ 완료된 작업

1. **환경 변수 설정**
   - `.env.example` 파일 생성
   - `.env` 파일 생성 (개발용 기본값)

2. **Config 모듈 설정**
   - Zod를 사용한 환경 변수 검증 스키마 (`src/config/env.config.ts`)
   - 전역 Config 모듈 (`src/config/config.module.ts`)
   - System Architecture 문서에 따라 `process.env` 직접 사용 금지, `ConfigService` 주입 사용

3. **Prisma 모듈 설정**
   - PrismaService 생성 (`src/prisma/prisma.service.ts`)
   - 전역 Prisma 모듈 (`src/prisma/prisma.module.ts`)

4. **기본 구조 설정**
   - AppModule에 ConfigModule, PrismaModule 추가
   - main.ts에 CORS 및 ValidationPipe 설정

## 📋 다음 단계

### 1. 필수 패키지 설치

npm이 offline 모드로 설정되어 있는 경우, 다음 명령으로 해제 후 설치하세요:

```powershell
# PowerShell에서 환경 변수 설정
$env:npm_config_offline="false"
npm install @prisma/client @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt zod @nestjs/bullmq bullmq ioredis class-validator class-transformer

# 또는 npm config 파일을 직접 수정
# C:\Users\manto\.npmrc 파일에서 offline=true를 제거하거나 false로 변경
```

**필수 패키지 목록:**
- `@prisma/client` - Prisma ORM 클라이언트
- `@nestjs/config` - 환경 변수 관리
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` - JWT 인증
- `bcrypt` - 비밀번호 해싱
- `zod` - 환경 변수 검증
- `@nestjs/bullmq`, `bullmq`, `ioredis` - Redis 큐 (BullMQ)
- `class-validator`, `class-transformer` - DTO 검증

### 2. Prisma 클라이언트 생성

```bash
npm run prisma:generate
```

### 3. 데이터베이스 설정

1. PostgreSQL 설치 및 실행
2. pgvector 확장 설치:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. `.env` 파일의 `DATABASE_URL` 수정:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/clothing_db?schema=public"
   ```

### 4. 데이터베이스 마이그레이션

```bash
npm run prisma:migrate
```

### 5. 환경 변수 설정 확인

`.env` 파일에서 다음 값들을 실제 값으로 변경하세요:
- `JWT_SECRET`: 최소 32자 이상의 안전한 시크릿 키
- `DATABASE_URL`: 실제 PostgreSQL 연결 정보
- `REDIS_HOST`, `REDIS_PORT`: Redis 서버 정보 (로컬 개발 시 localhost:6379)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS 자격 증명 (나중에 설정 가능)

### 6. 애플리케이션 실행

```bash
npm run start:dev
```

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── config/          # 환경 변수 설정
│   │   ├── config.module.ts
│   │   └── env.config.ts
│   ├── prisma/          # Prisma 설정
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma    # 데이터베이스 스키마
├── .env                 # 환경 변수 (git에 커밋하지 않음)
├── .env.example         # 환경 변수 템플릿
└── package.json
```

## 🔧 유용한 명령어

- `npm run start:dev` - 개발 모드로 실행
- `npm run prisma:generate` - Prisma 클라이언트 생성
- `npm run prisma:migrate` - 데이터베이스 마이그레이션
- `npm run prisma:studio` - Prisma Studio 실행 (DB GUI)
- `npm run build` - 프로덕션 빌드

## ⚠️ 주의사항

1. **환경 변수**: `.env` 파일은 절대 git에 커밋하지 마세요. `.env.example`만 커밋합니다.
2. **ConfigService 사용**: System Architecture 문서에 따라 모든 서비스에서 `ConfigService`를 주입받아 사용하세요. `process.env` 직접 사용은 금지됩니다.
3. **Prisma 스키마**: `prisma/schema.prisma` 파일은 이미 작성되어 있습니다. 필요에 따라 수정하세요.

## 🚀 다음 개발 단계

1. **인증 모듈** (Auth Module)
   - 회원가입/로그인 엔드포인트
   - JWT 전략 설정
   - 가드(Guard) 생성

2. **사용자 모듈** (User Module)
   - 사용자 프로필 관리
   - 사용자 정보 조회/수정

3. **옷장 모듈** (Closet Module)
   - 옷장 아이템 CRUD
   - 이미지 업로드 (S3 연동)

4. **스타일 참조 모듈** (Style Reference Module)
   - 스타일 사진 업로드
   - AI 워커와 통신 (BullMQ)

5. **아웃핏 모듈** (Outfit Module)
   - 아웃핏 생성/조회
   - AI 추천 기능
