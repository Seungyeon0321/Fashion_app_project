"""
DB 연결 + 테이블 정의

역할: SQLAlchemy로 PostgreSQL 연결 관리 + clothing_items 테이블 정의
위치: app/db/database.py
"""

# PostgreSQL 데이터베이스에서 벡터 타입을 사용할 수 있게 해줍니다.
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
    func,
    text,
)
# DeclarativeBase는 우리 DB에 들어갈 옷 데이터의 구조를 정의하는 클래스이다.
# Session은 우리 DB에 접근하는 클래스이다.
from sqlalchemy.orm import DeclarativeBase, Session

from app.core.config import settings


# SQLAlchemy 엔진 생성 (DB 연결 풀)
engine = create_engine(settings.DATABASE_URL)


class Base(DeclarativeBase):
    pass


class ClothingItem(Base):
    """
    옷 아이템 테이블.

    착용샷 1장에서 여러 개의 ClothingItem이 생성될 수 있음.
    예) 착용샷 1장 → Upper-clothes 1개 + Pants 1개 = ClothingItem 2개
    """

    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(Integer, nullable=False)
    
    job_id = Column(String, nullable=True)         # BullMQ job ID

    # 어떤 옷인지
    label = Column(String, nullable=False)          # "Upper-clothes", "Pants" 등
    label_id = Column(Integer, nullable=False)       # 4, 6 등 (LABEL_MAP 인덱스)

    # 원본 이미지 정보
    source_s3_key = Column(String, nullable=True)   # 원본 착용샷 S3 키
    crop_s3_key = Column(String, nullable=True)     # 크롭 이미지 S3 키 (향후 사용)

    # SegFormer 분석 결과
    bbox = Column(JSON, nullable=True)              # [x, y, w, h]
    mask_ratio = Column(Float, nullable=True)       # 0.374 등

    # CLIP 벡터 (핵심!)
    # Vector(512) = pgvector 타입, 512차원 float 배열
    # <=> 연산자로 코사인 거리 계산 가능
    embedding = Column(Vector(512), nullable=True)

    # 메타데이터
    created_at = Column(DateTime, server_default=func.now())


def init_db():
    """
    테이블 생성 + pgvector 확장 활성화.
    Worker 시작 시 한 번만 실행.
    """
    pass
    # with engine.connect() as conn:
    #     # pgvector 확장 활성화 (이미 돼있으면 무시)
    #     conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    #     conn.commit()

    # # 테이블이 없으면 생성 (있으면 스킵)
    # Base.metadata.create_all(engine)
    # print("[DB] 테이블 초기화 완료")


def get_session() -> Session:
    """DB 세션 반환. 사용 후 반드시 close() 필요."""
    return Session(engine)