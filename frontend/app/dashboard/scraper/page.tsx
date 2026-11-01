"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, ScrapeJob, LeadFolder } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Users,
  Sparkles,
  Folder,
} from "lucide-react";

export default function ScraperPage() {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [depth, setDepth] = useState<number>(2);
  const [folderName, setFolderName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState("");
  const [folders, setFolders] = useState<LeadFolder[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<ScrapeJob | null>(null);
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);

  useEffect(() => {
    api.folders
      .list()
      .then((res) => setFolders(res.folders || []))
      .catch(() => setFolders([]));
  }, []);

  const sampleDomains = [
    "stripe.com",
    "vercel.com",
    "linear.app",
    "supabase.com",
    "resend.com",
  ];

  const handleSingleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let formattedUrl = singleUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const job = await api.scraper.scrape(formattedUrl, depth, targetFolderId || undefined);
      setActiveJob(job);
      setExtractedEmails(job.emails || []);
      setSuccessMsg(`✓ Crawl finished! Visited ${job.pages_visited} pages and saved ${job.emails_found} verified leads into your folders.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setError("Please enter at least one domain or URL");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const formatted = urls.map((u) =>
        u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`
      );
      const res = await api.scraper.bulkScrape(
        formatted,
        depth,
        targetFolderId || undefined,
        folderName || undefined
      );
      setSuccessMsg(`✓ Bulk crawl initiated for ${res.total_jobs} domains! Leads are automatically organized in folders of ~50 prospects.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk scrape failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (extractedEmails.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,Email\n" + extractedEmails.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extracted_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs font-bold mb-2 shadow-sm dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Black &amp; Purple Autonomous Crawler</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-100 dark:bg-purple-500/15 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-sm">
              <Search className="w-6 h-6" />
            </span>
            <span>Deep Web Scraper</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            Crawl target websites up to 4 levels deep, segment contacts into folders of 50, and verify MX records
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/dashboard/leads"
            className="px-5 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md block"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>View Leads Database</span>
          </Link>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-purple-500/20 pb-4">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "single"
              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50"
              : "glass-card text-zinc-400 hover:text-white"
          }`}
        >
          Single Target URL
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === "bulk"
              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50"
              : "glass-card text-zinc-400 hover:text-white"
          }`}
        >
          Bulk Domain Crawler
        </motion.button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scrape Input Card */}
      <div className="p-8 rounded-3xl glass-panel relative overflow-hidden border border-purple-500/20">
        {tab === "single" ? (
          <form onSubmit={handleSingleScrape} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Target Website Domain or URL
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/60" />
                <input
                  type="text"
                  required
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  placeholder="https://example.com or stripe.com"
                  className="w-full pl-11 pr-4 py-3 bg-black/60 border border-purple-500/30 rounded-2xl text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Crawl Depth
                </label>
                <select
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/30 rounded-2xl text-xs text-white focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value={1} className="bg-black text-white">1 Level (Homepage only - Fastest)</option>
                  <option value={2} className="bg-black text-white">2 Levels (Homepage + /contact, /about - Recommended)</option>
                  <option value={3} className="bg-black text-white">3 Levels (Deep team &amp; subpage discovery)</option>
                  <option value={4} className="bg-black text-white">4 Levels (Exhaustive full-site spider)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Quick Sample Domains
                </label>
                <div className="flex flex-wrap gap-2">
                  {sampleDomains.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSingleUrl(d)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Crawling &amp; Verifying MX Records...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Start Deep Crawl</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleBulkScrape} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Folder Name (Batch of ~50 leads per folder)
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Fintech Founders Batch, SaaS Directories"
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/30 rounded-2xl text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Crawl Depth
                </label>
                <select
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/30 rounded-2xl text-xs text-white focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value={1} className="bg-black text-white">1 Level (Homepage only)</option>
                  <option value={2} className="bg-black text-white">2 Levels (Homepage + /contact, /about - Recommended)</option>
                  <option value={3} className="bg-black text-white">3 Levels (Deep subpage discovery)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Paste Multiple Domains / URLs (One per line)
              </label>
              <textarea
                rows={6}
                required
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                placeholder="stripe.com&#10;vercel.com&#10;linear.app&#10;supabase.com"
                className="w-full p-4 bg-black/60 border border-purple-500/30 rounded-2xl text-xs font-mono text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBulkUrls(sampleDomains.join("\n"))}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                + Insert 5 Sample Tech Domains
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initiating Bulk Spider...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Run Bulk Crawler</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        )}
      </div>

      {/* Results View */}
      {extractedEmails.length > 0 && (
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Extracted Prospect Emails</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {extractedEmails.length} verified email addresses found from {activeJob?.target_url}
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
            {extractedEmails.map((email, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-200">{email}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✓ Verified MX
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
