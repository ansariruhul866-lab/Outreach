import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    plan = Column(String, default="free")  # free | pro | agency
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    senders = relationship("SenderEmail", back_populates="user", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete-orphan")
    scrape_jobs = relationship("ScrapeJob", back_populates="user", cascade="all, delete-orphan")

class SenderEmail(Base):
    __tablename__ = "sender_emails"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    email = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    provider = Column(String, default="GMAIL")  # GMAIL | OUTLOOK | CUSTOM
    smtp_host = Column(String, default="smtp.gmail.com")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, nullable=False)
    smtp_password_enc = Column(Text, nullable=False)
    status = Column(String, default="PENDING")  # PENDING | VERIFIED | FAILED
    verify_token = Column(String, unique=True, nullable=True)
    daily_limit = Column(Integer, default=100)
    sent_today = Column(Integer, default=0)
    last_tested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="senders")
    campaigns = relationship("Campaign", back_populates="sender")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True, index=True)
    email = Column(String, nullable=False, index=True)
    first_name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    website = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    spam_score = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=True)
    is_unsubscribed = Column(Boolean, default=False)
    unsub_token = Column(String, unique=True, nullable=True, default=gen_uuid)
    status = Column(String, default="PENDING")  # PENDING | SENT | OPENED | REPLIED | FAILED
    tracking_id = Column(String, unique=True, nullable=True, default=gen_uuid)
    sent_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="leads")
    campaign = relationship("Campaign", back_populates="leads")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    sender_email_id = Column(String, ForeignKey("sender_emails.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, default="BACKLINK")  # BACKLINK | SERVICE_PITCH | PARTNERSHIP | CUSTOM
    status = Column(String, default="DRAFT")    # DRAFT | RUNNING | COMPLETED | PAUSED
    subject_template = Column(String, nullable=False)
    body_template = Column(Text, nullable=False)
    daily_limit = Column(Integer, default=50)
    send_delay_seconds = Column(Integer, default=60)
    total_sent = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_replied = Column(Integer, default=0)
    send_only_once = Column(Boolean, default=True)
    total_skipped = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="campaigns")
    sender = relationship("SenderEmail", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign")

class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    target_url = Column(String, nullable=False)
    depth = Column(Integer, default=2)
    status = Column(String, default="PENDING")  # PENDING | RUNNING | COMPLETED | FAILED
    pages_visited = Column(Integer, default=0)
    emails_found = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scrape_jobs")
