import base64
import httpx
import logging
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("outreachbot.gmail")

async def send_via_gmail_api(access_token: str, message: MIMEMultipart) -> dict:
    """
    Sends an email message directly through the official Gmail REST API over HTTPS port 443.
    Bypasses all SMTP firewall blocks and doesn't require any App Passwords.
    """
    raw_bytes = message.as_bytes()
    encoded_raw = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")

    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {"raw": encoded_raw}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        
        if resp.status_code in (200, 202):
            data = resp.json()
            logger.info(f"Gmail API email sent successfully! Message ID: {data.get('id')}")
            return {"success": True, "id": data.get("id")}
        
        err_msg = resp.text
        try:
            err_json = resp.json()
            err_msg = err_json.get("error", {}).get("message", err_msg)
        except Exception:
            pass

        if resp.status_code == 403:
            raise Exception(f"Gmail API Permission Error: {err_msg}. Ensure the Gmail API is enabled in your Google Cloud / Firebase console.")
        elif resp.status_code == 401:
            raise Exception("Gmail OAuth Access Token expired. Please log in again with Google to refresh access.")
        else:
            raise Exception(f"Gmail API error ({resp.status_code}): {err_msg}")
