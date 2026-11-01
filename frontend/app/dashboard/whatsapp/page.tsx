"use client";

import React, { useEffect, useState, useRef } from "react";
import { api, WhatsAppSender, Lead, WhatsAppMessageLog } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Smartphone,
  Layers,
  Sparkles,
  Play,
  Pause,
  Clock,
  Check,
  RotateCcw,
  ShieldAlert,
  History,
  Zap,
  Share2,
} from "lucide-react";

interface QueueItem {
  lead_id: string;
  recipient_name: string;
  recipient_phone: string;
  message: string;
  wa_link: string;
  web_link: string;
  sent?: boolean;
}

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
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

export default function WhatsAppPage() {
  const [senders, setSenders] = useState<WhatsAppSender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>("");
  const [history, setHistory] = useState<WhatsAppMessageLog[]>([]);
  const [leadsWithPhone, setLeadsWithPhone] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Sender Modal
  const [addSenderModalOpen, setAddSenderModalOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newSenderName, setNewSenderName] = useState("");
  const [addingSender, setAddingSender] = useState(false);

  // Message Template
  const [templateType, setTemplateType] = useState<"pitch" | "followup" | "custom">("pitch");
  const [directPhone, setDirectPhone] = useState("");
  const [directName, setDirectName] = useState("");
  const [directMessage, setDirectMessage] = useState(
    "Hi {{firstName}},\n\nI came across your business {{company}} and wanted to connect directly regarding our high-growth outreach tools.\n\nAre you available for a quick chat this week?\n\nBest regards!"
  );

  // Bulk WA queue
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkQueue, setBulkQueue] = useState<QueueItem[]>([]);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [isInstantSending, setIsInstantSending] = useState(false);

  // Auto-Runner State
  const [autoRunning, setAutoRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(15);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  // Switch template presets
  const handleTemplateSelect = (type: "pitch" | "followup" | "custom") => {
    setTemplateType(type);
    if (type === "pitch") {
      setDirectMessage(
        "Hi {{firstName}},\n\nI came across your business {{company}} and wanted to connect directly regarding our high-growth outreach tools.\n\nAre you available for a quick chat this week?\n\nBest regards!"
      );
    } else if (type === "followup") {
      setDirectMessage(
        "Hi {{firstName}},\n\nFollowing up on my previous note regarding {{company}}. Just wanted to see if you had a brief moment to explore how we can help you scale?\n\nLooking forward to hearing from you!"
      );
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [sList, hList, lList] = await Promise.all([
        api.whatsapp.listSenders().catch(() => []),
        api.whatsapp.getHistory().catch(() => []),
        api.leads.list(0, 500).catch(() => []),
      ]);
      setSenders(sList || []);
      if (sList && sList.length > 0 && !selectedSenderId) {
        const def = sList.find((s) => s.is_default) || sList[0];
        setSelectedSenderId(def.id);
      }
      setHistory(hList || []);
      const withPhone = (Array.isArray(lList) ? lList : []).filter(
        (l) => l.phone && l.phone.trim().length >= 7
      );
      setLeadsWithPhone(withPhone);
      // Default to first 20 leads selected for 1-click convenience
      setSelectedLeadIds(withPhone.slice(0, 20).map((l) => l.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-Runner countdown & dispatch effect
  useEffect(() => {
    if (!autoRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (currentIndex >= bulkQueue.length) {
      setAutoRunning(false);
      setNotice("🎉 Bulk WhatsApp sequence completed!");
      setTimeout(() => setNotice(null), 5000);
      return;
    }

    setCountdown(delaySeconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          dispatchLead(currentIndex);
          setCurrentIndex((idx) => idx + 1);
          return delaySeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRunning, currentIndex, bulkQueue.length, delaySeconds]);

  // Dispatch single lead from queue
  const dispatchLead = async (idx: number) => {
    const item = bulkQueue[idx];
    if (!item) return;

    window.open(item.web_link, "_blank");

    setBulkQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, sent: true } : q))
    );

    try {
      await api.whatsapp.logSent({
        lead_id: item.lead_id || undefined,
        recipient_phone: item.recipient_phone,
        recipient_name: item.recipient_name,
        message: item.message,
        sender_id: selectedSenderId || undefined,
      });
      api.whatsapp.getHistory().then((h) => setHistory(h || [])).catch(() => {});
    } catch (err) {
      console.error("Failed to log message:", err);
    }
  };

  // 1-CLICK SEND TO 1-20 PERSONS IN ONE GO
  const handleInstantBatchSend = async (targetCount?: number) => {
    const leadsToSend = targetCount
      ? leadsWithPhone.slice(0, targetCount)
      : leadsWithPhone.filter((l) => selectedLeadIds.includes(l.id));

    if (leadsToSend.length === 0) {
      alert("Please select at least 1 contact with a phone number (up to 20).");
      return;
    }

    const batch = leadsToSend.slice(0, 20);
    setIsInstantSending(true);

    try {
      const res = await api.whatsapp.bulkGenerateLinks({
        sender_id: selectedSenderId || undefined,
        message_template: directMessage,
        lead_ids: batch.map((l) => l.id),
      });

      const items = res.items || [];
      if (items.length === 0) {
        alert("No valid phone numbers found for the selected contacts.");
        setIsInstantSending(false);
        return;
      }

      const queueWithState = items.map((item) => ({ ...item, sent: true }));
      setBulkQueue(queueWithState);

      items.forEach((item, index) => {
        setTimeout(() => {
          window.open(item.web_link, "_blank");
        }, index * 350);
      });

      await api.whatsapp.batchLogSent(
        items.map((it) => ({
          lead_id: it.lead_id,
          recipient_phone: it.recipient_phone,
          recipient_name: it.recipient_name,
          message: it.message,
          sender_id: selectedSenderId || undefined,
        }))
      );

      api.whatsapp.getHistory().then((h) => setHistory(h || [])).catch(() => {});

      setNotice(
        `🚀 Dispatched ${items.length} WhatsApp chats in 1 click! Click 'Send' in each tab to deliver.`
      );
      setTimeout(() => setNotice(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to execute 1-click batch send");
    } finally {
      setIsInstantSending(false);
    }
  };

  // Native WhatsApp Multi-Contact Share
  const handleNativeWhatsAppShare = () => {
    const rendered = directMessage
      .replace("{{firstName}}", "there")
      .replace("{{company}}", "your business");
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(rendered)}`;
    window.open(shareUrl, "_blank");
  };

  const handleStartAutoRun = () => {
    if (bulkQueue.length === 0) {
      alert("Please generate a WhatsApp bulk queue first.");
      return;
    }
    const nextIdx = bulkQueue.findIndex((item) => !item.sent);
    if (nextIdx === -1) {
      if (confirm("All leads in the queue have been marked sent. Do you want to reset and start over?")) {
        setBulkQueue((prev) => prev.map((q) => ({ ...q, sent: false })));
        setCurrentIndex(0);
        setAutoRunning(true);
      }
      return;
    }
    setCurrentIndex(nextIdx);
    setAutoRunning(true);
  };

  const handlePauseAutoRun = () => {
    setAutoRunning(false);
  };

  const handleResetQueue = () => {
    setAutoRunning(false);
    setCurrentIndex(0);
    setBulkQueue((prev) => prev.map((q) => ({ ...q, sent: false })));
  };

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneNumber.trim()) return;

    setAddingSender(true);
    try {
      await api.whatsapp.addSender({
        phone_number: newPhoneNumber.trim(),
        display_name: newSenderName.trim() || `WhatsApp (${newPhoneNumber.trim()})`,
      });
      setAddSenderModalOpen(false);
      setNewPhoneNumber("");
      setNewSenderName("");
      setNotice("✓ WhatsApp number added successfully");
      loadData();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add WhatsApp sender");
    } finally {
      setAddingSender(false);
    }
  };

  const handleDeleteSender = async (id: string) => {
    if (!confirm("Are you sure you want to remove this WhatsApp number?")) return;
    try {
      await api.whatsapp.deleteSender(id);
      setSenders((prev) => prev.filter((s) => s.id !== id));
      if (selectedSenderId === id) setSelectedSenderId("");
      setNotice("✓ Sender removed");
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove sender");
    }
  };

  // Send Direct Single Message
  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim() || !directMessage.trim()) {
      alert("Please enter recipient phone number and message.");
      return;
    }

    try {
      const rendered = directMessage
        .replace("{{firstName}}", directName.trim() || "there")
        .replace("{{company}}", "your business");

      const res = await api.whatsapp.generateLink({
        sender_id: selectedSenderId || undefined,
        recipient_phone: directPhone.trim(),
        recipient_name: directName.trim() || undefined,
        message: rendered,
      });

      window.open(res.wa_link, "_blank");
      setNotice(`✓ WhatsApp opened for +${res.recipient_phone}!`);
      loadData();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate WhatsApp link");
    }
  };

  // Generate Bulk Click-to-Send Queue
  const handleGenerateBulk = async () => {
    if (selectedLeadIds.length === 0) {
      alert("Please select at least one contact with a phone number.");
      return;
    }

    setGeneratingBulk(true);
    setAutoRunning(false);
    try {
      const res = await api.whatsapp.bulkGenerateLinks({
        sender_id: selectedSenderId || undefined,
        message_template: directMessage,
        lead_ids: selectedLeadIds,
      });

      const queueWithState = (res.items || []).map((item) => ({
        ...item,
        sent: false,
      }));

      setBulkQueue(queueWithState);
      setCurrentIndex(0);
      setNotice(`✓ Generated 1-click WhatsApp queue for ${res.total} contacts!`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate bulk links");
    } finally {
      setGeneratingBulk(false);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectCount = (n: number) => {
    const subset = leadsWithPhone.slice(0, n).map((l) => l.id);
    setSelectedLeadIds(subset);
  };

  const selectedCount = selectedLeadIds.length;
  const sentCount = bulkQueue.filter((q) => q.sent).length;
  const progressPercent =
    bulkQueue.length > 0 ? Math.round((sentCount / bulkQueue.length) * 100) : 0;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="p-8 space-y-8 max-w-7xl mx-auto w-full"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple WhatsApp Outreach</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-900/40">
              <MessageSquare className="w-6 h-6" />
            </span>
            <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              Direct WhatsApp Outreach
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Send high-impact WhatsApp messages to 1&ndash;20 prospects in one go with one single template and one click.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddSenderModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add WhatsApp Number</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl glass-panel border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2.5 shadow-lg shadow-purple-950/50"
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1-CLICK INSTANT DISPATCH HERO BANNER (1-20 PERSONS IN ONE GO) */}
      <motion.div
        variants={cardVariants}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="p-8 rounded-3xl glass-panel border border-purple-500/40 relative overflow-hidden group shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 ambient-glow-purple-accent opacity-35 blur-3xl pointer-events-none group-hover:opacity-55 transition-opacity" />
        <div className="absolute bottom-0 left-10 w-64 h-64 ambient-glow-purple-lg opacity-25 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 fill-current text-purple-400" />
              <span>1-Click Multi-Contact Dispatch</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Send to {selectedCount > 0 ? Math.min(selectedCount, 20) : "1–20"} Contacts in One Go</span>
            </h2>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Select up to 20 prospects, review your active template, and launch with a single click. All {Math.min(selectedCount || 20, 20)} personalized WhatsApp chats open seamlessly in rapid succession, with automatic delivery logging.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(168, 85, 247, 0.45)" }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleInstantBatchSend()}
              disabled={isInstantSending || selectedCount === 0}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-600 hover:from-purple-400 hover:to-fuchsia-400 text-white font-black text-sm shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2.5 transition-all disabled:opacity-40"
            >
              {isInstantSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Dispatching {Math.min(selectedCount, 20)} Chats...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current text-white" />
                  <span>1-Click Send to All {Math.min(selectedCount, 20)} Leads</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleNativeWhatsAppShare}
              title="Open WhatsApp Multi-Contact Share picker to select multiple recipients inside WhatsApp"
              className="px-5 py-3.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Forward in WhatsApp</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Your Connected WhatsApp Numbers */}
      <motion.div variants={cardVariants} className="p-6 rounded-3xl glass-panel space-y-4 border-purple-500/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Your Sender WhatsApp Numbers ({senders.length})</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select which WhatsApp sender profile you want to send from. Add personal or business numbers.
            </p>
          </div>
        </div>

        {senders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl glass-card border border-purple-500/10 text-zinc-400 space-y-3">
            <Phone className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
            <p className="text-xs">No WhatsApp sender numbers added yet.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAddSenderModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition-all"
            >
              + Add Your First WhatsApp Number
            </motion.button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {senders.map((s) => (
              <motion.div
                key={s.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedSenderId(s.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between ${
                  selectedSenderId === s.id
                    ? "glass-panel border-purple-500/70 shadow-[0_0_25px_rgba(168,85,247,0.3)] bg-purple-500/[0.12]"
                    : "glass-card hover:border-purple-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/35 flex items-center justify-center text-purple-300 font-bold shadow-inner">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{s.display_name}</h3>
                    <p className="text-[11px] font-mono text-purple-300 font-semibold">+{s.phone_number}</p>
                    {s.is_default && (
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Default Sender</span>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSender(s.id);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                  title="Remove number"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Main Grid: Direct Single Sender & Leads Contacts */}
      <motion.div variants={cardVariants} className="grid lg:grid-cols-2 gap-6">
        {/* Message Composer & Template */}
        <div className="p-6 rounded-3xl glass-panel space-y-5 flex flex-col justify-between border-purple-500/20">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                <span>One Single Outreach Template</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                This template is automatically customized with lead details for all 1&ndash;20 recipients.
              </p>
            </div>

            {/* Template Presets */}
            <div className="flex items-center gap-2 pb-2 border-b border-purple-500/20">
              <span className="text-[11px] uppercase font-bold text-zinc-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleTemplateSelect("pitch")}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  templateType === "pitch"
                    ? "bg-purple-500/30 text-purple-200 border border-purple-500/50 font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                Pitch &amp; Outreach
              </button>
              <button
                type="button"
                onClick={() => handleTemplateSelect("followup")}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  templateType === "followup"
                    ? "bg-purple-500/30 text-purple-200 border border-purple-500/50 font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                Follow Up
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  templateType === "custom"
                    ? "bg-purple-500/30 text-purple-200 border border-purple-500/50 font-bold shadow-sm"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                Custom
              </button>
            </div>

            <form onSubmit={handleSendDirect} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Template Body
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono">
                    Tags: {"{{firstName}}"}, {"{{company}}"}, {"{{website}}"}
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  className="w-full p-4 glass-input rounded-2xl text-xs font-mono text-white focus:outline-none leading-relaxed"
                />
              </div>

              {/* Quick 1-off single prospect send */}
              <div className="pt-3 border-t border-purple-500/20 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Or Send to a Single Individual:
                </span>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="Phone (e.g. 919876543210)"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Name (Optional)"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!directPhone.trim()}
                  className="w-full py-2.5 rounded-xl glass-card hover:border-purple-500/50 disabled:opacity-40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send to this Single Phone Number</span>
                  <ExternalLink className="w-3 h-3" />
                </motion.button>
              </div>
            </form>
          </div>
        </div>

        {/* Database Contacts with Phone Numbers (1-20 Selection) */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 flex flex-col justify-between border-purple-500/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Prospect Contacts ({leadsWithPhone.length})</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Choose 1 to 20 prospects to send in one single click
                </p>
              </div>

              {/* 1-Click Batch Selection Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Select:</span>
                <button
                  type="button"
                  onClick={() => selectCount(5)}
                  className="px-2.5 py-1 rounded-lg glass-card hover:border-purple-500/40 text-xs font-semibold text-zinc-300 transition-all"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => selectCount(10)}
                  className="px-2.5 py-1 rounded-lg glass-card hover:border-purple-500/40 text-xs font-semibold text-zinc-300 transition-all"
                >
                  10
                </button>
                <button
                  type="button"
                  onClick={() => selectCount(15)}
                  className="px-2.5 py-1 rounded-lg glass-card hover:border-purple-500/40 text-xs font-semibold text-zinc-300 transition-all"
                >
                  15
                </button>
                <button
                  type="button"
                  onClick={() => selectCount(20)}
                  className="px-3 py-1 rounded-lg bg-purple-500/30 text-purple-200 border border-purple-500/50 text-xs font-bold transition-all shadow-sm"
                >
                  Top 20
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="px-2 py-1 rounded-lg glass-card text-[11px] text-zinc-400 hover:text-white transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            {leadsWithPhone.length === 0 ? (
              <div className="p-8 text-center rounded-2xl glass-card border border-purple-500/10 text-zinc-500 space-y-2">
                <Smartphone className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
                <p className="text-xs text-white font-semibold">No contacts with phone numbers found</p>
                <p className="text-[11px] text-zinc-400">
                  Go to <a href="/dashboard/leads" className="text-purple-400 underline">Leads &amp; Folders</a> to add phone numbers or import contacts via CSV.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-purple-500/10 border border-purple-500/20 rounded-2xl bg-black/60 backdrop-blur-md p-2 space-y-1">
                {leadsWithPhone.map((l) => {
                  const isChecked = selectedLeadIds.includes(l.id);
                  return (
                    <label
                      key={l.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                        isChecked ? "bg-purple-950/40 border border-purple-500/20" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectLead(l.id)}
                        className="rounded border-zinc-700 text-purple-600 focus:ring-0"
                      />
                      <div className="flex-1 truncate">
                        <p className="font-mono text-purple-300 font-bold text-xs truncate">
                          +{l.phone}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {l.first_name || l.email || "Contact"} {l.company ? `• ${l.company}` : ""}
                        </p>
                      </div>

                      <a
                        href={`https://wa.me/${l.phone?.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          directMessage
                            .replace("{{firstName}}", l.first_name || "there")
                            .replace("{{company}}", l.company || "your business")
                            .replace("{{website}}", l.website || "")
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          api.whatsapp.logSent({
                            lead_id: l.id,
                            recipient_phone: l.phone || "",
                            recipient_name: l.first_name || l.company || "",
                            message: directMessage,
                            sender_id: selectedSenderId || undefined,
                          }).catch(() => {});
                        }}
                        className="p-1.5 px-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-1 transition-all border border-purple-500/30"
                        title="Send via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </a>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Quick 1-Click Trigger footer */}
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
              <span>Selected: <strong className="text-white">{selectedCount}</strong> (max 20 per 1-click batch)</span>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleGenerateBulk}
                disabled={generatingBulk || selectedLeadIds.length === 0}
                className="px-3.5 py-1.5 rounded-xl glass-card hover:border-purple-500/50 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                {generatingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>View Queue Details</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bulk Dispatch Queue & Automation Controls */}
      {bulkQueue.length > 0 && (
        <motion.div variants={cardVariants} className="p-6 rounded-3xl glass-panel space-y-6 border-purple-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Bulk WhatsApp Dispatch Queue ({bulkQueue.length} Contacts)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Send all in 1 click or use the automated safety runner with pacing
              </p>
            </div>

            {/* Automation Control Toolbar */}
            <div className="flex items-center flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => handleInstantBatchSend()}
                disabled={isInstantSending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black text-xs shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>1-Click Launch All</span>
              </motion.button>

              <div className="flex items-center gap-2 glass-input px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] text-zinc-400 font-semibold">Delay:</span>
                <select
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  disabled={autoRunning}
                  className="bg-transparent text-xs text-purple-300 font-bold focus:outline-none"
                >
                  <option value={5} className="bg-black">5 seconds (Rapid)</option>
                  <option value={10} className="bg-black">10 seconds</option>
                  <option value={15} className="bg-black">15 seconds (Recommended)</option>
                  <option value={25} className="bg-black">25 seconds (Safe)</option>
                  <option value={40} className="bg-black">40 seconds (Ultra Safe)</option>
                </select>
              </div>

              {!autoRunning ? (
                <button
                  type="button"
                  onClick={handleStartAutoRun}
                  className="px-3.5 py-2 rounded-xl glass-card hover:border-purple-500/50 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
                  <span>Auto Sequence</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseAutoRun}
                  className="px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition-all"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetQueue}
                title="Reset all to unsent"
                className="p-2 rounded-xl glass-card text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setBulkQueue([])}
                className="text-xs text-zinc-400 hover:text-red-400 px-2 py-1"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>
                Dispatched: <strong className="text-white">{sentCount}</strong> of <strong className="text-white">{bulkQueue.length}</strong> ({progressPercent}%)
              </span>
              {autoRunning && (
                <span className="text-purple-300 font-semibold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sequence Active (Lead {currentIndex + 1} of {bulkQueue.length} &bull; Next in {countdown}s)
                </span>
              )}
            </div>
            <div className="w-full h-2 rounded-full bg-black overflow-hidden border border-purple-500/20">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 transition-all duration-300 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bulkQueue.map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                className={`p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between space-y-3 ${
                  item.sent
                    ? "glass-card opacity-60"
                    : autoRunning && idx === currentIndex
                    ? "glass-panel border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/50"
                    : "glass-card hover:border-purple-500/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{item.recipient_name}</span>
                    <span className="font-mono text-purple-300 text-xs font-semibold">+{item.recipient_phone}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-mono line-clamp-3 mt-2 leading-relaxed bg-black/60 p-2.5 rounded-xl border border-purple-500/20">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => dispatchLead(idx)}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      item.sent
                        ? "bg-purple-500/25 text-purple-200 border border-purple-500/40"
                        : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black shadow-md shadow-purple-900/40"
                    }`}
                  >
                    {item.sent ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sent (Resend)</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open WhatsApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Message Dispatch History */}
      {history.length > 0 && (
        <motion.div variants={cardVariants} className="p-6 rounded-3xl glass-panel space-y-4 border-purple-500/20">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <span>Recent WhatsApp Dispatch Activity ({history.length})</span>
          </h2>

          <div className="divide-y divide-purple-500/10 rounded-2xl glass-card overflow-hidden">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="p-3.5 flex items-center justify-between text-xs gap-4 hover:bg-purple-950/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {h.recipient_name || "Contact"} <span className="font-mono text-purple-300 font-normal">+{h.recipient_phone}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate max-w-md">{h.message}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                    DISPATCHED
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{h.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add WhatsApp Number Modal */}
      <AnimatePresence>
        {addSenderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md p-6 glass-panel rounded-3xl shadow-2xl border border-purple-500/30"
            >
              <button
                onClick={() => setAddSenderModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-white mb-1">Add WhatsApp Number</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Connect your WhatsApp number so prospects receive messages from you
              </p>

              <form onSubmit={handleAddSender} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    WhatsApp Number (with country code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="e.g. 919876543210 (India) or 14155552671 (US)"
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Include country code without &apos;+&apos; or spaces.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Sender Label / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSenderName}
                    onChange={(e) => setNewSenderName(e.target.value)}
                    placeholder="e.g. Rahul Personal WA or Sales Team Desk"
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddSenderModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl glass-card text-zinc-300 font-semibold text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={addingSender}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-lg shadow-purple-900/50 flex items-center justify-center gap-1.5"
                  >
                    {addingSender ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Number"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
