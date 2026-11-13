import re
import logging
from typing import Optional, Set
import dns.resolver

logger = logging.getLogger("email_validator")

# Regex for valid email syntax
EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', re.IGNORECASE)
HEX_HASH_RE = re.compile(r'^[0-9a-f]{20,64}$', re.IGNORECASE)

EXCLUDED_EXTENSIONS = (
    '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico',
    '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.mp4',
    '.zip', '.pdf', '.json', '.xml', '.bmp', '.tiff', '.avi',
    '.mov', '.wmv', '.m4v', '.tar', '.gz'
)

# Common website template / CMS theme / placeholder domains
DUMMY_DOMAINS: Set[str] = {
    'yourwebsite.com', 'mywebsite.com', 'yoursite.com', 'mysite.com',
    'website.com', 'yourcompany.com', 'mycompany.com', 'company.com',
    'sitename.com', 'domain.com', 'yourdomain.com', 'mydomain.com',
    'sampledomain.com', 'domainname.com', 'site.com', 'test.com',
    'sample.com', 'example.com', 'example.org', 'example.net',
    'email.com', 'demowebsite.com', 'tempuri.org', 'w3.org', 'schema.org',
    'sentry.io', 'errors.stripe.com', 'themeforest.net', 'envato.com',
    'bootstrapmade.com', 'colorlib.com', 'wordpress.org', 'wordpress.com',
    'shopify.com', 'wixpress.com', 'wix.com', 'squarespace.com',
    'webflow.com', 'weebly.com', 'hubspot.com', 'myshopify.com',
    'localhost', 'outreachbot.local'
}

# Substrings that identify dummy/template domains
DUMMY_DOMAIN_SUBSTRINGS = (
    'yourwebsite', 'mywebsite', 'yoursite', 'mysite',
    'yourdomain', 'mydomain', 'yourcompany', 'mycompany',
    'sampledomain', 'testdomain', 'example.com', 'domain.com'
)

# Dummy / placeholder local-parts (before the @)
DUMMY_LOCAL_PARTS: Set[str] = {
    'yourname', 'youremail', 'your-name', 'your-email',
    'test', 'demo', 'sample', 'dummy', 'placeholder',
    'username', 'name', 'email', 'user'
}

DISPOSABLE_DOMAINS: Set[str] = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
    "spam4.me", "trashmail.com", "trashmail.me", "trashmail.at",
    "dispostable.com", "maildrop.cc", "fakeinbox.com", "tempinbox.com",
    "10minutemail.com", "getairmail.com", "filzmail.com", "spamgourmet.com",
}

# In-memory MX cache to avoid repeated DNS queries: domain -> bool
_MX_CACHE: dict[str, bool] = {}

def is_clean_email_format(email: str) -> bool:
    """
    Fast synchronous syntactic & heuristic check:
    Rejects dummy domains, placeholder prefixes, telemetry hashes, static file extensions.
    """
    if not email or not isinstance(email, str):
        return False
    
    clean = email.strip().lower()
    if len(clean) < 5 or len(clean) > 85 or '@' not in clean:
        return False
    
    # Check static asset extensions
    if any(clean.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
        return False
    
    parts = clean.split('@')
    if len(parts) != 2:
        return False
    
    local_part, domain_part = parts[0], parts[1]
    if not local_part or not domain_part or '.' not in domain_part:
        return False
    
    # Check regex
    if not EMAIL_RE.match(clean):
        return False
    
    # Check dummy domains
    if domain_part in DUMMY_DOMAINS:
        return False
    
    # Check disposable domains
    if domain_part in DISPOSABLE_DOMAINS:
        return False
    
    # Check substring matches for template domains
    for sub in DUMMY_DOMAIN_SUBSTRINGS:
        if sub in domain_part:
            return False
        
    # Check dummy local parts
    if local_part in DUMMY_LOCAL_PARTS:
        return False
    
    # Specific catch for "info@yourwebsite.com", "contact@yourwebsite.com", etc.
    if local_part in {'info', 'contact', 'admin', 'hello', 'support', 'mail'} and 'website' in domain_part and 'your' in domain_part:
        return False
    
    # Filter telemetry / crash hashes (e.g. Sentry/Stripe error hashes)
    if HEX_HASH_RE.match(local_part):
        return False
    if any(sub in domain_part for sub in ['errors.', 'sentry.', 'telemetry.', 'bugs.', 'monitoring.']):
        return False
        
    return True

def check_domain_has_mx(domain: str, timeout: float = 2.0) -> bool:
    """
    Checks if a domain has valid DNS MX records that can receive incoming emails.
    Rejects domains with Null MX (RFC 7505) or no MX answer.
    """
    domain = domain.lower().strip()
    if domain in _MX_CACHE:
        return _MX_CACHE[domain]
    
    try:
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        resolver.timeout = timeout
        resolver.lifetime = timeout
        
        answers = resolver.resolve(domain, 'MX')
        has_valid_mx = False
        for r in answers:
            exchange = str(r.exchange).rstrip('.')
            # RFC 7505 Null MX record is '.' indicating domain does NOT accept email
            if exchange and exchange != '':
                has_valid_mx = True
                break
        
        _MX_CACHE[domain] = has_valid_mx
        return has_valid_mx
    except Exception:
        _MX_CACHE[domain] = False
        return False

def is_deliverable_email(email: str, check_mx: bool = True) -> bool:
    """
    Combined validation: format, template/dummy domain rejection, and DNS MX record check.
    """
    if not is_clean_email_format(email):
        return False
    
    if not check_mx:
        return True
    
    domain = email.strip().lower().split('@')[1]
    return check_domain_has_mx(domain)
