import os
import re
import json
import base64
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
try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

from core.database import get_db, SessionLocal
from core.models import User, Lead, LeadFolder, Campaign, SenderEmail
from core.auth import get_current_user
from core.email_validator import (
    is_clean_email_format,
    is_deliverable_email,
    check_domain_has_mx,
    DUMMY_DOMAINS
)
from core.gemini_service import (
    generate_website_serp_pitch,
    generate_reply_draft,
    generate_humanized_blog,
    generate_keyword_plan,
    generate_competitor_counter_strategy
)
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
    region: str = "in-en"     # in-en (India) | us-en (US) | uk-en (UK) | wt-wt (Global)
    num_results: int = 20

class SerpResultItem(BaseModel):
    rank: int
    title: str
    url: str
    domain: str
    snippet: str
    site_name: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)
    headings_outline: Optional[List[dict]] = Field(default_factory=list)
    word_count: Optional[int] = 0
    reading_time: Optional[str] = "3 min read"
    schemas_detected: Optional[List[str]] = Field(default_factory=list)

class SerpResponse(BaseModel):
    query: str
    purpose: str
    region: str
    total: int
    results: List[SerpResultItem]

class DraftBlogRequest(BaseModel):
    query: str
    purpose: str = "EDITORIAL"
    selected_blogs: Optional[List[dict]] = Field(default_factory=list)
    target_tone: str = "copywriter"

class KeywordPlanRequest(BaseModel):
    query: str
    region: str = "in-en"
    top_sites: Optional[List[dict]] = Field(default_factory=list)

class CompetitorStrategyRequest(BaseModel):
    query: str
    region: str = "in-en"
    selected_competitors: Optional[List[dict]] = Field(default_factory=list)

class ExtractAndOrganizeRequest(BaseModel):
    query: str
    purpose: str = "BACKLINK"
    region: str = "in-en"
    selected_items: List[SerpResultItem]
    use_ai_personalization: bool = False
    sender_email_id: Optional[str] = None
    custom_template_id: Optional[str] = None
    auto_create_campaign: bool = False
    follow_up_enabled: bool = True
    follow_up_delay_days: int = 2

