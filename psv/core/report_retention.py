"""Regras de disponibilidade e retenção dos relatórios do PSV."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import ChecklistResult, PSVSession, TaskResult


REPORT_RETENTION_DAYS = 60
REPORT_STATUS_NOT_GENERATED = "not_generated"
REPORT_STATUS_AVAILABLE = "available"
REPORT_STATUS_EXPIRED = "expired"
REPORT_STATUS_ANONYMIZED_OR_REMOVED = "anonymized_or_removed"

REPORT_STATUSES = {
    REPORT_STATUS_NOT_GENERATED,
    REPORT_STATUS_AVAILABLE,
    REPORT_STATUS_EXPIRED,
    REPORT_STATUS_ANONYMIZED_OR_REMOVED,
}


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _utc_naive(value: datetime) -> datetime:
    """Normaliza datas para consultas em colunas SQL sem timezone."""
    return _utc(value).replace(tzinfo=None)


def activate_report_retention(session, now: datetime | None = None) -> bool:
    """Registra a primeira geração sem guardar uma cópia permanente do PDF."""
    if session.report_generated_at:
        return refresh_report_retention_status(session, now)

    generated_at = _utc(now or datetime.now(timezone.utc))
    session.report_generated_at = generated_at
    session.report_expires_at = generated_at + timedelta(days=REPORT_RETENTION_DAYS)
    session.report_data_status = REPORT_STATUS_AVAILABLE
    return True


def refresh_report_retention_status(session, now: datetime | None = None) -> bool:
    """Atualiza o status quando o prazo de 60 dias já tiver terminado."""
    if session.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED:
        return False
    if not session.report_generated_at or not session.report_expires_at:
        next_status = REPORT_STATUS_NOT_GENERATED
    else:
        current_time = _utc(now or datetime.now(timezone.utc))
        next_status = (
            REPORT_STATUS_EXPIRED
            if current_time >= _utc(session.report_expires_at)
            else REPORT_STATUS_AVAILABLE
        )

    if session.report_data_status == next_status:
        return False
    session.report_data_status = next_status
    return True


def remove_expired_report_data(
    db: Session,
    session: PSVSession,
    now: datetime | None = None,
) -> bool:
    """Remove os dados identificáveis da avaliação e preserva metadados mínimos."""
    if session.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED:
        return False
    if session.report_data_status != REPORT_STATUS_EXPIRED:
        return False

    removed_at = _utc(now or datetime.now(timezone.utc))
    db.query(TaskResult).filter(
        TaskResult.session_id == session.id
    ).delete(synchronize_session=False)
    db.query(ChecklistResult).filter(
        ChecklistResult.session_id == session.id
    ).delete(synchronize_session=False)

    session.report_data_removed_at = removed_at
    session.report_data_status = REPORT_STATUS_ANONYMIZED_OR_REMOVED
    db.flush()
    db.expire(session, ["checklist", "task_results"])
    return True


def enforce_report_retention(
    db: Session,
    session: PSVSession,
    now: datetime | None = None,
) -> bool:
    """Atualiza o prazo e remove os dados da avaliação quando ele termina."""
    changed = refresh_report_retention_status(session, now)
    removed = remove_expired_report_data(db, session, now)
    return changed or removed


def cleanup_expired_report_data(
    db: Session,
    now: datetime | None = None,
) -> int:
    """Limpa em lote avaliações vencidas; o chamador controla o commit."""
    current_time = _utc(now or datetime.now(timezone.utc))
    sessions = (
        db.query(PSVSession)
        .filter(
            PSVSession.report_expires_at.isnot(None),
            PSVSession.report_expires_at <= _utc_naive(current_time),
            PSVSession.report_data_status != REPORT_STATUS_ANONYMIZED_OR_REMOVED,
        )
        .all()
    )

    removed = 0
    for session in sessions:
        if enforce_report_retention(db, session, current_time):
            removed += int(
                session.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED
            )
    return removed
