import re
import urllib.parse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, WhatsAppSender, WhatsAppMessage, Lead
from core.auth import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

def clean_phone_number(raw: str) -> str:
    """Strips spaces, dashes, parentheses, pluses to produce plain international digits."""
    digits = re.sub(r"[^\d]", "", raw)
    return digits

class AddSenderRequest(BaseModel):
    phone_number: str
    display_name: str
    is_default: bool = False

class SendMessageRequest(BaseModel):
    sender_id: str | None = None
    lead_id: str | None = None
    recipient_phone: str
    recipient_name: str | None = None
    message: str

class QuickBulkRequest(BaseModel):
    sender_id: str | None = None
    message_template: str
    lead_ids: list[str]

class LogSentRequest(BaseModel):
    lead_id: str | None = None
    recipient_phone: str
    recipient_name: str | None = None
    message: str
    sender_id: str | None = None

class BatchLogSentRequest(BaseModel):
    items: list[LogSentRequest]

# ----------------- WhatsApp Senders (Numbers) -----------------

@router.get("/senders")
def list_senders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    senders = db.query(WhatsAppSender).filter(
        WhatsAppSender.user_id == current_user.id
    ).order_by(WhatsAppSender.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "phone_number": s.phone_number,
            "display_name": s.display_name,
            "is_default": s.is_default,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else ""
        }
        for s in senders
    ]

@router.post("/senders")
def add_sender(
    req: AddSenderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_num = clean_phone_number(req.phone_number)
    if len(clean_num) < 7:
        raise HTTPException(status_code=400, detail="Please enter a valid phone number with country code")

    # If first sender, make default
    existing_count = db.query(WhatsAppSender).filter(WhatsAppSender.user_id == current_user.id).count()
    make_default = req.is_default or (existing_count == 0)

    if make_default:
        db.query(WhatsAppSender).filter(WhatsAppSender.user_id == current_user.id).update({"is_default": False})

    sender = WhatsAppSender(
        user_id=current_user.id,
        phone_number=clean_num,
        display_name=req.display_name.strip() or f"+{clean_num}",
        is_default=make_default
    )
    db.add(sender)
    db.commit()
    db.refresh(sender)
    return {"id": sender.id, "phone_number": sender.phone_number, "display_name": sender.display_name}

@router.delete("/senders/{sender_id}")
def delete_sender(
    sender_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sender = db.query(WhatsAppSender).filter(
        WhatsAppSender.id == sender_id,
        WhatsAppSender.user_id == current_user.id
    ).first()
    if not sender:
        raise HTTPException(status_code=404, detail="WhatsApp number not found")

    db.delete(sender)
    db.commit()
    return {"success": True}

# ----------------- WhatsApp Messages & Links -----------------

@router.post("/generate-link")
def generate_whatsapp_link(
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_num = clean_phone_number(req.recipient_phone)
    if len(clean_num) < 7:
        raise HTTPException(status_code=400, detail="Invalid recipient phone number")

    encoded_msg = urllib.parse.quote(req.message)
    # Direct Universal WhatsApp deep link: opens chat with message prefilled
    wa_link = f"https://wa.me/{clean_num}?text={encoded_msg}"
    web_link = f"https://web.whatsapp.com/send?phone={clean_num}&text={encoded_msg}"

    # Log message history
    msg_record = WhatsAppMessage(
        user_id=current_user.id,
        sender_id=req.sender_id,
        lead_id=req.lead_id,
        recipient_phone=clean_num,
        recipient_name=req.recipient_name,
        message=req.message,
        status="SENT",
        sent_at=datetime.utcnow()
    )
    db.add(msg_record)
    db.commit()

    return {
        "success": True,
        "recipient_phone": clean_num,
        "wa_link": wa_link,
        "web_link": web_link,
        "message_id": msg_record.id
    }

@router.post("/bulk-generate-links")
def bulk_generate_whatsapp_links(
    req: QuickBulkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    leads = db.query(Lead).filter(
        Lead.id.in_(req.lead_ids),
        Lead.user_id == current_user.id
    ).all()

    results = []
    for l in leads:
        raw_phone = l.phone or ""
        clean_num = clean_phone_number(raw_phone)
        if not clean_num or len(clean_num) < 7:
            continue

        rendered = req.message_template
        rendered = rendered.replace("{{firstName}}", l.first_name or "there")
        rendered = rendered.replace("{{company}}", l.company or "your business")
        rendered = rendered.replace("{{website}}", l.website or "")

        encoded_msg = urllib.parse.quote(rendered)
        wa_link = f"https://wa.me/{clean_num}?text={encoded_msg}"
        web_link = f"https://web.whatsapp.com/send?phone={clean_num}&text={encoded_msg}"

        results.append({
            "lead_id": l.id,
            "recipient_name": l.first_name or l.company or clean_num,
            "recipient_phone": clean_num,
            "message": rendered,
            "wa_link": wa_link,
            "web_link": web_link
        })

    return {"total": len(results), "items": results}

@router.post("/log-sent")
def log_sent_message(
    req: LogSentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_num = clean_phone_number(req.recipient_phone)
    msg_record = WhatsAppMessage(
        user_id=current_user.id,
        sender_id=req.sender_id,
        lead_id=req.lead_id,
        recipient_phone=clean_num,
        recipient_name=req.recipient_name,
        message=req.message,
        status="SENT",
        sent_at=datetime.utcnow()
    )
    db.add(msg_record)
    
    # Also update lead status if applicable
    if req.lead_id:
        lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.user_id == current_user.id).first()
        if lead and lead.status == "PENDING":
            lead.status = "CONTACTED"
            
    db.commit()
    return {"success": True, "message_id": msg_record.id}

@router.post("/batch-log-sent")
def batch_log_sent_messages(
    req: BatchLogSentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lead_ids_to_update = []
    now = datetime.utcnow()
    for item in req.items:
        clean_num = clean_phone_number(item.recipient_phone)
        msg_record = WhatsAppMessage(
            user_id=current_user.id,
            sender_id=item.sender_id,
            lead_id=item.lead_id,
            recipient_phone=clean_num,
            recipient_name=item.recipient_name,
            message=item.message,
            status="SENT",
            sent_at=now
        )
        db.add(msg_record)
        if item.lead_id:
            lead_ids_to_update.append(item.lead_id)

    if lead_ids_to_update:
        db.query(Lead).filter(
            Lead.id.in_(lead_ids_to_update),
            Lead.user_id == current_user.id,
            Lead.status == "PENDING"
        ).update({"status": "CONTACTED"}, synchronize_session=False)

    db.commit()
    return {"success": True, "count": len(req.items)}

@router.get("/history")
def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msgs = db.query(WhatsAppMessage).filter(
        WhatsAppMessage.user_id == current_user.id
    ).order_by(WhatsAppMessage.created_at.desc()).limit(100).all()

    return [
        {
            "id": m.id,
            "recipient_phone": m.recipient_phone,
            "recipient_name": m.recipient_name or "",
            "message": m.message,
            "status": m.status,
            "created_at": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else ""
        }
        for m in msgs
    ]
