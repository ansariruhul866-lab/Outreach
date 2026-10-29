import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url:
    if raw_db_url.startswith("postgres://"):
        DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_db_url
    DB_PATH = None
else:
    # Reliable local SQLite directory with fallback
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_DIR = os.path.join(base_dir, "data")
    try:
        os.makedirs(DB_DIR, exist_ok=True)
        test_file = os.path.join(DB_DIR, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception:
        DB_DIR = os.path.join(os.getcwd(), "data")
        os.makedirs(DB_DIR, exist_ok=True)

    DB_PATH = os.path.join(DB_DIR, "outreachbot.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"

engine_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=engine_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def run_migrations():
    import sqlite3
    if "sqlite" in DATABASE_URL and DB_PATH and os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            
            # Campaigns migrations
            cols = [c[1] for c in cur.execute("PRAGMA table_info(campaigns)").fetchall()]
            if cols:
                if "send_only_once" not in cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN send_only_once BOOLEAN DEFAULT 1")
                if "total_skipped" not in cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN total_skipped INTEGER DEFAULT 0")
                conn.commit()

            # Users migrations for Firebase Auth
            user_cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
            if user_cols:
                if "firebase_uid" not in user_cols:
                    cur.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT")
                if "is_email_verified" not in user_cols:
                    cur.execute("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0")
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
