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
    if "sqlite" in DATABASE_URL and DB_PATH and os.path.exists(DB_PATH):
        import sqlite3
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            
            # campaigns columns
            c_cols = [c[1] for c in cur.execute("PRAGMA table_info(campaigns)").fetchall()]
            if c_cols:
                if "send_only_once" not in c_cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN send_only_once BOOLEAN DEFAULT 1")
                if "total_skipped" not in c_cols:
                    cur.execute("ALTER TABLE campaigns ADD COLUMN total_skipped INTEGER DEFAULT 0")

            # sender_emails columns
            s_cols = [c[1] for c in cur.execute("PRAGMA table_info(sender_emails)").fetchall()]
            if s_cols:
                if "brevo_api_key_enc" not in s_cols:
                    cur.execute("ALTER TABLE sender_emails ADD COLUMN brevo_api_key_enc TEXT")
                if "resend_api_key_enc" not in s_cols:
                    cur.execute("ALTER TABLE sender_emails ADD COLUMN resend_api_key_enc TEXT")
                if "last_used_relay" not in s_cols:
                    cur.execute("ALTER TABLE sender_emails ADD COLUMN last_used_relay VARCHAR")

            # leads columns
            l_cols = [c[1] for c in cur.execute("PRAGMA table_info(leads)").fetchall()]
            if l_cols:
                if "delivery_provider" not in l_cols:
                    cur.execute("ALTER TABLE leads ADD COLUMN delivery_provider VARCHAR")

            conn.commit()
            conn.close()
        except Exception:
            pass
    elif "postgres" in DATABASE_URL:
        # PostgreSQL dynamic safe migration
        from sqlalchemy import text
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_only_once BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_skipped INTEGER DEFAULT 0;"))
                conn.execute(text("ALTER TABLE sender_emails ADD COLUMN IF NOT EXISTS brevo_api_key_enc TEXT;"))
                conn.execute(text("ALTER TABLE sender_emails ADD COLUMN IF NOT EXISTS resend_api_key_enc TEXT;"))
                conn.execute(text("ALTER TABLE sender_emails ADD COLUMN IF NOT EXISTS last_used_relay VARCHAR;"))
                conn.execute(text("ALTER TABLE sender_emails ALTER COLUMN smtp_user DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE sender_emails ALTER COLUMN smtp_password_enc DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS delivery_provider VARCHAR;"))
                conn.commit()
        except Exception:
            pass

run_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
