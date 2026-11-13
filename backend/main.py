import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import logging
from dotenv import load_dotenv

# Ensure backend directory is in sys.path regardless of where uvicorn is launched from
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("outreachbot")

# Init DB models & imports
from core.database import engine, Base, run_migrations
import core.models  # Ensure all SQLAlchemy models are registered

# Routers
from api.auth import router as auth_router
from api.senders import router as senders_router
from api.scraper import router as scraper_router
from api.leads import router as leads_router
from api.campaigns import router as campaigns_router
from api.tracking import router as tracking_router
from api.stats import router as stats_router
from api.folders import router as folders_router
from api.templates import router as templates_router
from api.whatsapp import router as whatsapp_router
from api.discovery import router as discovery_router

app = FastAPI(title="OutreachBot SaaS Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(auth_router, include_in_schema=False)
app.include_router(senders_router, prefix="/api")
app.include_router(scraper_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(tracking_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(discovery_router, prefix="/api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Global exception on {request.method} {request.url.path}: {exc}\n{tb}")
    origin = request.headers.get("origin") or "http://localhost:3000"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.on_event("startup")
def startup_event():
    try:
        import core.models
        Base.metadata.create_all(bind=engine)
        run_migrations()
        logger.info("Database schema initialized and verified.")
    except Exception as e:
        logger.error(f"Error during database schema startup: {e}")

    # Reset any orphaned RUNNING campaigns from previous crashes or reboots to PAUSED
    try:
        from core.database import SessionLocal
        from core.models import Campaign
        db = SessionLocal()
        orphaned = db.query(Campaign).filter(Campaign.status == "RUNNING").all()
        for c in orphaned:
            c.status = "PAUSED"
        db.commit()
        db.close()
        if orphaned:
            logger.info(f"Reset {len(orphaned)} orphaned RUNNING campaign(s) to PAUSED.")
    except Exception as e:
        logger.warning(f"Error resetting orphaned campaigns on startup: {e}")

@app.get("/api/test-smtp")
def test_smtp_connectivity():
    import socket
    results = {}
    for host, port in [
        ("smtp.gmail.com", 587),
        ("smtp.gmail.com", 465),
        ("smtp-mail.outlook.com", 587),
        ("smtp.mail.me.com", 587)
    ]:
        try:
            s = socket.create_connection((host, port), timeout=4)
            s.close()
            results[f"{host}:{port}"] = "CONNECTED"
        except Exception as e:
            results[f"{host}:{port}"] = f"FAILED: {e}"
    return results

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "platform": "OutRank AI", "version": "2.1.0"}

@app.get("/api/debug-status")
def debug_status():
    from core.database import DATABASE_URL, DB_PATH
    import os
    return {
        "status": "online",
        "database_type": "postgresql" if "postgres" in str(DATABASE_URL) else "sqlite",
        "database_url_masked": str(DATABASE_URL).split("@")[-1] if "@" in str(DATABASE_URL) else str(DATABASE_URL)[:35],
        "db_exists": os.path.exists(DB_PATH) if DB_PATH else None,
        "cwd": os.getcwd()
    }

@app.get("/api/debug-serp")
def debug_serp(q: str = "custom clothing store"):
    import urllib.request, urllib.parse, json

    diag = {}

    # 1. Google Autocomplete / Suggest
    try:
        url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={urllib.parse.quote_plus(q)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            diag["google_suggest"] = json.loads(r.read().decode())
    except Exception as e:
        diag["google_suggest"] = str(e)

    # 2. Wikipedia Opensearch
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote_plus(q)}&limit=5&namespace=0&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "OutRankBot/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            diag["wikipedia"] = json.loads(r.read().decode())
    except Exception as e:
        diag["wikipedia"] = str(e)

    # 3. Mojeek or other open engines
    try:
        url = f"https://www.mojeek.com/search?q={urllib.parse.quote_plus(q)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            content = r.read().decode("utf-8", errors="ignore")
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, "html.parser")
            titles = [a.get_text(strip=True)[:60] for a in soup.select("a.title")]
            diag["mojeek"] = {"status": r.status, "len": len(content), "titles": titles[:6]}
    except Exception as e:
        diag["mojeek"] = str(e)

    return diag

# Mount static frontend
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/app.html")
def app_alias(verified: str = None):
    url = "/static/app.html"
    if verified:
        url += f"?verified={verified}"
    return RedirectResponse(url=url)

@app.get("/index.html")
def index_alias():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
