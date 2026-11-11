import os
import re
import json
import asyncio
import logging
import urllib.parse
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
import httpx

from core.database import get_db, SessionLocal
from core.models import User, Lead, LeadFolder, Campaign, SenderEmail
from core.auth import get_current_user
from core.gemini_service import generate_website_serp_pitch, generate_reply_draft
from api.campaigns import execute_send_batch, render_vars, convert_to_email_html

logger = logging.getLogger("discovery")
router = APIRouter(prefix="/discovery", tags=["discovery"])

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', re.IGNORECASE)
PHONE_RE = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')

DUMMY_DOMAINS = {
    'example.com', 'domain.com', 'email.com', 'sample.com', 'test.com',
    'sentry.io', 'w3.org', 'schema.org', 'wixpress.com', 'yourcompany.com',
    'sitename.com', 'company.com'
}

CONTACT_PATHS = [
    "",
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
    "/write-for-us",
    "/editorial",
    "/team",
    "/press",
    "/support"
]

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

class SerpRequest(BaseModel):
    query: str
    purpose: str = "BACKLINK"  # BACKLINK | COMPETITOR | EDITORIAL | KEYWORD | MARKETING
    num_results: int = 20

class SerpResultItem(BaseModel):
    rank: int
    title: str
    url: str
    domain: str
    snippet: str

class SerpResponse(BaseModel):
    query: str
    purpose: str
    total: int
    results: List[SerpResultItem]

class ExtractAndOrganizeRequest(BaseModel):
    query: str
    purpose: str = "BACKLINK"
    selected_items: List[SerpResultItem]
    use_ai_personalization: bool = False
    sender_email_id: Optional[str] = None
    custom_template_id: Optional[str] = None
    auto_create_campaign: bool = False
    follow_up_enabled: bool = True
    follow_up_delay_days: int = 2

def search_serp_engine(query: str, target: int = 20) -> List[dict]:
    url = 'https://html.duckduckgo.com/html/'
    data = urllib.parse.urlencode({'q': query}).encode('utf-8')
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': 'https://html.duckduckgo.com/'
    }
    req = urllib.request.Request(url, data=data, headers=headers)
    results = []
    seen_urls = set()
    next_form = {}

    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            html = r.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            for res_div in soup.select('.result'):
                a = res_div.select_one('.result__title a')
                if not a:
                    continue
                href = a.get('href', '')
                title = a.get_text(strip=True)
                snip_el = res_div.select_one('.result__snippet')
                snippet = snip_el.get_text(strip=True) if snip_el else ''
                if 'uddg=' in href:
                    href = urllib.parse.unquote(href.split('uddg=')[1].split('&')[0])
                if href.startswith('http') and 'duckduckgo.com' not in href:
                    clean_u = href.split('?')[0].rstrip('/')
                    if clean_u not in seen_urls:
                        seen_urls.add(clean_u)
                        domain = urllib.parse.urlparse(href).netloc.replace('www.', '')
                        results.append({
                            'rank': len(results) + 1,
                            'title': title,
                            'url': href,
                            'domain': domain,
                            'snippet': snippet
                        })

            nav_form = soup.select_one('.nav-link form')
            if nav_form:
                for inp in nav_form.select('input[type="hidden"]'):
                    next_form[inp.get('name')] = inp.get('value', '')

        if len(results) < target and next_form:
            next_data = urllib.parse.urlencode(next_form).encode('utf-8')
            next_req = urllib.request.Request(url, data=next_data, headers=headers)
            with urllib.request.urlopen(next_req, timeout=12) as r2:
                html2 = r2.read().decode('utf-8', errors='ignore')
                soup2 = BeautifulSoup(html2, 'html.parser')
                for res_div in soup2.select('.result'):
                    a = res_div.select_one('.result__title a')
                    if not a:
                        continue
                    href = a.get('href', '')
                    title = a.get_text(strip=True)
                    snip_el = res_div.select_one('.result__snippet')
                    snippet = snip_el.get_text(strip=True) if snip_el else ''
                    if 'uddg=' in href:
                        href = urllib.parse.unquote(href.split('uddg=')[1].split('&')[0])
                    if href.startswith('http') and 'duckduckgo.com' not in href:
                        clean_u = href.split('?')[0].rstrip('/')
                        if clean_u not in seen_urls:
                            seen_urls.add(clean_u)
                            domain = urllib.parse.urlparse(href).netloc.replace('www.', '')
                            results.append({
                                'rank': len(results) + 1,
                                'title': title,
                                'url': href,
                                'domain': domain,
                                'snippet': snippet
                            })
                    if len(results) >= target:
                        break

    except Exception as e:
        logger.error(f"SERP search error for query '{query}': {e}")

    return results[:target]

