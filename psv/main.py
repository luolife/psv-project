"""
PSV — Aplicação FastAPI
========================
Ponto de entrada. Registra routers, CORS e cria tabelas no startup.

Rodar em desenvolvimento:
    uvicorn main:app --reload

Rodar em produção:
    uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
"""

import logging
import time
import os
import asyncio
from contextlib import suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import SessionLocal, create_tables, engine
from core.report_retention import cleanup_expired_report_data
from routers import auth, participants, sessions, reports

logger = logging.getLogger("psv")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,   # Swagger só em dev
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# CORS — permite o frontend React (dev: porta 5173, prod: mesmo domínio)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(participants.router)
app.include_router(sessions.router)
app.include_router(reports.router)

# ---------------------------------------------------------------------------
# Frontend buildado — servido pelo próprio FastAPI em produção
# ---------------------------------------------------------------------------

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    _create_tables_with_retry()
    _run_migrations()
    await asyncio.to_thread(_run_report_retention_cleanup)
    app.state.report_retention_task = asyncio.create_task(
        _report_retention_cleanup_loop()
    )


@app.on_event("shutdown")
async def shutdown():
    task = getattr(app.state, "report_retention_task", None)
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


def _create_tables_with_retry(max_attempts: int = 10, delay: float = 3.0) -> None:
    """
    Tenta criar as tabelas com retry progressivo.
    Evita crash loop quando o banco está temporariamente indisponível no Railway.
    Espera: 3s, 6s, 9s, ... até 30s por tentativa.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            create_tables()
            logger.info("Tabelas criadas/verificadas com sucesso.")
            return
        except Exception as e:
            wait = min(delay * attempt, 30.0)
            logger.warning(
                f"Tentativa {attempt}/{max_attempts} de conectar ao banco falhou: {e}. "
                f"Aguardando {wait:.0f}s..."
            )
            if attempt < max_attempts:
                time.sleep(wait)
            else:
                logger.error(
                    "Não foi possível conectar ao banco após todas as tentativas. "
                    "Endpoints que dependem do banco retornarão erro até a conexão ser restabelecida."
                )


def _run_migrations():
    """Aplica migrações de schema incrementais de forma idempotente."""
    from sqlalchemy import text, inspect as sa_inspect
    COLS_TO_ADD = [
        ("professionals", "city",  "ALTER TABLE professionals ADD COLUMN city VARCHAR(100)"),
        ("professionals", "state", "ALTER TABLE professionals ADD COLUMN state VARCHAR(50)"),
        ("participants", "medication_notes", "ALTER TABLE participants ADD COLUMN medication_notes TEXT"),
        ("sessions", "report_generated_at", "ALTER TABLE sessions ADD COLUMN report_generated_at DATETIME"),
        ("sessions", "report_expires_at", "ALTER TABLE sessions ADD COLUMN report_expires_at DATETIME"),
        ("sessions", "report_data_removed_at", "ALTER TABLE sessions ADD COLUMN report_data_removed_at DATETIME"),
        ("sessions", "report_data_status", "ALTER TABLE sessions ADD COLUMN report_data_status VARCHAR(40) DEFAULT 'not_generated' NOT NULL"),
    ]
    try:
        with engine.begin() as conn:
            inspector = sa_inspect(conn)
            for table, col, ddl in COLS_TO_ADD:
                existing = [c["name"] for c in inspector.get_columns(table)]
                if col not in existing:
                    conn.execute(text(ddl))
    except Exception as e:
        logger.warning(f"Migration warning: {e}")


def _run_report_retention_cleanup() -> None:
    db = SessionLocal()
    try:
        removed = cleanup_expired_report_data(db)
        db.commit()
        if removed:
            logger.info(
                "Retenção de relatórios: dados removidos de %s avaliação(ões).",
                removed,
            )
    except Exception:
        db.rollback()
        logger.exception("Falha na limpeza automática dos relatórios expirados.")
    finally:
        db.close()


async def _report_retention_cleanup_loop() -> None:
    """Executa a limpeza diariamente enquanto o servidor estiver ativo."""
    while True:
        await asyncio.sleep(24 * 60 * 60)
        await asyncio.to_thread(_run_report_retention_cleanup)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "version": settings.app_version}
