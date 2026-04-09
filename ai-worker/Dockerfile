FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch==2.11.0 torchvision==0.26.0

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

COPY .env.docker .env

CMD ["python", "-m", "app.workers.clothing_worker"]