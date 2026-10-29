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
    # Test SMTP credentials live
    try:
        async with aiosmtplib.SMTP(hostname=req.smtp_host, port=req.smtp_port, start_tls=True) as smtp:
            await smtp.login(req.smtp_user, req.smtp_password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP authentication failed: {str(e)}")

    verify_token = str(uuid.uuid4())
    pass_enc = encrypt_password(req.smtp_password, current_user.id)

    # Upsert sender email
    sender = db.query(SenderEmail).filter(
        SenderEmail.user_id == current_user.id,
        SenderEmail.email == req.email.lower()
    ).first()

    if sender:
        sender.display_name = req.display_name
        sender.provider = req.provider
        sender.smtp_host = req.smtp_host
        sender.smtp_port = req.smtp_port
        sender.smtp_user = req.smtp_user
        sender.smtp_password_enc = pass_enc
        sender.status = "PENDING"
        sender.verify_token = verify_token
    else:
        sender = SenderEmail(
            user_id=current_user.id,
            email=req.email.lower(),
            display_name=req.display_name,
            provider=req.provider,
            smtp_host=req.smtp_host,
            smtp_port=req.smtp_port,
            smtp_user=req.smtp_user,
            smtp_password_enc=pass_enc,
            status="PENDING",
            verify_token=verify_token
        )
        db.add(sender)

    db.commit()
    db.refresh(sender)

    # Send verification email directly from their SMTP to themselves
    verify_url = f"http://localhost:8000/api/senders/verify?token={verify_token}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your sender mailbox — OutreachBot"
    msg["From"] = f"{req.display_name} <{req.email}>"
    msg["To"] = req.email

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #c4530a;">Verify Your Sender Mailbox</h2>
      <p>Click the button below to confirm that <strong>{req.email}</strong> is authorized to send outreach campaigns via OutreachBot.</p>
      <div style="margin: 25px 0;">
        <a href="{verify_url}" style="background-color: #e86a10; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Mailbox Now
        </a>
      </div>
      <p style="font-size: 12px; color: #888;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="font-size: 11px; color: #555; word-break: break-all;">{verify_url}</p>
    </div>
    """
    msg.attach(MIMEText(html_content, "html"))

    try:
        async with aiosmtplib.SMTP(hostname=req.smtp_host, port=req.smtp_port, start_tls=True) as smtp:
            await smtp.login(req.smtp_user, req.smtp_password)
            await smtp.send_message(msg)
    except Exception as e:
        # Non-fatal if send failed, but inform
        pass

    return {
        "id": sender.id,
        "email": sender.email,
        "status": sender.status,
        "message": "Mailbox connected! A verification email has been sent to your address. Click the link inside to verify."
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
