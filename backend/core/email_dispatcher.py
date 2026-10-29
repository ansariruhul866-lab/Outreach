import os
import logging
import httpx
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("outreachbot.dispatcher")

async def test_brevo_key(api_key: str) -> tuple[bool, str]:
    """Test Brevo API key via HTTPS port 443."""
    if not api_key:
        return False, "Brevo API key is required"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.brevo.com/v3/account",
                headers={"api-key": api_key, "accept": "application/json"}
            )
            if resp.status_code == 200:
                data = resp.json()
                email = data.get("email", "verified")
                plan = data.get("plan", [{}])
                credits = plan[0].get("credits", 300) if plan else 300
                return True, f"Brevo authenticated ({email}, plan credits: {credits})"
            else:
                return False, f"Brevo authentication failed ({resp.status_code}): {resp.text[:120]}"
    except Exception as e:
        return False, f"Brevo connection error: {str(e)}"

async def test_resend_key(api_key: str) -> tuple[bool, str]:
    """Test Resend API key via HTTPS port 443."""
    if not api_key:
        return False, "Resend API key is required"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.resend.com/api-keys",
                headers={"Authorization": f"Bearer {api_key}", "accept": "application/json"}
            )
            if resp.status_code == 200:
                return True, "Resend API authenticated successfully"
            else:
                return False, f"Resend authentication failed ({resp.status_code}): {resp.text[:120]}"
    except Exception as e:
        return False, f"Resend connection error: {str(e)}"

