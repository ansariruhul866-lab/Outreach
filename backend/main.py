import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("outreachbot")

# Init DB models
from core.database import engine, Base, run_migrations
import core.models  # Ensure all SQLAlchemy models are registered
Base.metadata.create_all(bind=engine)
run_migrations()

# Routers
from api.auth import router as auth_router
from api.senders import router as senders_router
from api.scraper import router as scraper_router
from api.leads import router as leads_router
from api.campaigns import router as campaigns_router
from api.tracking import router as tracking_router
from api.stats import router as stats_router

app = FastAPI(title="OutreachBot SaaS Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(senders_router, prefix="/api")
app.include_router(scraper_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(tracking_router, prefix="/api")
app.include_router(stats_router, prefix="/api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Global exception on {request.method} {request.url.path}: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb}
    )

@app.on_event("startup")
def startup_event():
    import core.models
    Base.metadata.create_all(bind=engine)
    run_migrations()
    logger.info("Database schema initialized and verified.")

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
def health():
    return {"status": "ok", "platform": "OutreachBot Standalone SaaS"}

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
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
