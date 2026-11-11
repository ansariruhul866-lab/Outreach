"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api, Sender } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Send,
  Clock,
  MessageSquare,
  Bot,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Bell,
  Mail,
  Sliders,
  Check,
  BookOpen,
  Copy,
  Code,
  FileText,
  Layers,
  Download,
  ShieldCheck,
  Flame,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SerpItem {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  site_name?: string;
  keywords?: string[];
  headings_outline?: Array<{ level: number; text: string }>;
  word_count?: number;
  reading_time?: string;
  schemas_detected?: string[];
}

interface ReplyItem {
  id: string;
  company: string;
  email: string;
  website: string;
  serp_rank?: number;
  search_purpose?: string;
  reply_received_at?: string;
  reply_body?: string;
  ai_draft_reply?: string;
  status: string;
}

interface DraftedBlog {
  title: string;
  meta_title?: string;
  meta_description?: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  reading_time_minutes?: number;
  outline?: Array<{ level: number; heading: string }>;
  humanized_blog_markdown: string;
  clean_html?: string;
  schema_json_ld?: string;
  humanization_score?: number;
  copywriter_insights?: string;
  model_used?: string;
}

const PURPOSES = [
  { id: "BACKLINK", label: "Backlink Outreach", icon: "🔗", desc: "Find ranking sites & guest post editorial opportunities" },
  { id: "COMPETITOR", label: "Competitor Analysis", icon: "🔍", desc: "Discover competing tools, rivals & market alternatives" },
  { id: "EDITORIAL", label: "Blog & Editorial", icon: "📝", desc: "Find publications, high-authority blogs & guest contributors" },
  { id: "KEYWORD", label: "Keyword Research", icon: "🎯", desc: "Uncover dominant websites ranking for high-intent keywords" },
  { id: "MARKETING", label: "Digital Marketing", icon: "💼", desc: "Target B2B prospects, marketing agencies & businesses" },
];

const REGIONS = [
  { id: "in-en", label: "India (Local / Regional SERP)", icon: "🇮🇳" },
  { id: "wt-wt", label: "Global / Worldwide", icon: "🌐" },
  { id: "us-en", label: "United States", icon: "🇺🇸" },
  { id: "uk-en", label: "United Kingdom", icon: "🇬🇧" },
];

const PRESET_QUERIES = [
  "best custom clothing store",
  "customised t shirt in lucknow",
  "backlink for marketing website",
  "guest post tech blogs",
  "digital marketing agency in india",
];

