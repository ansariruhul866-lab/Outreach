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
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([
        api.stats.getSummary(),
        api.campaigns.list(),
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
          <h1 className="text-2xl font-black text-white">Outreach Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline performance and active campaigns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/scraper"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-600/20 flex items-center gap-2 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>New Scrape Job</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4">{stats?.total_leads ?? 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">Verified prospects in database</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emails Sent</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4">{stats?.total_sent ?? 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">Dispatched via Gmail API / SMTP</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4">
            {stats?.open_rate !== undefined ? `${stats.open_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{stats?.total_opened ?? 0} opens tracked</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reply Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4">
            {stats?.reply_rate !== undefined ? `${stats.reply_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{stats?.total_replied ?? 0} replies registered</p>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Link
          href="/dashboard/scraper"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 hover:border-orange-500/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Deep Web Scraper</h3>
          <p className="text-xs text-slate-400 mb-4">
            Extract emails from prospect websites or bulk lists with 4-level deep crawling.
          </p>
          <span className="text-xs font-bold text-orange-400 group-hover:underline flex items-center gap-1">
            Launch Crawler &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/campaigns"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Send className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Cold Outreach Campaigns</h3>
          <p className="text-xs text-slate-400 mb-4">
            Create personalized sequences with anti-spam random delay (0-120s) and lead selection.
          </p>
          <span className="text-xs font-bold text-amber-400 group-hover:underline flex items-center gap-1">
            Manage Campaigns &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/mailboxes"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 hover:border-blue-500/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Mailbox Dispatcher</h3>
          <p className="text-xs text-slate-400 mb-4">
            Auto-connect via Google Sign-In (Gmail REST API) or configure SMTP credentials.
          </p>
          <span className="text-xs font-bold text-blue-400 group-hover:underline flex items-center gap-1">
            View Mailboxes &rarr;
          </span>
        </Link>
      </div>

      {/* Campaigns Summary Table */}
      <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Active Campaigns</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quick glance of your cold outreach pipelines</p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Send className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-white text-sm">No campaigns created yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create your first cold outreach sequence to start pitching verified leads.
            </p>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              <span>Create Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{c.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        c.status === "RUNNING"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : c.status === "PAUSED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : c.status === "COMPLETED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
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
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
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
