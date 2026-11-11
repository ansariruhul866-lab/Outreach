"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
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
  Sparkles,
  Menu,
  X,
  Globe,
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
    },
    { label: "Deep Scraper", href: "/dashboard/scraper", icon: Search },
    { label: "Leads", href: "/dashboard/leads", icon: Users },
    { label: "Templates", href: "/dashboard/templates", icon: FileText },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: Send },
    {
      label: "WhatsApp",
      href: "/dashboard/whatsapp",
      icon: MessageSquare,
      badge: "Instant",
    },
    { label: "Mailboxes", href: "/dashboard/mailboxes", icon: Mail },
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
      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
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

          {/* Tools Navigation Area */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {toolsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleToolClick(e, item.href)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all duration-150 ${
                    isActive
                      ? "bg-purple-600/25 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      : "border-transparent text-zinc-300 hover:text-white hover:bg-white/[0.06] hover:border-purple-500/20"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-purple-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-500/25 text-purple-300 border border-purple-500/40">
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
                className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Go to Workspace</span>
                <span className="sm:hidden">Workspace</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="hidden sm:block px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-4 sm:px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl shadow-xl shadow-purple-900/40 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl glass-card text-zinc-300 hover:text-white border border-purple-500/20"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-purple-500/20 bg-black/95 backdrop-blur-3xl px-6 py-4 space-y-2"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400/80 mb-2 px-2">
                Outreach Tools
              </div>
              {toolsNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleToolClick(e, item.href)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? "bg-purple-600/25 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "border-transparent text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-purple-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/25 text-purple-300 border border-purple-500/40">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal isOpen={modalOpen} initialMode={modalMode} onClose={() => setModalOpen(false)} />
    </>
  );
}
