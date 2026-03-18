# AI Deployment Strategy: Quantized CPU Inference

**Date:** 2026-01-13
**Status:** Approved
**Context:** AI Fashion Coordinator App MVP
**Author:** Lead Developer

---

## 1. Executive Summary
To achieve high-quality style analysis (768-dimensional detail) without the prohibitive costs of always-on GPU servers, we have adopted a **Quantization + CPU** strategy.
We will deploy the **CLIP ViT-Large/Patch14 (768-dim)** model converted to **ONNX Int8 format**, running on cost-effective ARM-based CPU instances (e.g., AWS Graviton).

This strategy reduces infrastructure costs by approximately **85%** compared to traditional GPU serving while maintaining sub-second latency and 99% of the model's accuracy.

---

## 2. Problem Statement
* **Requirement:** The app requires the "Large" CLIP model (ViT-L/14) to capture subtle fashion details (texture, fit, vibe) rather than just color/shape.
* **Constraint:** The standard ViT-L model is computationally heavy.
    * **GPU Serving:** Fast (< 100ms) but expensive (~$400/month per node).
    * **CPU Serving (Raw):** Cheap but too slow (> 1.5s latency), leading to poor UX.
* **Goal:** Enable the use of the 768-dim model with low latency (< 500ms) and low cost (< $50/month for 10k users).

---

## 3. The Solution: Strategy B (Quantization)

### 3.1. Core Technologies
| Component | Choice | Reason |
| :--- | :--- | :--- |
| **Base Model** | CLIP ViT-Large/Patch14 | Provides 768-dim embeddings for superior style nuance. |
| **Format** | **ONNX** (Open Neural Network Exchange) | Standard format optimized for inference across different hardware. |
| **Optimization** | **Int8 Quantization** | Compresses model weights from 32-bit float to 8-bit integer. Reduces size by 4x and speeds up CPU inference by 3x. |
| **Runtime** | **ONNX Runtime** | High-performance inference engine developed by Microsoft. |

### 3.2. Performance Comparison (Estimated)

| Metric | Original PyTorch (CPU) | **Quantized ONNX (CPU)** | GPU Server |
| :--- | :--- | :--- | :--- |
| **Model Size** | ~1.6 GB | **~400 MB** | ~1.6 GB |
| **Latency** | 1.5s ~ 2.0s | **0.2s ~ 0.4s** | 0.05s |
| **Accuracy** | 100% (Baseline) | **~99%** | 100% |
| **Cost** | Low | **Low** | Very High |

---

## 4. Architecture Design for Scalability

To handle 10,000+ users (approx. 5,000 requests/day), we will use an asynchronous Message Queue architecture. This prevents the server from crashing during traffic spikes.

### 4.1. The Flow
1.  **Client (React Native):** Uploads image -> Requests analysis.
2.  **API Gateway (Node.js):**
    * Receives request.
    * Pushes a job to **Redis Queue (BullMQ)**.
    * Immediately returns a `jobId` to the client (Non-blocking).
3.  **AI Worker (Python + FastAPI + ONNX):**
    * Pulls job from Queue.
    * Runs YOLO (Crop) + CLIP (Vector Embedding).
    * Saves result to PostgreSQL.
    * Updates Job Status to `COMPLETED`.
4.  **Client:** Polling or WebSocket receives the completion notification.



### 4.2. Infrastructure Specs (AWS Example)
* **Instance Type:** `t4g.medium` (2 vCPU, 4 GiB Memory) - ARM-based Graviton2.
* **OS:** Ubuntu Server or Amazon Linux 2.
* **Docker:** Containerized Python Worker.

---

## 5. Cost Analysis (Monthly Estimate)

**Scenario:** 10,000 Active Users, 5,000 requests/day.

### Option A: Traditional GPU Server (g4dn.xlarge)
* Price: ~$0.526/hour
* Monthly: ~$380 USD
* **Verdict:** Too expensive for MVP.

### Option B: Quantized CPU Server (t4g.medium) - SELECTED
* Price: ~$0.0336/hour
* Monthly: ~$24 USD (per instance)
* **Redundancy:** Even with 2 instances (for high availability), total is **~$48 USD**.
* **Verdict:** **High Cost-Efficiency.**

---

## 6. Implementation Roadmap

### Phase 1: Model Conversion (Local)
1.  Download `clip-vit-large-patch14`.
2.  Script: Convert PyTorch `.pt` model to `.onnx`.
3.  Script: Apply **Dynamic Quantization** (`Float32` -> `Int8`).
4.  Verify accuracy loss (ensure vectors are still valid).

### Phase 2: Python Worker Development
1.  Create FastAPI server.
2.  Load `model_quantized.onnx` into `onnxruntime.InferenceSession`.
3.  Implement Preprocessing (Image Resizing/Normalization) matching CLIP's requirements.

### Phase 3: Integration
1.  Setup Redis on backend.
2.  Connect Node.js Producer and Python Consumer.

---

## 7. Future Considerations
* **Auto-Scaling:** If traffic exceeds 100 concurrent requests, we can use AWS Auto Scaling Groups to spawn more `t4g.medium` instances automatically based on CPU usage or Queue length.
* **Serverless Migration:** If traffic is very sporadic, this ONNX container can easily be moved to **AWS Lambda** (supporting up to 10GB memory) for true pay-per-request billing.