"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, StatsSummary, Campaign } from "@/lib/api";
import {
  Users,
  Send,
  Eye,
  MessageSquare,
  Search,
  Mail,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([
        api.stats.getSummary().catch(() => ({
          total_leads: 0,
          total_sent: 0,
          total_opened: 0,
          total_replied: 0,
          open_rate: 0,
          reply_rate: 0,
          active_senders: 0,
          active_campaigns: 0,
        })),
        api.campaigns.list().catch(() => []),
      ]);
      setStats(s);
      setCampaigns(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Cold Outreach &amp; Multi-Channel System</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Outreach Overview
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline performance, multi-channel analytics, and active outreach campaigns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/scraper"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>New Scrape Job</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid with Glass Cards & Glow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 ambient-glow-amber opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 text-orange-400 flex items-center justify-center shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4 relative z-10 tracking-tight">
            {stats?.total_leads ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 relative z-10">Verified prospects in database</p>
        </div>

        {/* Emails Sent */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 ambient-glow-cyan opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emails Sent</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4 relative z-10 tracking-tight">
            {stats?.total_sent ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 relative z-10">Dispatched via Gmail API / SMTP</p>
        </div>

        {/* Open Rate */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 ambient-glow-emerald opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-4 relative z-10 tracking-tight">
            {stats?.open_rate !== undefined ? `${stats.open_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 relative z-10">{stats?.total_opened ?? 0} opens tracked</p>
        </div>

        {/* Reply Rate */}
        <div className="p-6 rounded-3xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 ambient-glow-purple opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reply Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-400 mt-4 relative z-10 tracking-tight">
            {stats?.reply_rate !== undefined ? `${stats.reply_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 relative z-10">{stats?.total_replied ?? 0} replies registered</p>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Link
          href="/dashboard/scraper"
          className="p-6 rounded-3xl glass-panel hover:border-orange-500/40 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/10">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
            <span>Deep Web Scraper</span>
            <Sparkles className="w-3.5 h-3.5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Extract emails from prospect websites or bulk lists with 4-level deep multi-threaded crawling.
          </p>
          <span className="text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Launch Crawler &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/campaigns"
          className="p-6 rounded-3xl glass-panel hover:border-amber-500/40 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
            <Send className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
            <span>Cold Outreach Campaigns</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Create personalized sequences with anti-spam random delay (0-120s), attachments, and templates.
          </p>
          <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Manage Campaigns &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/whatsapp"
          className="p-6 rounded-3xl glass-panel hover:border-emerald-500/40 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
            <span>Direct WhatsApp Outreach</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">1-Click</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Send to 1–20 contacts in one go with one single template, multiple sender numbers, and live queue.
          </p>
          <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Open WhatsApp Direct &rarr;
          </span>
        </Link>
      </div>

      {/* Campaigns Summary Table */}
      <div className="rounded-3xl glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Active Campaigns</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quick glance of your cold outreach pipelines</p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Send className="w-8 h-8 mx-auto mb-3 opacity-40 text-orange-400" />
            <p className="font-bold text-white text-sm">No campaigns created yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create your first cold outreach sequence to start pitching verified leads.
            </p>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
            >
              <span>Create Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{c.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        c.status === "RUNNING"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : c.status === "PAUSED"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : c.status === "COMPLETED"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Sender: {c.sender_email || "None"} &bull; {c.leads_count} Leads ({c.pending_count} pending) &bull; Delay: {c.send_delay_seconds}s (+0-120s jitter)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-white">{c.total_sent} sent</p>
                    <p className="text-[10px] text-slate-500">{c.total_opened} opened</p>
                  </div>
                  <Link
                    href="/dashboard/campaigns"
                    className="p-2 px-3 rounded-xl glass-card text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
