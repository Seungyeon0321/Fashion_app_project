"""
Connection Test Script
Run: python test_connections.py

This file is for local verification only, not for deployment.
It checks if PostgreSQL, pgvector, and Redis are properly connected.
"""

import sys

# ── 1. config.py에서 접속 정보 불러오기 ─────────────────────
print("=" * 50)
print("[ Check Settings ]")
print("=" * 50)

try:
    from app.core.config import settings
    print(f"✅ config.py loaded successfully")
    print(f"   DATABASE_URL : {settings.DATABASE_URL}")
    print(f"   REDIS_URL    : {settings.REDIS_URL}")
    print(f"   AWS_REGION   : {settings.AWS_REGION}")
except Exception as e:
    print(f"❌ config.py loading failed: {e}")
    sys.exit(1)

print()

# ── 2. PostgreSQL 연결 테스트 ────────────────────────────────
print("=" * 50)
print("[ PostgreSQL Connection Test ]")
print("=" * 50)

try:
    import psycopg2

    # settings에서 URL을 꺼내서 직접 연결
    conn = psycopg2.connect(settings.DATABASE_URL)
    cursor = conn.cursor()

    # DB 버전 확인
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"✅ PostgreSQL connection successful")
    print(f"   Version: {version[:50]}...")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    print(f"   → Check if the clothing_db container is running")
    print(f"   → Run: docker ps | grep clothing_db")

print()

# ── 3. pgvector 확장 확인 ────────────────────────────────────
print("=" * 50)
print("[ pgvector 확장 확인 ]")
print("=" * 50)

try:
    import psycopg2

    conn = psycopg2.connect(settings.DATABASE_URL)
    cursor = conn.cursor()

    # pgvector 확장이 활성화되어 있는지 확인
    cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
    result = cursor.fetchone()

    if result:
        print(f"✅ pgvector activation check successful")
        print(f"   Extension Name: {result[0]}, Version: {result[1]}")
    else:
        print(f"⚠️  pgvector extension is not installed. Please activate it using the following command:")
        print(f"   docker exec -it clothing_db psql -U user -d clothing_db -c \"CREATE EXTENSION vector;\"")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ pgvector check failed: {e}")

print()

# ── 4. Redis 연결 테스트 ─────────────────────────────────────
print("=" * 50)
print("[ Redis Connection Test ]")
print("=" * 50)

try:
    import redis

    # from_url: URL 문자열로 바로 연결 (redis://localhost:6379)
    r = redis.from_url(settings.REDIS_URL)

    # ping: Redis가 살아있으면 PONG을 돌려줌
    response = r.ping()

    if response:
        print(f"✅ Redis connection successful (PONG received)")

        # Redis 서버 정보 일부 출력
        info = r.info("server")
        print(f"   Version: {info['redis_version']}")
        print(f"   Mode: {info['redis_mode']}")

except Exception as e:
    print(f"❌ Redis connection failed: {e}")
    print(f"   → Check if the clothing_redis container is running")
    print(f"   → docker ps | grep clothing_redis")

print()

# ── 5. Final Result ─────────────────────────────────────────────
print("=" * 50)
print("[ Completed ]")
print("=" * 50)
print("If all items are ✅, proceed to Step 4 (SegFormer Implementation).")
print("❌ If any item is ❌, check the status of the corresponding container: docker ps")