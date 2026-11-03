import io
import csv
import re
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Lead, LeadFolder
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

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}')

def normalize_phone_number(raw: str) -> Optional[str]:
    cleaned = re.sub(r'[^\d+]', '', raw)
    digits = re.sub(r'\D', '', cleaned)
    if 9 <= len(digits) <= 15:
        if cleaned.startswith("+"):
            return cleaned
        return f"+{cleaned}" if len(digits) > 10 else cleaned
    return None

def extract_leads_from_file(filename: str, content: bytes) -> list[dict]:
    ext = os.path.splitext(filename)[1].lower()
    leads: list[dict] = []
    seen = set()

    def add_lead(email=None, phone=None, name=None, company=None, website=None):
        clean_email = email.lower().strip() if email else None
        clean_phone = normalize_phone_number(phone) if phone else None
        if clean_email and not EMAIL_REGEX.match(clean_email):
            clean_email = None
        if not clean_email and not clean_phone:
            return
        key = (clean_email, clean_phone)
        if key in seen:
            return
        seen.add(key)
        leads.append({
            "email": clean_email,
            "phone": clean_phone,
            "first_name": name.strip() if name else None,
            "company": company.strip() if company else None,
            "website": website.strip() if website else None,
        })

    # 1. EXCEL (.xlsx, .xlsm, .xltx)
    if ext in [".xlsx", ".xlsm", ".xltx"]:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        for sheet in wb.worksheets:
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue
            header = [str(c or "").lower().strip() for c in rows[0]]
            email_idx = next((i for i, h in enumerate(header) if "email" in h or "mail" in h), None)
            phone_idx = next((i for i, h in enumerate(header) if any(k in h for k in ["phone", "mobile", "whatsapp", "contact", "number", "tel"])), None)
            name_idx = next((i for i, h in enumerate(header) if "name" in h or "first" in h), None)
            comp_idx = next((i for i, h in enumerate(header) if "comp" in h or "org" in h or "business" in h), None)
            web_idx = next((i for i, h in enumerate(header) if "web" in h or "site" in h or "url" in h), None)

            start_row = 1 if (email_idx is not None or phone_idx is not None) else 0
            for r in rows[start_row:]:
                r_str_list = [str(c).strip() if c is not None else "" for c in r]
                row_text = " ".join(r_str_list)

                r_email = r_str_list[email_idx] if email_idx is not None and email_idx < len(r_str_list) else None
                r_phone = r_str_list[phone_idx] if phone_idx is not None and phone_idx < len(r_str_list) else None
                r_name = r_str_list[name_idx] if name_idx is not None and name_idx < len(r_str_list) else None
                r_comp = r_str_list[comp_idx] if comp_idx is not None and comp_idx < len(r_str_list) else None
                r_web = r_str_list[web_idx] if web_idx is not None and web_idx < len(r_str_list) else None

                found_emails = EMAIL_REGEX.findall(row_text)
                found_phones = PHONE_REGEX.findall(row_text)

                target_email = r_email or (found_emails[0] if found_emails else None)
                target_phone = r_phone or (found_phones[0] if found_phones else None)

                if target_email or target_phone:
                    add_lead(email=target_email, phone=target_phone, name=r_name, company=r_comp, website=r_web)

    # 2. WORD (.docx)
    elif ext in [".docx"]:
        import docx
        doc = docx.Document(io.BytesIO(content))
        full_text = []
        for p in doc.paragraphs:
            if p.text.strip():
                full_text.append(p.text)
        for table in doc.tables:
            for row in table.rows:
                row_str = " ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_str:
                    full_text.append(row_str)

        for line in full_text:
            emails = EMAIL_REGEX.findall(line)
            phones = PHONE_REGEX.findall(line)
            if emails and phones:
                add_lead(email=emails[0], phone=phones[0])
            else:
                for e in emails:
                    add_lead(email=e)
                for p in phones:
                    add_lead(phone=p)

    # 3. PDF (.pdf)
    elif ext in [".pdf"]:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        pdf_lines = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pdf_lines.extend(t.split("\n"))

        for line in pdf_lines:
            emails = EMAIL_REGEX.findall(line)
            phones = PHONE_REGEX.findall(line)
            if emails and phones:
                add_lead(email=emails[0], phone=phones[0])
            else:
                for e in emails:
                    add_lead(email=e)
                for p in phones:
                    add_lead(phone=p)

    # 4. CSV, TXT, DOC, RTF, ETC.
    else:
        text = ""
        for encoding in ["utf-8", "latin-1", "cp1252", "utf-16"]:
            try:
                text = content.decode(encoding)
                break
            except Exception:
                continue

        if not text:
            text = content.decode("utf-8", errors="ignore")

        lines = text.splitlines()
        if ext == ".csv" and lines:
            reader = csv.reader(lines)
            row_list = list(reader)
            if row_list:
                header = [h.lower().strip() for h in row_list[0]]
                email_idx = next((i for i, h in enumerate(header) if "email" in h or "mail" in h), None)
                phone_idx = next((i for i, h in enumerate(header) if any(k in h for k in ["phone", "mobile", "whatsapp", "contact", "number", "tel"])), None)
                name_idx = next((i for i, h in enumerate(header) if "name" in h or "first" in h), None)
                comp_idx = next((i for i, h in enumerate(header) if "comp" in h or "org" in h), None)
                web_idx = next((i for i, h in enumerate(header) if "web" in h or "site" in h or "url" in h), None)

                start_idx = 1 if (email_idx is not None or phone_idx is not None) else 0
                for r in row_list[start_idx:]:
                    line_str = " ".join(r)
                    r_email = r[email_idx] if email_idx is not None and email_idx < len(r) else None
                    r_phone = r[phone_idx] if phone_idx is not None and phone_idx < len(r) else None
                    r_name = r[name_idx] if name_idx is not None and name_idx < len(r) else None
                    r_comp = r[comp_idx] if comp_idx is not None and comp_idx < len(r) else None
                    r_web = r[web_idx] if web_idx is not None and web_idx < len(r) else None

                    found_emails = EMAIL_REGEX.findall(line_str)
                    found_phones = PHONE_REGEX.findall(line_str)
                    add_lead(
                        email=r_email or (found_emails[0] if found_emails else None),
                        phone=r_phone or (found_phones[0] if found_phones else None),
                        name=r_name,
                        company=r_comp,
                        website=r_web
                    )
                return leads

        for line in lines:
            emails = EMAIL_REGEX.findall(line)
            phones = PHONE_REGEX.findall(line)
            if emails and phones:
                add_lead(email=emails[0], phone=phones[0])
            else:
                for e in emails:
                    add_lead(email=e)
                for p in phones:
                    add_lead(phone=p)

    return leads

