import os
import json
import logging
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("gemini_service")

FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash"
]

def get_gemini_api_key(custom_key: Optional[str] = None) -> str:
    key = custom_key or os.getenv("GEMINI_API_KEY")
    if not key or not key.strip():
        raise ValueError("Gemini API key is missing. Please configure your Gemini API Key in Settings or .env.")
    return key.strip()

def determine_lead_strategy(email: Optional[str], phone: Optional[str], website: Optional[str]) -> str:
    has_website = bool(website and website.strip() and not website.strip().lower() in ["none", "null", "n/a", "no website", "no"])
    has_email = bool(email and email.strip() and not email.strip().endswith("@outreachbot.local"))
    has_phone = bool(phone and phone.strip())

    if not has_website and has_email:
        return "NO_WEBSITE"
    elif has_phone and not has_email:
        return "PHONE_ONLY"
    elif has_website and has_email:
        return "HAS_WEBSITE"
    elif not has_website and has_phone:
        return "PHONE_ONLY"
    return "NO_WEBSITE"

def generate_lead_pitch(
    lead_data: Dict[str, Any],
    sender_name: str = "Outreach Specialist",
    agency_or_service: str = "Digital Growth & Web Engineering",
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    api_key = get_gemini_api_key(custom_api_key)

    company = lead_data.get("company") or "your business"
    first_name = lead_data.get("first_name") or "there"
    email = lead_data.get("email")
    phone = lead_data.get("phone")
    website = lead_data.get("website")

    strategy = determine_lead_strategy(email, phone, website)

    if strategy == "NO_WEBSITE":
        scenario_guidelines = f"""
TARGET SCENARIO: The prospect ({company}) DOES NOT HAVE A WEBSITE.
GOAL: Pitch them a modern, fast, high-converting website FIRST, and then automated marketing systems.
REQUIRED PROPOSAL STRUCTURE:
1. WHAT THE PROBLEM IS: Detail how not having an online web presence loses them high-intent customers searching for {company}'s services on Google, how prospects question credibility without a dedicated domain, and how they miss automated bookings.
2. HOW I CAN SOLVE THEM: Explain that you will build a clean, mobile-responsive, lightning-fast website custom-designed for their niche, followed by automated lead capture and client nurturing systems.
3. WHY CHOOSE ME RATHER THAN OTHERS: Highlight direct hands-on execution (no bloated agency retainers or junior handoffs), 7-day delivery turnaround, conversion-focused layout rather than generic slow templates, and guaranteed satisfaction.
4. CALL TO ACTION: A soft, zero-pressure question (e.g., "Are you open to seeing a 2-minute video mockup of what your site could look like?").
"""
    elif strategy == "PHONE_ONLY":
        scenario_guidelines = f"""
TARGET SCENARIO: The prospect ({company}) ONLY HAS A PHONE NUMBER / NO DIRECT EMAIL.
GOAL: Create a direct WhatsApp / SMS outreach script pitching a Website + Social Media + Digital Marketing setup tailored to {company}.
REQUIRED STRUCTURE:
1. Warm, professional, non-spammy opening acknowledging their business.
2. The core problem: Competitors are dominating Google Search and local social media feeds while {company} is missing out on inbound calls and bookings.
3. The solution: Turnkey Website + Social Media profile setup + Local Digital Marketing to get steady inquiries.
4. Why choose me: Fast setup, proven local business results, seamless WhatsApp support.
5. Soft WhatsApp CTA: A quick invite for a 5-minute call or 2-minute preview demo.
Also provide a backup email subject and email body if they request an email pitch.
"""
    else:  # HAS_WEBSITE
        scenario_guidelines = f"""
TARGET SCENARIO: The prospect ({company}) ALREADY HAS A WEBSITE ({website}).
GOAL: Pitch website redesign, speed & conversion rate optimization (CRO), and automated marketing systems.
REQUIRED STRUCTURE:
1. WHAT THE PROBLEM IS: Most websites lose up to 70% of visitors due to slow mobile loading, outdated layouts, and lack of automated lead capture or follow-up systems.
2. HOW I CAN SOLVE THEM: Modernize their user interface, make it load instantly on phones, and integrate automated email/SMS lead nurturing to convert traffic into booked sales.
3. WHY CHOOSE ME RATHER THAN OTHERS: ROI-driven design focused on booked clients (not just aesthetics), transparent pricing, and fast implementation.
4. CALL TO ACTION: A casual invite to review a free 3-point conversion audit.
"""

    prompt = f"""You are an elite B2B sales copywriter and cold outreach consultant.
Write a highly compelling, personalized outreach proposal for the following business prospect:

PROSPECT CREDENTIALS:
- Company/Business Name: {company}
- Contact Person: {first_name}
- Email: {email or "None"}
- Phone: {phone or "None"}
- Website: {website or "None (No website detected)"}
- Sender Identity: {sender_name} ({agency_or_service})

{scenario_guidelines}

TONE GUIDELINES:
- Conversational, authoritative, respectful, and direct.
- No cheesy buzzwords (do NOT say "I hope this email finds you well", "synergy", or "rockstar").
- Sound like a human expert reaching out specifically to them, not an automated robot.

OUTPUT FORMAT:
Return a STRICT JSON object with these exact keys:
{{
  "strategy": "{strategy}",
  "subject": "Clear, curiosity-inducing cold email subject line under 7 words",
  "problem": "Concise summary of the specific business problem identified",
  "solution": "Concise summary of how you will solve it (website first + marketing systems)",
  "why_choose_me": "Clear 2-3 key differentiators for choosing you over other agencies",
  "email_body": "Full ready-to-send personalized cold email text with appropriate line breaks",
  "whatsapp_message": "Ready-to-send punchy WhatsApp/SMS script with emojis and clean line breaks"
}}
"""

    last_error = None
    for model_name in FALLBACK_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json"
            }
        }
        try:
            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    # Clean markdown codeblocks if returned
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    elif raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    
                    parsed = json.loads(raw_text.strip())
                    parsed["model_used"] = model_name
                    return parsed
                elif res.status_code in [429, 503, 404]:
                    last_error = f"Model {model_name} returned status {res.status_code}: {res.text}"
                    continue
                else:
                    res.raise_for_status()
        except Exception as e:
            last_error = f"Exception with {model_name}: {str(e)}"
            continue

    raise RuntimeError(f"Failed to generate pitch with Gemini API across all fallback models. Last error: {last_error}")

