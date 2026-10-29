import re
import html
import asyncio
from urllib.parse import urljoin, urlparse, unquote
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Lead, ScrapeJob
from core.auth import get_current_user
from api.filter import validate_emails, FilterRequest

# Try importing curl_cffi for Chrome TLS fingerprint impersonation (bypasses Cloudflare 403s)
try:
    from curl_cffi.requests import AsyncSession
    HAS_CURL_CFFI = True
except ImportError:
    import httpx
    HAS_CURL_CFFI = False

router = APIRouter(prefix="/scraper", tags=["scraper"])

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', re.IGNORECASE)
HEX_HASH_RE = re.compile(r'^[0-9a-f]{24,64}$', re.IGNORECASE)

EXCLUDED_EXTENSIONS = (
    '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico',
    '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.mp4',
    '.zip', '.pdf', '.json', '.xml', '.bmp', '.tiff', '.avi',
    '.mov', '.wmv', '.m4v', '.tar', '.gz'
)

# Placeholder or error telemetry domains
DUMMY_DOMAINS = {
    'example.com', 'domain.com', 'email.com', 'sample.com', 'test.com',
    'sentry.io', 'w3.org', 'schema.org', 'wixpress.com', 'yourcompany.com',
    'sitename.com', 'company.com'
}

TIER1_KEYWORDS = [
    'contact', 'press', 'reach', 'touch', 'support', 'imprint',
    'impressum', 'inquiry', 'get-in-touch', 'contactus', 'site/email',
    'contacts', 'email'
]

TIER2_KEYWORDS = [
    'about', 'team', 'company', 'help', 'partner', 'legal', 'privacy',
    'media', 'feedback', 'our-team'
]

IGNORE_PATH_PATTERNS = [
    '-software', '-tools', '-alternatives', '-apps', '-products',
    '/compare/', '/vs/', '/best-', '/categories/', '/tag/', '/topics/',
    '/submissions', '/alternatives/', '/category/'
]

SUBPAGE_PENALTY = [
    '/people/', '/author/', '/tag/', '/category/', '/blog/',
    '/posts/', '/articles/', '/user/', '/profile/', '/members/'
]

COMMON_FALLBACK_PATHS = [
    "/contact",
    "/contact-us",
    "/contacts",
    "/site/email",
    "/pages/contact",
    "/pages/contact-us",
    "/press",
    "/about",
    "/about-us",
    "/pages/about-us",
    "/team",
    "/support",
    "/legal",
    "/get-in-touch",
    "/imprint"
]

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
}

class ScrapeRequest(BaseModel):
    url: str
    depth: int = 2
    campaign_id: str | None = None

class BulkScrapeRequest(BaseModel):
    urls: list[str] = Field(..., description="List of target website URLs or domains")
    depth: int = 2
    max_pages_per_site: int = 18
    campaign_id: str | None = None

class SiteResult(BaseModel):
    url: str
    domain: str
    company: str
    status: str  # "COMPLETED", "NO_EMAILS", "FAILED"
    pages_visited: int
    raw_found: int
    emails: list[str]
    error: str | None = None

class BulkScrapeResponse(BaseModel):
    total_sites: int
    successful_sites: int
    total_pages_visited: int
    total_raw_emails: int
    total_clean_emails: int
    total_saved_leads: int
    sites: list[SiteResult]

class SingleScrapeResponse(BaseModel):
    job_id: str
    target_url: str
    pages_visited: int
    emails_found: int
    emails_clean: int
    saved_to_db: int
    emails: list[str]

def decode_cloudflare_email(cfemail_hex: str) -> str:
    """Decodes Cloudflare's XOR-based email protection."""
    try:
        r = int(cfemail_hex[:2], 16)
        email = ''.join([chr(int(cfemail_hex[i:i+2], 16) ^ r) for i in range(2, len(cfemail_hex), 2)])
        return email.strip()
    except Exception:
        return ""

