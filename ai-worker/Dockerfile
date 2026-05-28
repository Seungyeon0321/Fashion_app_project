FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch==2.11.0 torchvision==0.26.0

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY shared/ ./shared/

COPY .env.docker .env

# ← 변경: clothing_worker 단독 실행 → uvicorn으로 FastAPI 실행
# 큐 워커는 main.py의 lifespan에서 background thread로 실행됨
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]