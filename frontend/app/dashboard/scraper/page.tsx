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
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7857FF]/10 border border-[#7857FF]/30 text-[#A78BFA] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#22D3C5]" />
            <span>Autonomous Lead &amp; SERP Crawler</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F7FF] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA]">
              <Search className="w-5 h-5" />
            </span>
            <span>Deep Web Scraper</span>
          </h1>
          <p className="text-xs text-[#A3AEC2] mt-1">
            Crawl target websites up to 4 levels deep, segment contacts into folders, and verify DNS MX records.
          </p>
        </div>

        <div>
          <Link
            href="/dashboard/leads"
            className="px-4 py-2 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#232B40] text-[#F5F7FF] text-xs font-semibold flex items-center gap-2 transition-all block"
          >
            <Users className="w-3.5 h-3.5 text-[#22D3C5]" />
            <span>View Leads Database</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#283149] pb-3">
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            tab === "single"
              ? "bg-[#7857FF] text-[#F5F7FF] shadow-sm"
              : "bg-[#0E1220] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF]"
          }`}
        >
          Single Target URL
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            tab === "bulk"
              ? "bg-[#7857FF] text-[#F5F7FF] shadow-sm"
              : "bg-[#0E1220] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF]"
          }`}
        >
          Bulk Domain Crawler
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#F16C7C]/10 border border-[#F16C7C]/25 text-[#F16C7C] text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#32C98A]/10 border border-[#32C98A]/25 text-[#32C98A] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scrape Input Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#141A29] border border-[#283149] shadow-lg">
        {tab === "single" ? (
          <form onSubmit={handleSingleScrape} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                Target Website Domain or URL
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 w-4 h-4 text-[#727E96]" />
                <input
                  type="text"
                  required
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  placeholder="https://example.com or stripe.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                  Crawl Depth
                </label>
                <select
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                >
                  <option value={1} className="bg-[#0E1220] text-[#F5F7FF]">1 Level (Homepage only - Fastest)</option>
                  <option value={2} className="bg-[#0E1220] text-[#F5F7FF]">2 Levels (Homepage + /contact, /about - Recommended)</option>
                  <option value={3} className="bg-[#0E1220] text-[#F5F7FF]">3 Levels (Deep team &amp; subpage discovery)</option>
                  <option value={4} className="bg-[#0E1220] text-[#F5F7FF]">4 Levels (Exhaustive full-site spider)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                  Quick Sample Domains
                </label>
                <div className="flex flex-wrap gap-2">
                  {sampleDomains.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSingleUrl(d)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0E1220] border border-[#283149] hover:bg-[#1B2233] text-[#A3AEC2] hover:text-[#F5F7FF] text-[11px] font-medium transition-all"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#F5F7FF]" />
                  <span>Crawling &amp; Verifying MX Records...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-[#F5F7FF]" />
                  <span>Start Deep Crawl</span>
                  <ArrowRight className="w-4 h-4 text-[#F5F7FF]" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBulkScrape} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                  Folder Name (Batch Segmentation)
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Fintech Founders Batch, SaaS Directories"
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                  Crawl Depth
                </label>
                <select
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                >
                  <option value={1} className="bg-[#0E1220] text-[#F5F7FF]">1 Level (Homepage only)</option>
                  <option value={2} className="bg-[#0E1220] text-[#F5F7FF]">2 Levels (Homepage + /contact, /about - Recommended)</option>
                  <option value={3} className="bg-[#0E1220] text-[#F5F7FF]">3 Levels (Deep subpage discovery)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3AEC2] mb-2">
                Paste Multiple Domains / URLs (One per line)
              </label>
              <textarea
                rows={6}
                required
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                placeholder="stripe.com&#10;vercel.com&#10;linear.app&#10;supabase.com"
                className="w-full p-3.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs font-mono text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBulkUrls(sampleDomains.join("\n"))}
                className="text-xs text-[#438BFF] hover:text-[#7857FF] font-medium transition-colors"
              >
                + Insert 5 Sample Tech Domains
              </button>

              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F5F7FF]" />
                    <span>Initiating Bulk Spider...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-[#F5F7FF]" />
                    <span>Run Bulk Crawler</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Results View */}
      {extractedEmails.length > 0 && (
        <div className="rounded-2xl bg-[#141A29] border border-[#283149] overflow-hidden shadow-lg">
          <div className="p-5 border-b border-[#283149] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-heading text-[#F5F7FF]">Extracted Prospect Emails</h2>
              <p className="text-xs text-[#A3AEC2] mt-0.5">
                {extractedEmails.length} verified email addresses found from {activeJob?.target_url}
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#232B40] text-[#F5F7FF] text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#22D3C5]" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="divide-y divide-[#283149] max-h-96 overflow-y-auto">
            {extractedEmails.map((email, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between bg-[#0E1220]/40">
                <span className="font-mono text-xs text-[#F5F7FF]">{email}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#32C98A]/15 text-[#32C98A] border border-[#32C98A]/30">
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
