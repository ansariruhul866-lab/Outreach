"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");

  const openAuth = (mode: "login" | "signup") => {
    setModalMode(mode);
    setModalOpen(true);
  };

  return (
    <>
      <header className="border-b border-purple-500/20 bg-black/75 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-xl shadow-lg shadow-purple-900/50 group-hover:scale-105 transition-transform text-white">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                OutreachBot
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                PRO 2.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
            <Link href="#features" className="hover:text-purple-300 transition-colors">
              Web Scraper
            </Link>
            <Link href="#anti-spam" className="hover:text-purple-300 transition-colors">
              Anti-Spam Filter
            </Link>
            <Link href="#gmail-api" className="hover:text-purple-300 transition-colors">
              Gmail &amp; WhatsApp Direct
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all block cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Workspace</span>
                </Link>
              </motion.div>
            ) : (
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Log in
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openAuth("signup")}
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </>
  );
}
