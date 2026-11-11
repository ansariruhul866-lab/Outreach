import asyncio
import json
import base64
import random
import logging
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from core.database import get_db, SessionLocal
from core.models import User, Campaign, SenderEmail, Lead
from core.auth import get_current_user
from core.encryption import decrypt_password, encrypt_password
from core.gmail_api import send_via_gmail_api, refresh_google_access_token
import os

logger = logging.getLogger("outreachbot")
router = APIRouter(prefix="/campaigns", tags=["campaigns"])

class AttachmentItem(BaseModel):
    filename: str
    content_base64: str  # Base64 string without data:mime;base64, prefix
    mime_type: str | None = "application/octet-stream"

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
    attachments: list[AttachmentItem] | None = None

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
    attachments: list[AttachmentItem] | None = None

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
    attachments_count: int = 0
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
    attachments: list[dict] | None = None
    created_at: str
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
        att_count = 0
        if c.attachments:
            try:
                parsed_att = json.loads(c.attachments)
                att_count = len(parsed_att) if isinstance(parsed_att, list) else 0
            except Exception:
                pass
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
            attachments_count=att_count,
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

    att_list = []
    if campaign.attachments:
        try:
            parsed = json.loads(campaign.attachments)
            if isinstance(parsed, list):
                att_list = parsed
        except Exception:
            pass

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
        attachments=att_list,
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

    attachments_json = None
    if req.attachments is not None:
        attachments_json = json.dumps([a.dict() for a in req.attachments])

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
        attachments=attachments_json,
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
                Lead.status.in_(["SENT", "OPENED", "REPLIED"]),
                Lead.email != None
            ).all() if e and e[0]
        )

    assigned_in_this_campaign = set()
    for l in target_leads:
        if not l.email or not l.email.strip() or l.email.endswith("@outreachbot.local"):
            continue
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
    if req.attachments is not None:
        campaign.attachments = json.dumps([a.dict() for a in req.attachments])

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

def convert_to_email_html(text: str) -> str:
    if not text:
        return ""
    # If already full HTML with <p> or <div tags, return wrapped in font container
    if "<p>" in text or "<p " in text or "<div" in text:
        return text

    # Process markdown bold **text**
    formatted = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Process markdown italic *text* or _text_
    formatted = re.sub(r'\*(.+?)\*', r'<em>\1</em>', formatted)
    formatted = re.sub(r'_(.+?)_', r'<em>\1</em>', formatted)

    # Normalize carriage returns
    formatted = formatted.replace('\r\n', '\n').replace('\r', '\n')

    # Split paragraphs by 2 or more newlines
    blocks = re.split(r'\n\s*\n', formatted.strip())
    html_blocks = []

    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines:
            continue

        # Check if entire block is a bullet list
        if all(line.startswith(('-', '*', '•')) for line in lines):
            items = []
            for line in lines:
                item_text = re.sub(r'^[-*•]\s*', '', line)
                items.append(f'<li style="margin-bottom: 7px;">{item_text}</li>')
            html_blocks.append(
                f'<ul style="margin: 8px 0 16px 22px; padding-left: 0; line-height: 1.65; color: #222222;">{"".join(items)}</ul>'
            )
        else:
            # Check if there are bullet points mixed in this block
            has_bullets = any(line.startswith(('-', '*', '•')) for line in lines)
            if has_bullets:
                curr_lines = []
                in_list = False
                list_items = []
                for line in lines:
                    if line.startswith(('-', '*', '•')):
                        if not in_list:
                            if curr_lines:
                                html_blocks.append(
                                    f'<p style="margin: 0 0 12px 0; line-height: 1.65; font-size: 15px; color: #222222;">{"<br>".join(curr_lines)}</p>'
                                )
                                curr_lines = []
                            in_list = True
                        item_text = re.sub(r'^[-*•]\s*', '', line)
                        list_items.append(f'<li style="margin-bottom: 7px;">{item_text}</li>')
                    else:
                        if in_list:
                            html_blocks.append(
                                f'<ul style="margin: 8px 0 16px 22px; padding-left: 0; line-height: 1.65; color: #222222;">{"".join(list_items)}</ul>'
                            )
                            list_items = []
                            in_list = False
                        curr_lines.append(line)
                if in_list and list_items:
                    html_blocks.append(
                        f'<ul style="margin: 8px 0 16px 22px; padding-left: 0; line-height: 1.65; color: #222222;">{"".join(list_items)}</ul>'
                    )
                if curr_lines:
                    html_blocks.append(
                        f'<p style="margin: 0 0 12px 0; line-height: 1.65; font-size: 15px; color: #222222;">{"<br>".join(curr_lines)}</p>'
                    )
            else:
                # Regular paragraph: single newlines within paragraph become <br>
                block_html = '<br>'.join(lines)
                html_blocks.append(
                    f'<p style="margin: 0 0 14px 0; line-height: 1.65; font-size: 15px; color: #222222;">{block_html}</p>'
                )

    inner_html = '\n'.join(html_blocks)
    return f'''<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.65; color: #222222; max-width: 600px;">
{inner_html}
</div>'''

def render_vars(template: str, vars_dict: dict) -> str:
    rendered = template
    for k, v in vars_dict.items():
        rendered = rendered.replace(f"{{{{{k}}}}}", str(v))
    return rendered

ACTIVE_CAMPAIGN_WORKERS: set[str] = set()

