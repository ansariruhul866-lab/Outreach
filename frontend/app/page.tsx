"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
  ShieldCheck,
  Send,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Clock,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");

  const openAuth = (mode: "login" | "signup") => {
    setModalMode(mode);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 selection:bg-orange-500/30">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-orange-400 mb-8 shadow-inner animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>Full-Stack Next.js + FastAPI + Google Gmail API Integration</span>
        </div>

        {/* Hero title */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Extract Clean Emails.<br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            Pitch High-Intent Leads.
          </span><br />
          Zero Cost.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Deep crawl prospect websites up to 4 levels, filter invalid &amp; spam domains with automated DNS MX checks, and send personalized pitches directly via Google&apos;s Gmail REST API with smart anti-spam delays.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Open Dashboard Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuth("signup")}
                className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Start Free Outreach &rarr;</span>
              </button>
              <button
                onClick={() => openAuth("login")}
                className="w-full sm:w-auto px-8 py-4 text-sm font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition-colors"
              >
                Sign In to Account
              </button>
            </>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-3xl font-black text-white">4 Levels</p>
            <p className="text-xs text-slate-400 mt-1">Deep Web Crawling</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-3xl font-black text-orange-400">7-Layer</p>
            <p className="text-xs text-slate-400 mt-1">DNS MX Spam Filter</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-3xl font-black text-amber-400">0 - 120s</p>
            <p className="text-xs text-slate-400 mt-1">Human Anti-Spam Jitter</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-3xl font-black text-emerald-400">Port 443</p>
            <p className="text-xs text-slate-400 mt-1">Gmail API (No Timeouts)</p>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="mt-28 grid sm:grid-cols-3 gap-6 text-left">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deep Web Scraper</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Asynchronously traverses client &amp; company websites up to 4 levels deep, inspecting HTML, contact pages, and scripts with robust regex parsing.
            </p>
          </div>

          <div id="anti-spam" className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">7-Layer Spam Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly verifies domain DNS MX records, filters out disposable mailboxes (Mailinator, TempMail), and computes prospect spam risk scores.
            </p>
          </div>

          <div id="gmail-api" className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Auto Gmail REST API</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sign in with Google and your mailbox is connected instantly. Emails dispatch through Google&apos;s official REST API over HTTPS without firewall blocks.
            </p>
          </div>
        </section>

        {/* Workflow Showcase */}
        <div className="mt-24 p-8 rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800 text-left">
          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-orange-400 uppercase tracking-widest">
            <Zap className="w-4 h-4" />
            <span>End-to-End Workflow</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500">STEP 01</div>
              <p className="font-bold text-white text-sm">Deep Crawl</p>
              <p className="text-xs text-slate-400">Enter a website URL or bulk list. Scrape subpages for verified executive emails.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500">STEP 02</div>
              <p className="font-bold text-white text-sm">MX Verification</p>
              <p className="text-xs text-slate-400">Automated DNS query tests each prospect domain. Drops invalid and throwaway inboxes.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500">STEP 03</div>
              <p className="font-bold text-white text-sm">Select Leads &amp; Jitter</p>
              <p className="text-xs text-slate-400">Checkmark specific leads, choose a template, and set a random 0-120s anti-spam delay.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500">STEP 04</div>
              <p className="font-bold text-white text-sm">Send &amp; Track</p>
              <p className="text-xs text-slate-400">Dispatches via your verified Gmail. Tracks open pixels, replies, and unsubscribe clicks.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        OutreachBot Next.js Edition &bull; Connected to FastAPI Backend &bull; Firebase Authenticated
      </footer>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </div>
  );
}
