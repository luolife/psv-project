"""
PSV — Schemas Pydantic
=======================
Separa o contrato da API (schemas) dos modelos do banco (SQLAlchemy).
Cada entidade tem três variantes: Base (campos comuns), Create (input),
e Read (output com id e campos gerados).
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator
import re


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Professional
# ---------------------------------------------------------------------------

class ProfessionalCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    profession: Optional[str] = None
    council: Optional[str] = None
    council_register: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v


class ProfessionalRead(BaseModel):
    id: str
    name: str
    email: str
    profession: Optional[str]
    council: Optional[str]
    council_register: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Participant
# ---------------------------------------------------------------------------

class ParticipantCreate(BaseModel):
    initials: str
    age: int
    sex: str
    notes: Optional[str] = None

    @field_validator("initials")
    @classmethod
    def initials_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Iniciais não podem ser vazias")
        return v

    @field_validator("age")
    @classmethod
    def age_range(cls, v: int) -> int:
        if not (0 <= v <= 120):
            raise ValueError("Idade deve estar entre 0 e 120")
        return v

    @field_validator("sex")
    @classmethod
    def sex_valid(cls, v: str) -> str:
        v = v.upper()
        if v not in ("M", "F", "O"):
            raise ValueError("Sexo deve ser M, F ou O")
        return v


class ParticipantRead(BaseModel):
    id: str
    initials: str
    age: int
    sex: str
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PSVSession
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    participant_id: str


class SessionRead(BaseModel):
    id: str
    participant_id: str
    professional_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SessionStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in ("completed", "abandoned"):
            raise ValueError("Status deve ser 'completed' ou 'abandoned'")
        return v


# ---------------------------------------------------------------------------
# Checklist
# ---------------------------------------------------------------------------

class ChecklistSubmit(BaseModel):
    """Respostas brutas do checklist: {item_number: score 0-4}"""
    responses: Dict[int, int]


class DomainResultRead(BaseModel):
    domain: str
    label: str
    raw_sum: int
    max_sum: int
    normalized_score: float
    level: str
    percentile: Optional[float] = None
    norm_label: Optional[str] = None


class ChecklistResultRead(BaseModel):
    id: str
    session_id: str
    hev_score: float
    hov_score: float
    bsv_score: float
    hev_level: str
    hov_level: str
    bsv_level: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Task Result
# ---------------------------------------------------------------------------

class TrialData(BaseModel):
    trial: int
    stimulus: Optional[str] = None
    response: Optional[str] = None
    correct: bool
    rt_ms: Optional[float] = None


class HardwareMetadata(BaseModel):
    screen_width: int
    screen_height: int
    device_pixel_ratio: float
    estimated_refresh_rate: Optional[float] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    user_agent: Optional[str] = None


class TaskResultSubmit(BaseModel):
    task_name: str
    total_trials: int
    hits: int
    errors: int
    omissions: int
    mean_rt_ms: Optional[float] = None
    raw_trials: List[TrialData] = []
    hardware_metadata: HardwareMetadata

    @field_validator("task_name")
    @classmethod
    def task_name_valid(cls, v: str) -> str:
        if v not in ("contrast", "motion", "gabor"):
            raise ValueError("task_name deve ser 'contrast', 'motion' ou 'gabor'")
        return v

    @field_validator("hits", "errors", "omissions")
    @classmethod
    def non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Contagens não podem ser negativas")
        return v


class TaskResultRead(BaseModel):
    id: str
    session_id: str
    task_name: str
    total_trials: int
    hits: int
    errors: int
    omissions: int
    mean_rt_ms: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Relatório — resumo completo de uma sessão
# ---------------------------------------------------------------------------

class SessionSummary(BaseModel):
    session: SessionRead
    participant: ParticipantRead
    checklist: Optional[ChecklistResultRead]
    tasks: List[TaskResultRead]
