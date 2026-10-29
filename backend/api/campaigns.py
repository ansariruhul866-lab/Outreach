import asyncio
import random
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.database import get_db, SessionLocal
from core.models import User, Campaign, SenderEmail, Lead
from core.auth import get_current_user
from core.encryption import decrypt_password
from core.gmail_api import send_via_gmail_api

logger = logging.getLogger("outreachbot")
router = APIRouter(prefix="/campaigns", tags=["campaigns"])

class CreateCampaignRequest(BaseModel):
    name: str
    type: str = "BACKLINK"
    sender_email_id: str
    subject_template: str
    body_template: str
    daily_limit: int = 50
    send_delay_seconds: int = 45
    send_only_once: bool = True
    lead_ids: list[str] | None = None

class UpdateCampaignRequest(BaseModel):
    name: str | None = None
    type: str | None = None
    sender_email_id: str | None = None
    subject_template: str | None = None
    body_template: str | None = None
    daily_limit: int | None = None
    send_delay_seconds: int | None = None
    send_only_once: bool | None = None
    lead_ids: list[str] | None = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    sender_email: str
    sender_email_id: str
    leads_count: int
    pending_count: int
    total_sent: int
    total_opened: int
    total_replied: int
    send_delay_seconds: int
    daily_limit: int
    send_only_once: bool
    total_skipped: int
    created_at: str

class CampaignDetailResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    sender_email_id: str
    sender_email: str
    subject_template: str
    body_template: str
    daily_limit: int
    send_delay_seconds: int
    send_only_once: bool
    total_sent: int
    total_opened: int
    total_replied: int
    total_skipped: int
    leads_count: int
    pending_count: int
    assigned_lead_ids: list[str]
    created_at: str

@router.get("")
def list_campaigns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.user_id == current_user.id).order_by(Campaign.created_at.desc()).all()
    results = []
    for c in campaigns:
        leads_count = db.query(Lead).filter(Lead.campaign_id == c.id, Lead.is_unsubscribed == False).count()
        pending_count = db.query(Lead).filter(Lead.campaign_id == c.id, Lead.status == "PENDING", Lead.is_unsubscribed == False).count()
        sender_email = c.sender.email if c.sender else "None"
        sender_email_id = c.sender.id if c.sender else ""
        results.append(CampaignResponse(
            id=c.id,
            name=c.name,
            type=c.type,
            status=c.status,
            sender_email=sender_email,
            sender_email_id=sender_email_id,
            leads_count=leads_count,
            pending_count=pending_count,
            total_sent=c.total_sent or 0,
            total_opened=c.total_opened or 0,
            total_replied=c.total_replied or 0,
            send_delay_seconds=c.send_delay_seconds or 45,
            daily_limit=c.daily_limit or 50,
            send_only_once=bool(c.send_only_once) if c.send_only_once is not None else True,
            total_skipped=c.total_skipped or 0,
            created_at=c.created_at.strftime("%Y-%m-%d") if c.created_at else ""
        ))
    return results

