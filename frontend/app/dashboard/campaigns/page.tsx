"use client";

import React, { useEffect, useState } from "react";
import { api, Campaign, Sender, EmailTemplate, LeadFolder, AttachmentItem } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
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
  Folder,
  FileText,
  Paperclip,
  Image as ImageIcon,
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [folders, setFolders] = useState<LeadFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<keyof typeof PRESETS>("BACKLINK");
  const [senderId, setSenderId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("ALL");
  const [subject, setSubject] = useState(PRESETS.BACKLINK.subject);
  const [body, setBody] = useState(PRESETS.BACKLINK.body);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [sendDelay, setSendDelay] = useState(45);
  const [sendOnlyOnce, setSendOnlyOnce] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Selective Leads State
  const [availableLeads, setAvailableLeads] = useState<Array<{ id: string; email: string; company?: string; status: string; folder_id?: string }>>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cList, sList, tList, fList] = await Promise.all([
        api.campaigns.list().catch(() => []),
        api.senders.list().catch(() => []),
        api.templates.list().catch(() => []),
        api.folders.list().then((res) => res.folders || []).catch(() => []),
      ]);
      setCampaigns(Array.isArray(cList) ? cList : []);
      setSenders(Array.isArray(sList) ? sList : []);
      setTemplates(Array.isArray(tList) ? tList : []);
      setFolders(Array.isArray(fList) ? fList : []);
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
    setAttachments([]);

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
    setAttachments(c.attachments || []);

    setModalOpen(true);
    setLeadLoading(true);
    try {
      const detail = await api.campaigns.get(c.id);
      const selectable = await api.leads.selectable(c.id);
      setAvailableLeads(selectable);
      setSelectedLeadIds(detail.assigned_lead_ids || []);
      if (detail.attachments) {
        setAttachments(detail.attachments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLeadLoading(false);
    }
  };

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setSubject(found.subject);
      setBody(found.body);
      if (found.attachments && found.attachments.length > 0) {
        setAttachments(found.attachments);
      }
    }
  };

  const handlePresetChange = (presetKey: keyof typeof PRESETS) => {
    setType(presetKey);
    setSelectedTemplateId("");
    setSubject(PRESETS[presetKey].subject);
    setBody(PRESETS[presetKey].body);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 5MB limit check
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 5MB. Please choose a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;
        // Strip data:mime/type;base64,
        const b64 = result.includes(",") ? result.split(",")[1] : result;
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content_base64: b64,
            mime_type: file.type || "application/octet-stream",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
        attachments,
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

  const displayedLeads = availableLeads.filter((l) => {
    if (selectedFolderFilter === "ALL") return true;
    return l.folder_id === selectedFolderFilter;
  });

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    setSelectedLeadIds(displayedLeads.map((l) => l.id));
  };

  const deselectAllLeads = () => {
    setSelectedLeadIds([]);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple Sequence Dispatcher</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-900/40">
              <Send className="w-6 h-6" />
            </span>
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Cold Outreach Campaigns
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Automated multi-mailbox email sequences with randomized anti-spam jitter (0-120s delay), attachments, and tracking.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </motion.button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Loading campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 rounded-3xl glass-panel border border-purple-500/20">
            <Send className="w-8 h-8 mx-auto mb-3 text-purple-400/50" />
            <p className="font-bold text-white text-sm">No campaigns yet</p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Click &apos;New Campaign&apos; to set up your first personalized outreach sequence.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30"
            >
              Create Campaign
            </motion.button>
          </div>
        ) : (
          campaigns.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="p-6 rounded-3xl glass-panel hover:border-purple-500/50 border-purple-500/20 transition-all duration-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 group"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
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
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/20">
                    {c.type}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 flex items-center gap-4 flex-wrap">
                  <span>Mailbox: <strong className="text-zinc-200">{c.sender_email || "None"}</strong></span>
                  <span>Assigned Leads: <strong className="text-zinc-200">{c.leads_count}</strong> ({c.pending_count} pending)</span>
                  <span>Anti-Spam Delay: <strong className="text-zinc-200">{c.send_delay_seconds}s + [0-120s jitter]</strong></span>
                </p>

                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-300 pt-1 flex-wrap">
                  <span>🚀 {c.total_sent} sent</span>
                  <span>👀 {c.total_opened} opened</span>
                  <span>💬 {c.total_replied} replied</span>
                  {(c.attachments_count ?? 0) > 0 && (
                    <span className="text-purple-400 flex items-center gap-1 font-bold">
                      <Paperclip className="w-3.5 h-3.5" />
                      {c.attachments_count} attachments
                    </span>
                  )}
                  {c.total_skipped > 0 && <span className="text-zinc-500">🚫 {c.total_skipped} skipped (Send-Once)</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {c.status === "RUNNING" ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePauseCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStartCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{c.status === "PAUSED" ? "Resume" : "Start Sending"}</span>
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openEditModal(c)}
                  className="px-3.5 py-2 rounded-xl glass-card text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteCampaign(c.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Campaign Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Pinned Header */}
            <div className="shrink-0 px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {editingId ? "Edit Campaign Sequence" : "Create Cold Outreach Campaign"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure your pitch template, selective lead checklist, and anti-spam delay
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Form Fields */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Name & Type */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1.5">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Q4 SaaS Partnership Outreach"
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1.5">
                      Sending Mailbox *
                    </label>
                    <select
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      {senders.length === 0 ? (
                        <option value="" className="bg-zinc-950 text-white">No mailboxes connected</option>
                      ) : (
                        senders.map((s) => (
                          <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
                            {s.display_name} ({s.email}) &bull; {s.provider}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Templates Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-purple-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>Saved Email Templates Library</span>
                    </label>
                    <a
                      href="/dashboard/templates"
                      target="_blank"
                      className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      + Manage Templates
                    </a>
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="" className="bg-zinc-950 text-white">-- Select from your saved templates or choose preset below --</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id} className="bg-zinc-950 text-white">
                        [{tpl.category}] {tpl.title} &mdash; &quot;{tpl.subject}&quot;
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Presets */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-purple-300 mb-2">
                    Or Quick Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePresetChange(key)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                          type === key && !selectedTemplateId
                            ? "bg-purple-600/25 border-purple-500 text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                            : "glass-card text-zinc-400 hover:text-white hover:border-purple-500/30"
                        }`}
                      >
                        <p className="truncate">{PRESETS[key].name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1.5">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase text-purple-300">
                      Email Body Template (HTML supported)
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 flex-wrap">
                      <span>Variables:</span>
                      <span className="font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">{"{{firstName}}"}</span>
                      <span className="font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">{"{{company}}"}</span>
                      <span className="font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">{"{{website}}"}</span>
                      <span className="font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">{"{{senderName}}"}</span>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-4 glass-input rounded-xl text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Attachments / References / Photos */}
                <div className="p-4 rounded-2xl glass-card border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-purple-400" />
                        <span>Email Attachments &amp; References ({attachments.length})</span>
                      </span>
                      <p className="text-[10px] text-zinc-400">
                        Attach PDF decks, portfolio links, screenshots, proposal documents, or product photos (up to 5MB each)
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl glass-card hover:border-purple-500/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                      <Plus className="w-3.5 h-3.5 text-purple-400" />
                      <span>Add File</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((att, idx) => {
                        const isImage = att.mime_type?.startsWith("image/");
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card border border-purple-500/30 text-xs text-zinc-200"
                          >
                            {isImage ? (
                              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            <span className="max-w-[180px] truncate">{att.filename}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                              title="Remove attachment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selective Leads Checklist */}
                <div className="p-4 rounded-2xl glass-card border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>Select Target Leads ({selectedLeadIds.length} of {displayedLeads.length} selected)</span>
                      </span>
                      <p className="text-[10px] text-zinc-400">Choose exactly which prospects will receive this campaign</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Filter by folder inside campaign modal */}
                      <select
                        value={selectedFolderFilter}
                        onChange={(e) => setSelectedFolderFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-xl glass-input text-[10px] font-semibold text-zinc-300 focus:outline-none"
                      >
                        <option value="ALL" className="bg-zinc-950 text-white">All Folders ({availableLeads.length})</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id} className="bg-zinc-950 text-white">
                            {f.name} ({f.leads_count})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={selectAllLeads}
                        className="px-2 py-1 rounded-lg glass-card text-[10px] font-semibold text-zinc-300 hover:text-white"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllLeads}
                        className="px-2 py-1 rounded-lg glass-card text-[10px] font-semibold text-zinc-300 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-purple-500/10 border border-purple-500/20 rounded-xl bg-black/40 p-2 space-y-1">
                    {leadLoading ? (
                      <div className="p-4 text-center text-xs text-zinc-500">Loading prospects...</div>
                    ) : displayedLeads.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">
                        No available leads in this selection. Run the scraper or import CSV first.
                      </div>
                    ) : (
                      displayedLeads.map((lead) => {
                        const isChecked = selectedLeadIds.includes(lead.id);
                        return (
                          <label
                            key={lead.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLead(lead.id)}
                              className="rounded border-purple-500/40 text-purple-600 focus:ring-0 accent-purple-600"
                            />
                            <span className="font-mono text-zinc-200">{lead.email}</span>
                            {lead.company && <span className="text-zinc-500">({lead.company})</span>}
                            <span className="ml-auto text-[10px] uppercase font-bold text-zinc-500">
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
                  <div className="p-4 rounded-2xl glass-card border border-purple-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span>Anti-Spam Human Delay</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={3600}
                        value={sendDelay}
                        onChange={(e) => setSendDelay(parseInt(e.target.value) || 45)}
                        className="w-24 px-3 py-2 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">sec base delay</span>
                    </div>
                    <p className="text-[10px] text-purple-300/80 font-medium">
                      ⚡ Auto-adds random 0–120 seconds jitter after every email to mimic human pacing.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl glass-card border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>Send Only Once</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={sendOnlyOnce}
                        onChange={(e) => setSendOnlyOnce(e.target.checked)}
                        className="rounded border-purple-500/40 text-purple-600 focus:ring-0 accent-purple-600"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Guarantees prospects who have previously been sent an email or replied will be safely skipped.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pinned Modal Actions */}
              <div className="shrink-0 px-6 py-4 border-t border-purple-500/20 flex items-center justify-end gap-3 bg-black/90 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>{editingId ? "Update Campaign" : "Save & Ready Campaign"}</span>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
