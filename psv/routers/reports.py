"""
PSV — Router: Reports
GET /sessions/{id}/report  → devolve PDF da sessão como download
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from auth import get_current_professional
from database import get_db
from models import Professional
from core.contract_generator import generate_contract_pdf
from core.privacy_generator import generate_privacy_pdf
from routers.sessions import _get_own_session
from core.report_generator import generate_detailed_pdf, generate_pdf
from core.report_retention import (
    REPORT_STATUS_ANONYMIZED_OR_REMOVED,
    REPORT_STATUS_EXPIRED,
    activate_report_retention,
    enforce_report_retention,
)

router = APIRouter(tags=["reports"])


@router.get("/sessions/{session_id}/report")
def download_report(
    session_id: str,
    tipo: str = "geral",
    confirmado: bool = False,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)

    if not confirmado:
        raise HTTPException(
            status_code=400,
            detail="Confirme a revisão profissional antes de gerar o relatório",
        )

    if enforce_report_retention(db, session):
        db.commit()
        db.refresh(session)

    if session.report_data_status == REPORT_STATUS_EXPIRED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Relatório expirado após o prazo de disponibilidade de 60 dias",
        )
    if session.report_data_status == REPORT_STATUS_ANONYMIZED_OR_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="O prazo de 60 dias terminou e os dados deste relatório foram removidos",
        )

    if session.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Relatório disponível apenas para sessões concluídas",
        )

    if not session.checklist or len(session.task_results) < 3:
        raise HTTPException(
            status_code=400,
            detail="Sessão incompleta — checklist ou tasks pendentes",
        )

    is_detailed = tipo == "detalhado"
    pdf_bytes = generate_detailed_pdf(session) if is_detailed else generate_pdf(session)
    if activate_report_retention(session):
        db.commit()
        db.refresh(session)
    suffix = "detalhado" if is_detailed else "geral"
    filename = f"PSV_{session.participant.initials}_{session.created_at.strftime('%Y%m%d')}_{suffix}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-PSV-Report-Status": session.report_data_status,
            "X-PSV-Report-Expires-At": session.report_expires_at.isoformat(),
        },
    )


@router.get("/documents/contract")
def download_contract(
    current: Professional = Depends(get_current_professional),
):
    return _contract_response(current)


@router.get("/sessions/documents/contract")
def download_contract_proxy_safe(
    current: Professional = Depends(get_current_professional),
):
    return _contract_response(current)


@router.get("/documents/privacy")
def download_privacy_policy(
    current: Professional = Depends(get_current_professional),
):
    return _privacy_response(current)


@router.get("/sessions/documents/privacy")
def download_privacy_policy_proxy_safe(
    current: Professional = Depends(get_current_professional),
):
    return _privacy_response(current)


def _contract_response(current: Professional):
    pdf_bytes = generate_contract_pdf(current)
    filename = "Contrato_PSV.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


def _privacy_response(_current: Professional):
    pdf_bytes = generate_privacy_pdf()
    filename = "Politica_Privacidade_PSV.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
