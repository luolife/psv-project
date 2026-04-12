"""
PSV — Configurações centrais
=============================
Todas as variáveis sensíveis vêm de variáveis de ambiente ou arquivo .env
Nunca coloque valores reais aqui — use o .env local ou variáveis do servidor.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Banco de dados ---
    database_url: str = "sqlite:///./psv_dev.db"
    # Produção: "postgresql+asyncpg://user:pass@host/dbname"

    # --- JWT ---
    secret_key: str = "TROQUE_ANTES_DE_SUBIR_PARA_PRODUCAO"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480   # 8 horas — sessão de trabalho

    # --- App ---
    app_name: str = "PSV — Protocolo Sensorial Visual"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- CORS — domínios permitidos (separados por vírgula no .env) ---
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
