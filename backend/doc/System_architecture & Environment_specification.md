# 📑 System Architecture & Environment Specification

## 1. Executive Summary
This document defines the technical standards, infrastructure requirements, and environment configurations for the **Clothing Coordination App**. It serves as the primary context for AI-driven development to ensure architectural consistency, type safety, and production-grade reliability.

---

## 2. System Architecture
The system follows a decoupled micro-service pattern to separate business logic from heavy AI computation.



### 🛰 Service Roles
* **Core Backend (NestJS):** * Manages User Authentication, Database (PostgreSQL/Prisma), and Business Logic.
    * Acts as the "Orchestrator" for AI tasks using BullMQ.
* **AI Worker (Python/FastAPI):** * Handles high-latency tasks: Image processing, Vector embeddings, and Coordination logic.
    * Communicates via REST (Sync) or Message Queue (Async).
* **Message Broker (Redis):** * Facilitates reliable communication between NestJS and Python.
    * Manages task retries and concurrency limits.

---

## 3. Tech Stack Standards

### A. Infrastructure
* **Database:** PostgreSQL with **pgvector** extension (for image similarity search).
* **Cache/Queue:** Redis (used by **BullMQ** in NestJS and **Arq/Celery** in Python).
* **Storage:** **AWS S3** (Image assets) + **CloudFront** (CDN).
* **ORM:** **Prisma** (for NestJS).

### B. Language & Frameworks
* **Backend:** NestJS (TypeScript), Strict Mode enabled.
* **AI Worker:** FastAPI (Python 3.10+), Pydantic for data validation.

---

## 4. Environment Configuration Strategy

### 🟢 Backend (NestJS)
- **Tooling:** `@nestjs/config` + **Zod**.
- **Rule:** Global `process.env` is **forbidden**. All services must inject `ConfigService`.
- **Validation:** Use a centralized `EnvConfig` schema via Zod. If a required variable is missing, the application must fail to start.

### 🟡 AI Worker (Python)
- **Tooling:** `pydantic-settings`.
- **Rule:** Use a `Settings` class that inherits from `BaseSettings`.
- **Validation:** Automatic type casting and validation on startup.

---

## 5. Master `.env.example`
*Ensure all local `.env` files are based on this template.*

```bash
# --- GENERAL ---
NODE_ENV=development # development | staging | production

# --- NESTJS BACKEND ---
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/clothing_db?schema=public"
JWT_SECRET="MUST_BE_MIN_32_CHARS_LONG"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:19006,http://localhost:3000"

# --- INFRASTRUCTURE (REDIS) ---
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# --- STORAGE (AWS S3) ---
AWS_REGION=ca-central-1 # Vancouver-specific region
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=vancouver-app-storage

# --- AI WORKER (PYTHON) ---
AI_WORKER_URL=http://localhost:8000
AI_WORKER_TIMEOUT=30000
AI_MODEL_PATH="./models/v1/"