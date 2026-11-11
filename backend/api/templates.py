import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, EmailTemplate
from core.auth import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])

DEFAULT_TEMPLATES = [
    {
        "title": "Backlink & Content Collaboration",
        "category": "PITCH",
        "subject": "Content collaboration idea for {{company}}",
        "body": """Hi {{firstName}},

I was exploring {{company}} and came across your content on topics relevant to our industry. I really appreciate the value you're providing to your readers.

I believe there's an opportunity for us to collaborate and create value for both our audiences.

We'd love to explore:
- A relevant contextual backlink placement within an existing article.
- A guest contribution featuring original, useful insights for your readers.
- A mutually beneficial content collaboration.

We can ensure any contribution is relevant, well-researched, and genuinely useful to your audience.

Would you be open to exploring a collaboration?

Best regards,  
**{{senderName}}**""",
    },
    {
        "title": "Initial Pitch & Value Proposition",
        "category": "PITCH",
        "subject": "Quick partnership idea for {{company}}",
        "body": "<p>Hi {{firstName}},</p>\n<p>I came across what you're building at <strong>{{company}}</strong> and wanted to reach out directly.</p>\n<p>We help companies like yours expand their reach and automate high-intent outreach pipelines without risking inbox deliverability.</p>\n<p>Would you be open to a quick 5-minute chat or exchanging ideas over email?</p>\n<p>Best regards,<br><strong>{{senderName}}</strong></p>",
    },
    {
        "title": "Gentle Follow-Up (Bump)",
        "category": "FOLLOW_UP",
        "subject": "Re: Quick partnership idea for {{company}}",
        "body": "<p>Hi {{firstName}},</p>\n<p>I know your inbox is likely busy, so I wanted to float this back to the top of your mind.</p>\n<p>Did you get a chance to review my previous note regarding {{company}}?</p>\n<p>If now isn't a good time, no worries at all!</p>\n<p>Best,<br><strong>{{senderName}}</strong></p>",
    },
    {
        "title": "Special Offer & Exclusive Discount",
        "category": "OFFER",
        "subject": "Exclusive 30% discount for {{company}}",
        "body": "<p>Hi {{firstName}},</p>\n<p>We're extending an exclusive <strong>30% discount</strong> this quarter to forward-thinking teams like <strong>{{company}}</strong>.</p>\n<p>You can test our full outbound infrastructure risk-free. Here's a link to explore what's included: <a href=\"{{website}}\">{{company}} Special Access</a>.</p>\n<p>Let me know if you'd like me to activate your coupon code today.</p>\n<p>Cheers,<br><strong>{{senderName}}</strong></p>",
    },
]

class AttachmentItem(BaseModel):
    filename: str
    content_base64: str
    mime_type: str | None = "application/octet-stream"

class CreateTemplateRequest(BaseModel):
    title: str
    category: str = "PITCH"  # PITCH | FOLLOW_UP | OFFER | CUSTOM
    subject: str
    body: str
    attachments: list[AttachmentItem] | None = None

class UpdateTemplateRequest(BaseModel):
    title: str | None = None
    category: str | None = None
    subject: str | None = None
    body: str | None = None
    attachments: list[AttachmentItem] | None = None

def seed_default_templates_if_empty(user_id: str, db: Session):
    count = db.query(EmailTemplate).filter(EmailTemplate.user_id == user_id).count()
    if count == 0:
        for dt in DEFAULT_TEMPLATES:
            tpl = EmailTemplate(
                user_id=user_id,
                title=dt["title"],
                category=dt["category"],
                subject=dt["subject"],
                body=dt["body"],
                is_default=True,
            )
            db.add(tpl)
        db.commit()

@router.get("")
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seed_default_templates_if_empty(current_user.id, db)
    templates = db.query(EmailTemplate).filter(
        EmailTemplate.user_id == current_user.id
    ).order_by(EmailTemplate.created_at.asc()).all()

    results = []
    for t in templates:
        att_list = []
        if t.attachments:
            try:
                parsed = json.loads(t.attachments)
                if isinstance(parsed, list):
                    att_list = parsed
            except Exception:
                pass
        results.append({
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "subject": t.subject,
            "body": t.body,
            "attachments": att_list,
            "is_default": t.is_default,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            "updated_at": t.updated_at.strftime("%Y-%m-%d %H:%M") if t.updated_at else ""
        })
    return results

@router.post("")
def create_template(
    req: CreateTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.title.strip() or not req.subject.strip() or not req.body.strip():
        raise HTTPException(status_code=400, detail="Title, subject, and body are required")

    att_json = None
    if req.attachments is not None:
        att_json = json.dumps([a.dict() for a in req.attachments])

    tpl = EmailTemplate(
        user_id=current_user.id,
        title=req.title.strip(),
        category=req.category.strip().upper(),
        subject=req.subject.strip(),
        body=req.body,
        attachments=att_json,
        is_default=False
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return {"id": tpl.id, "title": tpl.title, "category": tpl.category}

@router.put("/{template_id}")
def update_template(
    template_id: str,
    req: UpdateTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tpl = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.user_id == current_user.id
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if req.title is not None:
        tpl.title = req.title.strip()
    if req.category is not None:
        tpl.category = req.category.strip().upper()
    if req.subject is not None:
        tpl.subject = req.subject.strip()
    if req.body is not None:
        tpl.body = req.body
    if req.attachments is not None:
        tpl.attachments = json.dumps([a.dict() for a in req.attachments])
    tpl.updated_at = datetime.utcnow()

    db.commit()
    return {"success": True, "id": tpl.id}

@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tpl = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.user_id == current_user.id
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(tpl)
    db.commit()
    return {"success": True}
