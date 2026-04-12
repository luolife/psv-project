"""
PSV — Router: Participants
POST /participants          → cria participante
GET  /participants          → lista do profissional logado
GET  /participants/{id}     → detalhe + sessões
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from auth import get_current_professional
from database import get_db
from models import Professional, Participant
from schemas import ParticipantCreate, ParticipantRead

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


@router.post("", response_model=ParticipantRead, status_code=201)
def create_participant(
    payload: ParticipantCreate,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    from datetime import date
    # Calcula idade a partir da data de nascimento
    age = None
    if payload.birthdate:
        try:
            birth = date.fromisoformat(payload.birthdate)
            today = date.today()
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        except Exception:
            pass

    participant = Participant(
        professional_id=current.id,
        name=payload.name,
        initials=payload.name[:5] if payload.name else "",
        birthdate=payload.birthdate,
        age=age,
        sex=payload.sex,
        diagnosis_cid=payload.diagnosis_cid,
        city=payload.city,
        state=payload.state,
        country=payload.country,
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