async def crawl_site_for_contacts(base_url: str) -> dict:
    """Visits the main page and high-priority contact pages to extract emails and phone numbers."""
    emails = set()
    phones = set()
    parsed_base = urllib.parse.urlparse(base_url)
    domain_root = f"{parsed_base.scheme}://{parsed_base.netloc}"

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
        for subpath in CONTACT_PATHS[:5]:
            target = f"{domain_root}{subpath}" if subpath else base_url
            try:
                resp = await client.get(target)
                if resp.status_code == 200:
                    text = resp.text
                    # Extract mailto links
                    soup = BeautifulSoup(text, 'html.parser')
                    for mailto in soup.select('a[href^="mailto:"]'):
                        raw_m = mailto.get('href', '').replace('mailto:', '').split('?')[0].strip()
                        if '@' in raw_m:
                            emails.add(raw_m.lower())

                    # Regex extraction
                    found_emails = EMAIL_RE.findall(text)
                    for em in found_emails:
                        em_clean = em.lower().strip().rstrip('.')
                        em_domain = em_clean.split('@')[-1]
                        if em_domain not in DUMMY_DOMAINS and not em_clean.endswith(('png', 'jpg', 'svg', 'gif', 'webp', 'js', 'css')):
                            emails.add(em_clean)

                    found_phones = PHONE_RE.findall(text)
                    for ph in found_phones:
                        ph_clean = ph.strip()
                        if len(re.sub(r'\D', '', ph_clean)) >= 10:
                            phones.add(ph_clean)

                    # If we found at least 2 valid emails on contact page, we can stop early
                    if len(emails) >= 2 and subpath:
                        break
            except Exception:
                continue

    return {
        "emails": list(emails),
        "phones": list(phones)
    }

@router.post("/serp", response_model=SerpResponse)
def get_serp_rankings(req: SerpRequest, current_user: User = Depends(get_current_user)):
    """Extracts top 20 ranking website URLs from real-time SERP for the specified query and purpose."""
    query_clean = req.query.strip()
    if not query_clean:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results = search_serp_engine(query_clean, req.num_results or 20)
    return SerpResponse(
        query=query_clean,
        purpose=req.purpose.upper(),
        total=len(results),
        results=[SerpResultItem(**r) for r in results]
    )

