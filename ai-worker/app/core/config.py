from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices
import os


class Settings(BaseSettings):
    """
    AI Worker 환경변수 관리 클래스
    
    pydantic-settings가 아래 순서로 값을 찾아요:
    1. .env 파일
    2. 시스템 환경변수
    3. 여기 적힌 default 값 (없으면 에러)
    
    즉, .env 파일이 있으면 그걸 읽고,
    없으면 default 값을 사용해요.
    """

    # ── PostgreSQL ──────────────────────────────────────────
    # docker-compose clothing_db (호스트 포트 5433, compose의 POSTGRES_* 와 동일)
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost:5433/clothing_db"
    )

    # ── Redis ───────────────────────────────────────────────
    # 기존 clothing_redis 컨테이너 접속 정보
    # BullMQ job을 꺼내올 때 사용
    REDIS_URL: str = Field(
        default="redis://localhost:6379"
    )

    # ── AWS S3 ──────────────────────────────────────────────
    # NestJS가 저장한 이미지를 Python이 다운로드할 때 필요
    # .env 파일에 실제 값을 넣어야 함 (기본값 없음 → 없으면 에러)
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    AWS_REGION: str = Field(default="ca-central-1")
    S3_BUCKET: str = Field(
        default="",
        validation_alias=AliasChoices("S3_BUCKET_NAME", "AWS_S3_BUCKET"),
    )
    S3_BASE_URL: str = Field(
        default="",
        validation_alias=AliasChoices("S3_BASE_URL", "AWS_S3_BASE_URL"),
    )

    # ── AI 모델 ─────────────────────────────────────────────
    # HuggingFace에서 다운로드할 모델 이름
    # 처음 실행 시 자동으로 다운로드됨 (~수백MB)
    SEGFORMER_MODEL_NAME: str = Field(
        default="mattmdjaga/segformer_b2_clothes"
    )
    CLIP_MODEL_NAME: str = Field(
        default="openai/clip-vit-base-patch32"
    )

    # 로컬 테스트용 (test_segformer 등). .env에 없으면 None — 비워두면 무시됨
    IMAGE_PATH: str | None = Field(default=None)

    # ── Anthropic ───────────────────────────────────────────
    ANTHROPIC_API_KEY: str = Field(default="")

    # ── OpenWeather ─────────────────────────────────────────
    OPENWEATHER_API_KEY: str = Field(default="")
    WEATHER_LAT: str = Field(default="")
    WEATHER_LON: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file=(
            ".env.docker" if os.path.exists(".env.docker") else ".env" if os.path.exists(".env") else None
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

# 싱글톤 패턴: 이 파일을 import하면 항상 같은 settings 객체를 사용
# NestJS의 ConfigService와 같은 개념
settings = Settings()