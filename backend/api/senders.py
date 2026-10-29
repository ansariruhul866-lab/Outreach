import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from core.database import get_db
from core.models import User, SenderEmail
from core.auth import get_current_user
from core.encryption import encrypt_password, decrypt_password
from core.email_dispatcher import test_brevo_key, test_resend_key

router = APIRouter(prefix="/senders", tags=["senders"])

class ConnectSenderRequest(BaseModel):
    email: EmailStr
    display_name: str
    provider: str = "HYBRID"  # HYBRID | BREVO | RESEND | GMAIL | OUTLOOK | CUSTOM
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    brevo_api_key: str | None = None
    resend_api_key: str | None = None

class TestRelayRequest(BaseModel):
    brevo_api_key: str | None = None
    resend_api_key: str | None = None

class SenderResponse(BaseModel):
    id: str
    email: str
    display_name: str
    provider: str
    status: str
    daily_limit: int
    sent_today: int
    last_used_relay: str | None = None
    has_brevo: bool = False
    has_resend: bool = False

@router.get("", response_model=list[SenderResponse])
def list_senders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    senders = db.query(SenderEmail).filter(SenderEmail.user_id == current_user.id).all()
    env_has_brevo = bool(os.getenv("BREVO_API_KEY", "").strip())
    env_has_resend = bool(os.getenv("RESEND_API_KEY", "").strip())
    
    return [
        SenderResponse(
            id=s.id,
            email=s.email,
            display_name=s.display_name,
            provider=s.provider,
            status=s.status,
            daily_limit=s.daily_limit,
            sent_today=s.sent_today,
            last_used_relay=getattr(s, "last_used_relay", None),
            has_brevo=bool(getattr(s, "brevo_api_key_enc", None) or env_has_brevo),
            has_resend=bool(getattr(s, "resend_api_key_enc", None) or env_has_resend)
        ) for s in senders
    ]

@router.post("/test-relays")
async def test_relays(
    req: TestRelayRequest,
    current_user: User = Depends(get_current_user)
):
    """Test Brevo and Resend keys over HTTPS (Port 443). Safe on Render."""
    b_key = (req.brevo_api_key or os.getenv("BREVO_API_KEY", "")).strip()
    r_key = (req.resend_api_key or os.getenv("RESEND_API_KEY", "")).strip()

    results = {}
    if b_key:
        b_ok, b_msg = await test_brevo_key(b_key)
        results["brevo"] = {"success": b_ok, "message": b_msg}
    else:
        results["brevo"] = {"success": False, "message": "No Brevo API key provided or found in environment."}

    if r_key:
        r_ok, r_msg = await test_resend_key(r_key)
        results["resend"] = {"success": r_ok, "message": r_msg}
    else:
        results["resend"] = {"success": False, "message": "No Resend API key provided or found in environment."}

    return results

