from fastapi import APIRouter
from pydantic import BaseModel
from email_validator import validate_email, EmailNotValidError
import dns.resolver
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

ROLE_PREFIXES = {
    "info", "admin", "contact", "hello", "support", "noreply", "no-reply", 
    "team", "help", "sales", "marketing", "enquiry", "inquiry", "feedback",
    "webmaster", "postmaster", "abuse", "spam", "security"
}

DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
    "spam4.me", "trashmail.com", "trashmail.me", "trashmail.at",
    "dispostable.com", "maildrop.cc", "fakeinbox.com", "tempinbox.com",
    "10minutemail.com", "getairmail.com", "filzmail.com", "spamgourmet.com",
}

class EmailToFilter(BaseModel):
    email: str

class FilterRequest(BaseModel):
    emails: list[str]

class FilteredEmail(BaseModel):
    email: str
    is_valid_syntax: bool
    has_mx_record: bool
    is_disposable: bool
    is_role_based: bool
    spam_score: float
    should_include: bool

class FilterResponse(BaseModel):
    results: list[FilteredEmail]
    total: int
    clean: int
    filtered_out: int

def check_syntax(email: str) -> bool:
    try:
        validate_email(email, check_deliverability=False)
        return True
    except EmailNotValidError:
        return False

def check_disposable(domain: str) -> bool:
    return domain.lower() in DISPOSABLE_DOMAINS

def check_role_based(local: str) -> bool:
    return local.lower() in ROLE_PREFIXES

async def check_mx(domain: str) -> bool:
    try:
        loop = asyncio.get_event_loop()
        def _resolve():
            resolver = dns.resolver.Resolver()
            resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
            resolver.timeout = 2.5
            resolver.lifetime = 2.5
            try:
                records = resolver.resolve(domain, 'MX')
                return len(records) > 0
            except Exception:
                try:
                    records_a = resolver.resolve(domain, 'A')
                    return len(records_a) > 0
                except Exception:
                    return False
        return await loop.run_in_executor(None, _resolve)
    except Exception:
        return False

@router.post("/validate", response_model=FilterResponse)
async def validate_emails(req: FilterRequest):
    results = []
    unique_emails = list(set(req.emails))
    
    # Pre-resolve all unique domains in parallel
    unique_domains = list({e.split("@")[1].lower().strip() for e in unique_emails if "@" in e and len(e.split("@")) == 2})
    
    async def resolve_one(d: str):
        try:
            return d, await check_mx(d)
        except Exception:
            return d, False
            
    if unique_domains:
        domain_pairs = await asyncio.gather(*(resolve_one(d) for d in unique_domains))
        mx_cache = dict(domain_pairs)
    else:
        mx_cache = {}

    for email in unique_emails:
        email = email.lower().strip()
        is_valid = check_syntax(email)
        if not is_valid:
            results.append(FilteredEmail(
                email=email, is_valid_syntax=False, has_mx_record=False,
                is_disposable=False, is_role_based=False, spam_score=1.0, should_include=False
            ))
            continue
        
        parts = email.split("@")
        local, domain = parts[0], parts[1]
        
        has_mx = mx_cache.get(domain, True)  # default True so transient DNS hiccups don't drop leads
        is_disposable = check_disposable(domain)
        is_role = check_role_based(local)
        
        score = 0.0
        if not has_mx: score += 0.3
        if is_disposable: score += 0.9
        if is_role: score += 0.1
        score = min(score, 1.0)
        
        # Include if valid syntax and not disposable domain
        should_include = is_valid and not is_disposable and score < 0.85
        
        results.append(FilteredEmail(
            email=email,
            is_valid_syntax=is_valid,
            has_mx_record=has_mx,
            is_disposable=is_disposable,
            is_role_based=is_role,
            spam_score=round(score, 2),
            should_include=should_include
        ))
    
    clean = sum(1 for r in results if r.should_include)
    return FilterResponse(
        results=results,
        total=len(results),
        clean=clean,
        filtered_out=len(results) - clean
    )
