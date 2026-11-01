"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Users,
  Send,
  Mail,
  FileText,
  MessageSquare,
  LogOut,
  ExternalLink,
  Sparkles,
  Zap,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Deep Scraper", href: "/dashboard/scraper", icon: Search },
    { label: "Leads & Folders", href: "/dashboard/leads", icon: Users },
    { label: "Templates", href: "/dashboard/templates", icon: FileText },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: Send },
    { label: "WhatsApp Direct", href: "/dashboard/whatsapp", icon: MessageSquare, badge: "Instant" },
    { label: "Mailboxes", href: "/dashboard/mailboxes", icon: Mail },
  ];

  return (
    <aside className="w-64 border-r border-purple-500/20 bg-black/60 backdrop-blur-3xl p-6 flex flex-col justify-between shrink-0 min-h-screen relative z-20 shadow-[10px_0_40px_rgba(0,0,0,0.8)]">
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mb-8 group block">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-800 opacity-70 blur-md group-hover:opacity-100 transition duration-300" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-lg text-white shadow-xl shadow-purple-900/50">
              ⚡
            </div>
          </motion.div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>OutreachBot</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            </h1>
            <p className="text-[10px] bg-gradient-to-r from-purple-400 via-fuchsia-300 to-white bg-clip-text text-transparent font-black uppercase tracking-widest animate-gradient-text">
              Black &amp; Purple Pro
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
              >
                <Link
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative group overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/30 via-purple-500/20 to-transparent text-white border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border hover:border-purple-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "text-zinc-500 group-hover:text-purple-300"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-l-full bg-gradient-to-b from-purple-400 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,1)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="pt-6 border-t border-purple-500/20 space-y-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-2.5 rounded-2xl glass-card border-purple-500/20"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-md shadow-purple-800/40">
            {(user?.name || "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-purple-300/70 truncate">{user?.email || "user@domain.com"}</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-purple-950/40 border border-white/[0.08] hover:border-purple-500/30 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3 text-purple-400" />
            <span>Landing</span>
          </Link>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/15 hover:text-red-400 text-zinc-400 text-xs transition-colors border border-white/[0.08] hover:border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
