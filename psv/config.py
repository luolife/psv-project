"""
PSV — Configurações centrais
=============================
Todas as variáveis sensíveis vêm de variáveis de ambiente ou arquivo .env
Nunca coloque valores reais aqui — use o .env local ou variáveis do servidor.
"""

import json

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

    # --- Administração ---
    # Lista separada por virgulas. A permissao efetiva tambem fica registrada
    # no banco, sem depender da senha ou de informacoes enviadas pelo frontend.
    admin_emails: str = "luizhenrique.asf@gmail.com"

    # --- App ---
    app_name: str = "PSV — Protocolo Sensorial Visual"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- CORS — domínios permitidos (separados por vírgula no .env) ---
    allowed_origins: str = '["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]'

    @property
    def cors_allowed_origins(self) -> list[str]:
        raw = self.allowed_origins.strip()
        if not raw:
            return []
        if raw.startswith("["):
            return json.loads(raw)
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def admin_email_set(self) -> set[str]:
        return {
            email.strip().lower()
            for email in self.admin_emails.split(",")
            if email.strip()
        }

    def is_admin_email(self, email: str) -> bool:
        return email.strip().lower() in self.admin_email_set


settings = Settings()
