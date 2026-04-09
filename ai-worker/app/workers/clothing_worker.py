import json
import logging
import signal
import sys
import time

import redis as redis_lib

from app.core.config import settings
from app.workers.pipeline import ClothingPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

QUEUE_NAME = "clothing"
WAIT_KEY   = f"bull:{QUEUE_NAME}:wait"
ACTIVE_KEY = f"bull:{QUEUE_NAME}:active"
FAILED_KEY = f"bull:{QUEUE_NAME}:failed"


def get_job_key(job_id: str) -> str:
    return f"bull:{QUEUE_NAME}:{job_id}"


def process_job(r: redis_lib.Redis, pipeline: ClothingPipeline, raw: bytes) -> None:
    """
    raw: BLMOVE가 반환한 값 — BullMQ 버전에 따라
         단순 job ID 문자열이거나 JSON 직렬화된 job 객체일 수 있음.
    """

    decoded = raw.decode("utf-8")

    # ── 케이스 A: 값 자체가 JSON job 객체 (구버전 BullMQ) ──────────────
    try:
        # Redis에서 가져온 문자열을 파이썬 딕셔너리로 변환해 봅니다
        payload = json.loads(decoded)
        if isinstance(payload, dict) and "data" in payload:
            s3_key  = payload["data"]["s3Key"]
            user_id = payload["data"].get("userId", "unknown")
            job_id  = str(payload.get("id", decoded))
            _run_pipeline(r, pipeline, job_id, s3_key, user_id, raw)
            return
    except (json.JSONDecodeError, KeyError):
        pass

    # ── 케이스 B: 값이 job ID → Hash에서 실제 데이터 읽기 (신버전 BullMQ) ─
    job_id   = decoded
    job_key  = get_job_key(job_id)
    job_hash = r.hgetall(job_key)

    if not job_hash:
        logger.warning("job_id=%s 에 해당하는 Hash 없음 — 스킵", job_id)
        _remove_from_active(r, raw)
        return

    try:
        # Redis는 기본적으로 데이터를 바이너리 상태로 취급하기 때문에 문자열로 변환해야 합니다.
        data_str = job_hash.get(b"data", b"{}").decode("utf-8")
        data     = json.loads(data_str)
        s3_key   = data["s3Key"]
        user_id  = data.get("userId", "unknown")
    except (KeyError, json.JSONDecodeError) as e:
        logger.error("job_id=%s 데이터 파싱 실패: %s", job_id, e)
        _move_to_failed(r, raw, reason=str(e))
        return

    _run_pipeline(r, pipeline, job_id, s3_key, user_id, raw)


def _run_pipeline(
    r: redis_lib.Redis,
    pipeline: ClothingPipeline,
    job_id: str,
    s3_key: str,
    user_id: str,
    raw: bytes,
) -> None:
    logger.info("처리 시작 | job_id=%s user_id=%s s3_key=%s", job_id, user_id, s3_key)
    try:
        saved_ids = pipeline.run(s3_key=s3_key)
        logger.info(
            "처리 완료 | job_id=%s | 저장된 clothing_item ids: %s",
            job_id, saved_ids,
        )
        _remove_from_active(r, raw)
    except Exception as e:
        logger.error("처리 실패 | job_id=%s | %s", job_id, e, exc_info=True)
        _move_to_failed(r, raw, reason=str(e))


def _remove_from_active(r: redis_lib.Redis, raw: bytes) -> None:
    """active 큐에서 처리 완료된 job 제거"""
    r.lrem(ACTIVE_KEY, count=1, value=raw)


def _move_to_failed(r: redis_lib.Redis, raw: bytes, reason: str = "") -> None:
    """active → failed 이동 (ZSet: score = 현재 timestamp)"""
    pipe = r.pipeline()
    pipe.lrem(ACTIVE_KEY, count=1, value=raw)
    pipe.zadd(FAILED_KEY, {raw: time.time()})
    pipe.execute()
    logger.warning("job을 failed로 이동 | reason=%s", reason)


def run_worker() -> None:
    """메인 루프 — Ctrl+C 또는 SIGTERM으로 정상 종료"""
    from app.db.database import init_db
    init_db()

    r = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)
    pipeline = ClothingPipeline()

    # Graceful shutdown 처리
    shutdown = {"flag": False}

    def _handle_signal(sig, frame):
        logger.info("종료 신호 수신 (sig=%s) — 현재 job 완료 후 종료", sig)
        shutdown["flag"] = True

    signal.signal(signal.SIGINT,  _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info("Worker 시작 | queue=%s", QUEUE_NAME)

    while not shutdown["flag"]:
        # BLMOVE: wait 리스트 오른쪽에서 꺼내 active 왼쪽으로 push (atomic)
        # timeout=5 → 5초간 job 없으면 None 반환 후 루프 재시작
        # direction="RIGHT" → wait 리스트의 오른쪽에서 꺼내
        # destination="LEFT" → active 리스트의 왼쪽으로 push
        raw = r.blmove(WAIT_KEY, ACTIVE_KEY, 5, "RIGHT", "LEFT")

        if raw is None:
            continue  # 5초 대기 후 아무것도 없으면 재시도

        process_job(r, pipeline, raw)

    logger.info("Worker 정상 종료")


if __name__ == "__main__":
    run_worker()