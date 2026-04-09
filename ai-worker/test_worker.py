"""
Step 7 테스트 — NestJS 없이 직접 Redis에 가짜 job을 넣고
clothing_worker가 정상 처리하는지 확인
"""
import json
import time
import redis
from app.core.config import settings

QUEUE_NAME = "clothing"
WAIT_KEY   = f"bull:{QUEUE_NAME}:wait"

r = redis.from_url(settings.REDIS_URL, decode_responses=False)

# ── 방식 A: JSON job 객체를 직접 push (구버전 BullMQ 시뮬레이션) ──
fake_job = {
    "id":   "test-001",
    "name": "analyze-clothing",
    "data": {
        "s3Key":  "clothing/seungyeon/1820f1b7-bac1-4cf7-8dd0-4cb8d13d6455.jpeg",  # 실제 S3에 있는 키로 교체
        "userId": "test-user-123",
    },
}
r.lpush(WAIT_KEY, json.dumps(fake_job).encode("utf-8"))
print("✅ 가짜 job 삽입 완료:", fake_job["data"])
print("   이제 다른 터미널에서 worker를 실행하세요:")
print("   python -m app.workers.clothing_worker")