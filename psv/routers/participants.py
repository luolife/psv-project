"""
PSV — Router: Participants
POST /participants          → cria participante
GET  /participants          → lista do profissional logado
GET  /participants/{id}     → detalhe + sessões
PATCH /participants/{id}    → atualiza participante do profissional
DELETE /participants/{id}   → exclui participante do profissional
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from auth import get_current_professional
from database import get_db
from models import Professional, Participant, PSVSession, ChecklistResult, TaskResult
from schemas import ParticipantCreate, ParticipantRead, ParticipantUpdate

router = APIRouter(prefix="/participants", tags=["participants"])


def _get_own_participant(
    participant_id: str,
    db: Session,
    current: Professional,
) -> Participant:
    """Helper: busca participante e garante que pertence ao profissional logado."""
    p = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.professional_id == current.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participante não encontrado")
    return p


def _calc_age(birthdate: str | None) -> int | None:
    if not birthdate:
        return None
    try:
        birth = date.fromisoformat(birthdate)
        today = date.today()
        return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    except Exception:
        return None


@router.post("", response_model=ParticipantRead, status_code=201)
def create_participant(
    payload: ParticipantCreate,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    participant = Participant(
        professional_id=current.id,
        name=payload.name,
        initials=payload.name[:5] if payload.name else "",
        birthdate=payload.birthdate,
        age=_calc_age(payload.birthdate),
        sex=payload.sex,
        diagnosis_cid=payload.diagnosis_cid,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        medication_notes=payload.medication_notes,
        notes=payload.notes,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get("", response_model=List[ParticipantRead])
def list_participants(
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    return (
        db.query(Participant)
        .filter(Participant.professional_id == current.id)
        .order_by(Participant.created_at.desc())
        .all()
    )


@router.get("/{participant_id}", response_model=ParticipantRead)
def get_participant(
    participant_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    return _get_own_participant(participant_id, db, current)


@router.patch("/{participant_id}", response_model=ParticipantRead)
def update_participant(
    participant_id: str,
    payload: ParticipantUpdate,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    participant = _get_own_participant(participant_id, db, current)
    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        setattr(participant, field, value)

    if "name" in data:
        participant.initials = participant.name[:5] if participant.name else ""
    if "birthdate" in data:
        participant.age = _calc_age(participant.birthdate)

    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(
    participant_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    participant = _get_own_participant(participant_id, db, current)
    session_ids = [
        row[0]
        for row in db.query(PSVSession.id).filter(
            PSVSession.participant_id == participant.id,
            PSVSession.professional_id == current.id,
        ).all()
    ]

    if session_ids:
        db.query(TaskResult).filter(TaskResult.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(ChecklistResult).filter(ChecklistResult.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(PSVSession).filter(PSVSession.id.in_(session_ids)).delete(synchronize_session=False)

    db.delete(participant)
    db.commit()