def search_serp_engine(query: str, region: str = "in-en", target: int = 20) -> List[dict]:
    """
    Multi-Engine Regional SERP Crawler:
    - Primary: DuckDuckGo Lite multi-page pagination (100% resilient on cloud datacenter IPs, zero blocks)
    - Fallback: Bing Regional & Yahoo Regional with strict noise and promo filtering
    - Filters out generic UGC noise (Reddit, Quora, Pinterest, YouTube)
    - Strips sidebar search engine widgets (e.g. Windows OS troubleshooting guides)
    - Returns authentic ranking businesses matching Google local SERP
    """
    import difflib
    results = []
    seen_domains = set()

    UGC_NOISE = {
        "reddit.", "quora.", "pinterest.", "facebook.", "instagram.",
        "youtube.", "wikipedia.", "tiktok.", "twitter.", "x.com",
        "medium.", "linkedin.", "tumblr.", "tripadvisor.", "yelp.",
        "amazon.", "flipkart.", "etsy.com", "ebay.com",
        "windowscentral.com", "howtogeek.com", "windowsreport.com",
        "chatgpt.com", "openai.com", "whatsapp.com", "support.microsoft.com",
        "support.google.com", "apple.com"
    }

    def is_noise(domain: str, href: str, title: str, snippet: str) -> bool:
        d = domain.lower()
        h = href.lower()
        t = title.lower()
        s = snippet.lower()
        if any(noise in d for noise in UGC_NOISE):
            return True
        if any(bad in h for bad in ["/r/", "reddit.", "quora.", "pinterest.", "/pin/", "facebook.", "instagram.", "youtube."]):
            return True
        combined = f"{t} {s} {d}"
        if any(win in combined for win in ["file explorer", "windows 10", "windows 11", "how to open file"]) and not any(q_term in query.lower() for q_term in ["file", "windows", "explorer"]):
            return True
        return False

    def is_relevant(q: str, title: str, snippet: str, domain: str) -> bool:
        text = f"{title} {snippet} {domain}".lower()
        terms = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', q) if w.lower() not in {"best", "top", "near", "the", "for", "in", "and", "services", "find", "online"}]
        if not terms:
            return True
        for t in terms:
            if t in text:
                return True
            for w in text.split():
                clean_w = "".join(c for c in w if c.isalnum())
                if len(clean_w) >= 4 and len(t) >= 4:
                    if t[:4] == clean_w[:4] or difflib.SequenceMatcher(None, t, clean_w).ratio() > 0.65:
                        return True
        return False

    def add_result(title: str, href: str, snippet: str, check_relevance: bool = True):
        if not href or not href.startswith("http"):
            return
        if any(bad in href.lower() for bad in ["duckduckgo.com", "bing.com", "yahoo.com", "microsoft.com", "google.com", "msn.com"]):
            return
        domain = urllib.parse.urlparse(href).netloc.replace("www.", "").lower()
        if is_noise(domain, href, title, snippet):
            return
        if check_relevance and not is_relevant(query, title, snippet, domain):
            return
        if domain not in seen_domains:
            seen_domains.add(domain)
            results.append({
                "rank": len(results) + 1,
                "title": title.strip(),
                "url": href.strip(),
                "domain": domain,
                "snippet": snippet.strip()
            })

    # Prepare session if curl_cffi is available
    session = None
    if HAS_CURL_CFFI:
        try:
            session = cffi_requests.Session(impersonate="chrome120")
        except Exception as e:
            logger.warning(f"Failed to create curl_cffi session: {e}")

    # 1. Primary Engine: DuckDuckGo Lite (Multi-page, highly reliable on datacenter IPs)
    try:
        lite_url = "https://lite.duckduckgo.com/lite/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://lite.duckduckgo.com/"
        }
        post_payload = {"q": query, "kl": region}

        for page in range(3):
            if len(results) >= target:
                break
            try:
                if session:
                    r = session.post(lite_url, data=post_payload, headers=headers, timeout=10)
                    content = r.text
                else:
                    req = urllib.request.Request(lite_url, data=urllib.parse.urlencode(post_payload).encode("utf-8"), headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        content = resp.read().decode("utf-8", errors="ignore")

                soup = BeautifulSoup(content, "html.parser")
                for a in soup.select("a.result-link"):
                    tr_title = a.find_parent("tr")
                    tr_snip = tr_title.find_next_sibling("tr") if tr_title else None
                    snip_el = tr_snip.select_one(".result-snippet") if tr_snip else None
                    snippet = snip_el.get_text(strip=True) if snip_el else ""
                    add_result(a.get_text(strip=True), a.get("href", ""), snippet)
                    if len(results) >= target:
                        break

                # Extract next page pagination form
                next_payload = {}
                for f in soup.find_all("form"):
                    inputs = {i.get("name"): i.get("value") for i in f.find_all("input") if i.get("name")}
                    if "s" in inputs and "vqd" in inputs:
                        next_payload = inputs
                        break
                if not next_payload or next_payload.get("s") == post_payload.get("s"):
                    break
                post_payload = next_payload
            except Exception as pe:
                logger.debug(f"DDG Lite page {page} fetch error: {pe}")
                break
    except Exception as e:
        logger.warning(f"DDG Lite primary search error: {e}")

    # 2. Bing Regional Fallback (Strictly organic results)
    if len(results) < target:
        try:
            cc = "IN" if "in" in region else ("GB" if "uk" in region else "US")
            for page_offset in [1, 11]:
                if len(results) >= target:
                    break
                b_url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}&cc={cc}&setlang=en-US&first={page_offset}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                    "Accept-Language": "en-IN,en;q=0.9",
                }
                if session:
                    r = session.get(b_url, headers=headers, timeout=10)
                    content = r.text
                else:
                    req = urllib.request.Request(b_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as r:
                        content = r.read().decode("utf-8", errors="ignore")

                soup = BeautifulSoup(content, "html.parser")
                for li in soup.select("li.b_algo"):
                    if "b_ans" in li.get("class", []) or li.select_one(".b_slideexp, .b_prompts, .ans"):
                        continue
                    h2 = li.select_one("h2 a")
                    if not h2:
                        continue
                    href = h2.get("href", "")
                    title = h2.get_text(strip=True)
                    snip_el = li.select_one(".b_caption p, .b_snippet")
                    snippet = snip_el.get_text(strip=True) if snip_el else ""

                    if "bing.com/ck/a" in href and "u=a1" in href:
                        try:
                            b64 = href.split("u=a1")[1].split("&")[0]
                            b64 += "=" * ((4 - len(b64) % 4) % 4)
                            real_url = base64.b64decode(b64).decode("utf-8", errors="ignore")
                            if real_url.startswith("http"):
                                href = real_url
                        except Exception:
                            pass

                    add_result(title, href, snippet)
                    if len(results) >= target:
                        break
        except Exception as e:
            logger.warning(f"Bing regional search error: {e}")

    # 3. Yahoo Regional Fallback
    if len(results) < target:
        try:
            y_domain = "in.search.yahoo.com" if "in" in region else "search.yahoo.com"
            for b_param in [1, 11]:
                if len(results) >= target:
                    break
                y_url = f"https://{y_domain}/search?p={urllib.parse.quote(query)}&b={b_param}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                    "Accept-Language": "en-IN,en;q=0.9",
                }
                if session:
                    r = session.get(y_url, headers=headers, timeout=10)
                    content = r.text
                else:
                    req = urllib.request.Request(y_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as r:
                        content = r.read().decode("utf-8", errors="ignore")

                soup = BeautifulSoup(content, "html.parser")
                for div in soup.select("div.algo"):
                    a = div.select_one("h3.title a")
                    snip_el = div.select_one("div.compText")
                    if a:
                        href = a.get("href", "")
                        title = a.get_text(strip=True)
                        snippet = snip_el.get_text(strip=True) if snip_el else ""
                        if "/RU=" in href:
                            try:
                                href = urllib.parse.unquote(href.split("/RU=")[1].split("/RK=")[0])
                            except Exception:
                                pass
                        add_result(title, href, snippet)
                        if len(results) >= target:
                            break
        except Exception as e:
            logger.warning(f"Yahoo regional search error: {e}")

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
                    # Extract mailto links with clean format checking
                    soup = BeautifulSoup(text, 'html.parser')
                    for mailto in soup.select('a[href^="mailto:"]'):
                        raw_m = mailto.get('href', '').replace('mailto:', '').split('?')[0].strip().lower()
                        if is_clean_email_format(raw_m):
                            emails.add(raw_m)

                    # Regex extraction
                    found_emails = EMAIL_RE.findall(text)
                    for em in found_emails:
                        em_clean = em.lower().strip().rstrip('.')
                        if is_clean_email_format(em_clean):
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

    # Filter out any non-deliverable / no-MX emails
    verified_emails = [e for e in emails if is_deliverable_email(e, check_mx=True)]

    return {
        "emails": verified_emails,
        "phones": list(phones)
    }

async def extract_blog_insights(url: str, title: str, domain: str) -> dict:
    """
    Inspects a blog / editorial page to extract headings outline, target keywords,
    word count, reading time, and schema types.
    """
    insights = {
        "site_name": domain.title().split('.')[0],
        "keywords": [],
        "headings_outline": [],
        "word_count": 0,
        "reading_time": "3 min read",
        "schemas_detected": []
    }
    try:
        async with httpx.AsyncClient(headers=BROWSER_HEADERS, timeout=6.0, follow_redirects=True, verify=False) as client:
            r = await client.get(url)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                
                # Extract site name
                og_site = soup.find("meta", property="og:site_name")
                if og_site and og_site.get("content"):
                    insights["site_name"] = og_site["content"].strip()
                
                # Extract headings outline (h1, h2, h3)
                outline = []
                for tag in soup.find_all(["h1", "h2", "h3"]):
                    txt = tag.get_text(strip=True)
                    if txt and len(txt) > 3 and not any(b in txt.lower() for b in ["cookie", "newsletter", "subscribe", "advertisement", "comments", "privacy"]):
                        level = int(tag.name[1])
                        outline.append({"level": level, "text": txt[:120]})
                insights["headings_outline"] = outline[:15]

                # Extract detected schema types from JSON-LD
                schemas = []
                for s in soup.find_all("script", type="application/ld+json"):
                    try:
                        if s.string:
                            data = json.loads(s.string)
                            if isinstance(data, dict):
                                t = data.get("@type")
                                if t: schemas.append(t if isinstance(t, str) else str(t))
                                if "@graph" in data and isinstance(data["@graph"], list):
                                    for g in data["@graph"]:
                                        gt = g.get("@type")
                                        if gt: schemas.append(gt if isinstance(gt, str) else str(gt))
                            elif isinstance(data, list):
                                for d in data:
                                    t = d.get("@type")
                                    if t: schemas.append(t if isinstance(t, str) else str(t))
                    except Exception:
                        pass
                insights["schemas_detected"] = list(dict.fromkeys(schemas))[:5]

                # Extract body text and word count
                body_text = " ".join([p.get_text(strip=True) for p in soup.find_all(["p", "article"])])
                words = re.findall(r'\b[a-zA-Z]{3,}\b', body_text)
                insights["word_count"] = len(words)
                reading_min = max(1, round(len(words) / 200))
                insights["reading_time"] = f"{reading_min} min read"

                # Extract target keywords (meta keywords, title phrases, high frequency terms)
                meta_kw = soup.find("meta", attrs={"name": "keywords"})
                keywords = []
                if meta_kw and meta_kw.get("content"):
                    keywords = [k.strip() for k in meta_kw["content"].split(",") if k.strip() and len(k.strip()) > 3][:8]
                
                if not keywords:
                    from collections import Counter
                    stopwords = {'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'are', 'you', 'can', 'has', 'have', 'all', 'more', 'about', 'best', 'their', 'will', 'what', 'when'}
                    filtered = [w.lower() for w in words if w.lower() not in stopwords and len(w) > 3]
                    counts = Counter(filtered).most_common(8)
                    keywords = [c[0].title() for c in counts]
                
                insights["keywords"] = keywords[:6]
    except Exception as e:
        logger.debug(f"Error extracting blog insights for {url}: {e}")

    return insights

@router.post("/serp", response_model=SerpResponse)
async def get_serp_rankings(req: SerpRequest, current_user: User = Depends(get_current_user)):
    """Extracts top 20 ranking website URLs from real-time SERP for the specified query and purpose."""
    query_clean = req.query.strip()
    if not query_clean:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    reg = req.region or "in-en"
    results = search_serp_engine(query_clean, region=reg, target=req.num_results or 20)

    # If Editorial, Keyword, or Competitor purpose, automatically extract deep insights for top ranking pages
    if req.purpose.upper() in ["EDITORIAL", "KEYWORD", "COMPETITOR"] and results:
        analysis_tasks = [extract_blog_insights(r["url"], r.get("title", ""), r.get("domain", "")) for r in results[:10]]
        analyzed = await asyncio.gather(*analysis_tasks, return_exceptions=True)
        for i, a_res in enumerate(analyzed):
            if isinstance(a_res, dict):
                results[i]["site_name"] = a_res.get("site_name")
                results[i]["keywords"] = a_res.get("keywords", [])
                results[i]["headings_outline"] = a_res.get("headings_outline", [])
                results[i]["word_count"] = a_res.get("word_count", 0)
                results[i]["reading_time"] = a_res.get("reading_time", "3 min read")
                results[i]["schemas_detected"] = a_res.get("schemas_detected", [])

    return SerpResponse(
        query=query_clean,
        purpose=req.purpose.upper(),
        region=reg,
        total=len(results),
        results=[SerpResultItem(**r) for r in results]
    )

@router.post("/draft-blog")
def draft_humanized_blog(req: DraftBlogRequest, current_user: User = Depends(get_current_user)):
    """
    Uses Gemini AI Copywriter to generate an in-depth, humanized blog post
    based on ranking competitor keywords, outlines, and structures, complete with
    Article + FAQPage JSON-LD schema.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        blog_data = generate_humanized_blog(
            query=req.query.strip(),
            competitor_insights=req.selected_blogs or [],
            target_tone=req.target_tone or "copywriter"
        )
        return blog_data
    except Exception as e:
        logger.error(f"Error drafting humanized blog: {e}")
        raise HTTPException(status_code=500, detail=f"AI Copywriter drafting failed: {str(e)}")

@router.post("/keyword-plan")
def get_keyword_plan(req: KeywordPlanRequest, current_user: User = Depends(get_current_user)):
    """
    Crawls and reverse-engineers top 5 competitor ranking sites to discover:
    1. Core overlapping common keywords
    2. High-opportunity long-tail keywords with high rankability & low competition
    3. Search intent, difficulty, and content architecture plan.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        sites = req.top_sites
        if not sites:
            serp_res = search_serp_engine(req.query.strip(), region=req.region or "in-en", target=6)
            sites = serp_res[:5]

        plan = generate_keyword_plan(
            query=req.query.strip(),
            competitor_sites=sites
        )
        return plan
    except Exception as e:
        logger.error(f"Error generating keyword plan: {e}")
        raise HTTPException(status_code=500, detail=f"Keyword Planner failed: {str(e)}")

@router.post("/competitor-strategy")
def get_competitor_strategy(req: CompetitorStrategyRequest, current_user: User = Depends(get_current_user)):
    """
    Analyzes top ranking competitors in the niche, identifies business models,
    vulnerabilities, market gaps, and delivers an aggressive battle plan.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        comps = req.selected_competitors
        if not comps:
            serp_res = search_serp_engine(req.query.strip(), region=req.region or "in-en", target=8)
            comps = serp_res[:6]

        strategy = generate_competitor_counter_strategy(
            query=req.query.strip(),
            competitors=comps
        )
        return strategy
    except Exception as e:
        logger.error(f"Error generating competitor strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Competitor strategy analysis failed: {str(e)}")

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
        first_email = emails[0] if emails else None
        # Only fallback to contact@{domain} if the domain has verified live MX records
        if not first_email and check_domain_has_mx(item.domain):
            first_email = f"contact@{item.domain}"
        first_phone = phones[0] if phones else None

        is_verified = bool(first_email and is_deliverable_email(first_email, check_mx=True))

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
            is_verified=is_verified
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