async def send_via_brevo(
    api_key: str,
    from_name: str,
    from_email: str,
    to_name: str | None,
    to_email: str,
    subject: str,
    html_content: str,
    unsubscribe_url: str | None = None
) -> tuple[bool, str, str | None]:
    """
    Send email via Brevo REST API (HTTPS port 443).
    Returns (success, message, message_id).
    """
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key,
        "accept": "application/json",
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    if unsubscribe_url:
        payload["headers"] = {
            "List-Unsubscribe": f"<{unsubscribe_url}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            body = resp.text
            if resp.status_code in (200, 201):
                msg_id = resp.json().get("messageId")
                return True, f"Sent via Brevo (messageId: {msg_id})", msg_id
            
            # Check for credit or quota exhaustion
            is_exhausted = (
                resp.status_code in (400, 402, 429) and
                any(kw in body.lower() for kw in ["credit", "quota", "limit", "exceeded", "reseller_permission_denied", "not enough"])
            )
            return False, f"{'QUOTA_EXHAUSTED' if is_exhausted else 'BREVO_ERROR'}: {body[:200]}", None
    except Exception as e:
        return False, f"BREVO_EXCEPTION: {str(e)}", None

async def send_via_resend(
    api_key: str,
    from_name: str,
    from_email: str,
    to_email: str,
    subject: str,
    html_content: str,
    unsubscribe_url: str | None = None
) -> tuple[bool, str, str | None]:
    """
    Send email via Resend REST API (HTTPS port 443).
    Returns (success, message, message_id).
    """
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Resend format for from: "Sender Name <sender@example.com>"
    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    if unsubscribe_url:
        payload["headers"] = {
            "List-Unsubscribe": f"<{unsubscribe_url}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            body = resp.text
            if resp.status_code in (200, 201):
                msg_id = resp.json().get("id")
                return True, f"Sent via Resend (id: {msg_id})", msg_id
            
            is_exhausted = (
                resp.status_code in (400, 402, 429) and
                any(kw in body.lower() for kw in ["rate_limit_exceeded", "daily_quota_exceeded", "quota", "credit", "limit", "exceeded", "restricted"])
            )
            return False, f"{'QUOTA_EXHAUSTED' if is_exhausted else 'RESEND_ERROR'}: {body[:200]}", None
    except Exception as e:
        return False, f"RESEND_EXCEPTION: {str(e)}", None

async def send_via_smtp(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_pass: str,
    from_name: str,
    from_email: str,
    to_email: str,
    subject: str,
    html_content: str,
    unsubscribe_url: str | None = None
) -> tuple[bool, str]:
    """Send via direct SMTP (ports 587 / 465)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email
    if unsubscribe_url:
        msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg.attach(MIMEText(html_content, "html"))

    try:
        use_ssl = (smtp_port == 465)
        if use_ssl:
            async with aiosmtplib.SMTP(hostname=smtp_host, port=smtp_port, use_tls=True, timeout=12) as smtp:
                await smtp.login(smtp_user, smtp_pass)
                await smtp.send_message(msg)
        else:
            async with aiosmtplib.SMTP(hostname=smtp_host, port=smtp_port, start_tls=True, timeout=12) as smtp:
                await smtp.login(smtp_user, smtp_pass)
                await smtp.send_message(msg)
        return True, "Sent via Direct SMTP"
    except Exception as e:
        return False, f"SMTP error: {str(e)}"

async def dispatch_email_hybrid(
    from_name: str,
    from_email: str,
    to_name: str | None,
    to_email: str,
    subject: str,
    html_content: str,
    unsubscribe_url: str | None = None,
    provider: str = "HYBRID",
    brevo_key: str | None = None,
    resend_key: str | None = None,
    smtp_host: str | None = None,
    smtp_port: int = 587,
    smtp_user: str | None = None,
    smtp_pass: str | None = None
) -> tuple[bool, str, str]:
    """
    Intelligent Hybrid Dispatcher:
    - If HYBRID: Attempts Brevo (300/day). If credits exhausted or error -> immediately switches to Resend (3,000/mo).
    - If BREVO: Sends via Brevo. If exhausted & resend_key available, auto-falls back to Resend.
    - If RESEND: Sends via Resend. If exhausted & brevo_key available, auto-falls back to Brevo.
    - If SMTP (GMAIL/OUTLOOK/CUSTOM): Tries SMTP. If blocked/fails, and Brevo/Resend keys exist, fails over!
    
    Returns: (success: bool, used_provider: str, message: str)
    """
    # Resolve keys from arguments or environment variables
    b_key = brevo_key or os.getenv("BREVO_API_KEY", "").strip()
    r_key = resend_key or os.getenv("RESEND_API_KEY", "").strip()

    prov = provider.upper()

    # 1. RESEND-FIRST ROUTE
    if prov == "RESEND":
        if r_key:
            ok, msg, _ = await send_via_resend(r_key, from_name, from_email, to_email, subject, html_content, unsubscribe_url)
            if ok:
                return True, "resend", msg
            logger.warning(f"Resend send failed: {msg}. Checking Brevo fallback...")
            if b_key:
                ok_b, msg_b, _ = await send_via_brevo(b_key, from_name, from_email, to_name, to_email, subject, html_content, unsubscribe_url)
                if ok_b:
                    return True, "brevo", f"Auto-failover to Brevo: {msg_b}"
            return False, "resend", f"Resend failed: {msg}"
        else:
            return False, "resend", "Resend API key is missing"

    # 2. HYBRID OR BREVO-FIRST ROUTE (Default recommended)
    if prov in ("HYBRID", "BREVO"):
        # Try Brevo first
        if b_key:
            ok, msg, _ = await send_via_brevo(b_key, from_name, from_email, to_name, to_email, subject, html_content, unsubscribe_url)
            if ok:
                return True, "brevo", msg
            
            # Brevo failed or exhausted, check if we have Resend key
            logger.warning(f"Brevo send attempt issue: {msg}. Switching to Resend fallback...")
            if r_key:
                ok_r, msg_r, _ = await send_via_resend(r_key, from_name, from_email, to_email, subject, html_content, unsubscribe_url)
                if ok_r:
                    logger.info(f"Successfully switched to Resend after Brevo failure: {msg_r}")
                    return True, "resend", f"Auto-failover to Resend: {msg_r}"
                return False, "hybrid", f"Both providers failed! Brevo: {msg} | Resend: {msg_r}"
            return False, "brevo", f"Brevo failed: {msg} (No Resend fallback key configured)"
        
        elif r_key:
            # No Brevo key, but Resend key exists
            ok_r, msg_r, _ = await send_via_resend(r_key, from_name, from_email, to_email, subject, html_content, unsubscribe_url)
            if ok_r:
                return True, "resend", msg_r
            return False, "resend", f"Resend failed: {msg_r}"
        else:
            return False, "hybrid", "No Brevo or Resend API key configured for cloud delivery."

    # 3. DIRECT SMTP ROUTE (GMAIL / OUTLOOK / CUSTOM)
    if prov in ("GMAIL", "OUTLOOK", "CUSTOM") and smtp_host and smtp_user and smtp_pass:
        ok, msg = await send_via_smtp(smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, to_email, subject, html_content, unsubscribe_url)
        if ok:
            return True, "smtp", msg
        
        # If SMTP failed (e.g. timeout on Render port 587) and user has cloud keys, fail over!
        logger.warning(f"SMTP send failed ({msg}). Checking cloud relay failover...")
        if b_key:
            ok_b, msg_b, _ = await send_via_brevo(b_key, from_name, from_email, to_name, to_email, subject, html_content, unsubscribe_url)
            if ok_b:
                return True, "brevo", f"SMTP blocked/failed, auto-failover to Brevo: {msg_b}"
        if r_key:
            ok_r, msg_r, _ = await send_via_resend(r_key, from_name, from_email, to_email, subject, html_content, unsubscribe_url)
            if ok_r:
                return True, "resend", f"SMTP blocked/failed, auto-failover to Resend: {msg_r}"
        return False, "smtp", f"SMTP error: {msg}"

    return False, "none", f"Unknown email provider configuration: {provider}"
