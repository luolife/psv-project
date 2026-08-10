from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Base

def _build_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

db_url = _build_db_url(settings.database_url)
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
    engine_options = {}
else:
    connect_args = {"connect_timeout": 10}
    if ".proxy.rlwy.net" in db_url and "sslmode=" not in db_url:
        connect_args["sslmode"] = "require"
    engine_options = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=settings.debug,
    **engine_options,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
