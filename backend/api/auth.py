from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User
from core.auth import verify_password, hash_password, create_access_token, get_current_user
from core.firebase_auth import verify_firebase_id_token

router = APIRouter(prefix="/auth", tags=["auth"])

class FirebaseLoginRequest(BaseModel):
    id_token: str
    name: Optional[str] = None

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    is_email_verified: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/firebase-login", response_model=TokenResponse)
async def firebase_login(req: FirebaseLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via Firebase ID Token.
    Enforces that email_verified is true. Automatically provisions or updates user in database.
    """
    token_info = await verify_firebase_id_token(req.id_token)
    email = token_info["email"].lower().strip()
    uid = token_info["uid"]
    name = (req.name or token_info.get("name") or email.split("@")[0]).strip()

    user = db.query(User).filter(
        (User.firebase_uid == uid) | (User.email == email)
    ).first()

    if user:
        user.firebase_uid = uid
        user.is_email_verified = True
        if not user.name:
            user.name = name
    else:
        user = User(
            name=name,
            email=email,
            firebase_uid=uid,
            is_email_verified=True,
            plan="free"
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            plan=user.plan,
            is_email_verified=user.is_email_verified
        )
    )

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        plan="free"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            plan=user.plan,
            is_email_verified=bool(getattr(user, 'is_email_verified', True))
        )
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            plan=user.plan,
            is_email_verified=bool(getattr(user, 'is_email_verified', True))
        )
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        plan=current_user.plan,
        is_email_verified=bool(getattr(current_user, 'is_email_verified', True))
    )
