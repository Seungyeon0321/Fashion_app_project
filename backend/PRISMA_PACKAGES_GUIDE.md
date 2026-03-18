# Prisma 패키지 설치 가이드 및 역할 설명

## 📦 설치 순서

### 1단계: 기본 Prisma 패키지 (필수)
```bash
npm install @prisma/client@7
npm install -D prisma@7
```

**설치 상태:**
- ✅ `prisma@^7.3.0` - 이미 devDependencies에 설치됨
- ❌ `@prisma/client` - **아직 설치되지 않음** (필수 설치 필요)

### 2단계: Prisma 7 Adapter 패키지 (필수)
```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

**설치 상태:**
- ❌ `@prisma/adapter-pg` - 설치되지 않음
- ❌ `pg` - 설치되지 않음
- ❌ `@types/pg` - 설치되지 않음

---

## 📚 각 패키지의 역할

### 1. `prisma` (개발 의존성)
**역할:**
- Prisma CLI 도구 제공
- `prisma generate` - Prisma Client 생성
- `prisma migrate` - 데이터베이스 마이그레이션
- `prisma studio` - 데이터베이스 GUI
- `prisma format` - 스키마 포맷팅
- `prisma validate` - 스키마 검증

**언제 사용:**
- 개발 중에만 필요 (devDependencies)
- 프로덕션 빌드에는 포함되지 않음
- `schema.prisma` 파일을 읽고 Prisma Client를 생성하는 역할

**설치 위치:** `devDependencies`

---

### 2. `@prisma/client` (프로덕션 의존성)
**역할:**
- **런타임에 사용되는 Prisma Client 라이브러리**
- TypeScript 타입이 포함된 데이터베이스 클라이언트
- `PrismaClient` 클래스를 제공
- `prisma generate` 명령으로 생성되는 코드를 사용

**언제 사용:**
- 애플리케이션 실행 시 필요 (dependencies)
- 데이터베이스 쿼리 실행
- 타입 안전한 데이터베이스 접근

**설치 위치:** `dependencies`

**중요:** 
- `prisma generate` 명령을 실행하면 `node_modules/.prisma/client`에 코드가 생성됨
- 이 생성된 코드가 `@prisma/client`를 통해 사용됨

---

### 3. `@prisma/adapter-pg` (프로덕션 의존성)
**역할:**
- **Prisma 7의 새로운 Adapter 패턴**
- PostgreSQL 데이터베이스와 Prisma Client를 연결하는 어댑터
- `PrismaPg` 클래스를 제공
- Prisma 7에서는 **필수**로 사용해야 함

**언제 사용:**
- `PrismaClient` 생성 시 adapter로 전달
- 데이터베이스 연결 풀 관리
- Prisma 7의 새로운 아키텍처

**설치 위치:** `dependencies`

**코드 예시:**
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

---

### 4. `pg` (프로덕션 의존성)
**역할:**
- **PostgreSQL용 Node.js 드라이버**
- PostgreSQL 데이터베이스와의 실제 네트워크 연결
- `Pool` 클래스를 제공하여 연결 풀 관리
- `@prisma/adapter-pg`가 내부적으로 사용

**언제 사용:**
- `@prisma/adapter-pg`가 내부적으로 사용
- 직접 사용할 필요는 없지만 필수 의존성

**설치 위치:** `dependencies`

---

### 5. `@types/pg` (개발 의존성)
**역할:**
- `pg` 패키지의 TypeScript 타입 정의
- TypeScript에서 `pg`를 사용할 때 타입 안전성 제공

**언제 사용:**
- TypeScript 프로젝트에서 `pg`를 사용할 때
- 타입 체크 및 자동완성 지원

**설치 위치:** `devDependencies`

---

## 🔄 패키지 간 관계도

```
┌─────────────────┐
│   prisma CLI    │  (개발 시 사용)
│  (prisma@7)     │
└────────┬────────┘
         │ prisma generate 실행
         ▼
┌─────────────────┐
│ @prisma/client  │  (런타임 사용)
│   (생성된 코드)  │
└────────┬────────┘
         │ PrismaClient 생성 시
         ▼
┌─────────────────┐
│@prisma/adapter- │  (Prisma 7 필수)
│      pg         │
└────────┬────────┘
         │ 내부적으로 사용
         ▼
┌─────────────────┐
│       pg          │  (PostgreSQL 드라이버)
│  (연결 풀 관리)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│    Database     │
└─────────────────┘
```

---

## ✅ 올바른 설치 순서

### Step 1: 기본 Prisma 패키지
```bash
# prisma는 이미 설치되어 있지만 버전 확인
npm install -D prisma@7

# @prisma/client는 필수로 설치 필요
npm install @prisma/client@7
```

### Step 2: Prisma Client 생성
```bash
# @prisma/client를 설치한 후 반드시 실행
npm run prisma:generate
```

### Step 3: Adapter 패키지 설치
```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

### Step 4: 전체 설치 확인
```bash
npm list @prisma/client prisma @prisma/adapter-pg pg
```

---

## ⚠️ 주의사항

1. **설치 순서가 중요합니다:**
   - 먼저 `@prisma/client` 설치
   - 그 다음 `prisma generate` 실행
   - 마지막으로 adapter 패키지 설치

2. **버전 일치:**
   - `prisma`와 `@prisma/client`는 같은 메이저 버전 사용 (둘 다 v7)
   - 버전 불일치 시 오류 발생 가능

3. **Prisma 7의 변경사항:**
   - Prisma 7부터는 adapter가 **필수**
   - `@prisma/adapter-pg` 없이는 작동하지 않음

4. **타입 정의:**
   - TypeScript 사용 시 `@types/pg` 필수
   - 없으면 타입 오류 발생

---

## 🎯 요약

| 패키지 | 역할 | 설치 위치 | 필수 여부 |
|--------|------|-----------|----------|
| `prisma` | CLI 도구 | devDependencies | ✅ 필수 |
| `@prisma/client` | 런타임 클라이언트 | dependencies | ✅ 필수 |
| `@prisma/adapter-pg` | Prisma 7 어댑터 | dependencies | ✅ 필수 (Prisma 7) |
| `pg` | PostgreSQL 드라이버 | dependencies | ✅ 필수 |
| `@types/pg` | TypeScript 타입 | devDependencies | ✅ 필수 (TypeScript) |
