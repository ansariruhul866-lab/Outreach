"use client";

import React, { useEffect, useState } from "react";
import { api, Campaign, Sender } from "@/lib/api";
import {
  Send,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Mail,
  Clock,
  Sparkles,
  Users,
  ShieldCheck,
} from "lucide-react";

const PRESETS = {
  BACKLINK: {
    name: "Backlink & Editorial Collaboration",
    subject: "Quick collaboration idea for {{company}}",
    body: `<p>Hi {{firstName}},</p>\n<p>I came across your site <a href="{{website}}">{{company}}</a> and really enjoyed your recent coverage.</p>\n<p>I noticed several overlapping topics where our readers would find value. I'd love to propose a mutual backlink exchange or contribute a guest editorial piece tailored specifically for your audience.</p>\n<p>Would you be open to a quick 5-minute chat or exchanging ideas over email?</p>\n<p>Best regards,<br><strong>{{senderName}}</strong></p>`,
  },
  SERVICE_PITCH: {
    name: "Growth & Service Pitch",
    subject: "Accelerating digital growth for {{company}}",
    body: `<p>Hi {{firstName}},</p>\n<p>I noticed what you're building at <strong>{{company}}</strong> and wanted to reach out directly.</p>\n<p>We specialize in organic search optimization, custom web systems, and inbound growth pipelines that help brands drive qualified leads consistently.</p>\n<p>We recently put together 3 quick ideas that could help boost your organic reach this quarter. Happy to share them if you're interested?</p>\n<p>Best,<br><strong>{{senderName}}</strong></p>`,
  },
  PARTNERSHIP: {
    name: "Strategic Partnership Pitch",
    subject: "Strategic partnership idea with {{company}}",
    body: `<p>Hi {{firstName}},</p>\n<p>I've been following <strong>{{company}}</strong> and believe there's a strong synergistic opportunity between our two businesses.</p>\n<p>We could cross-refer clients, co-market high-intent content, and build long-term value together.</p>\n<p>Let me know if you might be open to a brief introductory call this week or next.</p>\n<p>Warmly,<br><strong>{{senderName}}</strong></p>`,
  },
  CUSTOM: {
    name: "Custom Template",
    subject: "Hello {{firstName}}",
    body: `<p>Hi {{firstName}},</p>\n<p>Write your personalized outreach message here...</p>\n<p>Best regards,<br><strong>{{senderName}}</strong></p>`,
  },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<keyof typeof PRESETS>("BACKLINK");
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState(PRESETS.BACKLINK.subject);
  const [body, setBody] = useState(PRESETS.BACKLINK.body);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [sendDelay, setSendDelay] = useState(45);
  const [sendOnlyOnce, setSendOnlyOnce] = useState(true);

  // Selective Leads State
  const [availableLeads, setAvailableLeads] = useState<Array<{ id: string; email: string; company?: string; status: string }>>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cList, sList] = await Promise.all([
        api.campaigns.list().catch(() => []),
        api.senders.list().catch(() => []),
      ]);
      setCampaigns(Array.isArray(cList) ? cList : []);
      setSenders(Array.isArray(sList) ? sList : []);
      if (Array.isArray(sList) && sList.length > 0 && !senderId) {
        setSenderId(sList[0].id);
      }
    } catch (e) {
      console.error(e);
      setCampaigns([]);
      setSenders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = async () => {
    setEditingId(null);
    setName("New Cold Outreach Campaign");
    setType("BACKLINK");
    setSubject(PRESETS.BACKLINK.subject);
    setBody(PRESETS.BACKLINK.body);
    setDailyLimit(50);
    setSendDelay(45);
    setSendOnlyOnce(true);

    setModalOpen(true);
    setLeadLoading(true);
    try {
      const selectable = await api.leads.selectable();
      setAvailableLeads(selectable);
      // Default: select all pending leads
      setSelectedLeadIds(selectable.map((l) => l.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLeadLoading(false);
    }
  };

  const openEditModal = async (c: Campaign) => {
    setEditingId(c.id);
    setName(c.name);
    setType((c.type as keyof typeof PRESETS) || "CUSTOM");
    setSenderId(c.sender_email_id || (senders[0]?.id ?? ""));
    setSubject(c.subject_template || "");
    setBody(c.body_template || "");
    setDailyLimit(c.daily_limit || 50);
    setSendDelay(c.send_delay_seconds || 45);
    setSendOnlyOnce(c.send_only_once !== false);

    setModalOpen(true);
    setLeadLoading(true);
    try {
      const detail = await api.campaigns.get(c.id);
      const selectable = await api.leads.selectable(c.id);
      setAvailableLeads(selectable);
      setSelectedLeadIds(detail.assigned_lead_ids || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLeadLoading(false);
    }
  };

  const handlePresetChange = (presetKey: keyof typeof PRESETS) => {
    setType(presetKey);
    setSubject(PRESETS[presetKey].subject);
    setBody(PRESETS[presetKey].body);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!senderId) {
      alert("Please connect or select a sending mailbox first");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        sender_email_id: senderId,
        subject_template: subject,
        body_template: body,
        daily_limit: dailyLimit,
        send_delay_seconds: sendDelay,
        send_only_once: sendOnlyOnce,
        lead_ids: selectedLeadIds,
      };

      if (editingId) {
        await api.campaigns.update(editingId, payload);
      } else {
        await api.campaigns.create(payload);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleStartCampaign = async (id: string) => {
    try {
      await api.campaigns.start(id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start campaign");
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await api.campaigns.pause(id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to pause campaign");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign? Assigned leads will be preserved.")) return;
    try {
      await api.campaigns.delete(id);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    setSelectedLeadIds(availableLeads.map((l) => l.id));
  };

  const deselectAllLeads = () => {
    setSelectedLeadIds([]);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Cold Outreach Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated email sequences with randomized anti-spam jitter (0-120s delay)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-600/20 flex items-center gap-2 transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            <span className="text-xs">Loading campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 rounded-3xl bg-slate-900/50 border border-slate-800">
            <Send className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-white text-sm">No campaigns yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Click &apos;New Campaign&apos; to set up your first personalized outreach sequence.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
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
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                    {c.type}
                  </span>
                </div>

                <p className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                  <span>Mailbox: <strong className="text-slate-200">{c.sender_email || "None"}</strong></span>
                  <span>Assigned Leads: <strong className="text-slate-200">{c.leads_count}</strong> ({c.pending_count} pending)</span>
                  <span>Anti-Spam Delay: <strong className="text-slate-200">{c.send_delay_seconds}s + [0-120s jitter]</strong></span>
                </p>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 pt-1">
                  <span>🚀 {c.total_sent} sent</span>
                  <span>👀 {c.total_opened} opened</span>
                  <span>💬 {c.total_replied} replied</span>
                  {c.total_skipped > 0 && <span className="text-slate-500">🚫 {c.total_skipped} skipped (Send-Once)</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {c.status === "RUNNING" ? (
                  <button
                    onClick={() => handlePauseCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{c.status === "PAUSED" ? "Resume" : "Start Sending"}</span>
                  </button>
                )}

                <button
                  onClick={() => openEditModal(c)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDeleteCampaign(c.id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Campaign Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Edit Campaign Sequence" : "Create Cold Outreach Campaign"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your pitch template, selective lead checklist, and anti-spam delay
              </p>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-6">
              {/* Name & Type */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Q4 SaaS Partnership Outreach"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                    Sending Mailbox *
                  </label>
                  <select
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    {senders.length === 0 ? (
                      <option value="">No mailboxes connected</option>
                    ) : (
                      senders.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name} ({s.email}) &bull; {s.provider}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Template Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-2">
                  Template Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetChange(key)}
                      className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                        type === key
                          ? "bg-orange-500/10 border-orange-500 text-orange-400 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="truncate">{PRESETS[key].name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-400">
                    Email Body Template (HTML supported)
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>Variables:</span>
                    <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{firstName}}"}</span>
                    <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{company}}"}</span>
                    <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{website}}"}</span>
                    <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{senderName}}"}</span>
                  </div>
                </div>
                <textarea
                  rows={6}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Selective Leads Checklist */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-400" />
                      <span>Select Target Leads ({selectedLeadIds.length} of {availableLeads.length} selected)</span>
                    </span>
                    <p className="text-[10px] text-slate-500">Choose exactly which prospects will receive this campaign</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllLeads}
                      className="px-2 py-1 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 hover:text-white"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllLeads}
                      className="px-2 py-1 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-850/60 border border-slate-850 rounded-xl bg-slate-900/40 p-2 space-y-1">
                  {leadLoading ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading prospects...</div>
                  ) : availableLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No available leads. Run the scraper or import CSV first.
                    </div>
                  ) : (
                    availableLeads.map((lead) => {
                      const isChecked = selectedLeadIds.includes(lead.id);
                      return (
                        <label
                          key={lead.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLead(lead.id)}
                            className="rounded border-slate-700 text-orange-500 focus:ring-0"
                          />
                          <span className="font-mono text-slate-200">{lead.email}</span>
                          {lead.company && <span className="text-slate-500">({lead.company})</span>}
                          <span className="ml-auto text-[10px] uppercase font-bold text-slate-500">
                            {lead.status}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Anti-spam & Delivery Controls */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Anti-Spam Human Delay</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={10}
                      max={3600}
                      value={sendDelay}
                      onChange={(e) => setSendDelay(parseInt(e.target.value) || 45)}
                      className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">sec base delay</span>
                  </div>
                  <p className="text-[10px] text-amber-400/90 font-medium">
                    ⚡ Auto-adds random 0–120 seconds jitter after every email to mimic human pacing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Send Only Once</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={sendOnlyOnce}
                      onChange={(e) => setSendOnlyOnce(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-0"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Guarantees prospects who have previously been sent an email or replied will be safely skipped.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{editingId ? "Update Campaign" : "Save & Ready Campaign"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
