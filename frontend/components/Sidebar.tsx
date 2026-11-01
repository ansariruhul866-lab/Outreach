"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
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
  Sun,
  Moon,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <aside className="w-64 border-r border-slate-200 dark:border-purple-500/20 bg-white dark:bg-black/90 p-5 flex flex-col justify-between shrink-0 min-h-screen relative z-20 shadow-sm dark:shadow-[10px_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-colors duration-200">
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mb-7 group block">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-800 opacity-70 blur-md group-hover:opacity-100 transition duration-300" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-lg text-white shadow-xl shadow-purple-900/40">
              ⚡
            </div>
          </motion.div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>OutreachBot</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </h1>
            <p className="text-[10px] text-purple-700 dark:bg-gradient-to-r dark:from-purple-400 dark:via-fuchsia-300 dark:to-white dark:bg-clip-text dark:text-transparent font-black uppercase tracking-widest">
              Black &amp; Purple Pro
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                whileHover={{ x: 4 }}
              >
                <Link
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative border ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 border-purple-500"
                      : "border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-purple-950/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-slate-500 group-hover:text-purple-600 dark:text-zinc-400 dark:group-hover:text-purple-300"
                      }`}
                    />
                    <span className="font-bold">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        isActive
                          ? "bg-white/20 text-white border-white/30"
                          : "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white shadow-sm" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* User Footer & Theme Toggler */}
      <div className="pt-4 border-t border-slate-200 dark:border-purple-500/20 space-y-3">
        {/* Day / Night Theme Toggler */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-500/20 text-xs">
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-purple-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">
              {theme === "dark" ? "Night Mode" : "Day Mode"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="relative w-11 h-6 rounded-full bg-slate-300 dark:bg-zinc-900 border border-slate-300 dark:border-purple-500/40 p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer shadow-inner"
            title="Toggle Day / Night Mode"
          >
            <motion.div
              animate={{ x: theme === "dark" ? 0 : 20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-500 shadow-md flex items-center justify-center text-[9px] text-white font-bold"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </motion.div>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-purple-500/20">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 flex items-center justify-center font-black text-xs text-white uppercase shadow-md shadow-purple-800/40 shrink-0">
            {(user?.name || "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-slate-500 dark:text-purple-300/80 truncate font-mono">{user?.email || "user@domain.com"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-purple-950/40 border border-slate-200 dark:border-white/[0.08] text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Landing</span>
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/[0.04] dark:hover:bg-red-500/15 dark:hover:text-red-400 text-slate-500 dark:text-zinc-400 text-xs transition-colors border border-slate-200 dark:border-white/[0.08] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
