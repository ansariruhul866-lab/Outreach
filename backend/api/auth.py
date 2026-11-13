from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import os
import urllib.parse
import httpx
import logging
import uuid
from core.database import get_db
from core.models import User, SenderEmail
from core.auth import verify_password, hash_password, create_access_token, get_current_user
from core.firebase_auth import verify_firebase_id_token
from core.encryption import encrypt_password

logger = logging.getLogger("outreachbot.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

class FirebaseLoginRequest(BaseModel):
    id_token: str
    name: Optional[str] = None
    google_access_token: Optional[str] = None

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
            password_hash=hash_password(str(uuid.uuid4())),
            firebase_uid=uid,
            is_email_verified=True,
            plan="free"
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Auto-provision or update Mailbox when signed in via Google OAuth
    if req.google_access_token:
        encrypted_oauth = encrypt_password(req.google_access_token, user.id)
        sender = db.query(SenderEmail).filter(
            SenderEmail.user_id == user.id,
            SenderEmail.email == email
        ).first()

        if sender:
            sender.provider = "GMAIL_API"
            sender.smtp_user = email
            if not sender.smtp_password_enc:
                sender.smtp_password_enc = encrypted_oauth
            sender.oauth_token_enc = encrypted_oauth
            sender.status = "VERIFIED"
            sender.display_name = user.name
        else:
            sender = SenderEmail(
                user_id=user.id,
                email=email,
                display_name=user.name,
                provider="GMAIL_API",
                smtp_host="smtp.gmail.com",
                smtp_port=587,
                smtp_user=email,
                smtp_password_enc=encrypted_oauth,
                oauth_token_enc=encrypted_oauth,
                status="VERIFIED",
                daily_limit=100
            )
            db.add(sender)
        db.commit()

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

def get_google_redirect_uri(request: Request) -> str:
    """
    Determine Google OAuth redirect URI dynamically:
    1. If GOOGLE_REDIRECT_URI is explicitly set AND does not contain localhost, use it.
    2. Check Render automatic platform environment variables (RENDER_EXTERNAL_URL / RENDER_EXTERNAL_HOSTNAME).
    3. Infer from incoming request proxy headers (x-forwarded-host / host).
    4. If deployed on Render or cloud, default to live domain https://outreach-b4u6.onrender.com/api/auth/google/callback.
    5. Local fallback for local development.
    """
    configured = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if configured and "localhost" not in configured and "127.0.0.1" not in configured:
        return configured
    
    # 2. Check Render platform environment variables
    render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
    if render_url and "localhost" not in render_url:
        return f"{render_url}/api/auth/google/callback"
    
    render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
    if render_host and "localhost" not in render_host:
        return f"https://{render_host}/api/auth/google/callback"
    
    # 3. Infer from incoming reverse-proxy request headers
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    if host and not host.startswith("localhost") and not host.startswith("127.0.0.1") and not host.startswith("0.0.0.0"):
        return f"{proto}://{host}/api/auth/google/callback"
    
    # 4. If running in Render container or production cloud environment
    if os.getenv("RENDER") or os.getenv("PORT") or os.getenv("RENDER_INSTANCE_ID"):
        return "https://outreach-b4u6.onrender.com/api/auth/google/callback"
    
    return configured or "http://localhost:8000/api/auth/google/callback"

@router.get("/google/login")
def google_login(request: Request, return_url: Optional[str] = None):
    """
    Direct Server-Side Google OAuth 2.0.
    Requests offline access and prompt=consent to ensure a permanent Refresh Token is granted
    with permissions to send emails via Gmail REST API.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    redirect_uri = get_google_redirect_uri(request)

    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured in backend environment")

    scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.send",
    ]

    state = return_url or "/dashboard"
    logger.info(f"Google OAuth login initiated: redirect_uri={redirect_uri}, state={state}")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "select_account consent",
        "include_granted_scopes": "true",
        "state": state
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles Google OAuth redirect:
    1. Exchanges authorization code for permanent refresh_token + access_token
    2. Fetches user identity from Google
    3. Auto-provisions User account and authenticates them
    4. Auto-connects and VERIFIES their Gmail mailbox for cold outreach
    5. Redirects back to OutRank AI frontend dashboard (supports dynamic deployed frontend origin)
    """
    # Resolve frontend destination:
    # If state contains full URL (e.g. "https://your-frontend.vercel.app/dashboard"), redirect directly to it
    if state and (state.startswith("http://") or state.startswith("https://")):
        target_destination = state
    else:
        frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
        if not frontend_url or "localhost" in frontend_url:
            referer = request.headers.get("referer", "")
            if referer and "localhost" not in referer:
                parsed = urllib.parse.urlparse(referer)
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
            elif os.getenv("RENDER"):
                frontend_url = "https://outreach-kohl-three.vercel.app"
            else:
                frontend_url = "http://localhost:3000"
        target_path = state if state and state.startswith("/") else "/dashboard"
        target_destination = f"{frontend_url}{target_path}"

    logger.info(f"Google OAuth callback received: code={bool(code)}, error={error}, target_destination={target_destination}")

    sep = "&" if "?" in target_destination else "?"

    if error:
        logger.error(f"Google OAuth returned error: {error}")
        return RedirectResponse(url=f"{target_destination}{sep}error={urllib.parse.quote(error)}")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Google")

    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = get_google_redirect_uri(request)

    # 1. Exchange authorization code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(token_url, data=token_payload)
        if token_resp.status_code != 200:
            logger.error(f"Google token exchange failed: {token_resp.text}")
            return RedirectResponse(url=f"{target_destination}{sep}error=google_token_exchange_failed")
        tokens = token_resp.json()

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    # 2. Get user profile from Google
    async with httpx.AsyncClient(timeout=15.0) as client:
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if userinfo_resp.status_code != 200:
            logger.error(f"Google userinfo lookup failed: {userinfo_resp.text}")
            return RedirectResponse(url=f"{target_destination}{sep}error=google_userinfo_failed")
        user_info = userinfo_resp.json()

    email = user_info["email"].lower().strip()
    name = (user_info.get("name") or email.split("@")[0]).strip()
    google_sub = user_info.get("id")

    # 3. Provision or update User in database
    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.name:
            user.name = name
        if not user.password_hash:
            user.password_hash = hash_password(str(uuid.uuid4()))
        if google_sub and not user.firebase_uid:
            user.firebase_uid = f"google_{google_sub}"
        user.is_email_verified = True
    else:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(str(uuid.uuid4())),
            firebase_uid=f"google_{google_sub}" if google_sub else None,
            is_email_verified=True,
            plan="free"
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # 4. Auto-provision and VERIFY the Gmail Mailbox with permanent Refresh Token!
    sender = db.query(SenderEmail).filter(
        SenderEmail.user_id == user.id,
        SenderEmail.email == email
    ).first()

    encrypted_access = encrypt_password(access_token, user.id)
    encrypted_refresh = encrypt_password(refresh_token, user.id) if refresh_token else None

    if sender:
        sender.provider = "GMAIL_API"
        sender.smtp_user = email
        if not sender.smtp_password_enc:
            sender.smtp_password_enc = encrypted_access
        sender.oauth_token_enc = encrypted_access
        if encrypted_refresh:
            sender.oauth_refresh_token_enc = encrypted_refresh
        sender.status = "VERIFIED"
        sender.display_name = name
    else:
        sender = SenderEmail(
            user_id=user.id,
            email=email,
            display_name=name,
            provider="GMAIL_API",
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            smtp_user=email,
            smtp_password_enc=encrypted_access,
            oauth_token_enc=encrypted_access,
            oauth_refresh_token_enc=encrypted_refresh,
            status="VERIFIED",
            daily_limit=150
        )
        db.add(sender)

    db.commit()

    # 5. Generate OutreachBot JWT access token and redirect to destination
    token = create_access_token(user.id, user.email)
    
    redirect_destination = (
        f"{target_destination}{sep}token={token}"
        f"&email={urllib.parse.quote(user.email)}"
        f"&name={urllib.parse.quote(user.name)}"
        f"&connected=gmail"
    )
    return RedirectResponse(url=redirect_destination)
