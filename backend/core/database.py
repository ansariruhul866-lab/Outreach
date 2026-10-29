import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "outreachbot.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def run_migrations():
    import sqlite3
    if "sqlite" in DATABASE_URL and os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cols = [c[1] for c in cur.execute("PRAGMA table_info(campaigns)").fetchall()]
            if cols:
                if "send_only_once" not in cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN send_only_once BOOLEAN DEFAULT 1")
                if "total_skipped" not in cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN total_skipped INTEGER DEFAULT 0")
                conn.commit()
            conn.close()
        except Exception:
            pass

run_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
