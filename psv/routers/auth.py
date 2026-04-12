"""
PSV — Router: Auth
POST /auth/register   → cadastro do profissional
POST /auth/login      → retorna JWT
GET  /auth/me         → dados do profissional logado
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import (
    hash_password, verify_password,
    create_access_token, get_current_professional,
)
from database import get_db
from models import Professional
from schemas import (
    ProfessionalCreate, ProfessionalRead,
    LoginRequest, TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=ProfessionalRead, status_code=201)
def register(payload: ProfessionalCreate, db: Session = Depends(get_db)):
    existing = db.query(Professional).filter(
        Professional.email == payload.email
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )

    professional = Professional(
        name=payload.name,
        cpf=payload.cpf,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        profession=payload.profession,
        council=payload.council,
        council_register=payload.council_register,
        area=payload.area,
        titulation=payload.titulation,
        institution=payload.institution,
    )
    db.add(professional)
    db.commit()
    db.refresh(professional)
    return professional


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    professional = db.query(Professional).filter(
        Professional.email == payload.email,
        Professional.is_active == 1,
    ).first()

    if not professional or not verify_password(payload.password, professional.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )

    token = create_access_token(subject=professional.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=ProfessionalRead)
def me(current: Professional = Depends(get_current_professional)):
    return current
