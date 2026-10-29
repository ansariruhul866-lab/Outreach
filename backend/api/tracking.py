import base64
from datetime import datetime
from fastapi import APIRouter, Query, Depends, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Lead, Campaign

router = APIRouter(prefix="/track", tags=["tracking"])

# 1x1 transparent GIF
TRANSPARENT_PIXEL = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")

@router.get("/pixel")
def track_open(id: str = Query(...), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.tracking_id == id).first()
    if lead and lead.status != "OPENED":
        lead.status = "OPENED"
        lead.opened_at = datetime.utcnow()
        if lead.campaign:
            lead.campaign.total_opened += 1
        db.commit()

    return Response(content=TRANSPARENT_PIXEL, media_type="image/gif")

@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = Query(...), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.unsub_token == token).first()
    if lead:
        lead.is_unsubscribed = True
        lead.status = "UNSUBSCRIBED"
        db.commit()

    return """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unsubscribed — OutreachBot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; max-width: 420px; }
          .check { width: 56px; height: 56px; background: #e6f4ea; border-radius: 50%; color: #1e7e34; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
          h1 { font-size: 20px; color: #111; margin-bottom: 8px; }
          p { color: #666; font-size: 14px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="check">✓</div>
          <h1>Successfully Unsubscribed</h1>
          <p>Your email address has been removed from this sender's outreach list. You will not receive any further automated emails.</p>
        </div>
      </body>
    </html>
    """
