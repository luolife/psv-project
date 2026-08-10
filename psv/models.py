"""
PSV — Models SQLAlchemy
========================
Entidades: Professional, Participant, PSVSession, ChecklistResult, TaskResult
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Integer, Float, DateTime,
    ForeignKey, JSON, Enum, UniqueConstraint, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


def new_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SessionStatus(str, PyEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    ABANDONED   = "abandoned"


class TaskName(str, PyEnum):
    CONTRAST = "contrast"
    MOTION   = "motion"
    GABOR    = "gabor"


# ---------------------------------------------------------------------------
# Professional — usuário do sistema
# ---------------------------------------------------------------------------

class Professional(Base):
    __tablename__ = "professionals"

    id               = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    name             = Column(String(200), nullable=False)
    cpf              = Column(String(14),  nullable=True)
    email            = Column(String(200), nullable=False, unique=True, index=True)
    secondary_email  = Column(String(200), nullable=True)
    hashed_password  = Column(String(200), nullable=False)
    profession       = Column(String(100), nullable=True)
    council          = Column(String(100), nullable=True)
    council_register = Column(String(50),  nullable=True)
    area             = Column(String(200), nullable=True)   # área de atuação
    titulation       = Column(String(100), nullable=True)   # titulação
    institution      = Column(String(200), nullable=True)   # instituição
    country          = Column(String(100), nullable=True, default="Brasil")
    city             = Column(String(100), nullable=True)
    state            = Column(String(50),  nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active        = Column(Integer, default=1, nullable=False)

    participants = relationship("Participant", back_populates="professional")
    sessions     = relationship("PSVSession",  back_populates="professional")

    def __repr__(self):
        return f"<Professional {self.name} ({self.email})>"


# ---------------------------------------------------------------------------
# Participant — paciente avaliado (não faz login)
# ---------------------------------------------------------------------------

class Participant(Base):
    __tablename__ = "participants"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    professional_id = Column(UUID(as_uuid=False), ForeignKey("professionals.id"), nullable=False, index=True)
    name            = Column(String(200), nullable=False)   # nome completo
    birthdate       = Column(String(10),  nullable=True)    # YYYY-MM-DD
    sex             = Column(String(1),   nullable=False)   # "M" | "F" | "O"
    diagnosis_cid   = Column(String(500), nullable=True)    # Diagnosticos selecionados
    city            = Column(String(100), nullable=True)
    state           = Column(String(50),  nullable=True)
    country         = Column(String(100), nullable=True, default="Brasil")
    medication_notes = Column(Text,       nullable=True)
    notes           = Column(Text,        nullable=True)
    # Campos legados — mantidos para compatibilidade
    initials        = Column(String(10),  nullable=True)
    age             = Column(Integer,     nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)

    professional = relationship("Professional", back_populates="participants")
    sessions     = relationship("PSVSession",   back_populates="participant")

    def __repr__(self):
        return f"<Participant {self.initials} age={self.age}>"


# ---------------------------------------------------------------------------
# PSVSession — uma avaliação completa
# ---------------------------------------------------------------------------

class PSVSession(Base):
    __tablename__ = "sessions"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    participant_id  = Column(UUID(as_uuid=False), ForeignKey("participants.id"), nullable=False, index=True)
    professional_id = Column(UUID(as_uuid=False), ForeignKey("professionals.id"), nullable=False, index=True)
    status          = Column(Enum(SessionStatus), default=SessionStatus.IN_PROGRESS, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at    = Column(DateTime, nullable=True)
    report_generated_at = Column(DateTime, nullable=True)
    report_expires_at   = Column(DateTime, nullable=True)
    report_data_removed_at = Column(DateTime, nullable=True)
    report_data_status  = Column(String(40), nullable=False, default="not_generated")

    participant  = relationship("Participant",      back_populates="sessions")
    professional = relationship("Professional",     back_populates="sessions")
    checklist    = relationship("ChecklistResult",  back_populates="session", uselist=False)
    task_results = relationship("TaskResult",       back_populates="session")

    @property
    def is_complete(self) -> bool:
        """Sessão completa = checklist + 3 tasks."""
        has_checklist = self.checklist is not None
        has_all_tasks = len(self.task_results) == 3
        return has_checklist and has_all_tasks

    def __repr__(self):
        return f"<PSVSession {self.id} status={self.status}>"


# ---------------------------------------------------------------------------
# ChecklistResult — resultado do check-list sensorial
# ---------------------------------------------------------------------------

class ChecklistResult(Base):
    __tablename__ = "checklist_results"

    id         = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id"), nullable=False, unique=True, index=True)

    # Scores normalizados 0–100
    hev_score = Column(Float, nullable=False)
    hov_score = Column(Float, nullable=False)
    bsv_score = Column(Float, nullable=False)

    # Classificações textuais (Baixo / Médio / Alto)
    hev_level = Column(String(10), nullable=False)
    hov_level = Column(String(10), nullable=False)
    bsv_level = Column(String(10), nullable=False)

    # Respostas brutas — {item_number: score} — para auditoria e reprocessamento
    raw_responses = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("PSVSession", back_populates="checklist")

    def __repr__(self):
        return f"<ChecklistResult HEV={self.hev_score} HOV={self.hov_score} BSV={self.bsv_score}>"


# ---------------------------------------------------------------------------
# TaskResult — resultado de uma task computadorizada
# ---------------------------------------------------------------------------

class TaskResult(Base):
    __tablename__ = "task_results"

    __table_args__ = (
        # cada task só pode aparecer uma vez por sessão
        UniqueConstraint("session_id", "task_name", name="uq_session_task"),
    )

    id         = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id"), nullable=False, index=True)
    task_name  = Column(Enum(TaskName), nullable=False)

    # Indicadores comportamentais
    total_trials = Column(Integer, nullable=False)
    hits         = Column(Integer, nullable=False)
    errors       = Column(Integer, nullable=False)
    omissions    = Column(Integer, nullable=False)
    mean_rt_ms   = Column(Float,   nullable=True)   # None se todas omissões

    # Dados brutos trial a trial — preservados para análise futura
    # Estrutura: [{trial: int, stimulus: str, response: str|null,
    #              correct: bool, rt_ms: float|null}]
    raw_trials = Column(JSON, nullable=False, default=list)

    # Metadados de hardware — registrados para controle metodológico
    # Estrutura: {screen_width, screen_height, device_pixel_ratio,
    #             estimated_refresh_rate, browser, os, user_agent}
    hardware_metadata = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("PSVSession", back_populates="task_results")

    @property
    def hit_rate(self) -> float | None:
        if self.total_trials == 0:
            return None
        return round((self.hits / self.total_trials) * 100, 1)

    def __repr__(self):
        return (
            f"<TaskResult {self.task_name} "
            f"hits={self.hits}/{self.total_trials} rt={self.mean_rt_ms}ms>"
        )
