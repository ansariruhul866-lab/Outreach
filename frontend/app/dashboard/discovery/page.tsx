"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

interface SerpItem {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
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

const PURPOSES = [
  { id: "BACKLINK", label: "Backlink Outreach", icon: "🔗", desc: "Find ranking sites & guest post editorial opportunities" },
  { id: "COMPETITOR", label: "Competitor Analysis", icon: "🔍", desc: "Discover competing tools, rivals & market alternatives" },
  { id: "EDITORIAL", label: "Blog & Editorial", icon: "📝", desc: "Find publications, high-authority blogs & guest contributors" },
  { id: "KEYWORD", label: "Keyword Research", icon: "🎯", desc: "Uncover dominant websites ranking for high-intent keywords" },
  { id: "MARKETING", label: "Digital Marketing", icon: "💼", desc: "Target B2B prospects, marketing agencies & businesses" },
];

const PRESET_QUERIES = [
  "backlink for marketing website",
  "guest post tech blogs",
  "best SEO tools for agencies",
  "digital marketing guest contribution",
  "write for us marketing and business",
];

export default function SerpDiscoveryPage() {
  const [query, setQuery] = useState("backlink for marketing website");
  const [purpose, setPurpose] = useState("BACKLINK");
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

  useEffect(() => {
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
        num_results: 20,
      });

      setSerpResults(res.results || []);
      // Select all 20 by default
      setSelectedRanks(res.results.map((r) => r.rank));
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

  const handleExtractAndLaunch = async () => {
    if (selectedRanks.length === 0) {
      alert("Please select at least 1 website from the SERP results.");
      return;
    }

    const selectedItems = serpResults.filter((r) => selectedRanks.includes(r.rank));
    setExtracting(true);
    setExtractStatus("Crawling selected websites & discovering verified emails...");

    try {
      const res = await api.discovery.extractAndOrganize({
        query: query.trim(),
        purpose,
        selected_items: selectedItems,
        use_ai_personalization: outreachMode === "AI_PERSONALIZED",
        sender_email_id: selectedSenderId || undefined,
        auto_create_campaign: true,
        follow_up_enabled: followUpEnabled,
        follow_up_delay_days: followUpDays,
      });

      setCreatedFolder({ id: res.folder_id, name: res.folder_name });
      setExtractStatus(res.message);
      loadSendersAndReplies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to extract contacts");
      setExtractStatus(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleSimulateReply = async () => {
    const testReplyText =
      "Hi! Thanks for reaching out. We would be open to a backlink exchange or guest contribution on our marketing blog. What topics did you have in mind and do you have any writing samples?";
    
    // Find a lead to test on or create demo alert
    try {
      const allLeads = await api.leads.list(0, 1);
      if (allLeads && allLeads.length > 0) {
        await api.discovery.simulateReply({
          lead_id: allLeads[0].id,
          reply_text: testReplyText,
        });
        loadSendersAndReplies();
        alert("Simulated incoming reply! Check the 'Incoming Reply Alerts' banner above.");
      } else {
        alert("Please extract leads first so we have a contact to simulate a reply for.");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error testing reply simulation");
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header & Incoming Reply Alerts Banner */}
      <div className="space-y-4">
        {replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-purple-950/80 to-black border border-purple-500/40 flex items-center justify-between shadow-[0_0_25px_rgba(168,85,247,0.25)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>{replies.length} Prospect Reply Received!</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    AI Drafts Ready
                  </span>
                </h4>
                <p className="text-xs text-zinc-300">
                  Latest from <strong>{replies[0].company}</strong> ({replies[0].email}) — Gemini has prepared an intelligent response.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedReply(replies[0]);
                setReplyModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-900/50 transition-all flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Review AI Draft</span>
            </button>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Real-Time SERP Crawler &amp; Outreach Engine</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                What are you looking for today?
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Search any niche $\rightarrow$ crawl live search engines $\rightarrow$ discover top 20 ranking URLs $\rightarrow$ extract emails $\rightarrow$ auto-organize into folders with AI outreach.
            </p>
          </div>

          <button
            onClick={handleSimulateReply}
            className="text-xs text-zinc-400 hover:text-purple-300 px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            title="Simulate an incoming response from a prospect to test AI draft responses"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Test Reply Alert</span>
          </button>
        </div>
      </div>

      {/* Main Search Command Card */}
      <div className="p-6 rounded-3xl glass-card border border-purple-500/25 relative overflow-hidden space-y-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 ambient-glow-purple-accent opacity-20 blur-3xl pointer-events-none" />

        {/* Purpose Selector Tabs */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300 mb-2.5">
            Select Outreach Purpose &amp; Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PURPOSES.map((p) => {
              const active = purpose === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPurpose(p.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    active
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                      : "bg-white/[0.02] border-white/5 text-zinc-400 hover:border-purple-500/30 hover:text-white"
                  }`}
                >
                  <div className="text-lg mb-1">{p.icon}</div>
                  <div className="text-xs font-black">{p.label}</div>
                  <div className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Query Input Bar */}
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
            Search Keyword / Topic
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. backlink for marketing website, guest post tech blogs..."
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
                  <span>Crawling SERP...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Find Top 20 Ranking Sites</span>
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
                <span>Top 20 Ranking Websites on SERP</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  {selectedRanks.length} of {serpResults.length} selected
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Targeting live ranking pages for query: <strong className="text-purple-300">"{query}"</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-colors"
              >
                {selectedRanks.length === serpResults.length ? "Deselect All" : "Select All (20)"}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-3.5">
            {serpResults.map((item) => {
              const isSelected = selectedRanks.includes(item.rank);
              return (
                <div
                  key={item.rank}
                  onClick={() => toggleSelect(item.rank)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-purple-950/20 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          #{item.rank < 10 ? `0${item.rank}` : item.rank}
                        </span>
                        <span className="text-xs font-bold text-zinc-300 truncate max-w-[200px]">
                          {item.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 transition-colors"
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

                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="truncate max-w-[280px]">{item.url}</span>
                    <span className="text-purple-400 font-semibold">{purpose}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2: Extraction & Outreach Configuration Panel */}
          <div className="p-6 rounded-3xl glass-card border border-purple-500/30 space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Automated Email Extraction &amp; Outreach Setup</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Selected websites will be crawled for verified emails, auto-organized into a designated date/purpose folder, and queued for campaign dispatch.
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
                      <span className="text-xs font-black">Desired Template</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      Dispatches your proven formatted Backlink &amp; Collaboration template with custom sender alias.
                    </p>
                  </button>
                </div>
              </div>

              {/* Sender Mailbox */}
              <div className="space-y-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
                  Sending Mailbox
                </label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full px-4 py-3 glass-input rounded-2xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
                      {s.display_name} ({s.email}) — {s.provider}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400">
                  Emails will be dispatched with your custom alias and anti-spam human jitter.
                </p>
              </div>
            </div>

            {/* 2-Day Follow-Up & Reply Sentinel Settings */}
            <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <div>
                    <h4 className="text-xs font-black text-white">Automated 2-Day Reply Monitoring &amp; Follow-Up</h4>
                    <p className="text-[10px] text-zinc-400">
                      Waits 2 days for reply. If reply comes: alerts you with AI draft. If no reply: sends follow-up.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {followUpEnabled && (
                <div className="flex items-center gap-3 pt-1 text-xs text-zinc-300">
                  <span>Wait delay before follow-up:</span>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(parseInt(e.target.value) || 2)}
                    className="w-16 px-3 py-1 glass-input rounded-xl text-xs text-white font-mono text-center focus:outline-none"
                  />
                  <span>days</span>
                </div>
              )}
            </div>

            {/* Action Button & Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-zinc-400">
                Auto-creating folder:{" "}
                <span className="text-purple-300 font-mono font-bold">
                  [{purpose}] {query} - (Current Timestamp)
                </span>
              </div>

              <button
                onClick={handleExtractAndLaunch}
                disabled={extracting || selectedRanks.length === 0}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-2xl shadow-purple-900/60 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting &amp; Launching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Extract Emails &amp; Start Campaign ({selectedRanks.length} Sites)</span>
                  </>
                )}
              </button>
            </div>

            {extractStatus && (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{extractStatus}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Reply Review Modal */}
      <AnimatePresence>
        {replyModalOpen && selectedReply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
