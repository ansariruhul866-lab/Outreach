"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BrandLogo } from "./BrandLogo";
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
  Globe,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navSections = [
    {
      title: "DISCOVERY & INTELLIGENCE",
      items: [
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
      ],
    },
    {
      title: "OUTREACH AUTOMATION",
      items: [
        {
          label: "Campaigns",
          href: "/dashboard/campaigns",
          icon: Send,
        },
        {
          label: "Templates",
          href: "/dashboard/templates",
          icon: FileText,
        },
        {
          label: "Leads & Folders",
          href: "/dashboard/leads",
          icon: Users,
        },
        {
          label: "WhatsApp Direct",
          href: "/dashboard/whatsapp",
          icon: MessageSquare,
          badge: "Instant",
          badgeColor: "bg-[#22D3C5]/12 text-[#22D3C5] border-[#22D3C5]/30",
        },
      ],
    },
    {
      title: "CHANNELS & SYSTEM",
      items: [
        {
          label: "Mailboxes",
          href: "/dashboard/mailboxes",
          icon: Mail,
        },
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-[#283149] bg-[#0E1220] p-5 flex flex-col justify-between shrink-0 min-h-screen relative z-10 select-none">
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-1">
          <BrandLogo size="md" />
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <span className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#727E96] px-3 mb-1.5">
                {sec.title}
              </span>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-[#1B2233] text-[#F5F7FF] border border-[#7857FF]/40 shadow-sm"
                          : "border border-transparent text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#141A29]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-[#7857FF]" : "text-[#727E96]"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[8.5px] font-mono font-semibold px-1.5 py-0.5 rounded border leading-none ${
                            item.badgeColor || "bg-[#7857FF]/15 text-[#A78BFA] border-[#7857FF]/30"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Profile & Actions Footer */}
      <div className="pt-4 border-t border-[#283149] space-y-3">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#141A29] border border-[#283149]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7857FF] to-[#438BFF] flex items-center justify-center font-bold text-xs text-[#F5F7FF] uppercase shadow-sm">
            {(user?.name || "U").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F5F7FF] truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-[#727E96] truncate">{user?.email || "user@domain.com"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#141A29] hover:bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-[#7857FF]" />
            <span>Landing</span>
          </Link>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg bg-[#141A29] hover:bg-[#F16C7C]/15 hover:text-[#F16C7C] text-[#727E96] text-xs transition-colors border border-[#283149]"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
