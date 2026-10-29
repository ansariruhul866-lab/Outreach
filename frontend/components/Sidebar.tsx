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
  LogOut,
  ExternalLink,
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
    { label: "Leads Database", href: "/dashboard/leads", icon: Users },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: Send },
    { label: "Mailboxes", href: "/dashboard/mailboxes", icon: Mail },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-lg shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">OutreachBot</h1>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">SaaS Edition</p>
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-400 border border-orange-500/20 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-orange-400" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="pt-6 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-xs text-white uppercase">
            {(user?.name || "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email || "user@domain.com"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Landing</span>
          </Link>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