@router.get("/{campaign_id}")
def get_campaign_detail(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    assigned_leads = db.query(Lead).filter(Lead.campaign_id == campaign.id).all()
    assigned_ids = [l.id for l in assigned_leads]
    leads_count = len(assigned_leads)
    pending_count = sum(1 for l in assigned_leads if l.status == "PENDING" and not l.is_unsubscribed)

    return CampaignDetailResponse(
        id=campaign.id,
        name=campaign.name,
        type=campaign.type,
        status=campaign.status,
        sender_email_id=campaign.sender_email_id,
        sender_email=campaign.sender.email if campaign.sender else "",
        subject_template=campaign.subject_template,
        body_template=campaign.body_template,
        daily_limit=campaign.daily_limit,
        send_delay_seconds=campaign.send_delay_seconds,
        send_only_once=bool(campaign.send_only_once) if campaign.send_only_once is not None else True,
        total_sent=campaign.total_sent or 0,
        total_opened=campaign.total_opened or 0,
        total_replied=campaign.total_replied or 0,
        total_skipped=campaign.total_skipped or 0,
        leads_count=leads_count,
        pending_count=pending_count,
        assigned_lead_ids=assigned_ids,
        created_at=campaign.created_at.strftime("%Y-%m-%d %H:%M") if campaign.created_at else ""
    )

@router.post("")
def create_campaign(
    req: CreateCampaignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sender = db.query(SenderEmail).filter(
        SenderEmail.id == req.sender_email_id,
        SenderEmail.user_id == current_user.id
    ).first()

    if not sender:
        raise HTTPException(status_code=400, detail="Invalid sender email selected")

    campaign = Campaign(
        user_id=current_user.id,
        sender_email_id=sender.id,
        name=req.name,
        type=req.type,
        subject_template=req.subject_template,
        body_template=req.body_template,
        daily_limit=req.daily_limit,
        send_delay_seconds=req.send_delay_seconds,
        send_only_once=req.send_only_once,
        total_skipped=0,
        status="DRAFT"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Lead assignment: use explicitly selected lead_ids if provided, otherwise all unassigned pending leads
    if req.lead_ids is not None and len(req.lead_ids) > 0:
        target_leads = db.query(Lead).filter(
            Lead.id.in_(req.lead_ids),
            Lead.user_id == current_user.id
        ).all()
    else:
        target_leads = db.query(Lead).filter(
            Lead.user_id == current_user.id,
            Lead.campaign_id == None,
            Lead.status == "PENDING"
        ).all()

    already_sent_emails = set()
    if req.send_only_once:
        already_sent_emails = set(
            e[0].lower().strip() for e in db.query(Lead.email).filter(
                Lead.user_id == current_user.id,
                Lead.status.in_(["SENT", "OPENED", "REPLIED"])
            ).all()
        )

    assigned_in_this_campaign = set()
    for l in target_leads:
        clean_email = l.email.lower().strip()
        if req.send_only_once and (clean_email in already_sent_emails or clean_email in assigned_in_this_campaign):
            l.status = "SKIPPED"
        else:
            l.campaign_id = campaign.id
            assigned_in_this_campaign.add(clean_email)
    db.commit()

    return {"id": campaign.id, "name": campaign.name, "send_only_once": campaign.send_only_once}

@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: str,
    req: UpdateCampaignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if req.name is not None:
        campaign.name = req.name
    if req.type is not None:
        campaign.type = req.type
    if req.sender_email_id is not None:
        sender = db.query(SenderEmail).filter(SenderEmail.id == req.sender_email_id, SenderEmail.user_id == current_user.id).first()
        if not sender:
            raise HTTPException(status_code=400, detail="Invalid sender email")
        campaign.sender_email_id = sender.id
    if req.subject_template is not None:
        campaign.subject_template = req.subject_template
    if req.body_template is not None:
        campaign.body_template = req.body_template
    if req.daily_limit is not None:
        campaign.daily_limit = req.daily_limit
    if req.send_delay_seconds is not None:
        campaign.send_delay_seconds = req.send_delay_seconds
    if req.send_only_once is not None:
        campaign.send_only_once = req.send_only_once

    # Update assigned leads if provided
    if req.lead_ids is not None:
        # Unassign leads previously in this campaign that are not in req.lead_ids
        current_leads = db.query(Lead).filter(Lead.campaign_id == campaign.id).all()
        target_ids_set = set(req.lead_ids)
        for l in current_leads:
            if l.id not in target_ids_set:
                l.campaign_id = None

        # Assign newly selected leads
        new_leads = db.query(Lead).filter(
            Lead.id.in_(req.lead_ids),
            Lead.user_id == current_user.id
        ).all()
        for l in new_leads:
            l.campaign_id = campaign.id

    db.commit()
    db.refresh(campaign)
    return {"success": True, "id": campaign.id, "name": campaign.name}

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Stop execution if currently running
    campaign.status = "STOPPED"
    db.commit()

    # Unassign leads so user does not lose prospects
    leads = db.query(Lead).filter(Lead.campaign_id == campaign.id).all()
    for l in leads:
        l.campaign_id = None
    db.commit()

    db.delete(campaign)
    db.commit()
    return {"success": True, "message": "Campaign deleted and leads safely unassigned"}

def render_vars(template: str, vars_dict: dict) -> str:
    rendered = template
    for k, v in vars_dict.items():
        rendered = rendered.replace(f"{{{{{k}}}}}", str(v))
    return rendered

async def execute_send_batch(campaign_id: str, user_id: str):
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user_id).first()
        if not campaign:
            return

        sender = campaign.sender
        if not sender:
            return

        is_gmail_api = (sender.provider == "GMAIL_API")
        smtp_pass = None
        oauth_token = None

        if is_gmail_api:
            if not sender.oauth_token_enc:
                logger.error(f"Sender {sender.id} is GMAIL_API but missing oauth_token_enc")
                campaign.status = "PAUSED"
                db.commit()
                return
            oauth_token = decrypt_password(sender.oauth_token_enc, user_id)
        else:
            if not sender.smtp_password_enc:
                logger.error(f"Sender {sender.id} missing SMTP password")
                campaign.status = "PAUSED"
                db.commit()
                return
            smtp_pass = decrypt_password(sender.smtp_password_enc, user_id)

        # Get pending leads up to daily limit
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign.id,
            Lead.status == "PENDING",
            Lead.is_unsubscribed == False
        ).limit(campaign.daily_limit).all()

        if not leads:
            campaign.status = "COMPLETED"
            db.commit()
            return

        campaign.status = "RUNNING"
        db.commit()

        sent_count = 0
        sent_in_current_batch = set()
        for lead in leads:
            # Check if campaign was paused or stopped by user
            db.refresh(campaign)
            if campaign.status in ("PAUSED", "STOPPED", "DRAFT"):
                logger.info(f"Campaign {campaign.id} paused/stopped by user. Halting send loop.")
                break

            clean_email = lead.email.lower().strip()

            # Strict Send-Only-Once deduplication
            if campaign.send_only_once:
                already_contacted = db.query(Lead).filter(
                    Lead.user_id == user_id,
                    Lead.email.ilike(clean_email),
                    Lead.status.in_(["SENT", "OPENED", "REPLIED"]),
                    Lead.id != lead.id
                ).first()

                if already_contacted or clean_email in sent_in_current_batch:
                    lead.status = "SKIPPED"
                    campaign.total_skipped = (campaign.total_skipped or 0) + 1
                    db.commit()
                    continue

            vars_dict = {
                "firstName": lead.first_name or lead.company or "there",
                "company": lead.company or "your website",
                "website": lead.website or "",
                "senderName": sender.display_name,
                "senderEmail": sender.email
            }

            subject = render_vars(campaign.subject_template, vars_dict)
            html_body = render_vars(campaign.body_template, vars_dict)

            # Tracking pixel + Unsubscribe link
            unsub_url = f"http://localhost:8000/api/track/unsubscribe?token={lead.unsub_token}"
            tracking_pixel = f'<img src="http://localhost:8000/api/track/pixel?id={lead.tracking_id}" width="1" height="1" style="display:none;" />'
            
            full_html = f"""
            {html_body}
            {tracking_pixel}
            <br><br>
            <div style="font-family: sans-serif; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
              Don't want to hear from us? <a href="{unsub_url}" style="color: #666; text-decoration: underline;">Unsubscribe here</a>.
            </div>
            """

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{sender.display_name} <{sender.email}>"
            msg["To"] = lead.email
            msg["List-Unsubscribe"] = f"<{unsub_url}>"
            msg.attach(MIMEText(full_html, "html"))

            try:
                if is_gmail_api:
                    await send_via_gmail_api(oauth_token, msg)
                else:
                    async with aiosmtplib.SMTP(hostname=sender.smtp_host, port=sender.smtp_port, start_tls=True) as smtp:
                        await smtp.login(sender.smtp_user, smtp_pass)
                        await smtp.send_message(msg)

                lead.status = "SENT"
                lead.sent_at = datetime.utcnow()
                sent_in_current_batch.add(clean_email)
                sent_count += 1
                campaign.total_sent = (campaign.total_sent or 0) + 1
                sender.sent_today = (sender.sent_today or 0) + 1
                db.commit()
            except Exception as e:
                logger.error(f"Error sending to {lead.email}: {e}")
                lead.status = "FAILED"
                db.commit()

            # Anti-spam human delay: base delay + random sec from 0 to 120 seconds
            random_jitter = random.randint(0, 120)
            actual_delay = max(5, campaign.send_delay_seconds) + random_jitter
            logger.info(f"Campaign {campaign.id}: Next email delay = {actual_delay}s (base {campaign.send_delay_seconds}s + jitter {random_jitter}s)")

            # Sleep in 1-second ticks to support instant pause / stop response
            for _ in range(actual_delay):
                await asyncio.sleep(1)
                db.refresh(campaign)
                if campaign.status in ("PAUSED", "STOPPED", "DRAFT"):
                    logger.info(f"Campaign {campaign.id} paused/stopped by user during delay. Exiting.")
                    return

        # Check remaining pending leads
        db.refresh(campaign)
        if campaign.status not in ("PAUSED", "STOPPED"):
            pending_remaining = db.query(Lead).filter(
                Lead.campaign_id == campaign.id,
                Lead.status == "PENDING",
                Lead.is_unsubscribed == False
            ).count()
            if pending_remaining == 0:
                campaign.status = "COMPLETED"
            else:
                campaign.status = "PAUSED"
            db.commit()
    finally:
        db.close()

@router.post("/{campaign_id}/start")
@router.post("/{campaign_id}/send")
def start_or_resume_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == "RUNNING":
        raise HTTPException(status_code=400, detail="Campaign is already executing")

    # Check if there are any pending leads
    pending_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign.id,
        Lead.status == "PENDING",
        Lead.is_unsubscribed == False
    ).count()

    if pending_leads == 0:
        raise HTTPException(status_code=400, detail="No pending leads assigned to this campaign. Please assign leads first.")

    campaign.status = "RUNNING"
    db.commit()

    background_tasks.add_task(execute_send_batch, campaign.id, current_user.id)
    return {"message": "Campaign outreach launched in background", "status": "RUNNING"}

@router.post("/{campaign_id}/pause")
@router.post("/{campaign_id}/stop")
def pause_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "PAUSED"
    db.commit()
    return {"message": "Campaign paused successfully", "status": "PAUSED"}
