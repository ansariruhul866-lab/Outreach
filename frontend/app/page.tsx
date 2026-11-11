"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  Search,
  Globe,
  Link as LinkIcon,
  ShieldCheck,
  Send,
  Zap,
  ArrowRight,
  FileText,
  Target,
  Users,
  MessageSquare,
  TrendingUp,
  Flame,
  CheckCircle2,
} from "lucide-react";

const INTENTS = [
  {
    id: "BACKLINK",
    label: "Backlink Outreach",
    icon: LinkIcon,
    placeholder: "e.g. backlink for marketing website, guest post tech blog...",
    hint: "Finds high-authority ranking sites, extracts verified emails & queues cold pitch campaigns",
    defaultQuery: "backlink for marketing website",
  },
  {
    id: "COMPETITOR",
    label: "Competitor Analysis",
    icon: Flame,
    placeholder: "e.g. best custom clothing store, CRM software for startups...",
    hint: "Filters out Reddit noise to reveal actual ranking rivals, service gaps & counter-strategy",
    defaultQuery: "best custom clothing store",
  },
  {
    id: "EDITORIAL",
    label: "Blog & Editorial",
    icon: FileText,
    placeholder: "e.g. best productivity tools 2026, bespoke tailoring guide...",
    hint: "Reverse-engineers top ranking articles & drafts a 100% humanized blog with JSON-LD schema",
    defaultQuery: "bespoke tailoring guide for men",
  },
  {
    id: "KEYWORD",
    label: "Keyword Research",
    icon: Target,
    placeholder: "e.g. email marketing software, best running shoes...",
    hint: "Crawls top 5 ranking competitors to find core shared keywords and high-ranking-chance targets",
    defaultQuery: "cold email automation tools",
  },
  {
    id: "MARKETING",
    label: "Digital Marketing",
    icon: Users,
    placeholder: "e.g. dental clinic new york, boutique fashion store...",
    hint: "Identifies B2B prospects and crafts site audit & redesign proposals",
    defaultQuery: "custom apparel stores in India",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");

  // Interactive Search State
  const [selectedIntent, setSelectedIntent] = useState("BACKLINK");
  const [searchQuery, setSearchQuery] = useState("backlink for marketing website");

  const currentIntentObj = INTENTS.find((i) => i.id === selectedIntent) || INTENTS[0];

  const openAuth = (mode: "login" | "signup") => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleIntentChange = (id: string) => {
    setSelectedIntent(id);
    const found = INTENTS.find((i) => i.id === id);
    if (found) {
      setSearchQuery(found.defaultQuery);
    }
  };

  const handleLaunchSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const targetUrl = `/dashboard/discovery?q=${encodeURIComponent(searchQuery.trim())}&purpose=${selectedIntent}&auto=1`;

    if (user) {
      router.push(targetUrl);
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_search", targetUrl);
      }
      openAuth("signup");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090B12] text-[#F5F7FF] selection:bg-[#7857FF]/30 selection:text-[#F5F7FF] relative overflow-hidden">
      {/* Restrained Ambient Subtle Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] ambient-glow-purple-lg opacity-40 pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 right-10 w-80 h-80 ambient-glow-purple-accent opacity-25 pointer-events-none blur-3xl" />

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-24 text-center relative z-10">
        {/* Hero Title — Exactly 6 words matching official brand tagline */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="font-heading text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#F5F7FF] max-w-4xl mx-auto leading-[1.08]"
        >
          See the Opportunity.<br />
          <span className="bg-gradient-to-r from-[#7857FF] via-[#A78BFA] to-[#438BFF] bg-clip-text text-transparent">
            Own the Search.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 text-sm sm:text-base md:text-lg text-[#A3AEC2] max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Autonomous search engine intelligence and multi-channel outreach platform. Deconstruct ranking competitors, synthesize humanized SEO content with schema, and turn SERP visibility into pipeline revenue.
        </motion.p>

        {/* Interactive "What are you looking for today?" Search Console */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-10 max-w-3xl mx-auto rounded-2xl bg-[#141A29] border border-[#283149] p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)] text-left"
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <span className="text-xs font-semibold text-[#F5F7FF] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#7857FF]" />
              <span>What are you looking for today?</span>
            </span>
            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-[#1B2233] text-[#A78BFA] border border-[#283149]">
              Live Regional SERP
            </span>
          </div>

          {/* 5 Intent Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3.5">
            {INTENTS.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedIntent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleIntentChange(item.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-[#1B2233] border-[#7857FF] text-[#F5F7FF] shadow-sm"
                      : "bg-[#0E1220] border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#1B2233]/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mb-1 ${isSelected ? "text-[#7857FF]" : "text-[#727E96]"}`} />
                  <div className="text-[11px] font-medium truncate">{item.label}</div>
                </button>
              );
            })}
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleLaunchSearch} className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#727E96]" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentIntentObj.placeholder}
                className="w-full pl-10 pr-32 sm:pr-36 py-3 bg-[#0E1220] border border-[#283149] rounded-xl text-xs sm:text-sm text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <span>Crawl SERP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#727E96] pl-1">
              <strong className="text-[#A3AEC2] font-medium">Intent Insight:</strong> {currentIntentObj.hint}
            </p>
          </form>
        </motion.div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {user ? (
            <Link
              href="/dashboard/discovery"
              className="w-full sm:w-auto px-6 py-3 text-xs font-semibold bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Intelligence Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuth("signup")}
                className="w-full sm:w-auto px-6 py-3 text-xs font-semibold bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>Get Started Free &rarr;</span>
              </button>
              <button
                onClick={() => openAuth("login")}
                className="w-full sm:w-auto px-6 py-3 text-xs font-medium bg-[#141A29] hover:bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] rounded-lg transition-colors"
              >
                Sign In to Account
              </button>
            </>
          )}
        </motion.div>

        {/* Analytical Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
        >
          <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149] text-left">
            <p className="font-heading font-bold text-2xl sm:text-3xl text-[#F5F7FF]">Top 20</p>
            <p className="text-xs text-[#727E96] mt-0.5">Live SERP Rankings</p>
          </div>
          <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149] text-left">
            <p className="font-heading font-bold text-2xl sm:text-3xl text-[#7857FF]">98% Human</p>
            <p className="text-xs text-[#727E96] mt-0.5">AI Copywriting Voice</p>
          </div>
          <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149] text-left">
            <p className="font-heading font-bold text-2xl sm:text-3xl text-[#22D3C5]">2-Day</p>
            <p className="text-xs text-[#727E96] mt-0.5">Automated Follow-Up</p>
          </div>
          <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149] text-left">
            <p className="font-heading font-bold text-2xl sm:text-3xl text-[#438BFF]">Port 443</p>
            <p className="text-xs text-[#727E96] mt-0.5">Gmail API &amp; WhatsApp Direct</p>
          </div>
        </motion.div>

        {/* 5 Superpowers Feature Section */}
        <section id="features" className="mt-20 space-y-5 text-left">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#7857FF]">
              Unified Intelligence Architecture
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
              Built to Outperform Disconnected SEO &amp; Outreach Stacks
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#7857FF]/12 border border-[#7857FF]/30 text-[#7857FF] flex items-center justify-center mb-3.5">
                <LinkIcon className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Backlink Outreach Engine</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Crawls ranking domains for verified editor and founder emails, stores them into date &amp; purpose folders, and launches cold backlink pitches with 2-day follow-ups.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#438BFF]/12 border border-[#438BFF]/30 text-[#438BFF] flex items-center justify-center mb-3.5">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Competitor Gap Intelligence</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Weeds out UGC noise (Reddit, Quora, Pinterest) to isolate actual businesses ranking on your target keywords. Audits their business models and outputs a counter-strategy.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#22D3C5]/12 border border-[#22D3C5]/30 text-[#22D3C5] flex items-center justify-center mb-3.5">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Humanized AI Blog &amp; Schema</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Reverse-engineers heading outlines and keyword density of top 20 ranking pages to write an authoritative, fluff-free publication post with valid Google JSON-LD schema.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#A78BFA]/12 border border-[#A78BFA]/30 text-[#A78BFA] flex items-center justify-center mb-3.5">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Keyword Planner Matrix</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Inspects the top 5 ranking sites, calculates search intent and ranking opportunity scores, and surfaces low-competition targets with 1-click CSV export.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#7857FF]/12 border border-[#7857FF]/30 text-[#7857FF] flex items-center justify-center mb-3.5">
                <Send className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Multi-Channel Cold Dispatch</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Connects directly to Google Gmail API over HTTPS (Port 443) or SMTP/IMAP, plus 1-click WhatsApp Direct chat routing with anti-spam jitter delays.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#32C98A]/12 border border-[#32C98A]/30 text-[#32C98A] flex items-center justify-center mb-3.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">DNS MX Spam Verification</h3>
              <p className="text-xs text-[#A3AEC2] leading-relaxed">
                Instantly validates DNS mail exchange records, filters throwaway domains, and tracks real-time open rates, click rates, and incoming prospect replies.
              </p>
            </div>
          </div>
        </section>

        {/* End-to-End Workflow */}
        <div className="mt-18 p-6 sm:p-8 rounded-2xl bg-[#0E1220] border border-[#283149] text-left">
          <div className="flex items-center gap-2 mb-5 text-[11px] font-mono font-semibold text-[#7857FF] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>End-to-End Execution Flow</span>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-[#7857FF]">STEP 01</div>
              <p className="font-heading font-semibold text-[#F5F7FF] text-xs sm:text-sm">Enter Keyword &amp; Intent</p>
              <p className="text-xs text-[#727E96] leading-relaxed">Type your target niche (e.g. backlink for marketing, custom clothing store, competitor audit).</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-[#7857FF]">STEP 02</div>
              <p className="font-heading font-semibold text-[#F5F7FF] text-xs sm:text-sm">Real-Time SERP Crawl</p>
              <p className="text-xs text-[#727E96] leading-relaxed">Engine fetches top 20 rankings on Google &amp; regional engines, strips Reddit noise, and parses site outlines.</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-[#7857FF]">STEP 03</div>
              <p className="font-heading font-semibold text-[#F5F7FF] text-xs sm:text-sm">AI Synthesis or Email Scrape</p>
              <p className="text-xs text-[#727E96] leading-relaxed">Draft humanized blogs with schema, run keyword gap planning, or extract verified decision-maker emails.</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-[#7857FF]">STEP 04</div>
              <p className="font-heading font-semibold text-[#F5F7FF] text-xs sm:text-sm">1-Click Dispatch &amp; Follow-Up</p>
              <p className="text-xs text-[#727E96] leading-relaxed">Pitches are personalized and queued with smart delays. If no reply in 2 days, auto-sends follow-up.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#283149] py-6 text-center text-xs text-[#727E96] bg-[#090B12]">
        OUTRANK AI &bull; AI-Powered SEO &amp; Marketing Intelligence Platform &bull; See the Opportunity. Own the Search.
      </footer>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </div>
  );
}
