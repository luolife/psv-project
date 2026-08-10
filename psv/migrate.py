"""
PSV — Migração manual
=====================
Adiciona colunas que não existem ainda nas tabelas do banco.

Rodar uma vez após deploy:
    python migrate.py

Idempotente — verifica se a coluna já existe antes de tentar criar.
"""

from database import engine
from sqlalchemy import text, inspect

MIGRATIONS = [
    # professionals: city e state (adicionados na v1.1)
    {
        "table": "professionals",
        "column": "city",
        "ddl": "ALTER TABLE professionals ADD COLUMN city VARCHAR(100)",
    },
    {
        "table": "professionals",
        "column": "state",
        "ddl": "ALTER TABLE professionals ADD COLUMN state VARCHAR(50)",
    },
    {
        "table": "professionals",
        "column": "country",
        "ddl": "ALTER TABLE professionals ADD COLUMN country VARCHAR(100) DEFAULT 'Brasil'",
    },
    {
        "table": "professionals",
        "column": "secondary_email",
        "ddl": "ALTER TABLE professionals ADD COLUMN secondary_email VARCHAR(200)",
    },
    {
        "table": "participants",
        "column": "medication_notes",
        "ddl": "ALTER TABLE participants ADD COLUMN medication_notes TEXT",
    },
    {
        "table": "sessions",
        "column": "report_generated_at",
        "ddl": "ALTER TABLE sessions ADD COLUMN report_generated_at DATETIME",
    },
    {
        "table": "sessions",
        "column": "report_expires_at",
        "ddl": "ALTER TABLE sessions ADD COLUMN report_expires_at DATETIME",
    },
    {
        "table": "sessions",
        "column": "report_data_removed_at",
        "ddl": "ALTER TABLE sessions ADD COLUMN report_data_removed_at DATETIME",
    },
    {
        "table": "sessions",
        "column": "report_data_status",
        "ddl": "ALTER TABLE sessions ADD COLUMN report_data_status VARCHAR(40) DEFAULT 'not_generated' NOT NULL",
    },
    # checklist_results: aceitar "N/A" no level (já era VARCHAR, sem mudança de schema)
]


def column_exists(conn, table: str, column: str) -> bool:
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns(table)]
    return column in cols


def run():
    with engine.begin() as conn:
        for m in MIGRATIONS:
            if "column" in m and "table" in m:
                if not column_exists(conn, m["table"], m["column"]):
                    print(f"  + {m['table']}.{m['column']} — adicionando...")
                    conn.execute(text(m["ddl"]))
                    print(f"    OK")
                else:
                    print(f"  OK {m['table']}.{m['column']} — já existe, pulando")

    print("\nMigração concluída.")


if __name__ == "__main__":
    print("PSV — Executando migrações...\n")
    run()
