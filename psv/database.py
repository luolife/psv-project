"""
PSV — Configuração do banco de dados
======================================
Usa SQLite em desenvolvimento e PostgreSQL em produção.
A troca é feita apenas pela variável DATABASE_URL no .env.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from models import Base

# SQLite precisa de connect_args especial para funcionar com threads do FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.debug,   # loga SQL quando debug=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    """Cria todas as tabelas se não existirem. Chamado no startup da app."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency do FastAPI — injeta sessão do banco e garante fechamento.

    Uso:
        @router.get("/...")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
