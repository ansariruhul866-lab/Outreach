from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Lead, Campaign, SenderEmail
from core.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_leads = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.is_unsubscribed == False).count()
    total_sent = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.status.in_(["SENT", "OPENED", "REPLIED"])).count()
    total_opened = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.status == "OPENED").count()
    total_replied = db.query(Lead).filter(Lead.user_id == current_user.id, Lead.status == "REPLIED").count()
    active_senders = db.query(SenderEmail).filter(SenderEmail.user_id == current_user.id, SenderEmail.status == "VERIFIED").count()
    active_campaigns = db.query(Campaign).filter(Campaign.user_id == current_user.id).count()

    open_rate = round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0.0

    return {
        "total_leads": total_leads,
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_replied": total_replied,
        "open_rate": open_rate,
        "active_senders": active_senders,
        "active_campaigns": active_campaigns
    }
