"""
PSV — Router: Reports
GET /sessions/{id}/report  → devolve PDF da sessão como download
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from auth import get_current_professional
from database import get_db
from models import Professional
from routers.sessions import _get_own_session
from core.report_generator import generate_pdf

router = APIRouter(tags=["reports"])


@router.get("/sessions/{session_id}/report")
def download_report(
    session_id: str,
    db: Session = Depends(get_db),
    current: Professional = Depends(get_current_professional),
):
    session = _get_own_session(session_id, db, current)

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

    pdf_bytes = generate_pdf(session)
    filename = f"PSV_{session.participant.initials}_{session.created_at.strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
