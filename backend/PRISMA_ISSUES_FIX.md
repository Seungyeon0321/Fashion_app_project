# Prisma 설정 문제 및 수정 사항

## 🚨 발견된 문제들

### 1. ❌ Import 경로 오류 (심각)
**위치:** `src/prisma/prisma.service.ts:2`
```typescript
// 현재 (잘못됨)
import { PrismaClient } from '../generated/prisma/client/index.js';

// 문제점:
// - index.js 파일이 존재하지 않음
// - 실제 PrismaClient는 client.ts에 export되어 있음
```

**수정 필요:**
```typescript
import { PrismaClient } from '../generated/prisma/client/client.js';
// 또는
import { PrismaClient } from '@prisma/client';
```

---

### 2. ❌ @nestjs/config 패키지 누락 (심각)
**위치:** `src/prisma/prisma.service.ts:5`
```typescript
import { ConfigService } from '@nestjs/config';
```

**문제점:**
- `package.json`에 `@nestjs/config`가 설치되지 않음
- ConfigService를 사용할 수 없음

**수정 필요:**
```bash
npm install @nestjs/config
```

---

### 3. ⚠️ datasource에 extensions 누락 (중요)
**위치:** `prisma/schema.prisma:9-11`
```prisma
datasource db {
  provider   = "postgresql"
  // extensions = [vector] 가 없음!
}
```

**문제점:**
- pgvector 확장이 활성화되지 않음
- 벡터 검색 기능 사용 불가
- DATABASE_SCHEMA.md 문서에 따르면 필수

**수정 필요:**
```prisma
datasource db {
  provider   = "postgresql"
  extensions = [vector] // Activate PostgreSQL vector extension
}
```

---

### 4. ⚠️ generator에 previewFeatures 누락 (중요)
**위치:** `prisma/schema.prisma:4-7`
```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma/client"
  // previewFeatures = ["postgresqlExtensions"] 가 없음!
}
```

**문제점:**
- pgvector 확장 사용을 위해 `postgresqlExtensions` preview feature 필요
- DATABASE_SCHEMA.md 문서에 명시됨

**수정 필요:**
```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma/client"
  previewFeatures = ["postgresqlExtensions"] // Required for pgvector usage
}
```

---

### 5. ⚠️ prisma.config.ts의 import 경로 확인 필요
**위치:** `prisma/prisma.config.ts:2`
```typescript
import { defineConfig, env } from 'prisma/config';
```

**확인 필요:**
- Prisma 7에서 이 import 경로가 올바른지 확인
- 실제 패키지 구조와 일치하는지 검증 필요

---

## ✅ 수정 사항 요약

1. **prisma.service.ts**: Import 경로 수정
2. **package.json**: `@nestjs/config` 추가
3. **schema.prisma**: `extensions = [vector]` 추가
4. **schema.prisma**: `previewFeatures` 추가
