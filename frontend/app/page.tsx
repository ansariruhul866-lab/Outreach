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
  Sparkles,
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
      // Store intent in session/local storage then prompt auth
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_search", targetUrl);
      }
      openAuth("signup");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-black text-white selection:bg-purple-600/40 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] ambient-glow-purple-lg opacity-40 pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 ambient-glow-purple-accent opacity-25 pointer-events-none blur-3xl" />

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center relative z-10">
        {/* Glow badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-purple-500/30 text-xs font-bold text-purple-300 mb-8 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>RankReach AI &bull; Autonomous SERP Intelligence &amp; Multi-Channel Outreach OS</span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]"
        >
          Search The Web. Uncover Competitors.<br />
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-white bg-clip-text text-transparent">
            Pitch High-Intent Inboxes.
          </span><br />
          Zero Cost.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Crawl Google SERP for any niche, weed out Reddit noise, reverse-engineer top competitor blogs &amp; schemas, extract verified decision-maker emails, and dispatch 1-to-1 personalized campaigns with automated 2-day follow-ups.
        </motion.p>

        {/* Interactive "What are you looking for today?" Search Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 max-w-3xl mx-auto rounded-3xl glass-card border border-purple-500/40 p-4 sm:p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] text-left"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>What are you looking for today?</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              Live SERP Crawler
            </span>
          </div>

          {/* 5 Purpose Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {INTENTS.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedIntent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleIntentChange(item.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400"
                      : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mb-1 ${isSelected ? "text-purple-300" : "text-zinc-500"}`} />
                  <div className="text-[11px] font-bold truncate">{item.label}</div>
                </button>
              );
            })}
          </div>

          {/* Search Form */}
          <form onSubmit={handleLaunchSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentIntentObj.placeholder}
                className="w-full pl-11 pr-32 sm:pr-40 py-3.5 glass-input rounded-2xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-lg shadow-purple-900/50 flex items-center gap-1.5 transition-all"
              >
                <span>Crawl SERP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 pl-1">
              <strong className="text-purple-300">Intent Insight:</strong> {currentIntentObj.hint}
            </p>
          </form>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {user ? (
            <Link
              href="/dashboard/discovery"
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Open SERP Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuth("signup")}
                className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Start Free Outreach &rarr;</span>
              </button>
              <button
                onClick={() => openAuth("login")}
                className="w-full sm:w-auto px-8 py-4 text-sm font-semibold glass-card hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-2xl transition-colors"
              >
                Sign In to Account
              </button>
            </>
          )}
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-white">Top 20</p>
            <p className="text-xs text-zinc-400 mt-1">Live SERP Rankings</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-purple-400">98% Human</p>
            <p className="text-xs text-zinc-400 mt-1">AI Copywriter &amp; Schema</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-purple-300">2-Day</p>
            <p className="text-xs text-zinc-400 mt-1">Automated Follow-Up</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-white">Port 443</p>
            <p className="text-xs text-zinc-400 mt-1">Gmail API &amp; WhatsApp Direct</p>
          </div>
        </motion.div>

        {/* 5 Superpowers Section */}
        <section id="features" className="mt-24 space-y-6 text-left">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-purple-400">The 5 Core Superpowers</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">Engineered to Replace Ahrefs, Jasper, Hunter &amp; Instantly</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <LinkIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Backlink Outreach Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Crawls ranking domains for verified editor and founder emails, stores them into date &amp; purpose folders, and launches cold backlink pitches with 2-day follow-ups.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Competitor Gap Intelligence</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Weeds out UGC noise (Reddit, Quora, Pinterest) to isolate actual businesses ranking on your target keywords. Audits their business models and outputs a counter-strategy.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Humanized AI Blog &amp; Schema</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reverse-engineers the heading outline and keyword density of the top 20 ranking pages to write an authoritative, fluff-free publication post with valid Google JSON-LD schema.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Keyword Planner Matrix</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inspects the top 5 ranking sites, calculates search intent and ranking opportunity scores, and surfaces low-competition targets with 1-click CSV export.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Multi-Channel Cold Dispatch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connects directly to Google Gmail API over HTTPS (Port 443) or SMTP/IMAP, plus 1-click WhatsApp Direct chat routing with anti-spam jitter delays.
              </p>
            </div>

            <div className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">DNS MX Spam Verification</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instantly validates DNS mail exchange records, filters throwaway domains, and tracks real-time open rates, click rates, and incoming prospect replies.
              </p>
            </div>
          </div>
        </section>

        {/* End-to-End Workflow */}
        <div className="mt-20 p-8 rounded-3xl glass-panel border border-purple-500/30 text-left">
          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-purple-400 uppercase tracking-widest">
            <Zap className="w-4 h-4" />
            <span>How The Seamless Flow Works</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 01</div>
              <p className="font-bold text-white text-sm">Enter Keyword &amp; Intent</p>
              <p className="text-xs text-zinc-400">Type what you&apos;re looking for (e.g. backlink for marketing, custom clothing store, competitor audit).</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 02</div>
              <p className="font-bold text-white text-sm">Real-Time SERP Crawl</p>
              <p className="text-xs text-zinc-400">Bot fetches top 20 rankings on Google &amp; regional engines, strips Reddit noise, and extracts site outlines.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 03</div>
              <p className="font-bold text-white text-sm">AI Synthesis or Email Scrape</p>
              <p className="text-xs text-zinc-400">Draft humanized blogs with schema, run keyword gap planning, or extract verified decision-maker emails.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 04</div>
              <p className="font-bold text-white text-sm">1-Click Dispatch &amp; Follow-Up</p>
              <p className="text-xs text-zinc-400">Emails are personalized with AI and queued with smart jitter delays. If no reply in 2 days, auto-sends follow-up.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8 text-center text-xs text-zinc-500 bg-black/60">
        RankReach AI &bull; OutreachBot Pro Platform &bull; Connected to FastAPI &bull; Gmail API &amp; WhatsApp Ready
      </footer>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </div>
  );
}
