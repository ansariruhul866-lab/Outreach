import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Lead
from core.auth import get_current_user, verify_token

router = APIRouter(prefix="/leads", tags=["leads"])

class AddLeadRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    first_name: str | None = None
    company: str | None = None
    website: str | None = None
    campaign_id: str | None = None
    folder_id: str | None = None

class BatchDeleteRequest(BaseModel):
    lead_ids: list[str]

class MoveLeadsRequest(BaseModel):
    lead_ids: list[str]
    folder_id: str | None = None  # None removes from folder

class LeadResponse(BaseModel):
    id: str
    folder_id: str | None = None
    email: str | None = None
    phone: str | None = None
    first_name: str | None
    company: str | None
    website: str | None
    source_url: str | None
    status: str
    spam_score: float
    is_verified: bool
    created_at: str

@router.get("/selectable")
def get_selectable_leads(
    folder_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.is_unsubscribed == False
    )
    if folder_id:
        if folder_id == "UNASSIGNED":
            query = query.filter(Lead.folder_id == None)
        else:
            query = query.filter(Lead.folder_id == folder_id)

    leads = query.order_by(Lead.created_at.desc()).all()

    return [
        {
            "id": l.id,
            "folder_id": l.folder_id,
            "email": l.email,
            "phone": l.phone or "",
            "company": l.company or "",
            "status": l.status,
            "campaign_id": l.campaign_id
        }
        for l in leads
    ]

@router.get("")
def list_leads(
    search: str = "",
    status: str = "",
    folder_id: str | None = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.is_unsubscribed == False
    )

    if folder_id:
        if folder_id == "UNASSIGNED":
            query = query.filter(Lead.folder_id == None)
        else:
            query = query.filter(Lead.folder_id == folder_id)

    if search:
        s = f"%{search.lower()}%"
        query = query.filter((Lead.email.ilike(s)) | (Lead.company.ilike(s)) | (Lead.phone.ilike(s)))

    if status and status != "ALL":
        query = query.filter(Lead.status == status)

    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "leads": [
            LeadResponse(
                id=l.id,
                folder_id=l.folder_id,
                email=l.email,
                phone=l.phone,
                first_name=l.first_name,
                company=l.company,
                website=l.website,
                source_url=l.source_url,
                status=l.status,
                spam_score=l.spam_score,
                is_verified=l.is_verified,
                created_at=l.created_at.strftime("%Y-%m-%d") if l.created_at else ""
            ) for l in leads
        ]
    }

@router.post("")
def create_lead(req: AddLeadRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.email and not req.phone:
        raise HTTPException(status_code=400, detail="Either email or phone number is required")

    clean_email = req.email.lower().strip() if req.email else None
    clean_phone = req.phone.strip() if req.phone else None

    if clean_email:
        existing = db.query(Lead).filter(
            Lead.user_id == current_user.id,
            Lead.email == clean_email
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Lead with this email already exists")

    lead = Lead(
        user_id=current_user.id,
        campaign_id=req.campaign_id,
        folder_id=req.folder_id,
        email=clean_email or f"wa_{clean_phone}@outreachbot.local",
        phone=clean_phone,
        first_name=req.first_name,
        company=req.company,
        website=req.website,
        status="PENDING",
        is_verified=True
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"id": lead.id, "email": lead.email, "phone": lead.phone}

@router.get("/export")
def export_leads(
    token: str | None = Query(None),
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
):
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required to export leads")

    current_user = verify_token(raw_token, db)

    leads = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.is_unsubscribed == False
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Email", "First Name", "Company", "Website", "Source", "Status", "Date Added"])

    for l in leads:
        writer.writerow([
            l.email,
            l.first_name or "",
            l.company or "",
            l.website or "",
            l.source_url or "",
            l.status,
            l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=outreachbot_leads.csv",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.delete("/all")
def delete_all_leads(
    folder_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Lead).filter(Lead.user_id == current_user.id)
    if folder_id:
        if folder_id == "UNASSIGNED":
            query = query.filter(Lead.folder_id == None)
        else:
            query = query.filter(Lead.folder_id == folder_id)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"success": True, "deleted": deleted_count}

@router.post("/batch-delete")
def batch_delete_leads(
    req: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.lead_ids:
        return {"success": True, "deleted": 0}

    deleted_count = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.id.in_(req.lead_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {"success": True, "deleted": deleted_count}

@router.post("/move")
def move_leads_to_folder(
    req: MoveLeadsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.lead_ids:
        return {"success": True, "updated": 0}

    updated_count = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.id.in_(req.lead_ids)
    ).update({"folder_id": req.folder_id}, synchronize_session=False)

    db.commit()
    return {"success": True, "updated": updated_count}

@router.delete("/{lead_id}")
def delete_lead(lead_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"success": True}