@router.post("/upload-extract")
async def upload_and_extract_leads(
    file: UploadFile = File(...),
    folder_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = file.filename or "uploaded_leads"
    extracted = extract_leads_from_file(filename, contents)

    if not extracted:
        raise HTTPException(
            status_code=400,
            detail=f"No valid emails or phone numbers found in '{filename}'. Please make sure the document contains contact details."
        )

    # 1. Automatically create a new folder for these leads
    base_name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").strip()
    target_folder_name = (folder_name or f"Imported: {base_name}").strip()

    folder = LeadFolder(
        user_id=current_user.id,
        name=target_folder_name,
        description=f"Auto-extracted {len(extracted)} leads from '{filename}'",
        source="FILE_UPLOAD"
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    # 2. Insert leads into the newly created folder
    imported_count = 0
    duplicate_count = 0

    for item in extracted:
        email = item.get("email")
        phone = item.get("phone")

        existing = None
        if email:
            existing = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.email == email).first()
        elif phone:
            existing = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.phone == phone).first()

        if existing:
            duplicate_count += 1
            if not existing.folder_id:
                existing.folder_id = folder.id
            continue

        lead = Lead(
            user_id=current_user.id,
            folder_id=folder.id,
            email=email,
            phone=phone,
            first_name=item.get("first_name"),
            company=item.get("company"),
            website=item.get("website"),
            source_url=filename,
            status="PENDING",
            is_verified=True,
            spam_score=0.0
        )
        db.add(lead)
        imported_count += 1

    db.commit()

    emails_count = sum(1 for x in extracted if x.get("email"))
    phones_count = sum(1 for x in extracted if x.get("phone"))

    return {
        "success": True,
        "folder_id": folder.id,
        "folder_name": folder.name,
        "total_extracted": len(extracted),
        "emails_count": emails_count,
        "phones_count": phones_count,
        "imported": imported_count,
        "duplicates": duplicate_count,
        "message": f"✓ Created folder '{folder.name}' with {imported_count} new leads ({emails_count} emails, {phones_count} phone numbers)."
    }
