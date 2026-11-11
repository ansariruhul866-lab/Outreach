"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, StatsSummary, Campaign } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Users,
  Send,
  Eye,
  MessageSquare,
  Search,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  ArrowRight,
  Shield,
  TrendingUp,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto w-full pb-12"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#1B2233] border border-[#283149] text-[#A78BFA] text-[10px] font-mono font-semibold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3 text-[#7857FF]" />
            <span>SEO &amp; Outreach Intelligence OS</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F5F7FF] tracking-tight">
            Overview &amp; Pipeline Analytics
          </h1>
          <p className="text-xs text-[#727E96] mt-0.5">
            Real-time pipeline performance, multi-channel analytics, and active outreach campaigns
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-[#141A29] hover:bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#7857FF]" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/scraper"
            className="px-4 py-2 rounded-lg bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>New Scrape Job</span>
          </Link>
        </div>
      </motion.div>

      {/* "What are you looking for today?" Hero Discovery Card */}
      <motion.div
        variants={itemVariants}
        className="p-6 rounded-2xl bg-[#141A29] border border-[#283149] relative overflow-hidden shadow-sm"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#7857FF]">
              SERP Intelligence &bull; Live Crawler
            </span>
            <h2 className="font-heading text-xl font-bold text-[#F5F7FF] flex items-center gap-2">
              <span>What are you looking for today?</span>
              <Sparkles className="w-4 h-4 text-[#A78BFA]" />
            </h2>
            <p className="text-xs text-[#A3AEC2] leading-relaxed">
              Crawl live regional search engines &rarr; extract top 20 ranking sites &rarr; organize verified decision-maker emails into dated folders &rarr; automate 1-to-1 personalized campaigns with 2-day reply monitoring.
            </p>
          </div>

          <Link
            href="/dashboard/discovery"
            className="px-5 py-2.5 rounded-lg bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] font-semibold text-xs shadow-sm flex items-center gap-1.5 self-start md:self-auto shrink-0 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>Launch SERP Discovery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-4 mt-4 border-t border-[#283149]/60">
          <span className="text-[10px] font-mono font-semibold text-[#727E96] uppercase">Try Query:</span>
          {[
            "backlink for marketing website",
            "best custom clothing store",
            "competitor analysis tools",
            "digital marketing agency clients",
          ].map((chip) => (
            <Link
              key={chip}
              href={`/dashboard/discovery?q=${encodeURIComponent(chip)}&auto=1`}
              className="text-xs px-2.5 py-1 rounded-md bg-[#0E1220] hover:bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] transition-colors flex items-center gap-1.5"
            >
              <span>{chip}</span>
              <ArrowRight className="w-3 h-3 text-[#7857FF]" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Analytics KPI Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Leads */}
        <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#727E96]">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-[#7857FF]/12 border border-[#7857FF]/25 text-[#7857FF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-heading font-bold text-2xl sm:text-3xl text-[#F5F7FF] mt-2.5">
            {stats?.total_leads ?? 0}
          </p>
          <p className="text-[10px] text-[#727E96] mt-1 font-mono">Verified in database</p>
        </div>

        {/* Emails Sent */}
        <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#727E96]">Emails Sent</span>
            <div className="w-8 h-8 rounded-lg bg-[#438BFF]/12 border border-[#438BFF]/25 text-[#438BFF] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="font-heading font-bold text-2xl sm:text-3xl text-[#F5F7FF] mt-2.5">
            {stats?.total_sent ?? 0}
          </p>
          <p className="text-[10px] text-[#727E96] mt-1 font-mono">Dispatched via Gmail API</p>
        </div>

        {/* Open Rate */}
        <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#727E96]">Open Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#22D3C5]/12 border border-[#22D3C5]/25 text-[#22D3C5] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="font-heading font-bold text-2xl sm:text-3xl text-[#22D3C5] mt-2.5">
            {stats?.open_rate !== undefined ? `${stats.open_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-[#727E96] mt-1 font-mono">{stats?.total_opened ?? 0} opens tracked</p>
        </div>

        {/* Reply Rate */}
        <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#727E96]">Reply Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/12 border border-[#A78BFA]/25 text-[#A78BFA] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="font-heading font-bold text-2xl sm:text-3xl text-[#A78BFA] mt-2.5">
            {stats?.reply_rate !== undefined ? `${stats.reply_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-[#727E96] mt-1 font-mono">{stats?.total_replied ?? 0} replies registered</p>
        </div>
      </motion.div>

      {/* 3 Quick Launch Engine Cards */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/scraper"
          className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors block group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#7857FF]/12 border border-[#7857FF]/25 text-[#7857FF] flex items-center justify-center mb-3">
            <Search className="w-4 h-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Deep Web Scraper</h3>
          <p className="text-xs text-[#A3AEC2] mb-3 leading-relaxed">
            Extract emails from prospect websites or bulk lists with 4-level deep multi-threaded crawling.
          </p>
          <span className="text-xs font-semibold text-[#7857FF] group-hover:text-[#A78BFA] inline-flex items-center gap-1 transition-colors">
            Launch Crawler &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/campaigns"
          className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors block group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#438BFF]/12 border border-[#438BFF]/25 text-[#438BFF] flex items-center justify-center mb-3">
            <Send className="w-4 h-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Cold Outreach Campaigns</h3>
          <p className="text-xs text-[#A3AEC2] mb-3 leading-relaxed">
            Create personalized sequences with anti-spam random delay (0-120s), attachments, and templates.
          </p>
          <span className="text-xs font-semibold text-[#438BFF] group-hover:text-[#7857FF] inline-flex items-center gap-1 transition-colors">
            Manage Campaigns &rarr;
          </span>
        </Link>

        <Link
          href="/dashboard/whatsapp"
          className="p-5 rounded-xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-colors block group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#22D3C5]/12 border border-[#22D3C5]/25 text-[#22D3C5] flex items-center justify-center mb-3">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-[#F5F7FF] mb-1">Direct WhatsApp Outreach</h3>
          <p className="text-xs text-[#A3AEC2] mb-3 leading-relaxed">
            Send to 1–20 contacts in one go with one single template, multiple sender numbers, and live queue.
          </p>
          <span className="text-xs font-semibold text-[#22D3C5] group-hover:text-[#7857FF] inline-flex items-center gap-1 transition-colors">
            Open WhatsApp Direct &rarr;
          </span>
        </Link>
      </motion.div>

      {/* Campaigns Summary Table */}
      <motion.div variants={itemVariants} className="rounded-xl bg-[#141A29] border border-[#283149] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#283149] flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-bold text-[#F5F7FF]">Active Outreach Campaigns</h2>
            <p className="text-xs text-[#727E96] mt-0.5">Quick glance of your active pipeline dispatches</p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="text-xs font-semibold text-[#7857FF] hover:text-[#A78BFA] flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-10 text-center text-[#727E96]">
            <Send className="w-7 h-7 mx-auto mb-2.5 text-[#727E96]" />
            <p className="font-semibold text-[#F5F7FF] text-sm">No campaigns created yet</p>
            <p className="text-xs text-[#727E96] mt-1 mb-4">
              Create your first cold outreach sequence to start pitching verified leads.
            </p>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7857FF] hover:bg-[#6845EF] text-[#F5F7FF] rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <span>Create Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#283149]">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#1B2233]/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F5F7FF] text-sm">{c.name}</span>
                    <span
                      className={`text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                        c.status === "RUNNING"
                          ? "bg-[#32C98A]/12 text-[#32C98A] border-[#32C98A]/30"
                          : c.status === "PAUSED"
                          ? "bg-[#F3B84C]/12 text-[#F3B84C] border-[#F3B84C]/30"
                          : c.status === "COMPLETED"
                          ? "bg-[#438BFF]/12 text-[#438BFF] border-[#438BFF]/30"
                          : "bg-[#1B2233] text-[#727E96] border-[#283149]"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#727E96] mt-1 font-mono">
                    Sender: {c.sender_email || "None"} &bull; {c.leads_count} Leads ({c.pending_count} pending) &bull; Delay: {c.send_delay_seconds}s (+0-120s jitter)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-[#F5F7FF] font-mono">{c.total_sent} sent</p>
                    <p className="text-[10px] text-[#727E96] font-mono">{c.total_opened} opened</p>
                  </div>
                  <Link
                    href="/dashboard/campaigns"
                    className="p-1.5 px-3 rounded-lg bg-[#0E1220] hover:bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] text-xs font-medium transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
