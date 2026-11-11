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
      badgeColor: "bg-[#7857FF]/15 text-[#A78BFA] border-[#7857FF]/30",
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
      badgeColor: "bg-[#22D3C5]/12 text-[#22D3C5] border-[#22D3C5]/30",
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
      <header className="sticky top-0 z-50 w-full border-b border-[#283149] bg-[#090B12]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <BrandLogo size="md" />

          {/* Centered Precision Dock */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-[#0E1220] border border-[#283149]">
            {toolsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleToolClick(e, item.href)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors duration-150 ${
                    isActive
                      ? "bg-[#1B2233] text-[#F5F7FF] border border-[#7857FF]/40 shadow-sm"
                      : "text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#1B2233]/60"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-[#7857FF]" : "text-[#727E96]"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[8.5px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-semibold bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] rounded-lg shadow-sm shadow-[#7857FF]/30 flex items-center gap-2 transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="hidden sm:block px-3 py-2 text-xs font-medium text-[#A3AEC2] hover:text-[#F5F7FF] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-4 py-2 text-xs font-semibold bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] rounded-lg shadow-sm shadow-[#7857FF]/30 flex items-center gap-1.5 transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#1B2233] transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-[#283149] bg-[#0E1220] px-4 py-4 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2">
                {toolsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleToolClick(e, item.href)}
                      className="p-2.5 rounded-lg bg-[#141A29] border border-[#283149] flex items-center gap-2 text-xs font-medium text-[#A3AEC2] hover:text-[#F5F7FF]"
                    >
                      <Icon className="w-4 h-4 text-[#7857FF] shrink-0" />
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
                    className="w-full py-2.5 rounded-lg border border-[#283149] text-xs font-medium text-[#A3AEC2] hover:text-[#F5F7FF]"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuth("signup");
                    }}
                    className="w-full py-2.5 rounded-lg bg-[#7857FF] text-xs font-semibold text-[#F5F7FF]"
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
