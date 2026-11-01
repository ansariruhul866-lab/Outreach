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
  Mail,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 24,
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
      className="p-8 space-y-8 max-w-7xl mx-auto w-full"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple Intelligence Engine</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Outreach Overview
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time pipeline performance, multi-channel analytics, and active outreach campaigns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-2xl glass-card text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </motion.button>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/dashboard/scraper"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all block"
            >
              <Search className="w-3.5 h-3.5" />
              <span>New Scrape Job</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Metrics Grid with Framer Motion Glass Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <motion.div
          whileHover={{ y: -4, borderColor: "rgba(168, 85, 247, 0.5)" }}
          className="p-6 rounded-3xl glass-card relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 ambient-glow-purple-accent opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shadow-inner">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4 relative z-10 tracking-tight">
            {stats?.total_leads ?? 0}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 relative z-10">Verified prospects in database</p>
        </motion.div>

        {/* Emails Sent */}
        <motion.div
          whileHover={{ y: -4, borderColor: "rgba(168, 85, 247, 0.5)" }}
          className="p-6 rounded-3xl glass-card relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 ambient-glow-purple-accent opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Emails Sent</span>
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 flex items-center justify-center shadow-inner">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4 relative z-10 tracking-tight">
            {stats?.total_sent ?? 0}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 relative z-10">Dispatched via Gmail API / SMTP</p>
        </motion.div>

        {/* Open Rate */}
        <motion.div
          whileHover={{ y: -4, borderColor: "rgba(168, 85, 247, 0.5)" }}
          className="p-6 rounded-3xl glass-card relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 ambient-glow-purple-accent opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Open Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shadow-inner">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-300 mt-4 relative z-10 tracking-tight">
            {stats?.open_rate !== undefined ? `${stats.open_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 relative z-10">{stats?.total_opened ?? 0} opens tracked</p>
        </motion.div>

        {/* Reply Rate */}
        <motion.div
          whileHover={{ y: -4, borderColor: "rgba(168, 85, 247, 0.5)" }}
          className="p-6 rounded-3xl glass-card relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 ambient-glow-purple-accent opacity-30 blur-2xl group-hover:opacity-60 transition-opacity" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Reply Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-fuchsia-300 mt-4 relative z-10 tracking-tight">
            {stats?.reply_rate !== undefined ? `${stats.reply_rate}%` : "0%"}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 relative z-10">{stats?.total_replied ?? 0} replies registered</p>
        </motion.div>
      </motion.div>

      {/* Quick Launch Cards */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <Link
            href="/dashboard/scraper"
            className="p-6 rounded-3xl glass-panel hover:border-purple-500/50 transition-all block group relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <span>Deep Web Scraper</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Extract emails from prospect websites or bulk lists with 4-level deep multi-threaded crawling.
            </p>
            <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Launch Crawler &rarr;
            </span>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <Link
            href="/dashboard/campaigns"
            className="p-6 rounded-3xl glass-panel hover:border-purple-500/50 transition-all block group relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-fuchsia-900/30">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <span>Cold Outreach Campaigns</span>
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Create personalized sequences with anti-spam random delay (0-120s), attachments, and templates.
            </p>
            <span className="text-xs font-bold text-fuchsia-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Manage Campaigns &rarr;
            </span>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <Link
            href="/dashboard/whatsapp"
            className="p-6 rounded-3xl glass-panel hover:border-purple-500/50 transition-all block group relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/30">
              <Zap className="w-5 h-5 fill-current text-purple-300" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <span>Direct WhatsApp Outreach</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-500/40">1-Click</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Send to 1–20 contacts in one go with one single template, multiple sender numbers, and live queue.
            </p>
            <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Open WhatsApp Direct &rarr;
            </span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Campaigns Summary Table */}
      <motion.div variants={itemVariants} className="rounded-3xl glass-panel overflow-hidden border border-purple-500/20">
        <div className="p-6 border-b border-purple-500/20 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Active Campaigns</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Quick glance of your cold outreach pipelines</p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Send className="w-8 h-8 mx-auto mb-3 opacity-40 text-purple-400" />
            <p className="font-bold text-white text-sm">No campaigns created yet</p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Create your first cold outreach sequence to start pitching verified leads.
            </p>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-purple-900/40"
            >
              <span>Create Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/10">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="p-5 flex items-center justify-between gap-4 hover:bg-purple-950/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{c.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        c.status === "RUNNING"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : c.status === "PAUSED"
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : c.status === "COMPLETED"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40"
                          : "bg-black text-zinc-400 border-zinc-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Sender: {c.sender_email || "None"} &bull; {c.leads_count} Leads ({c.pending_count} pending) &bull; Delay: {c.send_delay_seconds}s (+0-120s jitter)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-white">{c.total_sent} sent</p>
                    <p className="text-[10px] text-zinc-400">{c.total_opened} opened</p>
                  </div>
                  <Link
                    href="/dashboard/campaigns"
                    className="p-2 px-3 rounded-xl glass-card text-zinc-300 hover:text-white text-xs font-semibold"
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
