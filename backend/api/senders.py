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

router = APIRouter(prefix="/senders", tags=["senders"])

class ConnectSenderRequest(BaseModel):
    email: EmailStr
    display_name: str
    provider: str = "GMAIL"  # GMAIL | OUTLOOK | CUSTOM
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str

class SenderResponse(BaseModel):
    id: str
    email: str
    display_name: str
    provider: str
    status: str
    daily_limit: int
    sent_today: int

@router.get("", response_model=list[SenderResponse])
def list_senders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    senders = db.query(SenderEmail).filter(SenderEmail.user_id == current_user.id).all()
    return [
        SenderResponse(
            id=s.id,
            email=s.email,
            display_name=s.display_name,
            provider=s.provider,
            status=s.status,
            daily_limit=s.daily_limit,
            sent_today=s.sent_today
        ) for s in senders
    ]

@router.post("")
async def connect_sender(
    req: ConnectSenderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_password = req.smtp_password.replace(" ", "").strip()
    clean_user = req.smtp_user.strip()
    clean_email = str(req.email).lower().strip()

    # Test SMTP credentials live with automatic port fallback (587 STARTTLS <-> 465 SSL)
    test_ports = [req.smtp_port]
    if req.smtp_port == 587 and 465 not in test_ports:
        test_ports.append(465)
    elif req.smtp_port == 465 and 587 not in test_ports:
        test_ports.append(587)
    elif 587 not in test_ports and 465 not in test_ports:
        test_ports.extend([587, 465])

    connected = False
    effective_port = req.smtp_port
    last_err = None

    for port_to_test in test_ports:
        use_tls = (port_to_test == 465)
        start_tls = not use_tls
        try:
            async with aiosmtplib.SMTP(
                hostname=req.smtp_host.strip(),
                port=port_to_test,
                use_tls=use_tls,
                start_tls=start_tls,
                timeout=18.0
            ) as smtp:
                await smtp.login(clean_user, clean_password)
            connected = True
            effective_port = port_to_test
            break
        except Exception as e:
            last_err = e

    if not connected:
        raise HTTPException(
            status_code=400,
            detail=f"Mailbox authentication failed: {str(last_err)}. If using Gmail, make sure you use a 16-character App Password (not your normal Google account password) and that 2-Step Verification is turned on."
        )

    pass_enc = encrypt_password(clean_password, current_user.id)

    # Upsert sender email directly as VERIFIED since live SMTP login succeeded!
    sender = db.query(SenderEmail).filter(
        SenderEmail.user_id == current_user.id,
        SenderEmail.email == clean_email
    ).first()

    if sender:
        sender.display_name = req.display_name.strip()
        sender.provider = req.provider
        sender.smtp_host = req.smtp_host.strip()
        sender.smtp_port = effective_port
        sender.smtp_user = clean_user
        sender.smtp_password_enc = pass_enc
        sender.status = "VERIFIED"
        sender.verify_token = None
    else:
        sender = SenderEmail(
            user_id=current_user.id,
            email=clean_email,
            display_name=req.display_name.strip(),
            provider=req.provider,
            smtp_host=req.smtp_host.strip(),
            smtp_port=effective_port,
            smtp_user=clean_user,
            smtp_password_enc=pass_enc,
            status="VERIFIED",
            verify_token=None,
            daily_limit=100
        )
        db.add(sender)

    db.commit()
    db.refresh(sender)

    return {
        "id": sender.id,
        "email": sender.email,
        "status": sender.status,
        "message": f"✓ {sender.email} successfully connected and verified! Ready to dispatch cold outreach campaigns."
    }

@router.get("/verify")
def verify_sender(token: str = Query(...), db: Session = Depends(get_db)):
    sender = db.query(SenderEmail).filter(SenderEmail.verify_token == token).first()
    if not sender:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    sender.status = "VERIFIED"
    sender.verify_token = None
    db.commit()
    return RedirectResponse(url="/static/app.html?verified=1")

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
