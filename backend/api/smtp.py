from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class SmtpCredentials(BaseModel):
    host: str
    port: int = 587
    username: str
    password: str
    from_email: str
    from_name: str

class TestSmtpRequest(BaseModel):
    credentials: SmtpCredentials

class SendEmailRequest(BaseModel):
    credentials: SmtpCredentials
    to_email: str
    to_name: str | None = None
    subject: str
    html_body: str
    text_body: str | None = None
    unsubscribe_url: str | None = None

class SmtpTestResponse(BaseModel):
    success: bool
    message: str

class SendEmailResponse(BaseModel):
    success: bool
    message: str

@router.post("/test", response_model=SmtpTestResponse)
async def test_smtp(req: TestSmtpRequest):
    creds = req.credentials
    try:
        async with aiosmtplib.SMTP(hostname=creds.host, port=creds.port, start_tls=True) as smtp:
            await smtp.login(creds.username, creds.password)
        return SmtpTestResponse(success=True, message="SMTP connection successful")
    except Exception as e:
        logger.error(f"SMTP test failed for {creds.from_email}: {e}")
        return SmtpTestResponse(success=False, message=str(e))

@router.post("/send", response_model=SendEmailResponse)
async def send_email(req: SendEmailRequest):
    creds = req.credentials
    msg = MIMEMultipart("alternative")
    msg["Subject"] = req.subject
    msg["From"] = f"{creds.from_name} <{creds.from_email}>"
    msg["To"] = req.to_email
    
    if req.unsubscribe_url:
        msg["List-Unsubscribe"] = f"<{req.unsubscribe_url}>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    text_body = req.text_body or "Please view this email in an HTML-compatible client."
    msg.attach(MIMEText(text_body, "plain"))
    
    # Add unsubscribe footer to HTML
    html = req.html_body
    if req.unsubscribe_url:
        html += f"""
        <br><br>
        <div style="font-family:sans-serif;font-size:11px;color:#888;text-align:center;padding:12px;border-top:1px solid #eee;">
          Don't want to receive these emails? 
          <a href="{req.unsubscribe_url}" style="color:#666;text-decoration:underline;">Unsubscribe here</a>
        </div>
        """
    msg.attach(MIMEText(html, "html"))

    try:
        async with aiosmtplib.SMTP(hostname=creds.host, port=creds.port, start_tls=True) as smtp:
            await smtp.login(creds.username, creds.password)
            await smtp.send_message(msg)
        logger.info(f"Email sent to {req.to_email} from {creds.from_email}")
        return SendEmailResponse(success=True, message="Email sent successfully")
    except Exception as e:
        logger.error(f"Failed to send email to {req.to_email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
