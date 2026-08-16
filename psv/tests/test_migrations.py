from sqlalchemy import create_engine, inspect, text

from migrate import COLUMN_EXPANSIONS, run


def test_legacy_schema_receives_all_current_columns():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE professionals (id VARCHAR(36) PRIMARY KEY, email VARCHAR(200))"))
        conn.execute(text("CREATE TABLE participants (id VARCHAR(36) PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE sessions (id VARCHAR(36) PRIMARY KEY)"))
        conn.execute(text("INSERT INTO sessions (id) VALUES ('session-1')"))
        conn.execute(
            text(
                "INSERT INTO professionals (id, email) "
                "VALUES ('professional-1', 'luizhenrique.asf@gmail.com')"
            )
        )

    run(engine, verbose=False)
    # A segunda execucao confirma que a migracao e idempotente.
    run(engine, verbose=False)

    inspector = inspect(engine)
    professional_columns = {
        column["name"] for column in inspector.get_columns("professionals")
    }
    participant_columns = {
        column["name"] for column in inspector.get_columns("participants")
    }
    session_columns = {
        column["name"] for column in inspector.get_columns("sessions")
    }

    assert {
        "secondary_email",
        "titulation",
        "institution",
        "country",
        "city",
        "state",
        "is_admin",
    } <= professional_columns
    assert {"country", "medication_notes"} <= participant_columns
    assert {
        "report_generated_at",
        "report_expires_at",
        "report_data_removed_at",
        "report_data_status",
        "presentation_mode",
    } <= session_columns

    with engine.connect() as conn:
        status = conn.execute(
            text("SELECT report_data_status FROM sessions WHERE id = 'session-1'")
        ).scalar_one()
    assert status == "not_generated"

    with engine.connect() as conn:
        is_admin = conn.execute(
            text(
                "SELECT is_admin FROM professionals "
                "WHERE id = 'professional-1'"
            )
        ).scalar_one()
    assert is_admin == 1


def test_participant_diagnosis_column_is_expanded_in_postgresql():
    assert (
        "participants",
        "diagnosis_cid",
        "VARCHAR(500)",
        500,
    ) in COLUMN_EXPANSIONS