async def execute_send_batch(campaign_id: str, user_id: str):
    if campaign_id in ACTIVE_CAMPAIGN_WORKERS:
        logger.info(f"Worker for campaign {campaign_id} already active in memory. Skipping duplicate spawn.")
        return

    ACTIVE_CAMPAIGN_WORKERS.add(campaign_id)
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

        refresh_token = None
        if is_gmail_api:
            if not sender.oauth_token_enc and not sender.oauth_refresh_token_enc:
                logger.error(f"Sender {sender.id} is GMAIL_API but missing oauth tokens")
                campaign.status = "PAUSED"
                db.commit()
                return
            if sender.oauth_token_enc:
                oauth_token = decrypt_password(sender.oauth_token_enc, user_id)
            if sender.oauth_refresh_token_enc:
                refresh_token = decrypt_password(sender.oauth_refresh_token_enc, user_id)
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

            if not lead.email or not lead.email.strip() or lead.email.endswith("@outreachbot.local"):
                lead.status = "SKIPPED"
                db.commit()
                continue

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
            plain_body = render_vars(campaign.body_template, vars_dict)
            html_body = convert_to_email_html(plain_body)

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

            # Create mixed multipart message if attachments exist, otherwise alternative
            has_attachments = False
            raw_attachments = []
            if campaign.attachments:
                try:
                    parsed_att = json.loads(campaign.attachments)
                    if isinstance(parsed_att, list) and len(parsed_att) > 0:
                        has_attachments = True
                        raw_attachments = parsed_att
                except Exception:
                    pass

            if has_attachments:
                msg = MIMEMultipart("mixed")
                body_part = MIMEMultipart("alternative")
                body_part.attach(MIMEText(plain_body, "plain", "utf-8"))
                body_part.attach(MIMEText(full_html, "html", "utf-8"))
                msg.attach(body_part)

                for att in raw_attachments:
                    fname = att.get("filename", "attachment")
                    b64_content = att.get("content_base64", "")
                    mime = att.get("mime_type", "application/octet-stream") or "application/octet-stream"
                    try:
                        file_bytes = base64.b64decode(b64_content)
                        maintype, subtype = mime.split("/", 1) if "/" in mime else ("application", "octet-stream")
                        part = MIMEBase(maintype, subtype)
                        part.set_payload(file_bytes)
                        encoders.encode_base64(part)
                        part.add_header("Content-Disposition", f'attachment; filename="{fname}"')
                        msg.attach(part)
                    except Exception as att_err:
                        logger.error(f"Failed to attach file {fname}: {att_err}")
            else:
                msg = MIMEMultipart("alternative")
                msg.attach(MIMEText(plain_body, "plain", "utf-8"))
                msg.attach(MIMEText(full_html, "html", "utf-8"))

            msg["Subject"] = subject
            msg["From"] = f"{sender.display_name} <{sender.email}>"
            msg["To"] = lead.email
            msg["List-Unsubscribe"] = f"<{unsub_url}>"

            try:
                if is_gmail_api:
                    try:
                        await send_via_gmail_api(oauth_token, msg)
                    except Exception as ge:
                        err_str = str(ge).lower()
                        if ("expired" in err_str or "401" in err_str or "invalid" in err_str) and refresh_token:
                            client_id = os.getenv("GOOGLE_CLIENT_ID", "")
                            client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
                            if client_id and client_secret:
                                logger.info(f"Auto-refreshing expired Google token for sender {sender.email}...")
                                oauth_token = await refresh_google_access_token(refresh_token, client_id, client_secret)
                                sender.oauth_token_enc = encrypt_password(oauth_token, user_id)
                                db.commit()
                                await send_via_gmail_api(oauth_token, msg)
                            else:
                                raise ge
                        else:
                            raise ge
                else:
                    # Smart SMTP dispatch with automatic fallback between 587 (STARTTLS) and 465 (SSL)
                    ports_to_try = [sender.smtp_port]
                    if sender.smtp_port == 587 and 465 not in ports_to_try:
                        ports_to_try.append(465)
                    elif sender.smtp_port == 465 and 587 not in ports_to_try:
                        ports_to_try.append(587)

                    dispatched = False
                    last_dispatch_err = None
                    for try_port in ports_to_try:
                        use_tls = (try_port == 465)
                        start_tls = not use_tls
                        try:
                            async with aiosmtplib.SMTP(
                                hostname=sender.smtp_host,
                                port=try_port,
                                use_tls=use_tls,
                                start_tls=start_tls,
                                timeout=20.0
                            ) as smtp:
                                await smtp.login(sender.smtp_user, smtp_pass)
                                await smtp.send_message(msg)
                            dispatched = True
                            if try_port != sender.smtp_port:
                                sender.smtp_port = try_port
                                db.commit()
                            break
                        except Exception as send_err:
                            last_dispatch_err = send_err
                            logger.warning(f"SMTP send via port {try_port} failed: {send_err}. Trying fallback port if available...")

                    if not dispatched:
                        raise last_dispatch_err

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

            # Natural delivery delay: base delay + small human jitter (1-10s)
            jitter_max = min(10, max(2, campaign.send_delay_seconds // 3))
            random_jitter = random.randint(1, jitter_max)
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
    except Exception as ex:
        logger.exception(f"Fatal error in execute_send_batch for campaign {campaign_id}: {ex}")
        try:
            c_err = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if c_err:
                c_err.status = "PAUSED"
                db.commit()
        except Exception:
            pass
    finally:
        ACTIVE_CAMPAIGN_WORKERS.discard(campaign_id)
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

    if campaign.status == "RUNNING" and campaign_id in ACTIVE_CAMPAIGN_WORKERS:
        return {"message": "Campaign outreach is already actively executing", "status": "RUNNING"}

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