@router.post("/extract-and-organize")
async def extract_and_organize_leads(
    req: ExtractAndOrganizeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    1. Creates a designated folder: [Purpose] Query - Timestamp
    2. Crawls selected SERP websites for contact details (emails, phones)
    3. Saves leads with SERP rank, snippet, purpose, and query
    4. Generates AI pitches if requested
    5. Optionally auto-creates campaign with 2-day follow-up
    """
    if not req.selected_items:
        raise HTTPException(status_code=400, detail="No SERP items selected for crawling")

    now = datetime.now()
    purpose_label = req.purpose.capitalize()
    folder_name = f"[{purpose_label}] {req.query.strip()} - {now.strftime('%b %d, %Y %I:%M %p')}"

    folder = LeadFolder(
        user_id=current_user.id,
        name=folder_name,
        description=f"Auto-generated discovery folder for {req.purpose} outreach from SERP search '{req.query}'",
        source="SERP_DISCOVERY"
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    created_leads = []

    # Parallel contact extraction across all selected SERP websites
    crawl_tasks = [crawl_site_for_contacts(item.url) for item in req.selected_items]
    crawled_results = await asyncio.gather(*crawl_tasks, return_exceptions=True)

    sender_disp = "Expansio Team"
    if req.sender_email_id:
        s_rec = db.query(SenderEmail).filter_by(id=req.sender_email_id).first()
        if s_rec:
            sender_disp = s_rec.display_name or s_rec.email

    for item, crawl_res in zip(req.selected_items, crawled_results):
        emails = []
        phones = []
        if isinstance(crawl_res, dict):
            emails = crawl_res.get("emails", [])
            phones = crawl_res.get("phones", [])

        # Infer company name from domain or title
        company = item.domain.split('.')[0].capitalize()
        first_email = emails[0] if emails else f"editor@{item.domain}"
        first_phone = phones[0] if phones else None

        lead = Lead(
            user_id=current_user.id,
            folder_id=folder.id,
            email=first_email,
            phone=first_phone,
            company=company,
            first_name="Editorial Team",
            website=item.url,
            source_url=item.url,
            serp_rank=item.rank,
            search_query=req.query,
            search_purpose=req.purpose,
            snippet=item.snippet,
            status="PENDING",
            is_verified=bool(emails)
        )

        # AI Hyper-Personalization per website
        if req.use_ai_personalization:
            try:
                pitch_res = generate_website_serp_pitch(
                    website_title=item.title,
                    website_url=item.url,
                    snippet=item.snippet,
                    purpose=req.purpose,
                    search_query=req.query,
                    company_name=company,
                    sender_name=sender_disp
                )
                lead.ai_pitch_subject = pitch_res.get("subject")
                lead.ai_pitch_body = pitch_res.get("email_body")
                lead.ai_pitch_strategy = req.purpose
                lead.ai_pitch_generated_at = datetime.utcnow()
            except Exception as e:
                logger.warning(f"Could not generate AI pitch for {item.url}: {e}")

        db.add(lead)
        created_leads.append(lead)

    db.commit()

    # Optional Auto-Campaign Creation with 2-Day Follow-Up
    campaign_id = None
    if req.auto_create_campaign and req.sender_email_id:
        default_follow_up_subject = f"Following up re: collaboration with {{{{company}}}}"
        default_follow_up_body = """Hi {{firstName}},

I wanted to quickly follow up on my previous note regarding a potential collaboration with **{{company}}**.

I know you receive countless messages each week, so I wanted to gently bring this back to your radar.

Would you be open to a quick 3-minute exchange, or should I reach back out at a better time?

Best regards,  
**{{senderName}}**"""

        camp = Campaign(
            user_id=current_user.id,
            sender_email_id=req.sender_email_id,
            name=f"Campaign: {folder_name}",
            type=req.purpose,
            status="DRAFT",
            subject_template="Content collaboration idea for {{company}}",
            body_template="""Hi {{firstName}},

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
            follow_up_enabled=req.follow_up_enabled,
            follow_up_delay_days=req.follow_up_delay_days,
            follow_up_subject_template=default_follow_up_subject,
            follow_up_body_template=default_follow_up_body,
            purpose=req.purpose,
            search_query=req.query
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        campaign_id = camp.id

        # Assign leads to this campaign
        for ld in created_leads:
            ld.campaign_id = camp.id
        db.commit()

    return {
        "folder_id": folder.id,
        "folder_name": folder.name,
        "total_extracted": len(created_leads),
        "campaign_id": campaign_id,
        "message": f"Successfully created folder '{folder.name}' with {len(created_leads)} SERP leads!"
    }

@router.get("/replies")
def list_replies_and_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all leads where a reply was detected, with AI response draft ready for review."""
    replied_leads = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.reply_received == True
    ).order_by(Lead.reply_received_at.desc()).all()

    return [
        {
            "id": l.id,
            "company": l.company,
            "email": l.email,
            "website": l.website,
            "serp_rank": l.serp_rank,
            "search_purpose": l.search_purpose,
            "reply_received_at": l.reply_received_at.strftime("%b %d, %Y %I:%M %p") if l.reply_received_at else None,
            "reply_body": l.reply_body,
            "ai_draft_reply": l.ai_draft_reply,
            "status": l.status
        }
        for l in replied_leads
    ]

class SimulateReplyRequest(BaseModel):
    lead_id: str
    reply_text: str

@router.post("/simulate-reply")
def simulate_or_process_reply(
    req: SimulateReplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Processes an incoming prospect reply:
    1. Sets lead.reply_received = True and updates status to REPLIED
    2. Uses Gemini AI to draft an intelligent response ready for user 1-click review & send
    """
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.reply_received = True
    lead.reply_received_at = datetime.utcnow()
    lead.reply_body = req.reply_text.strip()
    lead.status = "REPLIED"

    # Call Gemini to draft a context-aware answer
    sender_name = "Expansio Team"
    if lead.campaign and lead.campaign.sender:
        sender_name = lead.campaign.sender.display_name or "Expansio Team"

    orig_email = lead.ai_pitch_body or (lead.campaign.body_template if lead.campaign else "Our initial collaboration pitch")
    try:
        reply_draft_data = generate_reply_draft(
            lead_name=lead.first_name or "there",
            company=lead.company or "your website",
            original_pitch=orig_email,
            prospect_reply=req.reply_text,
            sender_name=sender_name
        )
        lead.ai_draft_reply = reply_draft_data.get("reply_body")
    except Exception as e:
        logger.warning(f"Could not generate AI draft reply: {e}")
        lead.ai_draft_reply = f"Hi {lead.first_name or 'there'},\n\nThank you for getting back to me! I would be glad to discuss this further. When might be a convenient time for a brief exchange?\n\nBest regards,\n{sender_name}"

    db.commit()
    return {
        "success": True,
        "message": f"Reply registered from {lead.email}! AI draft reply prepared.",
        "ai_draft_reply": lead.ai_draft_reply
    }
