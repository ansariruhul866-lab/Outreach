from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, LeadFolder, Lead
from core.auth import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])

class CreateFolderRequest(BaseModel):
    name: str
    description: str | None = None

class RenameFolderRequest(BaseModel):
    name: str
    description: str | None = None

@router.get("")
def list_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folders = db.query(LeadFolder).filter(
        LeadFolder.user_id == current_user.id
    ).order_by(LeadFolder.created_at.desc()).all()

    # Also count unassigned leads (folder_id is NULL)
    unassigned_count = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.folder_id == None,
        Lead.is_unsubscribed == False
    ).count()

    total_leads_count = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.is_unsubscribed == False
    ).count()

    results = []
    for f in folders:
        cnt = db.query(Lead).filter(
            Lead.folder_id == f.id,
            Lead.is_unsubscribed == False
        ).count()
        results.append({
            "id": f.id,
            "name": f.name,
            "description": f.description or "",
            "source": f.source,
            "leads_count": cnt,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else ""
        })

    return {
        "total_leads": total_leads_count,
        "unassigned_leads": unassigned_count,
        "folders": results
    }

@router.post("")
def create_folder(
    req: CreateFolderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Folder name is required")

    folder = LeadFolder(
        user_id=current_user.id,
        name=req.name.strip(),
        description=req.description.strip() if req.description else None,
        source="MANUAL"
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return {"id": folder.id, "name": folder.name}

@router.put("/{folder_id}")
def update_folder(
    folder_id: str,
    req: RenameFolderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder = db.query(LeadFolder).filter(
        LeadFolder.id == folder_id,
        LeadFolder.user_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if req.name.strip():
        folder.name = req.name.strip()
    if req.description is not None:
        folder.description = req.description.strip()

    db.commit()
    return {"success": True, "id": folder.id, "name": folder.name}

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: str,
    delete_leads: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder = db.query(LeadFolder).filter(
        LeadFolder.id == folder_id,
        LeadFolder.user_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if delete_leads:
        # Delete leads inside the folder
        db.query(Lead).filter(
            Lead.folder_id == folder_id,
            Lead.user_id == current_user.id
        ).delete()
    else:
        # Unlink leads from folder
        db.query(Lead).filter(
            Lead.folder_id == folder_id,
            Lead.user_id == current_user.id
        ).update({"folder_id": None})

    db.delete(folder)
    db.commit()
    return {"success": True}
