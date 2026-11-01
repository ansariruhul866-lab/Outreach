"use client";

import React, { useEffect, useState } from "react";
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
  ArrowRight,
  Sparkles,
} from "lucide-react";

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

  // Single Quick Message
  const [directPhone, setDirectPhone] = useState("");
  const [directName, setDirectName] = useState("");
  const [directMessage, setDirectMessage] = useState(
    "Hi {{firstName}},\n\nI came across your contact regarding {{company}} and wanted to reach out directly on WhatsApp.\n\nWould you be open to a quick chat?\n\nBest regards!"
  );

  // Bulk WA queue
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkQueue, setBulkQueue] = useState<Array<{
    lead_id: string;
    recipient_name: string;
    recipient_phone: string;
    message: string;
    wa_link: string;
    web_link: string;
  }>>([]);
  const [generatingBulk, setGeneratingBulk] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

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

      // Open in WhatsApp Web / App
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
    try {
      const res = await api.whatsapp.bulkGenerateLinks({
        sender_id: selectedSenderId || undefined,
        message_template: directMessage,
        lead_ids: selectedLeadIds,
      });

      setBulkQueue(res.items || []);
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
            Reach leads with phone numbers directly on WhatsApp &mdash; connect your numbers and dispatch personalized messages
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
              Add your mobile/business WhatsApp numbers. You can switch between multiple numbers at any time.
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
                <span>Single Prospect Direct Message</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Send to any business or individual WhatsApp number with 1 click
              </p>
            </div>

            <form onSubmit={handleSendDirect} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Phone Number (With Country Code) *
                  </label>
                  <input
                    type="text"
                    required
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
                    Message Body
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tags: {"{{firstName}}"}, {"{{company}}"}
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Launch WhatsApp &amp; Send Message</span>
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
                  Select prospects to generate 1-click WhatsApp outreach links
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateBulk}
                disabled={generatingBulk || leadsWithPhone.length === 0}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                {generatingBulk ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Queue ({selectedLeadIds.length})</span>
                  </>
                )}
              </button>
            </div>

            {leadsWithPhone.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-500 space-y-2">
                <Smartphone className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs text-white font-semibold">No contacts with phone numbers found</p>
                <p className="text-[11px] text-slate-400">
                  Go to <a href="/dashboard/leads" className="text-orange-400 underline">Leads &amp; Folders</a> to add phone numbers manually or import contacts with phone columns.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-850 border border-slate-850 rounded-2xl bg-slate-950/80 p-2 space-y-1">
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
                          {l.first_name || l.email || "Contact"} {l.company ? `&bull; ${l.company}` : ""}
                        </p>
                      </div>

                      <a
                        href={`https://wa.me/${l.phone?.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          directMessage
                            .replace("{{firstName}}", l.first_name || "there")
                            .replace("{{company}}", l.company || "your business")
                        )}`}
                        target="_blank"
                        rel="noreferrer"
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

      {/* Bulk Click-to-Send Queue View */}
      {bulkQueue.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>1-Click WhatsApp Dispatch Queue ({bulkQueue.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click &quot;Open WhatsApp&quot; on each row to dispatch your personalized message seamlessly
              </p>
            </div>
            <button
              onClick={() => setBulkQueue([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear Queue
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bulkQueue.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-3 flex flex-col justify-between"
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

                <a
                  href={item.wa_link}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
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
