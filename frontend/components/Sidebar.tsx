"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
    <aside className="w-64 border-r border-white/[0.08] bg-slate-950/40 backdrop-blur-2xl p-6 flex flex-col justify-between shrink-0 min-h-screen relative z-20 shadow-2xl">
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 opacity-60 blur-sm group-hover:opacity-100 transition duration-300" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center font-black text-lg text-white shadow-xl group-hover:scale-105 transition-transform">
              ⚡
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>OutreachBot</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </h1>
            <p className="text-[10px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent font-bold uppercase tracking-widest animate-gradient-text">
              Enterprise Pro
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative group overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent text-white border border-amber-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:border hover:border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-gradient-to-b from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="pt-6 border-t border-white/[0.08] space-y-3">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl glass-card">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-md shadow-orange-500/20">
            {(user?.name || "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || "user@domain.com"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>Landing</span>
          </Link>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs transition-colors border border-white/[0.06] hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
