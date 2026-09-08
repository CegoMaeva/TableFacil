import os
import datetime as dt
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, DateTime, Integer, String, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, Session
from passlib.hash import bcrypt

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://auth:auth@auth-db/auth")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
JWT_ALGO = "HS256"

engine = create_engine(DATABASE_URL, echo=False, future=True)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False, default="client")  # client|employee
    employee_code = Column(String(50), nullable=True)  # for employees only
    role = Column(String(50), nullable=True)  # manager, cook, driver, cashier, support
    created_at = Column(DateTime, default=dt.datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


app = FastAPI(title="Auth Service", version="1.0.0")


class RegisterClientRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class RegisterEmployeeRequest(BaseModel):
    email: EmailStr
    password: str
    code: str
    role: Optional[str] = None


class LoginClientRequest(BaseModel):
    email: EmailStr
    password: str


class LoginEmployeeRequest(BaseModel):
    code: str
    password: str


class VerifyResponse(BaseModel):
    valid: bool
    claims: Optional[dict] = None


def get_db():
    with Session(engine) as session:
        yield session


def hash_password(raw: str) -> str:
    return bcrypt.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return bcrypt.verify(raw, hashed)


def create_token(payload: dict, ttl_hours: int) -> str:
    now = dt.datetime.utcnow()
    exp = now + dt.timedelta(hours=ttl_hours)
    payload = {**payload, "exp": exp, "iat": now}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGO)


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth"}


@app.post("/auth/register/client")
async def register_client(payload: RegisterClientRequest, db: Session = Depends(get_db)):
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        user_type="client",
        role="client",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    token = create_token({"sub": user.email, "user_type": "client", "role": "client"}, ttl_hours=24)
    return {"token": token, "user": {"email": user.email, "role": "client"}}


@app.post("/auth/register/employee")
async def register_employee(payload: RegisterEmployeeRequest, db: Session = Depends(get_db)):
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        user_type="employee",
        employee_code=payload.code,
        role=payload.role or "employee",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email ou code déjà utilisé")
    token = create_token({"sub": user.email, "user_type": "employee", "role": user.role, "code": user.employee_code}, ttl_hours=12)
    return {
        "token": token,
        "user": {"email": user.email, "role": user.role, "code": user.employee_code},
    }


@app.post("/auth/login/client")
async def login_client(payload: LoginClientRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower(), User.user_type == "client"))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    token = create_token({"sub": user.email, "user_type": "client", "role": "client"}, ttl_hours=24)
    return {"token": token, "user": {"email": user.email, "role": "client"}}


@app.post("/auth/login/employee")
async def login_employee(payload: LoginEmployeeRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.employee_code == payload.code, User.user_type == "employee"))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    token = create_token({"sub": user.email, "user_type": "employee", "role": user.role, "code": user.employee_code}, ttl_hours=12)
    return {
        "token": token,
        "user": {"email": user.email, "role": user.role, "code": user.employee_code},
    }


@app.get("/auth/verify", response_model=VerifyResponse)
async def verify(token: str):
    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGO])
        return VerifyResponse(valid=True, claims=claims)
    except jwt.PyJWTError:
        return VerifyResponse(valid=False, claims=None)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