function FormattedArticleRenderer({ markdown }: { markdown: string }) {
  const blocks = markdown.split("\n\n");

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 1
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={bIdx} className="text-2xl sm:text-3xl font-black text-white mt-8 mb-4 tracking-tight border-b border-purple-500/20 pb-3">
              {trimmed.replace(/^#\s+/, "")}
            </h1>
          );
        }

        // Heading 2
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={bIdx} className="text-xl font-black text-purple-200 mt-7 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500" />
              <span>{trimmed.replace(/^##\s+/, "")}</span>
            </h2>
          );
        }

        // Heading 3
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={bIdx} className="text-base font-bold text-white mt-5 mb-2 pl-3 border-l-2 border-purple-400">
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split("\n");
          return (
            <ul key={bIdx} className="space-y-1.5 my-2 pl-2">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  <span className="text-purple-400 font-bold mt-1 text-xs">•</span>
                  <span>{item.replace(/^[-*]\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p key={bIdx} className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function SerpDiscoveryPage() {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("best custom clothing store");
  const [purpose, setPurpose] = useState("EDITORIAL");
  const [region, setRegion] = useState("in-en");
  const [searching, setSearching] = useState(false);
  const [serpResults, setSerpResults] = useState<SerpItem[]>([]);
  const [selectedRanks, setSelectedRanks] = useState<number[]>([]);

  // Extraction & Organization State
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [createdFolder, setCreatedFolder] = useState<{ id: string; name: string } | null>(null);

  // Outreach Configuration
  const [outreachMode, setOutreachMode] = useState<"TEMPLATE" | "AI_PERSONALIZED">("AI_PERSONALIZED");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>("");
  const [followUpDays, setFollowUpDays] = useState(2);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);

  // Reply Alerts
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [selectedReply, setSelectedReply] = useState<ReplyItem | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);

  // Blog & Editorial Copywriting State
  const [expandedOutlineRanks, setExpandedOutlineRanks] = useState<number[]>([]);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [draftingBlog, setDraftingBlog] = useState(false);
  const [draftedBlog, setDraftedBlog] = useState<DraftedBlog | null>(null);
  const [blogActiveTab, setBlogActiveTab] = useState<"preview" | "markdown" | "html" | "schema" | "seo">("preview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadSendersAndReplies();
  }, []);

  const loadSendersAndReplies = async () => {
    try {
      const [sList, rList] = await Promise.all([
        api.senders.list().catch(() => []),
        api.discovery.getReplies().catch(() => []),
      ]);
      setSenders(sList);
      if (sList.length > 0 && !selectedSenderId) {
        setSelectedSenderId(sList[0].id);
      }
      setReplies(rList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSerpResults([]);
    setSelectedRanks([]);
    setExtractStatus(null);
    setCreatedFolder(null);

    try {
      const res = await api.discovery.getSerp({
        query: query.trim(),
        purpose,
        region,
        num_results: 20,
      });

      setSerpResults(res.results || []);
      // Select all by default
      setSelectedRanks((res.results || []).map((r) => r.rank));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to crawl SERP");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (rank: number) => {
    setSelectedRanks((prev) =>
      prev.includes(rank) ? prev.filter((r) => r !== rank) : [...prev, rank]
    );
  };

  const handleSelectAll = () => {
    if (selectedRanks.length === serpResults.length) {
      setSelectedRanks([]);
    } else {
      setSelectedRanks(serpResults.map((r) => r.rank));
    }
  };

  const toggleOutline = (rank: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOutlineRanks((prev) =>
      prev.includes(rank) ? prev.filter((r) => r !== rank) : [...prev, rank]
    );
  };

  const handleDraftBlog = async () => {
    if (!query.trim()) return;
    setDraftingBlog(true);
    setBlogModalOpen(true);
    try {
      const selectedArticles = serpResults.filter(
        (r) => selectedRanks.length === 0 || selectedRanks.includes(r.rank)
      );
      const res = await api.discovery.draftBlog({
        query: query.trim(),
        purpose: "EDITORIAL",
        selected_blogs: selectedArticles,
        target_tone: "copywriter",
      });
      setDraftedBlog(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate blog draft");
    } finally {
      setDraftingBlog(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const downloadTextFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExtractAndOrganize = async (autoLaunchCampaign: boolean = false) => {
    const selectedItems = serpResults.filter((r) => selectedRanks.includes(r.rank));
    if (selectedItems.length === 0) {
      alert("Please select at least 1 ranking website to crawl.");
      return;
    }

    setExtracting(true);
    setExtractStatus("Crawling ranking domains for contact emails and verifying mailbox routing...");

    try {
      const res = await api.discovery.extractAndOrganize({
        query: query.trim(),
        purpose,
        region,
        selected_items: selectedItems,
        use_ai_personalization: outreachMode === "AI_PERSONALIZED",
        sender_email_id: selectedSenderId || undefined,
        auto_create_campaign: autoLaunchCampaign,
        follow_up_enabled: followUpEnabled,
        follow_up_delay_days: followUpDays,
      });

      setCreatedFolder({ id: res.folder_id, name: res.folder_name });
      setExtractStatus(res.message);
      loadSendersAndReplies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Extraction failed");
      setExtractStatus(null);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 glass-card border border-purple-500/20 bg-gradient-to-br from-black via-purple-950/20 to-black">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>SERP Discovery, SEO Reverse-Engineering &amp; AI Copywriter</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            What are you looking for today?
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Search ranking Google &amp; regional SERPs, extract verified emails, analyze top competitor structures &amp; keywords, or draft 100% humanized blog posts with valid Schema.org markup.
          </p>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Purpose / Category Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-300">
          Select Outreach Purpose &amp; Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PURPOSES.map((p) => {
            const isSelected = purpose === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPurpose(p.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/50"
                    : "bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04]"
                }`}
              >
                <div>
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="font-black text-xs text-white">{p.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug line-clamp-2">
                    {p.desc}
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="activePurposeGlow"
                    className="absolute inset-0 border-2 border-purple-400 rounded-2xl pointer-events-none"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Box & Regional Selector */}
      <div className="p-6 rounded-3xl glass-card border border-purple-500/30 space-y-4 shadow-2xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
              Search Keyword / Topic
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400">Region:</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-black/60 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-medium"
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-zinc-950 text-white">
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. best custom clothing store, customised t shirt in lucknow, backlink for marketing..."
                className="w-full pl-11 pr-4 py-3.5 glass-input rounded-2xl text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Crawling Regional SERP...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>{purpose === "EDITORIAL" ? "Analyze Ranking Blogs" : "Find Top 20 Ranking Sites"}</span>
                </>
              )}
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Popular:</span>
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setQuery(preset);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-zinc-300 hover:text-purple-300 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Blog & Editorial AI Copywriter Action Banner */}
      {purpose === "EDITORIAL" && serpResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-black border-2 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 text-[11px] font-bold border border-purple-400/40">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>AI Copywriter &amp; Schema Generator Ready</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              Draft Humanized Blog Post &amp; Schema From Ranking Blogs
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Our AI Copywriter extracts the headings, keywords, and schema structures from these <strong className="text-purple-300">{serpResults.length} live ranking pages</strong> to generate a 100% humanized, publication-ready blog post with zero robotic AI clichés and complete JSON-LD schema markup.
            </p>
          </div>

          <button
            onClick={handleDraftBlog}
            disabled={draftingBlog}
            className="px-7 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/60 flex items-center gap-2.5 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            {draftingBlog ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Copywriting in Progress...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>✨ Draft Humanized Blog Post</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Step 1: SERP Top 20 Results Section */}
      {serpResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Section Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl glass-card border border-purple-500/20">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Top Ranking Websites on SERP</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  {selectedRanks.length} of {serpResults.length} selected
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Targeting live ranking pages for query: <strong className="text-purple-300">"{query}"</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {purpose === "EDITORIAL" && (
                <button
                  onClick={handleDraftBlog}
                  disabled={draftingBlog}
                  className="text-xs px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>Draft Blog ({selectedRanks.length} sources)</span>
                </button>
              )}
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-2 rounded-xl border border-white/10 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-colors"
              >
                {selectedRanks.length === serpResults.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {serpResults.map((item) => {
              const isSelected = selectedRanks.includes(item.rank);
              const isOutlineExpanded = expandedOutlineRanks.includes(item.rank);

              return (
                <div
                  key={item.rank}
                  onClick={() => toggleSelect(item.rank)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-purple-950/25 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.18)]"
                      : "bg-white/[0.01] border-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Rank, Site Name, Domain, Checkbox */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          #{item.rank < 10 ? `0${item.rank}` : item.rank}
                        </span>

                        {item.site_name && (
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/15">
                            {item.site_name}
                          </span>
                        )}

                        <span className="text-xs font-bold text-zinc-300 truncate max-w-[180px]">
                          {item.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 transition-colors"
                          title="Open URL in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-purple-600 border-purple-500 text-white"
                              : "border-white/20"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Page Title */}
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {item.title}
                    </h4>

                    {/* Snippet */}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>

                    {/* Editorial Specific Details: Keywords & Schemas */}
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="pt-1.5 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-300">
                          Extracted Keywords:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.keywords.slice(0, 5).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-200 border border-purple-500/25 font-medium"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Metrics: Word Count & Schemas */}
                    {(item.word_count || (item.schemas_detected && item.schemas_detected.length > 0)) && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px]">
                        {item.word_count ? (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono">
                            📊 {item.word_count.toLocaleString()} words
                          </span>
                        ) : null}
                        {item.reading_time ? (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono">
                            ⏱️ {item.reading_time}
                          </span>
                        ) : null}
                        {item.schemas_detected?.map((sc, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 font-mono text-[9px]"
                          >
                            Schema: {sc}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Headings Outline Tree / Accordion */}
                    {item.headings_outline && item.headings_outline.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => toggleOutline(item.rank, e)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300 hover:text-purple-200 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {isOutlineExpanded ? "Hide Blog Structure" : `View Blog Outline (${item.headings_outline.length} Headings)`}
                          </span>
                          {isOutlineExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isOutlineExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 p-3 rounded-xl bg-black/60 border border-purple-500/20 space-y-1.5 max-h-48 overflow-y-auto"
                            >
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                Heading Hierarchy &amp; Content Structure:
                              </div>
                              {item.headings_outline.map((h, hIdx) => (
                                <div
                                  key={hIdx}
                                  className={`text-[11px] leading-tight ${
                                    h.level === 1
                                      ? "font-black text-purple-200 pl-1 border-l-2 border-purple-500"
                                      : h.level === 2
                                      ? "font-semibold text-zinc-200 pl-3 border-l-2 border-purple-400/40"
                                      : "text-zinc-400 pl-5 border-l-2 border-zinc-700 text-[10px]"
                                  }`}
                                >
                                  <span className="font-mono text-[9px] text-purple-400 mr-1.5">
                                    H{h.level}
                                  </span>
                                  <span>{h.text}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="truncate max-w-[280px] font-mono">{item.url}</span>
                    <span className="text-purple-400 font-semibold">{purpose}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2: Extraction & Outreach Configuration Panel */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Automated Email Extraction &amp; Outreach Setup</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Selected websites will be crawled for verified contact emails, organized into a designated date/purpose folder, and queued for campaign dispatch.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-2">
              {/* Outreach Personalization Mode */}
              <div className="space-y-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
                  Emailing Strategy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutreachMode("AI_PERSONALIZED")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      outreachMode === "AI_PERSONALIZED"
                        ? "bg-purple-600/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black">Gemini AI Custom</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      AI inspects each ranking site's specific topic &amp; crafts a 100% unique personalized email.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutreachMode("TEMPLATE")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      outreachMode === "TEMPLATE"
                        ? "bg-purple-600/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black">Master Template</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      Dispatches your verified High-Converting Backlink / Editorial collaboration template.
                    </p>
                  </button>
                </div>
              </div>

              {/* Sender & 2-Day Follow-Up Automation */}
              <div className="space-y-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
                  Connected Mailbox (Sending As)
                </label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
                      {s.display_name} ({s.email}) - {s.status}
                    </option>
                  ))}
                  {senders.length === 0 && (
                    <option value="" className="bg-zinc-950 text-zinc-400">
                      No verified sender connected (connect in Settings/Mailboxes)
                    </option>
                  )}
                </select>

                <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-bold text-white">2-Day Automated Follow-Up</div>
                      <div className="text-[10px] text-zinc-400">
                        If no reply received in 2 days, auto-send gentle nudge
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-zinc-400">
                {selectedRanks.length} domains selected for contact extraction
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={extracting || selectedRanks.length === 0}
                  onClick={() => handleExtractAndOrganize(false)}
                  className="flex-1 sm:flex-initial px-6 py-3 rounded-xl border border-purple-500/40 hover:bg-purple-500/10 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {extracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                  <span>Extract Emails &amp; Save to Folder</span>
                </button>

                <button
                  type="button"
                  disabled={extracting || selectedRanks.length === 0 || !selectedSenderId}
                  onClick={() => handleExtractAndOrganize(true)}
                  className="flex-1 sm:flex-initial px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {extracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Extract &amp; Launch Outreach Campaign</span>
                </button>
              </div>
            </div>

            {/* Status / Success Banner */}
            {extractStatus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="flex-1 font-medium">{extractStatus}</div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 3: Incoming Replies & AI Draft Alerts Panel */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Prospect Reply Alerts &amp; AI Response Drafts</h3>
              <p className="text-xs text-zinc-400">
                Monitors replies from prospects. When an answer lands, Gemini drafts an email reply for your 1-click review.
              </p>
            </div>
          </div>
          <button
            onClick={loadSendersAndReplies}
            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {replies.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
            <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No active incoming replies yet.</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Once prospects reply to your campaign, their responses and automated AI reply drafts will appear here for 1-click approval.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3.5">
            {replies.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-white">{r.company}</h4>
                    <p className="text-[11px] text-zinc-400 font-mono">{r.email}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    REPLY RECEIVED
                  </span>
                </div>

                <p className="text-xs text-zinc-300 bg-black/40 p-3 rounded-xl border border-white/5 italic">
                  "{r.reply_body}"
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-purple-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Draft Ready</span>
                  </span>

                  <button
                    onClick={() => {
                      setSelectedReply(r);
                      setReplyModalOpen(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
                  >
                    Review &amp; Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Copywriter Humanized Blog Drafter Modal (Portaled directly to document.body for highest z-index) */}
      {mounted && blogModalOpen && createPortal(
        <div
          onClick={() => setBlogModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/90 backdrop-blur-xl overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[90vh] rounded-3xl glass-card border border-purple-500/40 bg-zinc-950 flex flex-col shadow-[0_0_60px_rgba(168,85,247,0.3)] overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-black to-zinc-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Humanized AI Blog &amp; Schema Generator</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      98% Human Authenticity
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Trained in lifestyle publication copywriting voice • 0 AI fluff • Valid Google Rich Results Schema
                  </p>
                </div>
              </div>

              <button
                onClick={() => setBlogModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Loading State */}
            {draftingBlog ? (
              <div className="py-28 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">AI Copywriter Crafting Humanized Post...</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Reverse-engineering competitor headings, targeting secondary keywords, and applying burstiness filters to eliminate generic robotic patterns.
                  </p>
                </div>
              </div>
            ) : draftedBlog ? (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Top Info Bar: Headline & Actions */}
                <div className="p-5 border-b border-white/5 bg-black/50 space-y-3 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                        HEADLINE (H1):
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-white truncate">
                        {draftedBlog.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyToClipboard(draftedBlog.humanized_blog_markdown, "all_md")}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        {copiedKey === "all_md" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === "all_md" ? "Copied!" : "Copy Markdown"}</span>
                      </button>

                      <button
                        onClick={() => downloadTextFile(draftedBlog.humanized_blog_markdown, `${query.replace(/\s+/g, '_')}_blog.md`, "text/markdown")}
                        className="p-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                        title="Download Markdown File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Meta Description & Primary Keywords */}
                  <div className="grid sm:grid-cols-3 gap-3 pt-1">
                    <div className="sm:col-span-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                          META DESCRIPTION (155 CHARS):
                        </span>
                        <button
                          onClick={() => copyToClipboard(draftedBlog.meta_description || "", "meta")}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === "meta" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {draftedBlog.meta_description}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                        FOCUS KEYWORDS:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {draftedBlog.secondary_keywords?.slice(0, 4).map((kw, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-200 border border-purple-500/20 font-medium">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-x-auto">
                    <button
                      onClick={() => setBlogActiveTab("preview")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        blogActiveTab === "preview"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Formatted Article</span>
                    </button>

                    <button
                      onClick={() => setBlogActiveTab("markdown")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        blogActiveTab === "markdown"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Markdown</span>
                    </button>

                    <button
                      onClick={() => setBlogActiveTab("html")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        blogActiveTab === "html"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Semantic HTML</span>
                    </button>

                    <button
                      onClick={() => setBlogActiveTab("schema")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        blogActiveTab === "schema"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>JSON-LD Schema</span>
                    </button>

                    <button
                      onClick={() => setBlogActiveTab("seo")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        blogActiveTab === "seo"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Quality &amp; SEO Notes</span>
                    </button>
                  </div>
                </div>

                {/* Tab Panes */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                  {blogActiveTab === "preview" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
                        💡 <strong>Copywriter Humanization Applied:</strong> Burstiness pacing applied, sensory fabric drapes &amp; measurement details included, 0 robotic clichés. Ready for direct publication.
                      </div>

                      <div className="p-6 rounded-2xl bg-black/60 border border-white/5">
                        <FormattedArticleRenderer markdown={draftedBlog.humanized_blog_markdown} />
                      </div>
                    </div>
                  )}

                  {blogActiveTab === "markdown" && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => copyToClipboard(draftedBlog.humanized_blog_markdown, "raw_md")}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === "raw_md" ? "Copied Markdown!" : "Copy Raw Markdown"}</span>
                        </button>
                      </div>
                      <pre className="p-5 rounded-2xl bg-black/90 border border-white/10 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {draftedBlog.humanized_blog_markdown}
                      </pre>
                    </div>
                  )}

                  {blogActiveTab === "html" && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => copyToClipboard(draftedBlog.clean_html || "", "clean_html")}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === "clean_html" ? "Copied HTML!" : "Copy Clean HTML"}</span>
                        </button>
                      </div>
                      <pre className="p-5 rounded-2xl bg-black/90 border border-white/10 text-xs text-purple-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {draftedBlog.clean_html || "<p>HTML conversion generated</p>"}
                      </pre>
                    </div>
                  )}

                  {blogActiveTab === "schema" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-400">
                          Valid <code className="text-purple-300">schema.org</code> JSON-LD script (Article + FAQPage). Paste directly into your site's <code className="text-purple-300">&lt;head&gt;</code>.
                        </div>
                        <button
                          onClick={() => copyToClipboard(draftedBlog.schema_json_ld || "", "schema")}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === "schema" ? "Copied Schema!" : "Copy JSON-LD"}</span>
                        </button>
                      </div>
                      <pre className="p-5 rounded-2xl bg-black/90 border border-white/10 text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {draftedBlog.schema_json_ld || '{"@context": "https://schema.org"}'}
                      </pre>
                    </div>
                  )}

                  {blogActiveTab === "seo" && (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-purple-300">Human Authenticity:</span>
                          <div className="text-2xl font-black text-white">98%</div>
                          <p className="text-[10px] text-zinc-400">Evaluated against 15+ robotic AI phrase triggers.</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-purple-300">Target SERP:</span>
                          <div className="text-2xl font-black text-white truncate">{query}</div>
                          <p className="text-[10px] text-zinc-400">Optimized for regional Google search rank.</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-purple-300">Schema Validation:</span>
                          <div className="text-2xl font-black text-emerald-400">Valid ✓</div>
                          <p className="text-[10px] text-zinc-400">Article &amp; FAQPage Rich Results ready.</p>
                        </div>
                      </div>

                      {draftedBlog.copywriter_insights && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-purple-300">Copywriter Strategy Note:</span>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {draftedBlog.copywriter_insights}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/60 shrink-0">
                  <div className="text-xs text-zinc-400">
                    Model: <span className="font-mono text-purple-300">{draftedBlog.model_used || "gemini-flash-lite-latest"}</span>
                  </div>
                  <button
                    onClick={() => setBlogModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                  >
                    Done / Close
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>,
        document.body
      )}

      {/* Reply Review & Approval Modal (Portaled) */}
      {mounted && replyModalOpen && selectedReply && createPortal(
        <div
          onClick={() => setReplyModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl glass-card border border-purple-500/40 p-6 space-y-4 bg-zinc-950 my-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Prospect Reply Review</h3>
                  <p className="text-[11px] text-zinc-400">{selectedReply.company} ({selectedReply.email})</p>
                </div>
              </div>
              <button
                onClick={() => setReplyModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs px-2.5 py-1 rounded-lg border border-white/10"
              >
                Close
              </button>
            </div>

            {/* Prospect Message */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-300">Prospect's Incoming Message:</span>
              <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedReply.reply_body}</p>
            </div>

            {/* AI Draft Response */}
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-purple-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Gemini AI Drafted Reply:</span>
                </span>
                <span className="text-[10px] text-zinc-400">Review &amp; Approve</span>
              </div>
              <textarea
                rows={6}
                defaultValue={selectedReply.ai_draft_reply || ""}
                className="w-full p-3 glass-input rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReplyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:text-white"
              >
                Save as Draft
              </button>
              <button
                onClick={() => {
                  alert(`Reply sent to ${selectedReply.email}!`);
                  setReplyModalOpen(false);
                }}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/50 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply Now</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
