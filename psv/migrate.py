"""Migracoes incrementais e idempotentes do banco de dados do PSV."""

from sqlalchemy import inspect, text

from database import engine


MIGRATIONS = [
    # professionals
    ("professionals", "secondary_email", "VARCHAR(200)"),
    ("professionals", "titulation", "VARCHAR(100)"),
    ("professionals", "institution", "VARCHAR(200)"),
    ("professionals", "country", "VARCHAR(100) DEFAULT 'Brasil'"),
    ("professionals", "city", "VARCHAR(100)"),
    ("professionals", "state", "VARCHAR(50)"),
    # participants
    ("participants", "country", "VARCHAR(100) DEFAULT 'Brasil'"),
    ("participants", "medication_notes", "TEXT"),
    # sessions. TIMESTAMP e aceito pelo PostgreSQL e pelo SQLite.
    ("sessions", "report_generated_at", "TIMESTAMP"),
    ("sessions", "report_expires_at", "TIMESTAMP"),
    ("sessions", "report_data_removed_at", "TIMESTAMP"),
    (
        "sessions",
        "report_data_status",
        "VARCHAR(40) DEFAULT 'not_generated' NOT NULL",
    ),
]


def run(target_engine=engine, verbose: bool = True) -> None:
    """Adiciona apenas as colunas ausentes no banco informado."""
    with target_engine.begin() as conn:
        inspector = inspect(conn)
        tables = set(inspector.get_table_names())
        columns_by_table = {
            table: {column["name"] for column in inspector.get_columns(table)}
            for table in tables
        }

        for table, column, column_type in MIGRATIONS:
            if table not in tables:
                if verbose:
                    print(f"  - {table} nao existe, pulando {column}")
                continue

            if column in columns_by_table[table]:
                if verbose:
                    print(f"  OK {table}.{column} - ja existe, pulando")
                continue

            if verbose:
                print(f"  + {table}.{column} - adicionando...")
            conn.execute(
                text(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")
            )
            columns_by_table[table].add(column)
            if verbose:
                print("    OK")

    if verbose:
        print("\nMigracao concluida.")


if __name__ == "__main__":
    print("PSV - Executando migracoes...\n")
    run()
