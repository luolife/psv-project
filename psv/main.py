"""
PSV — Aplicação FastAPI
========================
Ponto de entrada. Registra routers, CORS e cria tabelas no startup.

Rodar em desenvolvimento:
    uvicorn main:app --reload

Rodar em produção:
    uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import settings
from database import create_tables
from routers import auth, participants, sessions, reports

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
    allow_origins=settings.allowed_origins,
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
def startup():
    create_tables()


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "version": settings.app_version}
