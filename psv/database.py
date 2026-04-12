"""
PSV — Configuração do banco de dados
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from config import settings
from models import Base


def _build_db_url(url: str) -> str:
    """Adapta a URL para pg8000 — driver puro Python."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+pg8000://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+pg8000://", 1)
    return url


db_url = _build_db_url(settings.database_url)
is_sqlite = "sqlite" in db_url
is_postgres = not is_sqlite

connect_args = {"check_same_thread": False} if is_sqlite else {}

# Para PostgreSQL via pg8000: SSL obrigatório para o Supabase
if is_postgres:
    import ssl
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl_context"] = ssl_context

engine = create_engine(db_url, connect_args=connect_args, echo=settings.debug)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
