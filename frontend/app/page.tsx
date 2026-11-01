"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Send,
  Zap,
  ArrowRight,
  Sparkles,
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
    <div className="min-h-screen flex flex-col justify-between bg-black text-white selection:bg-purple-600/40 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] ambient-glow-purple-lg opacity-40 pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 ambient-glow-purple-accent opacity-25 pointer-events-none blur-3xl" />

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        {/* Glow badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-purple-500/30 text-xs font-bold text-purple-300 mb-8 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Full-Stack Next.js + FastAPI + Google Gmail API Integration</span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-5xl sm:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]"
        >
          Extract Clean Emails.<br />
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-white bg-clip-text text-transparent">
            Pitch High-Intent Leads.
          </span><br />
          Zero Cost.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Deep crawl prospect websites up to 4 levels, filter invalid &amp; spam domains with automated DNS MX checks, and send personalized pitches directly via Google&apos;s Gmail REST API with smart anti-spam delays.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Open Dashboard Workspace</span>
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
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-white">4 Levels</p>
            <p className="text-xs text-zinc-400 mt-1">Deep Web Crawling</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-purple-400">7-Layer</p>
            <p className="text-xs text-zinc-400 mt-1">DNS MX Spam Filter</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-purple-300">0 - 120s</p>
            <p className="text-xs text-zinc-400 mt-1">Human Anti-Spam Jitter</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
            <p className="text-3xl font-black text-white">Port 443</p>
            <p className="text-xs text-zinc-400 mt-1">Gmail API (No Timeouts)</p>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <section id="features" className="mt-28 grid sm:grid-cols-3 gap-6 text-left">
          <div className="p-8 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deep Web Scraper</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Asynchronously traverses client &amp; company websites up to 4 levels deep, inspecting HTML, contact pages, and scripts with robust regex parsing.
            </p>
          </div>

          <div id="anti-spam" className="p-8 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">7-Layer Spam Verification</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instantly verifies domain DNS MX records, filters out disposable mailboxes (Mailinator, TempMail), and computes prospect spam risk scores.
            </p>
          </div>

          <div id="gmail-api" className="p-8 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Auto Gmail REST API</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sign in with Google and your mailbox is connected instantly. Emails dispatch through Google&apos;s official REST API over HTTPS without firewall blocks.
            </p>
          </div>
        </section>

        {/* Workflow Showcase */}
        <div className="mt-24 p-8 rounded-3xl glass-panel border border-purple-500/30 text-left">
          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-purple-400 uppercase tracking-widest">
            <Zap className="w-4 h-4" />
            <span>End-to-End Workflow</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 01</div>
              <p className="font-bold text-white text-sm">Deep Crawl</p>
              <p className="text-xs text-zinc-400">Enter a website URL or bulk list. Scrape subpages for verified executive emails.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 02</div>
              <p className="font-bold text-white text-sm">MX Verification</p>
              <p className="text-xs text-zinc-400">Automated DNS query tests each prospect domain. Drops invalid and throwaway inboxes.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 03</div>
              <p className="font-bold text-white text-sm">Select Leads &amp; Jitter</p>
              <p className="text-xs text-zinc-400">Checkmark specific leads, choose a template, and set a random 0-120s anti-spam delay.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-black text-purple-400">STEP 04</div>
              <p className="font-bold text-white text-sm">Send &amp; Track</p>
              <p className="text-xs text-zinc-400">Dispatches via your verified Gmail. Tracks open pixels, replies, and unsubscribe clicks.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8 text-center text-xs text-zinc-500 bg-black/60">
        OutreachBot Next.js Edition &bull; Connected to FastAPI Backend &bull; Firebase Authenticated
      </footer>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </div>
  );
}