def generate_website_serp_pitch(
    website_title: str,
    website_url: str,
    snippet: str,
    purpose: str = "BACKLINK",
    search_query: str = "backlinks",
    company_name: Optional[str] = None,
    sender_name: str = "Expansio Team",
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Generates hyper-personalized outreach specifically tailored to a ranking SERP website."""
    api_key = get_gemini_api_key(custom_api_key)

    company = company_name or (website_url.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", ""))

    purpose_instructions = {
        "BACKLINK": f"Propose a contextual backlink or editorial addition to their coverage on '{website_title}'. Offer a high-value exchange or original insight tailored to their readers.",
        "COMPETITOR": f"Reach out as a complementary partner in the '{search_query}' niche for audience sharing and co-marketing.",
        "EDITORIAL": f"Pitch a guest contribution or expert article with original data that fits seamlessly into '{website_title}'.",
        "KEYWORD": f"Reach out acknowledging their high ranking for '{search_query}' and propose collaborative content.",
        "MARKETING": f"Propose performance digital marketing, website optimization, and automated conversion systems."
    }.get(purpose.upper(), f"Propose a valuable partnership in the '{search_query}' niche.")

    prompt = f"""You are an elite outreach strategist writing a 1-to-1 cold outreach email to the webmaster/editor of a top-ranking website.

TARGET WEBSITE DETAILS:
- Title: {website_title}
- URL: {website_url}
- Snippet: {snippet}
- Discovered via Query: "{search_query}"
- Outreach Purpose: {purpose} ({purpose_instructions})
- Prospect Domain / Brand: {company}
- Sender Name: {sender_name}

STRICT WRITING RULES:
1. Avoid generic templates. Specifically reference the topic of their article/page ('{website_title}').
2. Keep it punchy, respectful, and concise (under 130 words).
3. Follow the 3-part framework:
   - Genuine observation of their specific content and why it stood out
   - The collaboration proposal ({purpose_instructions}) with clear value to their readers
   - Low-friction call to action (e.g., 'Open to exploring?' or 'Mind if I send 2 quick topic ideas?')
4. Use standard markdown formatting (double newlines between paragraphs, bold for sender name **{sender_name}**, bullet points for proposals if multiple).
5. Output ONLY valid JSON adhering to the schema below.

JSON SCHEMA:
{{
  "subject": "Curiosity-sparking subject line specifically mentioning {company} or their article topic (under 7 words)",
  "hook": "Specific reference to their article or website content",
  "proposal": "What you are proposing (contextual link / guest insight / partnership)",
  "email_body": "Full ready-to-send formatted email text with double newlines between paragraphs"
}}
"""

    last_error = None
    for model_name in FALLBACK_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json"
            }
        }
        try:
            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    elif raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    parsed = json.loads(raw_text.strip())
                    parsed["model_used"] = model_name
                    return parsed
                elif res.status_code in [429, 503, 404]:
                    last_error = f"Model {model_name} returned status {res.status_code}: {res.text}"
                    continue
                else:
                    res.raise_for_status()
        except Exception as e:
            last_error = f"Exception with {model_name}: {str(e)}"
            continue

    raise RuntimeError(f"Failed to generate SERP pitch with Gemini API: {last_error}")

def generate_reply_draft(
    lead_name: str,
    company: str,
    original_pitch: str,
    prospect_reply: str,
    sender_name: str = "Expansio Team",
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an intelligent context-aware reply to an interested prospect response."""
    api_key = get_gemini_api_key(custom_api_key)

    prompt = f"""You are a professional outreach manager replying to a prospect who responded to our cold outreach.

CONVERSATION CONTEXT:
- Prospect Name: {lead_name}
- Company: {company}
- Our Original Email:
\"\"\"{original_pitch}\"\"\"

- Prospect's Reply:
\"\"\"{prospect_reply}\"\"\"

- Sender Name: {sender_name}

INSTRUCTIONS:
1. Craft a warm, conversational, and helpful response addressing whatever the prospect asked (e.g., pricing, guidelines, timeline, link insertion, sample topics).
2. If they are interested: propose a clear next step (e.g., sharing a link/draft or scheduling a quick 5-min sync).
3. If they asked questions or have requirements: acknowledge them directly and offer solutions.
4. Keep the tone friendly, professional, and succinct.
5. Output ONLY valid JSON adhering to the schema below.

JSON SCHEMA:
{{
  "reply_subject": "Re: subject line",
  "reply_body": "Full ready-to-send reply draft with clean paragraphs and signoff",
  "sentiment": "INTERESTED | QUESTIONS | NEGOTIATING | NOT_INTERESTED",
  "recommended_action": "Short action note for user (e.g., 'Send topic samples' or 'Confirm pricing')"
}}
"""

    last_error = None
    for model_name in FALLBACK_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json"
            }
        }
        try:
            with httpx.Client(timeout=25.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    elif raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    parsed = json.loads(raw_text.strip())
                    parsed["model_used"] = model_name
                    return parsed
                elif res.status_code in [429, 503, 404]:
                    last_error = f"Model {model_name} returned status {res.status_code}: {res.text}"
                    continue
                else:
                    res.raise_for_status()
        except Exception as e:
            last_error = f"Exception with {model_name}: {str(e)}"
            continue

    raise RuntimeError(f"Failed to generate reply draft with Gemini API: {last_error}")
