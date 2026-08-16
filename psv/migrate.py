"""Migracoes incrementais e idempotentes do banco de dados do PSV."""

from sqlalchemy import inspect, text

from database import engine
from config import settings


MIGRATIONS = [
    # professionals
    ("professionals", "secondary_email", "VARCHAR(200)"),
    ("professionals", "titulation", "VARCHAR(100)"),
    ("professionals", "institution", "VARCHAR(200)"),
    ("professionals", "country", "VARCHAR(100) DEFAULT 'Brasil'"),
    ("professionals", "city", "VARCHAR(100)"),
    ("professionals", "state", "VARCHAR(50)"),
    ("professionals", "is_admin", "INTEGER DEFAULT 0 NOT NULL"),
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
    ("sessions", "presentation_mode", "INTEGER DEFAULT 0 NOT NULL"),
]

# Colunas presentes em bancos antigos que precisam ter seu tamanho ampliado.
# O SQLite nao aplica limites de VARCHAR; a alteracao e necessaria no PostgreSQL.
COLUMN_EXPANSIONS = [
    ("participants", "diagnosis_cid", "VARCHAR(500)", 500),
]


def run(target_engine=engine, verbose: bool = True) -> None:
    """Atualiza de forma idempotente bancos antigos para o esquema atual."""
    with target_engine.begin() as conn:
        inspector = inspect(conn)
        tables = set(inspector.get_table_names())
        column_details_by_table = {
            table: {
                column["name"]: column
                for column in inspector.get_columns(table)
            }
            for table in tables
        }
        columns_by_table = {
            table: set(columns)
            for table, columns in column_details_by_table.items()
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

        if conn.dialect.name == "postgresql":
            for table, column, column_type, minimum_length in COLUMN_EXPANSIONS:
                if table not in tables or column not in columns_by_table[table]:
                    continue

                current_type = column_details_by_table[table][column]["type"]
                current_length = getattr(current_type, "length", None)
                if current_length is None or current_length >= minimum_length:
                    if verbose:
                        print(
                            f"  OK {table}.{column} - tamanho atual suficiente"
                        )
                    continue

                if verbose:
                    print(
                        f"  ~ {table}.{column} - ampliando para {column_type}..."
                    )
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ALTER COLUMN {column} "
                        f"TYPE {column_type}"
                    )
                )
                if verbose:
                    print("    OK")

        if "professionals" in tables and "is_admin" in columns_by_table["professionals"]:
            for admin_email in settings.admin_email_set:
                conn.execute(
                    text(
                        "UPDATE professionals SET is_admin = 1 "
                        "WHERE LOWER(email) = :admin_email"
                    ),
                    {"admin_email": admin_email},
                )

    if verbose:
        print("\nMigracao concluida.")


if __name__ == "__main__":
    print("PSV - Executando migracoes...\n")
    run()
