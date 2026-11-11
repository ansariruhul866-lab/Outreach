"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { BrandLogo } from "./BrandLogo";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  FileText,
  Send,
  MessageSquare,
  Mail,
  LayoutDashboard,
  ArrowRight,
  Menu,
  X,
  Globe,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openAuth = (mode: "login" | "signup") => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const toolsNav = [
    {
      label: "SERP Discovery",
      href: "/dashboard/discovery",
      icon: Globe,
      badge: "AI",
      badgeColor: "bg-purple-500/25 text-purple-300 border-purple-500/40",
    },
    {
      label: "Deep Scraper",
      href: "/dashboard/scraper",
      icon: Search,
    },
    {
      label: "Leads",
      href: "/dashboard/leads",
      icon: Users,
    },
    {
      label: "Templates",
      href: "/dashboard/templates",
      icon: FileText,
    },
    {
      label: "Campaigns",
      href: "/dashboard/campaigns",
      icon: Send,
    },
    {
      label: "WhatsApp",
      href: "/dashboard/whatsapp",
      icon: MessageSquare,
      badge: "Instant",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    },
    {
      label: "Mailboxes",
      href: "/dashboard/mailboxes",
      icon: Mail,
    },
  ];

  const handleToolClick = (e: React.MouseEvent, href: string) => {
    if (!user) {
      e.preventDefault();
      openAuth("login");
    } else {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-purple-500/20 bg-black/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between gap-4">
          {/* Custom Brand Logo */}
          <BrandLogo size="md" />

          {/* Centered Modern Floating Capsule Dock */}
          <nav className="hidden lg:flex items-center gap-0.5 p-1 rounded-full bg-zinc-950/80 border border-purple-500/25 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
            {toolsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleToolClick(e, item.href)}
                  className={`h-8 px-3 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border border-purple-500/60 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-purple-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-full border leading-none ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="hidden sm:block px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-purple-500/20 bg-zinc-950/95 backdrop-blur-2xl px-4 py-4 space-y-2 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
                {toolsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleToolClick(e, item.href)}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 flex items-center gap-2 text-xs font-semibold text-zinc-200"
                    >
                      <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {!user && (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuth("login");
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-300"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuth("signup");
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-lg shadow-purple-900/50"
                  >
                    Start Free &rarr;
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </>
  );
}
