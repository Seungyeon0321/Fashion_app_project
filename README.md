# AI Fashion Coordinator (MVP)

An AI fashion coordination app. It lets users register their closet by taking photos (CV: YOLO, embeddings: CLIP), then recommends an “outfit for today” by combining the user’s style book preferences with weather context.  
It also aims to detect “what’s missing” (items inferred from style references that the user doesn’t own) and connect them to affiliate purchase links.

---

## Key Features

1. **Digital Wardrobe (AI Closet)**
   - Automatic category classification based on uploaded photos (YOLO-based)
   - Extracts and stores CLIP embeddings (768-dim) in `pgvector`
   - Improves recommendation quality using item states like `isWashing` / `isArchived`
   - Adapts to weather by using each item’s wearable temperature range (`minTemp` / `maxTemp`)

2. **Style Book (Reference Gallery)**
   - Save “Goal Styles” from magazines, Pinterest, Instagram screenshots, etc.
   - Decompose images and store style mood embeddings
   - Learns the style book’s mood to refine recommendation filters

3. **Daily Outfit (Weather-Adaptive Suggestion)**
   - Syncs with a location-based weather API (temperature and precipitation)
   - First-pass filtering to keep only items matching the current temperature
   - Ranks results using vector similarity (cosine similarity) against the user’s style book embeddings

4. **Monetization: “The Missing Piece” (Affiliate Marketing)**
   - Detects missing items from style book images via gap analysis
   - Finds visually similar products (integration with external commerce DB is assumed)
   - Provides affiliate links via `WishlistItem` and supports a “Shop the Look” CTA

---

## System Overview

This project targets an asynchronous architecture that separates serving (web/API) from heavy AI computation (workers).

### Components

- **Frontend (React Native / Expo)**
  - Camera capture and UI (frame overlays, timers, previews)
  - Requests upload permission from the backend, then uploads directly to S3

- **Core Backend (NestJS)**
  - Authentication/session management and API gateway responsibilities
  - Manages domain data with PostgreSQL + Prisma
  - Asynchronously orchestrates AI jobs with BullMQ + Redis

- **AI Worker (Python / FastAPI)**
  - Handles compute-heavy tasks: image processing, embeddings (CLIP), YOLO-based crop/analysis
  - Runs quantized CPU inference using ONNX Runtime (**ONNX Int8**)
  - Persists analysis results to the database and updates job status to completed

- **Storage & Deployment Setup**
  - Image assets and crop artifacts: AWS S3 + CloudFront
  - YOLO analysis can be operated using a Lambda/S3-trigger flow plus a webhook callback contract

---

## Tech Stack

- **Frontend**: Expo SDK, `expo-router`, `expo-camera`, `react-native-svg`
- **Backend**: NestJS (TypeScript) with an Express-based server
- **AI**: Python (FastAPI) + ONNX Runtime (CLIP ONNX Int8)
- **DB**: PostgreSQL + `pgvector`
- **ORM**: Prisma
- **Queue/Cache**: Redis + BullMQ
- **Storage**: AWS S3 (presigned URL uploads)

---

## Repository Structure

- `frontend/`: Mobile app (Expo) source
- `backend/`: Core Backend (NestJS) plus DB/architecture/deployment docs
- `backend/doc/`: System architecture, DB schema, upload strategy, AI deployment strategy, YOLO evaluation, and other design docs

---

## Local Development (Example)

> Adjust commands and environment details according to the docs and each `package.json`.

### Backend

1. Go to `backend/`
2. Install dependencies
   ```bash
   npm install
   ```
3. Create `.env`
   - Create it based on the template in `backend/README.md` or `backend/doc/System_architecture & Environment_specification.md`
4. Prepare Prisma and the database
   - Enable the `pgvector` extension (`CREATE EXTENSION IF NOT EXISTS vector;`)
   - `npm run prisma:generate`
   - `npm run prisma:migrate` or `npm run prisma:push`
5. Start the server
   ```bash
   npm run start:dev
   ```
6. Health check
   - `GET /health`

### Frontend

1. Go to `frontend/`
2. Install dependencies
   ```bash
   npm install
   ```
3. Run development server
   ```bash
   npm run start
   ```

---

## Upload & AI Processing Flow (Summary)

1. The client sends an “image upload URL request” to the backend (including an auth token)
2. The backend verifies the user and issues an S3 **presigned URL**
3. The client uploads the image to S3 using that URL
4. A S3-triggered flow (or queue-based worker) runs YOLO crop/analysis and generates CLIP embeddings
5. The backend updates job status/results (via webhook or queue state)
6. The recommendation API uses pgvector-based similarity search results

---

## Docs

- `backend/doc/README.md`: Backend design document index
- DB schema / vector search: `backend/doc/Database_schema.md`
- Upload strategy (S3 presigned URL): `backend/doc/Strategy_upload_image_to_S3.md`
- AI deployment strategy (ONNX Int8 quantized CPU): `backend/doc/AI_DEPLOYMENT_STRATEGY.md`
- YOLO evaluation / webhook contract: `backend/doc/Lambda_YOLO_evaluation.md`

---

## License

The backend is marked as `UNLICENSED` in `backend/package.json`.