def clean_extracted_email(e: str) -> str:
    """Strips leading/trailing punctuation, quotes, and JSON unicode artifacts."""
    clean = e.strip(".,;:\"'<>(){}[]/\\`").lower()
    for prefix in ('u003e', 'u003c', 'u0026', 'u0040'):
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
    for suffix in ('u003e', 'u003c', 'u0026', 'u0040'):
        if clean.endswith(suffix):
            clean = clean[:-len(suffix)]
    return clean.strip(".,;:\"'<>(){}[]/\\`")

def extract_emails_from_html(raw_html: str) -> set[str]:
    """
    Multi-pass email extraction:
    1. Cloudflare data-cfemail deobfuscation
    2. mailto: links & URL unquoting
    3. Normalization of [at], (at), entities
    4. JSON-LD & script parsing
    5. Full text regex
    """
    emails = set()
    if not raw_html:
        return emails

    # 1. Cloudflare and mailto deobfuscation
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        
        # Look for data-cfemail attributes
        for cf in soup.find_all(attrs={"data-cfemail": True}):
            dec = decode_cloudflare_email(cf.get("data-cfemail", ""))
            if EMAIL_RE.match(dec):
                emails.add(clean_extracted_email(dec))

        # Look for /cdn-cgi/l/email-protection# links
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if "/cdn-cgi/l/email-protection#" in href:
                hex_part = href.split("#")[-1]
                dec = decode_cloudflare_email(hex_part)
                if EMAIL_RE.match(dec):
                    emails.add(clean_extracted_email(dec))
            elif href.lower().startswith("mailto:"):
                m_email = href[7:].split("?")[0].split("#")[0].strip()
                m_email = unquote(m_email)
                for found_m in EMAIL_RE.findall(m_email):
                    emails.add(clean_extracted_email(found_m))

        # Look for JSON-LD schemas
        for script in soup.find_all("script", type="application/ld+json"):
            if script.string:
                for match in EMAIL_RE.findall(script.string):
                    emails.add(clean_extracted_email(match))

        # Look for meta tags
        for meta in soup.find_all("meta", content=True):
            content = meta.get("content", "")
            if "@" in content:
                for match in EMAIL_RE.findall(content):
                    emails.add(clean_extracted_email(match))
    except Exception:
        pass

    # 2. Text normalization & Regex Pass
    clean_text = html.unescape(raw_html)
    clean_text = clean_text.replace("%40", "@").replace("%2e", ".").replace("%2E", ".")
    clean_text = clean_text.replace(r"\u003e", ">").replace(r"\u003c", "<").replace(r"\u0040", "@")
    
    clean_text = re.sub(r'\s*(\[at\]|\(at\)|\{at\})\s*', '@', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'\s*(\[dot\]|\(dot\)|\{dot\})\s*', '.', clean_text, flags=re.IGNORECASE)

    for match in EMAIL_RE.findall(clean_text):
        emails.add(clean_extracted_email(match))

    # Filter out static file extensions and invalid formats
    filtered = set()
    for e in emails:
        if len(e) < 5 or len(e) > 85:
            continue
        if any(e.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
            continue
        parts = e.split("@")
        if len(parts) != 2:
            continue
        local_part, domain_part = parts[0], parts[1]
        if domain_part in DUMMY_DOMAINS:
            continue
        if local_part in {"test", "sample", "yourname", "username", "demo"}:
            continue
        # Filter Sentry/telemetry crash hashes (32 hex characters)
        if HEX_HASH_RE.match(local_part):
            continue
        if any(sub in domain_part for sub in ['errors.', 'sentry.', 'telemetry.', 'bugs.', 'monitoring.']):
            continue
        filtered.add(e)

    return filtered

def extract_scored_links(raw_html: str, base_url: str, allowed_domain: str) -> list[str]:
    """Extracts internal links and sorts them by Tier: Contact > About/Team > General."""
    soup = BeautifulSoup(raw_html, "html.parser")
    tier1_links = []
    tier2_links = []
    normal_links = []
    seen = set()

    clean_allowed = allowed_domain.lstrip("www.").lower()

    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if not href or href.startswith(("#", "javascript:", "tel:", "mailto:")):
            continue

        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)
        clean_netloc = parsed.netloc.lstrip("www.").lower()

        # Check domain match (exact or subdomain)
        if (clean_netloc == clean_allowed or clean_netloc.endswith("." + clean_allowed)) and parsed.scheme in ("http", "https"):
            clean_url = full_url.split("#")[0].rstrip("/")
            if clean_url in seen:
                continue
            seen.add(clean_url)

            # Skip asset extensions
            if any(clean_url.lower().endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                continue

            path_lower = parsed.path.lower()
            text_lower = tag.get_text().strip().lower()

            # Ignore product comparison directories that match 'contact' or 'support'
            if any(p in path_lower for p in IGNORE_PATH_PATTERNS):
                normal_links.append(clean_url)
                continue

            is_subpage = any(sp in path_lower for sp in SUBPAGE_PENALTY)
            
            # Anchor text matching: short text only to avoid product card false positives
            is_text_contact = len(text_lower.split()) <= 4 and any(k in text_lower for k in ['contact', 'email', 'support', 'press', 'reach us', 'get in touch', 'imprint'])
            is_text_about = len(text_lower.split()) <= 4 and any(k in text_lower for k in ['about', 'team', 'company'])

            is_tier1 = (any(k in path_lower for k in TIER1_KEYWORDS) or is_text_contact) and not is_subpage
            is_tier2 = (any(k in path_lower for k in TIER2_KEYWORDS) or is_text_about) and not is_subpage

            if is_tier1:
                tier1_links.append(clean_url)
            elif is_tier2:
                tier2_links.append(clean_url)
            else:
                normal_links.append(clean_url)

    # Return Tier 1 first (Contact/Press/Support), then Tier 2 (About/Team), then normal
    return tier1_links + tier2_links + normal_links

def normalize_target_url(raw_url: str) -> tuple[str, str, str]:
    """Returns (normalized_url, domain, company_name)"""
    target = raw_url.strip()
    if not target:
        return "", "", ""
    if not target.startswith(("http://", "https://")):
        target = "https://" + target

    parsed = urlparse(target)
    domain = parsed.netloc.lower()
    clean_domain = domain.lstrip("www.")

    # Company name heuristic
    company = clean_domain.split(".")[0].capitalize()
    return target, clean_domain, company

async def fetch_page(client, url: str) -> str:
    """Fetches a page with follow_redirects and error safety."""
    try:
        if HAS_CURL_CFFI:
            resp = await client.get(url, timeout=9.0)
            if resp.status_code in (200, 404):
                return resp.text
        else:
            resp = await client.get(url, timeout=8.0, follow_redirects=True)
            if resp.status_code in (200, 404):
                ctype = resp.headers.get("content-type", "").lower()
                if "text/html" in ctype or "text/plain" in ctype or not ctype:
                    return resp.text
    except Exception:
        pass
    return ""

async def crawl_domain(
    client,
    raw_target: str,
    depth: int = 2,
    max_pages: int = 18
) -> tuple[str, str, str, int, set[str], str | None]:
    """
    Intelligent website crawler:
    1. Fetches root page first.
    2. Prioritizes Tier 1 contact/about endpoints.
    3. Traverses priority pages to find all verified emails.
    """
    target, domain, company = normalize_target_url(raw_target)
    if not target:
        return "", "", "", 0, set(), "Invalid URL"

    visited = set()
    queue: list[tuple[str, int]] = []
    queued_set = set()
    raw_emails: set[str] = set()
    pages_visited = 0
    error_msg = None

    # Step 1: Queue root target URL first
    queue.append((target, 0))
    queued_set.add(target.rstrip("/"))

    # Step 2: Queue high-yield fallback paths
    base_prefix = f"https://{domain}"
    for fb in COMMON_FALLBACK_PATHS:
        fb_url = base_prefix + fb
        clean_fb = fb_url.rstrip("/")
        if clean_fb not in queued_set:
            queue.append((fb_url, 1))
            queued_set.add(clean_fb)

    try:
        while queue and pages_visited < max_pages:
            url, cur_depth = queue.pop(0)
            clean_norm_url = url.rstrip("/")
            if clean_norm_url in visited:
                continue
            visited.add(clean_norm_url)

            html_content = await fetch_page(client, url)
            
            # If root https failed, attempt http fallback
            if not html_content and pages_visited == 0:
                http_fallback = f"http://{domain}"
                html_content = await fetch_page(client, http_fallback)

            if not html_content:
                continue

            pages_visited += 1
            emails = extract_emails_from_html(html_content)
            raw_emails.update(emails)

            # Discover and queue internal links if within depth limit
            if cur_depth < depth and len(queue) < 60:
                discovered_links = extract_scored_links(html_content, url, domain)
                for link in discovered_links:
                    clean_l = link.rstrip("/")
                    if clean_l not in visited and clean_l not in queued_set and len(queue) < 60:
                        # Priority links go to the front of queue
                        is_t1 = any(k in clean_l.lower() for k in TIER1_KEYWORDS)
                        if is_t1:
                            queue.insert(0, (link, cur_depth + 1))
                        else:
                            queue.append((link, cur_depth + 1))
                        queued_set.add(clean_l)

            await asyncio.sleep(0.08)

    except Exception as e:
        error_msg = str(e)

    return target, domain, company, pages_visited, raw_emails, error_msg

# ---------------- API ENDPOINTS ----------------

@router.post("/crawl", response_model=SingleScrapeResponse)
async def crawl_single(
    req: ScrapeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target, domain, company = normalize_target_url(req.url)
    if not target:
        raise HTTPException(status_code=400, detail="Invalid target URL provided")

    job = ScrapeJob(
        user_id=current_user.id,
        target_url=target,
        depth=req.depth,
        status="RUNNING"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if HAS_CURL_CFFI:
        async with AsyncSession(impersonate="chrome", verify=False) as client:
            _, domain, company, pages_visited, raw_emails, error = await crawl_domain(
                client, target, depth=req.depth, max_pages=35
            )
    else:
        limits = httpx.Limits(max_keepalive_connections=15, max_connections=30)
        async with httpx.AsyncClient(headers=BROWSER_HEADERS, verify=False, timeout=8.0, limits=limits) as client:
            _, domain, company, pages_visited, raw_emails, error = await crawl_domain(
                client, target, depth=req.depth, max_pages=35
            )

    # Validate emails
    filter_resp = await validate_emails(FilterRequest(emails=list(raw_emails)))
    clean_leads = [r.email for r in filter_resp.results if r.should_include]

    saved_count = 0
    for email in clean_leads:
        existing = db.query(Lead).filter(
            Lead.user_id == current_user.id,
            Lead.email == email
        ).first()

        if not existing:
            lead = Lead(
                user_id=current_user.id,
                campaign_id=req.campaign_id,
                email=email,
                company=company,
                website=target,
                source_url=target,
                status="PENDING",
                is_verified=True,
                spam_score=0.0
            )
            db.add(lead)
            saved_count += 1

    job.status = "COMPLETED" if not error else "FAILED"
    job.pages_visited = pages_visited
    job.emails_found = len(clean_leads)
    job.error_message = error
    db.commit()

    return SingleScrapeResponse(
        job_id=job.id,
        target_url=target,
        pages_visited=pages_visited,
        emails_found=len(raw_emails),
        emails_clean=len(clean_leads),
        saved_to_db=saved_count,
        emails=clean_leads
    )

@router.post("/bulk-crawl", response_model=BulkScrapeResponse)
async def bulk_crawl(
    req: BulkScrapeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cleaned_targets: list[str] = []
    seen_domains: set[str] = set()

    for item in req.urls:
        lines = [line.strip() for line in item.split("\n") if line.strip()]
        for l in lines:
            parts = [p.strip() for p in l.split(",") if p.strip()]
            for p in parts:
                _, domain, _ = normalize_target_url(p)
                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    cleaned_targets.append(p)

    if not cleaned_targets:
        raise HTTPException(status_code=400, detail="Please provide at least 1 valid website URL or domain.")

    if len(cleaned_targets) > 50:
        cleaned_targets = cleaned_targets[:50]

    # Concurrency semaphore: crawl 5 domains concurrently
    semaphore = asyncio.Semaphore(5)
    max_p = max(req.max_pages_per_site, 15)

    async def run_crawl_session():
        if HAS_CURL_CFFI:
            async with AsyncSession(impersonate="chrome", verify=False) as client:
                async def crawl_with_limit(u: str):
                    async with semaphore:
                        try:
                            return await asyncio.wait_for(
                                crawl_domain(client, u, depth=req.depth, max_pages=max_p),
                                timeout=24.0
                            )
                        except asyncio.TimeoutError:
                            t, d, c = normalize_target_url(u)
                            return t, d, c, 1, set(), "Timeout (site took >24s to respond)"
                        except Exception as ex:
                            t, d, c = normalize_target_url(u)
                            return t, d, c, 0, set(), f"Connection error: {str(ex)[:100]}"

                tasks = [crawl_with_limit(u) for u in cleaned_targets]
                return await asyncio.gather(*tasks)
        else:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=40)
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, verify=False, timeout=8.0, limits=limits) as client:
                async def crawl_with_limit(u: str):
                    async with semaphore:
                        try:
                            return await asyncio.wait_for(
                                crawl_domain(client, u, depth=req.depth, max_pages=max_p),
                                timeout=24.0
                            )
                        except asyncio.TimeoutError:
                            t, d, c = normalize_target_url(u)
                            return t, d, c, 1, set(), "Timeout (site took >24s to respond)"
                        except Exception as ex:
                            t, d, c = normalize_target_url(u)
                            return t, d, c, 0, set(), f"Connection error: {str(ex)[:100]}"

                tasks = [crawl_with_limit(u) for u in cleaned_targets]
                return await asyncio.gather(*tasks)

    results = await run_crawl_session()

    # Collect all raw emails across all sites for batch validation
    all_raw_emails_set: set[str] = set()
    for _, _, _, _, raw_emails, _ in results:
        all_raw_emails_set.update(raw_emails)

    # Run DNS MX & spam validation
    filter_resp = await validate_emails(FilterRequest(emails=list(all_raw_emails_set)))
    clean_emails_set = {r.email for r in filter_resp.results if r.should_include}

    # Process and build per-site responses & save to DB
    site_results: list[SiteResult] = []
    total_pages_visited = 0
    total_raw_emails = 0
    total_clean_emails = 0
    total_saved_leads = 0
    successful_sites = 0

    for target, domain, company, pages_visited, raw_emails, error in results:
        total_pages_visited += pages_visited
        total_raw_emails += len(raw_emails)

        site_clean = [e for e in raw_emails if e in clean_emails_set]
        total_clean_emails += len(site_clean)

        status = "COMPLETED"
        if error and pages_visited == 0:
            status = "FAILED"
        elif len(site_clean) == 0:
            status = "NO_EMAILS"
        else:
            successful_sites += 1

        # Save to DB
        site_saved = 0
        for email in site_clean:
            existing = db.query(Lead).filter(
                Lead.user_id == current_user.id,
                Lead.email == email
            ).first()

            if not existing:
                lead = Lead(
                    user_id=current_user.id,
                    campaign_id=req.campaign_id,
                    email=email,
                    company=company,
                    website=target,
                    source_url=target,
                    status="PENDING",
                    is_verified=True,
                    spam_score=0.0
                )
                db.add(lead)
                site_saved += 1

        total_saved_leads += site_saved

        site_results.append(SiteResult(
            url=target,
            domain=domain,
            company=company,
            status=status,
            pages_visited=pages_visited,
            raw_found=len(raw_emails),
            emails=site_clean,
            error=error
        ))

    db.commit()

    # Record job
    job = ScrapeJob(
        user_id=current_user.id,
        target_url=f"Bulk Scrape ({len(cleaned_targets)} websites)",
        depth=req.depth,
        status="COMPLETED",
        pages_visited=total_pages_visited,
        emails_found=total_clean_emails
    )
    db.add(job)
    db.commit()

    return BulkScrapeResponse(
        total_sites=len(cleaned_targets),
        successful_sites=successful_sites,
        total_pages_visited=total_pages_visited,
        total_raw_emails=total_raw_emails,
        total_clean_emails=total_clean_emails,
        total_saved_leads=total_saved_leads,
        sites=site_results
    )
