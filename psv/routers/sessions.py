"""
PSV — Router: Sessions
POST   /sessions                        → abre nova sessão
GET    /sessions                        → lista do profissional
GET    /sessions/{id}                   → detalhe da sessão
DELETE /sessions/{id}                   → exclui sessão do profissional
PATCH  /sessions/{id}/status            → marca completed / abandoned
PATCH  /sessions/{id}/presentation-mode → ativa modo reduzido para administrador
POST   /sessions/{id}/checklist         → salva checklist + calcula scores
POST   /sessions/{id}/tasks             → salva resultado de uma task
GET    /sessions/{id}/summary           → resumo completo para relatório
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_professional
from core.checklist_logic import calculate_scores, ChecklistValidationError
from core.report_retention import (
    REPORT_STATUS_ANONYMIZED_OR_REMOVED,
    REPORT_STATUS_EXPIRED,
    enforce_report_retention,
)
from database import get_db
from models import (
    Professional, Participant, PSVSession,
    ChecklistResult, TaskResult,
    SessionStatus, TaskName,
)
from schemas import (
    SessionCreate, SessionRead, SessionStatusUpdate,
    ChecklistSubmit, ChecklistResultRead,
    TaskResultSubmit, TaskResultRead,
    SessionSummary, ParticipantRead,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_own_session(
    session_id: str,
    db: Session,
    current: Professional,
) -> PSVSession:
    s = db.query(PSVSession).filter(
        PSVSession.id == session_id,
        PSVSession.professional_id == current.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if enforce_report_retention(db, s):
        db.commit()
        db.refresh(s)
    return s


def _require_in_progress(session: PSVSession) -> None:
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sessão já está '{session.status}' — não pode ser modificada",
        )


def _require_report_data_available(session: PSVSession) -> None:
    if session.report_data_status in {
        REPORT_STATUS_EXPIRED,
        REPORT_STATUS_ANONYMIZED_OR_REMOVED,
    }:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=(
                "O prazo de disponibilidade de 60 dias terminou e os dados "
                "desta avaliação foram removidos"
            ),
        )


# ---------------------------------------------------------------------------
# Sessões
# ---------------------------------------------------------------------------

@router.post("", response_model=SessionRead, status_code=201)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    # Garante que o participante pertence ao profissional
    participant = db.query(Participant).filter(
        Participant.id == payload.participant_id,
        Participant.professional_id == current.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participante não encontrado")

    if payload.presentation_mode and not current.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modo de apresentação disponível apenas para administradores",
        )

    session = PSVSession(
        participant_id=payload.participant_id,
        professional_id=current.id,
        presentation_mode=1 if payload.presentation_mode else 0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}/presentation-mode", response_model=SessionRead)
def enable_presentation_mode(
    session_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    if not current.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modo de apresentação disponível apenas para administradores",
        )

    session = _get_own_session(session_id, db, current)
    _require_in_progress(session)

    if session.task_results:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O modo de apresentação não pode ser alterado após o início das tarefas",
        )

    session.presentation_mode = 1
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=List[SessionRead])
def list_sessions(
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    sessions = (
        db.query(PSVSession)
        .filter(PSVSession.professional_id == current.id)
        .order_by(PSVSession.created_at.desc())
        .all()
    )
    changed = False
    for session in sessions:
        changed = enforce_report_retention(db, session) or changed
    if changed:
        db.commit()
        for session in sessions:
            db.refresh(session)
    return sessions


@router.get("/{session_id}", response_model=SessionRead)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    return _get_own_session(session_id, db, current)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)

    db.query(TaskResult).filter(TaskResult.session_id == session.id).delete(synchronize_session=False)
    db.query(ChecklistResult).filter(ChecklistResult.session_id == session.id).delete(synchronize_session=False)
    db.delete(session)
    db.commit()


@router.patch("/{session_id}/status", response_model=SessionRead)
def update_status(
    session_id: str,
    payload: SessionStatusUpdate,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)
    _require_in_progress(session)

    session.status = SessionStatus(payload.status)
    if payload.status == "completed":
        session.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    return session


# ---------------------------------------------------------------------------
# Checklist
# ---------------------------------------------------------------------------

@router.post("/{session_id}/checklist", response_model=ChecklistResultRead, status_code=201)
def submit_checklist(
    session_id: str,
    payload: ChecklistSubmit,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)
    _require_in_progress(session)

    if session.checklist is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checklist já foi submetido para esta sessão",
        )

    # Detecta se é triagem visual (valores não são todos inteiros 0-4)
    is_visual_screening = any(
        not isinstance(v, int) or v not in range(5)
        for v in payload.responses.values()
    )

    if is_visual_screening:
        # Triagem Visual — salva respostas brutas sem calcular scores de domínio
        checklist = ChecklistResult(
            session_id=session_id,
            hev_score=0.0,
            hov_score=0.0,
            bsv_score=0.0,
            hev_level="N/A",
            hov_level="N/A",
            bsv_level="N/A",
            raw_responses=payload.responses,
        )
    else:
        # Checklist clássico — valida e calcula scores de domínio
        try:
            result = calculate_scores(payload.responses)
        except ChecklistValidationError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

        checklist = ChecklistResult(
            session_id=session_id,
            hev_score=result.hev.normalized_score,
            hov_score=result.hov.normalized_score,
            bsv_score=result.bsv.normalized_score,
            hev_level=result.hev.level.value,
            hov_level=result.hov.level.value,
            bsv_level=result.bsv.level.value,
            raw_responses=payload.responses,
        )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@router.post("/{session_id}/tasks", response_model=TaskResultRead, status_code=201)
def submit_task(
    session_id: str,
    payload: TaskResultSubmit,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)
    _require_in_progress(session)

    expected_trials = 5 if session.presentation_mode else 80
    if payload.total_trials != expected_trials:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Quantidade inválida de tentativas principais: "
                f"esperado {expected_trials}"
            ),
        )

    # Impede submissão duplicada da mesma task
    existing = db.query(TaskResult).filter(
        TaskResult.session_id == session_id,
        TaskResult.task_name == TaskName(payload.task_name),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task '{payload.task_name}' já foi submetida para esta sessão",
        )

    task = TaskResult(
        session_id=session_id,
        task_name=TaskName(payload.task_name),
        total_trials=payload.total_trials,
        hits=payload.hits,
        errors=payload.errors,
        omissions=payload.omissions,
        mean_rt_ms=payload.mean_rt_ms,
        raw_trials=[t.model_dump() for t in payload.raw_trials],
        hardware_metadata=payload.hardware_metadata.model_dump(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Resumo completo — alimenta o relatório PDF
# ---------------------------------------------------------------------------

@router.get("/{session_id}/summary", response_model=SessionSummary)
def get_summary(
    session_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)
    _require_report_data_available(session)
    return SessionSummary(
        session=SessionRead.model_validate(session),
        participant=ParticipantRead.model_validate(session.participant),
        checklist=ChecklistResultRead.model_validate(session.checklist) if session.checklist else None,
        tasks=[TaskResultRead.model_validate(t) for t in session.task_results],
    )
