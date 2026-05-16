"""
DB 연결 + 테이블 정의

역할: SQLAlchemy로 PostgreSQL 연결 관리 + clothing_items 테이블 정의
위치: app/db/database.py
"""

from contextlib import contextmanager

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
from sqlalchemy.orm import DeclarativeBase, Session

from app.core.config import settings


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
    job_id = Column(String, nullable=True)
    label = Column(String, nullable=False)
    label_id = Column(Integer, nullable=False)
    source_s3_key = Column(String, nullable=True)
    crop_s3_key = Column(String, nullable=True)
    bbox = Column(JSON, nullable=True)
    mask_ratio = Column(Float, nullable=True)
    embedding = Column(Vector(512), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


def init_db():
    """
    테이블 생성 + pgvector 확장 활성화.
    Worker 시작 시 한 번만 실행.
    """
    pass


def get_session() -> Session:
    """DB 세션 반환. 사용 후 반드시 close() 필요."""
    return Session(engine)


@contextmanager
def get_db():
    """
    SQLAlchemy 세션 컨텍스트 매니저.

    왜 추가했는가?
        기존 get_session()은 Session 객체를 그냥 반환해서
        사용 후 수동으로 close()를 해줘야 했음.
        with 문으로 쓰면 예외가 나도 자동으로 세션이 닫힘.

    사용법:
        with get_db() as db:
            result = db.execute(text("SELECT ...")).fetchone()

    예외 처리:
        예외 발생 시 rollback 후 세션 닫음.
        정상 종료 시 세션만 닫음 (commit은 호출부에서 명시적으로)
    """
    session = Session(engine)
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()