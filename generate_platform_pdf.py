import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

PDF_PATHS = [
    os.path.abspath(r"c:\Users\ruhul\Desktop\web\outreachbot\OutRank_AI_Platform_Guide.pdf"),
    os.path.abspath(r"c:\Users\ruhul\Desktop\web\outreachbot\frontend\public\OutRank_AI_Platform_Guide.pdf"),
    os.path.abspath(r"C:\Users\ruhul\.gemini\antigravity\brain\a3e258d7-b4c5-4cdb-8e63-8cd3e6748acd\OutRank_AI_Platform_Guide.pdf"),
]

# Ensure output directories exist
for p in PDF_PATHS:
    os.makedirs(os.path.dirname(p), exist_ok=True)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Don't draw header/footer on cover if first page
        if self._pageNumber > 1:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#7E22CE"))
            self.drawString(54, letter[1] - 36, "OUTRANK AI")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(115, letter[1] - 36, "•  Autonomous SERP Intelligence & Multi-Channel Outreach OS")
            
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Running Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 46, letter[0] - 54, 46)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 32, "Confidential & Proprietary • OutRank AI System Architecture Guide")
        
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_text)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#581C87")     # Deep Indigo Purple
    SECONDARY = colors.HexColor("#7E22CE")   # Vibrant Purple
    ACCENT = colors.HexColor("#A855F7")      # Bright Fuchsia Purple
    TEXT_DARK = colors.HexColor("#0F172A")   # Slate 900
    TEXT_MUTED = colors.HexColor("#475569")  # Slate 600
    BG_LIGHT = colors.HexColor("#FAF5FF")    # Soft Violet Tint
    BORDER_COLOR = colors.HexColor("#E9D5FF")

    # Typography Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=PRIMARY,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=TEXT_MUTED,
        spaceAfter=18,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=TEXT_DARK,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        textColor=PRIMARY,
    )

    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    story = []

    # -------------------------------------------------------------
    # 1. HEADER / TITLE BLOCK
    # -------------------------------------------------------------
    badge_table = Table(
        [[Paragraph("<b>PLATFORM SPECIFICATION &amp; USER MANUAL</b>", badge_style)]],
        colWidths=[240],
    )
    badge_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SECONDARY),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(badge_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("OutRank AI: The Autonomous Growth OS", title_style))
    story.append(Paragraph("Comprehensive Guide • Architecture, Capabilities &amp; How It Works", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=SECONDARY, spaceBefore=0, spaceAfter=14))

    # -------------------------------------------------------------
    # 2. EXECUTIVE SUMMARY & WHAT IS OUTRANK AI
    # -------------------------------------------------------------
    story.append(Paragraph("1. Executive Summary &amp; Platform Mission", h1_style))
    story.append(Paragraph(
        "<b>OutRank AI</b> (formerly known as OutreachBot Pro) is an all-in-one autonomous Search Engine "
        "Intelligence, Content Synthesis, and Multi-Channel Cold Outreach Platform. It combines live regional SERP crawling, "
        "automated competitor deconstruction, fluff-free AI copywriting with JSON-LD schema generation, and verified "
        "multi-channel email and WhatsApp dispatch into a single unified workspace.",
        body_style
    ))
    story.append(Paragraph(
        "Traditional outreach and SEO workflows require marketing teams to purchase and juggle 4 to 5 separate tools: "
        "Ahrefs/Semrush for keyword intelligence, Jasper/SurferSEO for blog outlines, Hunter/Apollo for email discovery, "
        "and Instantly/Lemlist for email warm-up and sending. OutRank AI unifies all five phases into an automated "
        "zero-friction pipeline.",
        body_style
    ))

    # Comparison Table
    story.append(Spacer(1, 6))
    comp_data = [
        ["Capability", "Fragmented Tool Stack ($500+/mo)", "OutRank AI OS (Unified)"],
        ["SERP Competitor Discovery", "Ahrefs / Semrush ($199/mo)", "Built-in Live SERP Crawler + UGC noise filter"],
        ["Content & Schema Drafting", "Jasper / SurferSEO ($89/mo)", "100% Humanized Blog Drafter + JSON-LD Schema"],
        ["Keyword Gap Planning", "Mangools / Moz ($99/mo)", "Top 5 Overlap Matrix + Opportunity Scoring (CSV)"],
        ["Email Extraction & MX Check", "Hunter.io / Apollo ($99/mo)", "Deep 4-Level Scraper + DNS MX Verification"],
        ["Cold Email & WhatsApp Send", "Instantly / Lemlist ($99/mo)", "Google Gmail REST API (Port 443) + WhatsApp Direct"],
        ["Follow-Up Automation", "Complex Zapier automations", "Built-in 2-Day Follow-Up & AI Reply Drafter"],
    ]
    comp_table = Table(comp_data, colWidths=[130, 185, 189])
    comp_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FAF5FF")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_DARK),
        ])
    )
    story.append(comp_table)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # 3. HOW THE PLATFORM WORKS (STEP-BY-STEP WORKFLOW)
    # -------------------------------------------------------------
    story.append(Paragraph("2. How It Works: The 4-Stage Autonomous Pipeline", h1_style))
    story.append(Paragraph(
        "The system operates on an automated four-stage pipeline designed to turn raw search queries into verified inbound deals:",
        body_style
    ))

    stages = [
        ("STAGE 1: Search & Regional Intent Formulation",
         "The user enters any target query or industry niche (e.g., 'best custom clothing store', 'backlink for marketing website'). "
         "The system selects the target region (India, US, UK, or Global) and intent category (Backlink, Competitor, Editorial, Keyword, or Marketing)."),
        ("STAGE 2: Multi-Engine Regional SERP Crawling & Noise Filtering",
         "OutRank AI queries live regional search engines. It runs an aggressive UGC noise filter that automatically purges forum "
         "threads, Reddit (/r/), Quora, Pinterest, and YouTube, isolating only authentic ranking business websites and editorial publications."),
        ("STAGE 3: Deep Reverse-Engineering & Content/Email Extraction",
         "Depending on the selected mode, OutRank AI deconstructs the ranking websites: extracting H1/H2 heading hierarchies, word counts, "
         "schema markups, keywords, and crawling subpages up to 4 levels deep to find verified executive emails and telephone numbers."),
        ("STAGE 4: 1-Click Multi-Channel Outreach & 2-Day Follow-Up",
         "Extracted prospects are organized into structured date-and-purpose folders. Campaigns are dispatched directly through Google's "
         "Gmail REST API or WhatsApp Direct with 0-120s anti-spam jitter delays. If a prospect doesn't reply within 2 days, a follow-up is automatically scheduled."),
    ]

    for title, desc in stages:
        story.append(Paragraph(f"<b>• {title}</b>", h2_style))
        story.append(Paragraph(desc, body_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 4. THE 5 INTENT-DRIVEN OPERATING SUITES
    # -------------------------------------------------------------
    story.append(Paragraph("3. The 5 Core Intent Suites", h1_style))
    story.append(Paragraph(
        "Unlike generic crawlers that treat all queries identically, OutRank AI dynamically switches its entire action suite "
        "based on the user's strategic intent:",
        body_style
    ))

    suites_data = [
        ["Intent Mode", "Target Goal", "Autonomous Platform Action"],
        ["Backlink Outreach", "Guest posting & link building", "Extracts editor/founder emails from ranking sites, creates dated folder, configures 2-day follow-up nudge."],
        ["Competitor Analysis", "Market gap discovery & rivals", "Filters UGC noise, audits competitor business models, exposes weaknesses, and generates counter-strategy."],
        ["Blog & Editorial", "Ranking article generation", "Reverse-engineers top competitor outlines, synthesizes H1-H3 structure, and drafts humanized blog + JSON-LD schema."],
        ["Keyword Research", "SERP opportunity matrix", "Crawls top 5 sites, isolates core overlapping keywords and high-opportunity low-competition keywords (CSV export)."],
        ["Digital Marketing", "B2B client acquisition", "Finds local businesses and agencies, analyzing performance gaps (site speed, mobile CRO) for pitch proposals."],
    ]
    suite_table = Table(suites_data, colWidths=[110, 140, 254])
    suite_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF5FF")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_DARK),
        ])
    )
    story.append(suite_table)
    story.append(Spacer(1, 14))

    # Page Break for Technical Architecture & Deliverability
    story.append(PageBreak())

    # -------------------------------------------------------------
    # 5. DELIVERABILITY & MULTI-CHANNEL ENGINE
    # -------------------------------------------------------------
    story.append(Paragraph("4. Cold Outreach &amp; High-Deliverability Engine", h1_style))
    story.append(Paragraph(
        "Cold email failure is primarily caused by poor list hygiene, missing DNS records, and firewall port blocks. OutRank AI "
        "implements enterprise-grade deliverability safeguards:",
        body_style
    ))

    story.append(Paragraph("<b>• Google Gmail REST API (Port 443 HTTPS):</b>", h2_style))
    story.append(Paragraph(
        "Instead of brittle SMTP connections over port 587 or 465 (frequently blocked by cloud firewalls and residential ISPs), "
        "OutRank AI connects directly to Google Workspace using OAuth 2.0 REST endpoints over HTTPS port 443, ensuring zero connection timeouts.",
        body_style
    ))

    story.append(Paragraph("<b>• 7-Layer DNS MX &amp; Disposable Filter:</b>", h2_style))
    story.append(Paragraph(
        "Before any email is assigned to a campaign, the system performs live DNS queries for valid Mail Exchange (MX) records "
        "and strips disposable domains (Mailinator, GuerrillaMail, TempMail). This keeps bounce rates below 1.5%.",
        body_style
    ))

    story.append(Paragraph("<b>• Human Anti-Spam Jitter Delays (0 - 120s):</b>", h2_style))
    story.append(Paragraph(
        "OutRank AI enforces configurable base delays with randomized human-like jitter delays (+0 to +120 seconds) between "
        "consecutive message dispatches, avoiding algorithmic spam-filter pattern detection.",
        body_style
    ))

    story.append(Paragraph("<b>• WhatsApp Direct Outreach:</b>", h2_style))
    story.append(Paragraph(
        "For prospects with extracted mobile numbers, OutRank AI provides instant 1-click WhatsApp web/desktop dispatch with "
        "pre-filled contextual messages, enabling multi-channel follow-ups beyond the email inbox.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 6. TECHNICAL ARCHITECTURE & STACK
    # -------------------------------------------------------------
    story.append(Paragraph("5. Technical Architecture &amp; System Stack", h1_style))
    story.append(Paragraph(
        "OutRank AI is built on a modern, decoupled client-server architecture designed for high concurrency and sub-second response times:",
        body_style
    ))

    tech_data = [
        ["Layer", "Technology", "Role &amp; Performance Profile"],
        ["Frontend UI", "Next.js 16 (App Router) + Turbopack", "React 19, TailwindCSS, Framer Motion, Lucide icons, luxury black & purple glassmorphism."],
        ["Backend API", "FastAPI (Python 3.14 / Uvicorn)", "Asynchronous endpoints, BackgroundTasks campaign dispatcher, CORS middleware, JWT auth."],
        ["AI Synthesis", "Google Gemini Flash Lite", "Generates humanized blogs, competitor market gap audits, and 1-to-1 personalized pitches in ~1.5s."],
        ["Web Crawler", "BeautifulSoup4 + Urllib Regional", "DuckDuckGo Regional, Bing Regional, deep regex scraper with 4-level domain traversal."],
        ["Storage / DB", "SQLAlchemy + SQLite / PostgreSQL", "Stores users, leads, folders, templates, campaigns, mailboxes, and tracking events."],
        ["Deliverability", "DNS Resolver + Gmail API REST", "Automated MX validation, spam scoring, OAuth 2.0 token refresh, open pixel tracking."],
    ]
    tech_table = Table(tech_data, colWidths=[90, 160, 254])
    tech_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF5FF")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_DARK),
        ])
    )
    story.append(tech_table)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 7. USER ACTION CHECKLIST: HOW TO RUN A CAMPAIGN
    # -------------------------------------------------------------
    story.append(Paragraph("6. Quick-Start User Journey", h1_style))
    story.append(Paragraph(
        "Follow these 5 steps to launch your first end-to-end campaign in under 3 minutes:",
        body_style
    ))

    steps = [
        ("Step 1: Connect Sending Mailbox", "Navigate to <b>Mailboxes</b> and click <i>Connect Gmail</i>. Sign in to grant official Google API sending access."),
        ("Step 2: Enter Keyword &amp; Select Intent", "Go to <b>SERP Discovery</b> (or the homepage search bar). Enter your keyword (e.g. 'best custom clothing store') and select your intent."),
        ("Step 3: Review Ranking Competitors", "Inspect the top 20 rankings. Check competitor heading outlines, word counts, and detected schemas. Reddit and UGC noise are already filtered."),
        ("Step 4: Execute Intent Action", "Click <b>Generate Keyword Plan</b> for ranking opportunities, <b>Launch Blog Drafter</b> for a humanized article, or <b>Extract Emails &amp; Save to Folder</b>."),
        ("Step 5: Launch &amp; Monitor", "Select your connected mailbox and enable the <b>2-Day Follow-Up</b> checkbox. Click <i>Extract &amp; Launch Backlink Campaign</i>. Track opens and replies live on the Overview dashboard."),
    ]

    for title, desc in steps:
        story.append(Paragraph(f"<b>{title}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 14))

    # Final Summary Callout Box
    callout_data = [[
        Paragraph(
            "<b>OutRank AI Platform Guarantee:</b> By combining live SERP intelligence with automated cold outreach, "
            "users achieve up to 4x higher response rates than generic email scraping tools, while saving $500+/month "
            "on third-party software subscriptions.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3E8FF")),
            ("BOX", (0, 0), (-1, -1), 1, SECONDARY),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(callout_table)

    # Build the document with our custom two-pass NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated: {filename}")

if __name__ == "__main__":
    for path in PDF_PATHS:
        build_pdf(path)
    print("All PDFs successfully built!")
