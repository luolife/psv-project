import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, Participant, Professional
from core.report_generator import generate_detailed_pdf, generate_pdf
from routers.sessions import create_session, submit_task
from schemas import HardwareMetadata, SessionCreate, TaskResultSubmit


def make_database():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def add_account(db, email, is_admin):
    professional = Professional(
        name="Profissional Teste",
        email=email,
        hashed_password="teste",
        is_admin=is_admin,
    )
    db.add(professional)
    db.flush()
    participant = Participant(
        professional_id=professional.id,
        name="Participante Teste",
        sex="O",
    )
    db.add(participant)
    db.commit()
    return professional, participant


def task_payload(total_trials):
    return TaskResultSubmit(
        task_name="contrast",
        total_trials=total_trials,
        hits=total_trials,
        errors=0,
        omissions=0,
        mean_rt_ms=350,
        raw_trials=[],
        hardware_metadata=HardwareMetadata(
            screen_width=1920,
            screen_height=1080,
            device_pixel_ratio=1,
        ),
    )


def test_only_admin_can_create_presentation_session():
    db = make_database()
    regular, participant = add_account(db, "regular@psv.test", 0)

    with pytest.raises(HTTPException) as error:
        create_session(
            SessionCreate(
                participant_id=participant.id,
                presentation_mode=True,
            ),
            db,
            regular,
        )

    assert error.value.status_code == 403


def test_presentation_session_accepts_five_main_trials():
    db = make_database()
    admin, participant = add_account(db, "admin@psv.test", 1)
    session = create_session(
        SessionCreate(
            participant_id=participant.id,
            presentation_mode=True,
        ),
        db,
        admin,
    )

    result = submit_task(session.id, task_payload(5), db, admin)

    assert result.total_trials == 5
    assert session.presentation_mode == 1
    assert generate_pdf(session).startswith(b"%PDF")
    assert generate_detailed_pdf(session).startswith(b"%PDF")


def test_normal_session_rejects_reduced_trial_count():
    db = make_database()
    admin, participant = add_account(db, "admin@psv.test", 1)
    session = create_session(
        SessionCreate(participant_id=participant.id),
        db,
        admin,
    )

    with pytest.raises(HTTPException) as error:
        submit_task(session.id, task_payload(5), db, admin)

    assert error.value.status_code == 422
