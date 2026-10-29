# OutreachBot Engine

A standalone Python FastAPI microservice that powers the OutreachBot SaaS feature for [Expansio](https://expansio.in). The Next.js platform calls this service via HTTP API for web scraping, email filtering, and SMTP operations.

## What This Service Does

| Module | Endpoint | Description |
|--------|----------|-------------|
| Scraper | `POST /scraper/crawl` | Async BFS web crawler — extracts emails from a site up to a configurable depth (max 50 pages) |
| Filter | `POST /filter/validate` | Validates emails for syntax, MX records, disposable domains, and role-based prefixes; returns a spam score (0–1) for each |
| SMTP | `POST /smtp/test` | Tests SMTP credentials (async) |
| SMTP | `POST /smtp/send` | Sends a single HTML/plain-text email via provided SMTP credentials with optional unsubscribe header |
| Health | `GET /health` | Liveness check |

## Setup

### Prerequisites
- Python 3.11+
- Windows PowerShell (or adapt commands for Linux/macOS)

### Install

```powershell
# 1. Clone / navigate to this directory
cd c:\Users\ruhul\Desktop\web\expansio\outreachbot-py

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
.\venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy and configure environment variables
Copy-Item .env.example .env
# Edit .env with your values
```

### Configure `.env`

| Variable | Description |
|----------|-------------|
| `MASTER_ENCRYPTION_SECRET` | Long random secret (≥32 chars) used to derive per-user Fernet keys for SMTP password encryption |
| `API_SECRET_KEY` | Shared secret — the Next.js backend must send this as a header to authenticate requests |
| `PORT` | Port to listen on (default `8001`) |

### Run

```powershell
.\start.ps1
```

Or manually:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### `GET /health`
Returns `{ "status": "ok", "service": "outreachbot-engine" }`.

---

### `POST /scraper/crawl`
Crawls a website and extracts unique email addresses.

**Request**
```json
{
  "url": "https://example.com",
  "depth": 2,
  "job_id": "job_abc123"
}
```

**Response**
```json
{
  "emails": ["founder@example.com", "hello@example.com"],
  "pages_visited": 12,
  "job_id": "job_abc123"
}
```

---

### `POST /filter/validate`
Validates and scores a list of emails.

**Request**
```json
{
  "emails": ["user@example.com", "fake@mailinator.com"]
}
```

**Response**
```json
{
  "results": [
    {
      "email": "user@example.com",
      "is_valid_syntax": true,
      "has_mx_record": true,
      "is_disposable": false,
      "is_role_based": false,
      "spam_score": 0.0,
      "should_include": true
    }
  ],
  "total": 2,
  "clean": 1,
  "filtered_out": 1
}
```

---

### `POST /smtp/test`
Tests SMTP credentials without sending an email.

**Request**
```json
{
  "credentials": {
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "you@gmail.com",
    "password": "app-password",
    "from_email": "you@gmail.com",
    "from_name": "Your Name"
  }
}
```

---

### `POST /smtp/send`
Sends an email. Automatically appends an unsubscribe footer if `unsubscribe_url` is provided.

**Request**
```json
{
  "credentials": { ... },
  "to_email": "prospect@company.com",
  "to_name": "Jane Doe",
  "subject": "Quick intro",
  "html_body": "<p>Hi Jane...</p>",
  "text_body": "Hi Jane...",
  "unsubscribe_url": "https://expansio.in/unsubscribe?token=xyz"
}
```

## Architecture Notes

- **Encryption**: `core/encryption.py` uses HKDF (SHA-256) to derive a unique Fernet key per user from the `MASTER_ENCRYPTION_SECRET` + `user_id`. The Next.js backend stores encrypted SMTP passwords and decrypts them before forwarding to this service.
- **Rate limiting**: The scraper waits 0.5 s between page requests and caps at 50 pages per crawl.
- **DNS caching**: MX lookups in the filter module are cached per domain within a single request to avoid redundant DNS queries.