@router.post("")
async def connect_sender(
    req: ConnectSenderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prov = (req.provider or "HYBRID").upper()
    pass_enc = None
    brevo_enc = None
    resend_enc = None
    status = "VERIFIED"  # Cloud relays are verified directly over HTTPS

    # 1. CLOUD RELAYS (HYBRID, BREVO, RESEND)
    if prov in ("HYBRID", "BREVO", "RESEND"):
        b_key = (req.brevo_api_key or os.getenv("BREVO_API_KEY", "")).strip()
        r_key = (req.resend_api_key or os.getenv("RESEND_API_KEY", "")).strip()

        if not b_key and not r_key:
            raise HTTPException(
                status_code=400,
                detail="At least one API key (Brevo or Resend) is required for Cloud Relay mode. You can get free keys at brevo.com (300/day) or resend.com (3,000/mo)."
            )

        verification_notes = []
        if b_key:
            b_ok, b_msg = await test_brevo_key(b_key)
            if not b_ok and prov == "BREVO":
                raise HTTPException(status_code=400, detail=f"Brevo API error: {b_msg}")
            if b_ok:
                verification_notes.append("Brevo verified (300/day pool)")
                brevo_enc = encrypt_password(b_key, current_user.id)

        if r_key:
            r_ok, r_msg = await test_resend_key(r_key)
            if not r_ok and prov == "RESEND":
                raise HTTPException(status_code=400, detail=f"Resend API error: {r_msg}")
            if r_ok:
                verification_notes.append("Resend verified (3,000/mo pool)")
                resend_enc = encrypt_password(r_key, current_user.id)

        if not verification_notes:
            raise HTTPException(
                status_code=400,
                detail="Could not authenticate with provided Brevo or Resend credentials. Please verify your API keys."
            )

        success_message = f"Mailbox connected via HTTPS Cloud Relay! ({' + '.join(verification_notes)} with automatic failover). 0% chance of port blocks on Render."

    # 2. TRADITIONAL SMTP (GMAIL / OUTLOOK / CUSTOM)
    else:
        if not req.smtp_user or not req.smtp_password:
            raise HTTPException(status_code=400, detail="SMTP username and password are required for direct SMTP.")

        try:
            use_ssl = (req.smtp_port == 465)
            if use_ssl:
                async with aiosmtplib.SMTP(hostname=req.smtp_host, port=req.smtp_port, use_tls=True, timeout=10) as smtp:
                    await smtp.login(req.smtp_user, req.smtp_password)
            else:
                async with aiosmtplib.SMTP(hostname=req.smtp_host, port=req.smtp_port, start_tls=True, timeout=10) as smtp:
                    await smtp.login(req.smtp_user, req.smtp_password)
        except Exception as e:
            err_str = str(e)
            if "timed out" in err_str.lower() or "timeout" in err_str.lower() or "587" in err_str:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"SMTP connection timed out on port {req.smtp_port}. "
                        "Free cloud hosts (such as Render) block outbound SMTP ports (587/465/25). "
                        "Recommendation: Choose Provider 'Cloud Relay (Brevo + Resend)' to send over HTTPS port 443 with zero blocks!"
                    )
                )
            raise HTTPException(status_code=400, detail=f"SMTP authentication failed: {err_str}")

        pass_enc = encrypt_password(req.smtp_password, current_user.id)
        success_message = "Mailbox connected & verified successfully via direct SMTP!"

    # Upsert sender email in database
    sender = db.query(SenderEmail).filter(
        SenderEmail.user_id == current_user.id,
        SenderEmail.email == req.email.lower()
    ).first()

    if sender:
        sender.display_name = req.display_name
        sender.provider = prov
        sender.smtp_host = req.smtp_host or "smtp.gmail.com"
        sender.smtp_port = req.smtp_port or 587
        sender.smtp_user = req.smtp_user or req.email.lower()
        if pass_enc:
            sender.smtp_password_enc = pass_enc
        if brevo_enc:
            sender.brevo_api_key_enc = brevo_enc
        if resend_enc:
            sender.resend_api_key_enc = resend_enc
        sender.status = status
    else:
        sender = SenderEmail(
            user_id=current_user.id,
            email=req.email.lower(),
            display_name=req.display_name,
            provider=prov,
            smtp_host=req.smtp_host or "smtp.gmail.com",
            smtp_port=req.smtp_port or 587,
            smtp_user=req.smtp_user or req.email.lower(),
            smtp_password_enc=pass_enc or "",
            brevo_api_key_enc=brevo_enc,
            resend_api_key_enc=resend_enc,
            status=status
        )
        db.add(sender)

    db.commit()
    db.refresh(sender)

    return {
        "id": sender.id,
        "email": sender.email,
        "provider": sender.provider,
        "status": sender.status,
        "message": success_message
    }

@router.delete("/{sender_id}")
def delete_sender(sender_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sender = db.query(SenderEmail).filter(
        SenderEmail.id == sender_id,
        SenderEmail.user_id == current_user.id
    ).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    db.delete(sender)
    db.commit()
    return {"success": True}
