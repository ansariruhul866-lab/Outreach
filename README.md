# ⚡ OutreachBot — Cold Outreach & Bulk Email Scraper SaaS Platform

A modern, multi-tenant software platform designed to bulk scrape target websites, extract verified email addresses, bypass Cloudflare bot protections, filter spam, and execute cold email campaigns with human-like anti-spam pacing directly from your own verified mailboxes.

---

## 🌟 Key Features

### 1. 🌐 Bulk Multi-Site Web Scraper
- **Parallel Multi-Website Crawling**: Enter 10–20+ URLs at once to extract prospect leads simultaneously.
- **Cloudflare Bypass (`curl_cffi`)**: Uses browser TLS fingerprint impersonation (Chrome 120/124 JA3/HTTP2) to bypass Cloudflare, Akamai, and bot protection walls on sites like ProductHunt, TrustRadius, etc.
- **Smart Contact Discovery**: Automatically prioritizes high-yield contact endpoints (`/contact`, `/about`, `/team`, `/press`, `/company`, `/imprint`).
- **Sanitized Extraction**: Cleans Sentry error logs, tracking hash hashes, asset URLs, and noise from extracted contacts.

### 2. 🛡️ 7-Layer Prospect Quality & Spam Filter
- **RFC 5322 Syntax Checking**: Catches formatting issues and typos.
- **Live DNS MX Resolution**: Verifies active mail server records for every recipient domain.
- **Disposable Email Blacklist**: Filters throwaway domains (Mailinator, TempMail, GuerrillaMail).
- **Send Only Once Deduplication**: Safeguards against contacting the same prospect more than once across your entire workspace, protecting domain health.

### 3. ⏱️ Anti-Spam Sending Engine & Randomized Delay
- **Randomized Jitter**: Adds a random **0–120 second jitter** after every single email sent:
  $$\text{Actual Delay} = \max(5, \text{Base Delay}) + \text{random}(0, 120)\text{ seconds}$$
- **Human-Paced Sending**: Evades Google Workspace and Microsoft 365 mechanical pattern detection.
- **1-Second Tick Responsiveness**: Sleep delay responds immediately when pausing or stopping a campaign.

### 4. 🎛️ Complete Campaign Lifecycle Controls
- **Selective Prospect Assignment**: Choose target leads using a searchable checklist with **Select All**, **Unassigned Only**, and quick filters.
- **Real-Time Campaign Controls**:
  - **▶ Start / Continue**: Launch or resume sending right where it left off.
  - **⏸ Pause / Stop**: Gracefully halt active background sending at any second.
  - **✏️ Edit Campaign**: Update templates, delays, limits, and prospect selections on the fly.
  - **🗑️ Delete Campaign**: Delete campaigns safely with zero loss of prospects (leads are unassigned).
- **Live Status Monitoring**: Real-time polling with animated indicators (`RUNNING`, `PAUSED`, `COMPLETED`, `DRAFT`).

### 5. 📬 Sender Mailbox Integration
- Connect any **Gmail** or **Google Workspace** mailbox using a 16-character Google App Password.
- Support for **Outlook**, **Office 365**, and **Custom SMTP**.
- Automated test email verification flow to confirm sender ownership before campaign activation.
- Credentials stored with AES/Fernet encryption at rest.

### 6. 📊 Tracking & Analytics
- Embedded 1x1 invisible open-tracking pixel.
- Automated CAN-SPAM and GDPR compliant 1-click unsubscribe links (`/api/track/unsubscribe`).
- Full CSV Export for scraped websites, filtered results, and cold lead lists.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ installed
- Git

### 1. Clone & Setup
```bash
git clone https://github.com/ansariruhul866-lab/Outreach.git
cd Outreach
```

### 2. Windows 1-Click Launch
Double-click `run.bat` or run:
```powershell
.\run.bat
```

### 3. Manual Installation
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Open your browser at **[http://localhost:8000](http://localhost:8000)**.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn, SQLAlchemy
- **Scraper Engine**: `curl_cffi` (TLS Browser Impersonation), `httpx`, `BeautifulSoup4`, `lxml`
- **Mail Delivery**: `aiosmtplib` (Async SMTP)
- **Email Validation**: `email-validator`, `dnspython`
- **Security**: `cryptography` (Fernet AES), `bcrypt`, `PyJWT`
- **Frontend**: Tailwind CSS, Vanilla JavaScript (Zero build step, instant load)
- **Database**: SQLite (Zero configuration, easily swappable to PostgreSQL)

---

## 📄 License
MIT License.
