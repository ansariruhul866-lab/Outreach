"use client";

import React, { useEffect, useState, useRef } from "react";
import { api, WhatsAppSender, Lead, WhatsAppMessageLog } from "@/lib/api";
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
      setSelectedLeadIds(withPhone.map((l) => l.id));
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

    // Start countdown
    setCountdown(delaySeconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time to trigger send for currentIndex!
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

    // Open WhatsApp Web/Universal link in a new window/tab
    window.open(item.web_link, "_blank");

    // Mark as sent in state
    setBulkQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, sent: true } : q))
    );

    // Record in backend log
    try {
      await api.whatsapp.logSent({
        lead_id: item.lead_id || undefined,
        recipient_phone: item.recipient_phone,
        recipient_name: item.recipient_name,
        message: item.message,
        sender_id: selectedSenderId || undefined,
      });
      // Refresh history silently
      api.whatsapp.getHistory().then((h) => setHistory(h || [])).catch(() => {});
    } catch (err) {
      console.error("Failed to log message:", err);
    }
  };

  const handleStartAutoRun = () => {
    if (bulkQueue.length === 0) {
      alert("Please generate a WhatsApp bulk queue first.");
      return;
    }
    // Find next unsent index
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

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === leadsWithPhone.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leadsWithPhone.map((l) => l.id));
    }
  };

  const sentCount = bulkQueue.filter((q) => q.sent).length;
  const progressPercent =
    bulkQueue.length > 0 ? Math.round((sentCount / bulkQueue.length) * 100) : 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span>Direct WhatsApp Outreach</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Reach contacts with phone numbers directly on WhatsApp &mdash; multi-number senders, bulk queue generation, and automated human-paced dispatch.
          </p>
        </div>

        <button
          onClick={() => setAddSenderModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add WhatsApp Number</span>
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Your Connected WhatsApp Numbers */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Your Sender WhatsApp Numbers ({senders.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which WhatsApp sender profile you want to send from. You can add personal or business numbers.
            </p>
          </div>
        </div>

        {senders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-400 space-y-3">
            <Phone className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
            <p className="text-xs">No WhatsApp sender numbers added yet.</p>
            <button
              onClick={() => setAddSenderModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors"
            >
              + Add Your First WhatsApp Number
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {senders.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSenderId(s.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedSenderId === s.id
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                    : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{s.display_name}</h3>
                    <p className="text-[11px] font-mono text-emerald-400">+{s.phone_number}</p>
                    {s.is_default && (
                      <span className="text-[9px] uppercase font-bold text-slate-500">Default Sender</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSender(s.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove number"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Direct Single Sender & Leads Contacts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Direct Message */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Message Composer &amp; Quick Send</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Send a 1-off message or configure the template used for the bulk queue below
              </p>
            </div>

            {/* Template Presets */}
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
              <span className="text-[11px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleTemplateSelect("pitch")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  templateType === "pitch"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                Pitch &amp; Outreach
              </button>
              <button
                type="button"
                onClick={() => handleTemplateSelect("followup")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  templateType === "followup"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                Follow Up
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("custom")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  templateType === "custom"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                Custom
              </button>
            </div>

            <form onSubmit={handleSendDirect} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Phone Number (With Country Code)
                  </label>
                  <input
                    type="text"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="e.g. 919876543210 or +14155552671"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Contact Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase text-slate-400">
                    Message Body Template
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tags: {"{{firstName}}"}, {"{{company}}"}, {"{{website}}"}
                  </span>
                </div>
                <textarea
                  rows={5}
                  required
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!directPhone.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Launch Direct WhatsApp to Number</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Database Contacts with Phone Numbers */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Prospects with Phone Numbers ({leadsWithPhone.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select prospects to generate 1-click WhatsApp outreach queue
                </p>
              </div>

              <div className="flex items-center gap-2">
                {leadsWithPhone.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllLeads}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                  >
                    {selectedLeadIds.length === leadsWithPhone.length ? "Deselect All" : "Select All"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  disabled={generatingBulk || selectedLeadIds.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  {generatingBulk ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Bulk Queue ({selectedLeadIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {leadsWithPhone.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-500 space-y-2">
                <Smartphone className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs text-white font-semibold">No contacts with phone numbers found</p>
                <p className="text-[11px] text-slate-400">
                  Go to <a href="/dashboard/leads" className="text-orange-400 underline">Leads &amp; Folders</a> to add phone numbers or import contacts via CSV.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-850 border border-slate-850 rounded-2xl bg-slate-950/80 p-2 space-y-1">
                {leadsWithPhone.map((l) => {
                  const isChecked = selectedLeadIds.includes(l.id);
                  return (
                    <label
                      key={l.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-900 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectLead(l.id)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <div className="flex-1 truncate">
                        <p className="font-mono text-emerald-400 font-bold text-xs truncate">
                          +{l.phone}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
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
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors"
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
          </div>
        </div>
      </div>

      {/* Bulk Dispatch Queue & Automation Controls */}
      {bulkQueue.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Bulk WhatsApp Dispatch Queue ({bulkQueue.length} Contacts)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch with safe pacing to avoid WhatsApp spam triggers, or send individually with 1 click.
              </p>
            </div>

            {/* Automation Control Toolbar */}
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400 font-semibold">Delay:</span>
                <select
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  disabled={autoRunning}
                  className="bg-transparent text-xs text-emerald-400 font-bold focus:outline-none"
                >
                  <option value={5} className="bg-slate-900">5 seconds (Rapid)</option>
                  <option value={10} className="bg-slate-900">10 seconds</option>
                  <option value={15} className="bg-slate-900">15 seconds (Recommended)</option>
                  <option value={25} className="bg-slate-900">25 seconds (Safe)</option>
                  <option value={40} className="bg-slate-900">40 seconds (Ultra Safe)</option>
                </select>
              </div>

              {!autoRunning ? (
                <button
                  type="button"
                  onClick={handleStartAutoRun}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Auto-Dispatch</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseAutoRun}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Sequence</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetQueue}
                title="Reset all to unsent"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setBulkQueue([])}
                className="text-xs text-slate-400 hover:text-red-400 px-2 py-1"
              >
                Clear Queue
              </button>
            </div>
          </div>

          {/* Rate Limit Protection Banner & Progress Bar */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Anti-Spam Safety: Automatic delay pacing ensures safe sending without risking WhatsApp account suspensions.
                </span>
              </div>
              {autoRunning && (
                <span className="font-mono font-bold text-emerald-300 animate-pulse">
                  Opening next contact in {countdown}s...
                </span>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Dispatched: <strong className="text-white">{sentCount}</strong> of <strong className="text-white">{bulkQueue.length}</strong> ({progressPercent}%)
                </span>
                {autoRunning && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Sequence Active (Lead {currentIndex + 1} of {bulkQueue.length})
                  </span>
                )}
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bulkQueue.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  item.sent
                    ? "bg-slate-950/40 border-slate-800/40 opacity-70"
                    : autoRunning && idx === currentIndex
                    ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30"
                    : "bg-slate-950 border-slate-850 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{item.recipient_name}</span>
                    <span className="font-mono text-emerald-400 text-xs">+{item.recipient_phone}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-3 mt-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => dispatchLead(idx)}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      item.sent
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-600/10"
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
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Dispatch History */}
      {history.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Recent WhatsApp Dispatch Activity ({history.length})</span>
          </h2>

          <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="p-3.5 flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {h.recipient_name || "Contact"} <span className="font-mono text-emerald-400 font-normal">+{h.recipient_phone}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-md">{h.message}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    DISPATCHED
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">{h.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add WhatsApp Number Modal */}
      {addSenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <button
              onClick={() => setAddSenderModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Add WhatsApp Number</h3>
            <p className="text-xs text-slate-400 mb-6">
              Connect your WhatsApp number so prospects receive messages from you
            </p>

            <form onSubmit={handleAddSender} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  WhatsApp Number (with country code) *
                </label>
                <input
                  type="text"
                  required
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="e.g. 919876543210 (India) or 14155552671 (US)"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Include country code without &apos;+&apos; or spaces.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Sender Label / Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSenderName}
                  onChange={(e) => setNewSenderName(e.target.value)}
                  placeholder="e.g. Rahul Personal WA or Sales Team Desk"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddSenderModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSender}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  {addingSender ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Number"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
