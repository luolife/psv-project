from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.report_retention import (
    REPORT_RETENTION_DAYS,
    REPORT_STATUS_ANONYMIZED_OR_REMOVED,
    REPORT_STATUS_AVAILABLE,
    REPORT_STATUS_EXPIRED,
    REPORT_STATUS_NOT_GENERATED,
    activate_report_retention,
    cleanup_expired_report_data,
    refresh_report_retention_status,
)
from models import (
    Base,
    ChecklistResult,
    Participant,
    Professional,
    PSVSession,
    SessionStatus,
    TaskName,
    TaskResult,
)


def make_session(**overrides):
    values = {
        "report_generated_at": None,
        "report_expires_at": None,
        "report_data_removed_at": None,
        "report_data_status": REPORT_STATUS_NOT_GENERATED,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_first_generation_starts_60_day_availability():
    generated_at = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    session = make_session()

    assert activate_report_retention(session, generated_at) is True
    assert session.report_generated_at == generated_at
    assert session.report_expires_at == generated_at + timedelta(days=REPORT_RETENTION_DAYS)
    assert session.report_data_status == REPORT_STATUS_AVAILABLE


def test_report_remains_available_before_expiration():
    generated_at = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    session = make_session(
        report_generated_at=generated_at,
        report_expires_at=generated_at + timedelta(days=REPORT_RETENTION_DAYS),
        report_data_status=REPORT_STATUS_AVAILABLE,
    )

    assert refresh_report_retention_status(session, generated_at + timedelta(days=59)) is False
    assert session.report_data_status == REPORT_STATUS_AVAILABLE


def test_report_expires_at_60_days():
    generated_at = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    session = make_session(
        report_generated_at=generated_at,
        report_expires_at=generated_at + timedelta(days=REPORT_RETENTION_DAYS),
        report_data_status=REPORT_STATUS_AVAILABLE,
    )

    assert refresh_report_retention_status(session, generated_at + timedelta(days=60)) is True
    assert session.report_data_status == REPORT_STATUS_EXPIRED


def test_anonymized_or_removed_status_is_not_overwritten():
    generated_at = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)
    session = make_session(
        report_generated_at=generated_at,
        report_expires_at=generated_at + timedelta(days=REPORT_RETENTION_DAYS),
        report_data_status=REPORT_STATUS_ANONYMIZED_OR_REMOVED,
    )

    assert refresh_report_retention_status(session, generated_at + timedelta(days=90)) is False
    assert session.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED


def make_database():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def add_professional_and_participant(db):
    professional = Professional(
        name="Profissional Demo",
        email="retencao@psv.test",
        hashed_password="teste",
    )
    db.add(professional)
    db.flush()
    participant = Participant(
        professional_id=professional.id,
        name="Participante Demo",
        sex="O",
        initials="PD",
    )
    db.add(participant)
    db.flush()
    return professional, participant


def add_completed_session_with_results(
    db,
    professional,
    participant,
    generated_at,
    expires_at,
):
    session = PSVSession(
        participant_id=participant.id,
        professional_id=professional.id,
        status=SessionStatus.COMPLETED,
        completed_at=generated_at,
        report_generated_at=generated_at,
        report_expires_at=expires_at,
        report_data_status=REPORT_STATUS_AVAILABLE,
    )
    db.add(session)
    db.flush()
    db.add(
        ChecklistResult(
            session_id=session.id,
            hev_score=10,
            hov_score=20,
            bsv_score=30,
            hev_level="Baixo",
            hov_level="Baixo",
            bsv_level="Baixo",
            raw_responses={"1": 1},
        )
    )
    for task_name in TaskName:
        db.add(
            TaskResult(
                session_id=session.id,
                task_name=task_name,
                total_trials=1,
                hits=1,
                errors=0,
                omissions=0,
                mean_rt_ms=350,
                raw_trials=[{"trial": 1, "correct": True}],
                hardware_metadata={"browser": "test"},
            )
        )
    db.commit()
    return session


def test_cleanup_removes_expired_assessment_data():
    db = make_database()
    now = datetime(2026, 9, 24, 12, 0, tzinfo=timezone.utc)
    professional, participant = add_professional_and_participant(db)
    expired = add_completed_session_with_results(
        db,
        professional,
        participant,
        generated_at=now - timedelta(days=61),
        expires_at=now - timedelta(days=1),
    )

    assert cleanup_expired_report_data(db, now) == 1
    db.commit()
    db.refresh(expired)

    assert expired.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED
    assert expired.report_data_removed_at.replace(tzinfo=timezone.utc) == now
    assert db.query(ChecklistResult).filter_by(session_id=expired.id).count() == 0
    assert db.query(TaskResult).filter_by(session_id=expired.id).count() == 0
    assert db.get(Participant, participant.id) is not None
    assert db.get(Professional, professional.id) is not None
    db.close()


def test_cleanup_preserves_valid_assessment_for_same_participant():
    db = make_database()
    now = datetime(2026, 9, 24, 12, 0, tzinfo=timezone.utc)
    professional, participant = add_professional_and_participant(db)
    expired = add_completed_session_with_results(
        db,
        professional,
        participant,
        generated_at=now - timedelta(days=61),
        expires_at=now - timedelta(days=1),
    )
    available = add_completed_session_with_results(
        db,
        professional,
        participant,
        generated_at=now - timedelta(days=10),
        expires_at=now + timedelta(days=50),
    )

    assert cleanup_expired_report_data(db, now) == 1
    db.commit()
    db.refresh(expired)
    db.refresh(available)

    assert expired.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED
    assert available.report_data_status == REPORT_STATUS_AVAILABLE
    assert db.query(ChecklistResult).filter_by(session_id=available.id).count() == 1
    assert db.query(TaskResult).filter_by(session_id=available.id).count() == 3
    db.close()
