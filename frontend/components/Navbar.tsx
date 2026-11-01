"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";

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
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-800 opacity-70 blur-md group-hover:opacity-100 transition duration-300" />
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-lg text-white shadow-xl shadow-purple-900/50">
                ⚡
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-purple-300 bg-clip-text text-transparent">
                OutreachBot
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40">
                Pro
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">
              Web Scraper
            </Link>
            <Link href="#anti-spam" className="hover:text-white transition-colors">
              Anti-Spam Filter
            </Link>
            <Link href="#gmail-api" className="hover:text-white transition-colors">
              Gmail API Dispatcher
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Workspace</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </>
  );
}
