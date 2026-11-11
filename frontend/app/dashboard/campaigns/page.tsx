"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    subject: "Content collaboration idea for {{company}}",
    body: `Hi {{firstName}},

I was exploring {{company}} and came across your content on topics relevant to our industry. I really appreciate the value you're providing to your readers.

I believe there's an opportunity for us to collaborate and create value for both our audiences.

We'd love to explore:
- A relevant contextual backlink placement within an existing article.
- A guest contribution featuring original, useful insights for your readers.
- A mutually beneficial content collaboration.

We can ensure any contribution is relevant, well-researched, and genuinely useful to your audience.

Would you be open to exploring a collaboration?

Best regards,  
**{{senderName}}**`,
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
  const [mounted, setMounted] = useState(false);

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

  // Custom email input state
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [addingCustomEmails, setAddingCustomEmails] = useState(false);

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
    setMounted(true);
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

  const handleAddCustomEmails = async () => {
    const raw = customEmailInput
      .split(/[,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (raw.length === 0) return;

    // Deduplicate against already-available leads
    const existingEmails = new Set(availableLeads.map((l) => l.email.toLowerCase()));
    const newEmails = raw.filter((e) => !existingEmails.has(e));
    const alreadyExisting = raw.filter((e) => existingEmails.has(e));

    // Select already-existing leads that were typed in
    if (alreadyExisting.length > 0) {
      const existingIds = availableLeads
        .filter((l) => alreadyExisting.includes(l.email.toLowerCase()))
        .map((l) => l.id);
      setSelectedLeadIds((prev) => [...new Set([...prev, ...existingIds])]);
    }

    if (newEmails.length === 0) {
      setCustomEmailInput("");
      return;
    }

    setAddingCustomEmails(true);
    try {
      const createdLeads: Array<{ id: string; email: string; company?: string; status: string; folder_id?: string }> = [];
      for (const email of newEmails) {
        const lead = await api.leads.create({ email });
        createdLeads.push({
          id: lead.id,
          email: lead.email || email,
          company: lead.company,
          status: lead.status || "PENDING",
          folder_id: lead.folder_id || undefined,
        });
      }
      // Add created leads to available leads and auto-select them
      setAvailableLeads((prev) => [...prev, ...createdLeads]);
      setSelectedLeadIds((prev) => [...new Set([...prev, ...createdLeads.map((l) => l.id)])]);
      setCustomEmailInput("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add custom emails");
    } finally {
      setAddingCustomEmails(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7857FF]/10 border border-[#7857FF]/30 text-[#A78BFA] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#22D3C5]" />
            <span>Multi-Channel Sequence Dispatcher</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F7FF] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA]">
              <Send className="w-5 h-5" />
            </span>
            <span>Cold Outreach Campaigns</span>
          </h1>
          <p className="text-xs text-[#A3AEC2] mt-1">
            Automated multi-mailbox email sequences with randomized anti-spam jitter (0-120s delay), attachments, and tracking.
          </p>
        </div>

        <div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2 transition-all w-fit shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-[#727E96] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#7857FF]" />
            <span className="text-xs">Loading campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-[#A3AEC2] rounded-2xl bg-[#141A29] border border-[#283149]">
            <Send className="w-8 h-8 mx-auto mb-3 text-[#7857FF]/50" />
            <p className="font-bold text-[#F5F7FF] text-sm">No campaigns yet</p>
            <p className="text-xs text-[#727E96] mt-1 mb-4">
              Click &apos;New Campaign&apos; to set up your first personalized outreach sequence.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl btn-primary text-[#F5F7FF] text-xs font-semibold shadow-md"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-all duration-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 group shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold font-heading text-[#F5F7FF]">{c.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                      c.status === "RUNNING"
                        ? "bg-[#32C98A]/15 text-[#32C98A] border-[#32C98A]/30"
                        : c.status === "PAUSED"
                        ? "bg-[#F3B84C]/15 text-[#F3B84C] border-[#F3B84C]/30"
                        : c.status === "COMPLETED"
                        ? "bg-[#438BFF]/15 text-[#438BFF] border-[#438BFF]/30"
                        : "bg-[#0E1220] text-[#727E96] border-[#283149]"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#1B2233] text-[#A78BFA] border border-[#283149]">
                    {c.type}
                  </span>
                </div>

                <p className="text-xs text-[#A3AEC2] flex items-center gap-4 flex-wrap">
                  <span>Mailbox: <strong className="text-[#F5F7FF]">{c.sender_email || "None"}</strong></span>
                  <span>Assigned Leads: <strong className="text-[#F5F7FF]">{c.leads_count}</strong> ({c.pending_count} pending)</span>
                  <span>Anti-Spam Delay: <strong className="text-[#F5F7FF]">{c.send_delay_seconds}s + jitter</strong></span>
                </p>

                <div className="flex items-center gap-4 text-xs font-semibold text-[#A3AEC2] pt-1 flex-wrap">
                  <span>🚀 {c.total_sent} sent</span>
                  <span>👀 {c.total_opened} opened</span>
                  <span>💬 {c.total_replied} replied</span>
                  {(c.attachments_count ?? 0) > 0 && (
                    <span className="text-[#A78BFA] flex items-center gap-1 font-medium">
                      <Paperclip className="w-3.5 h-3.5" />
                      {c.attachments_count} attachments
                    </span>
                  )}
                  {c.total_skipped > 0 && <span className="text-[#727E96]">🚫 {c.total_skipped} skipped</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {c.status === "RUNNING" ? (
                  <button
                    onClick={() => handlePauseCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#F3B84C]/15 hover:bg-[#F3B84C]/25 text-[#F3B84C] border border-[#F3B84C]/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartCampaign(c.id)}
                    className="px-3.5 py-2 rounded-xl btn-primary text-[#F5F7FF] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{c.status === "PAUSED" ? "Resume" : "Start Sending"}</span>
                  </button>
                )}

                <button
                  onClick={() => openEditModal(c)}
                  className="px-3.5 py-2 rounded-xl bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#232B40] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDeleteCampaign(c.id)}
                  className="p-2 rounded-xl bg-[#F16C7C]/10 hover:bg-[#F16C7C]/20 text-[#F16C7C] border border-[#F16C7C]/25 text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Campaign Create/Edit Modal - Portaled to document.body for highest z-index */}
      {mounted && modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#141A29] border border-[#283149] rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
            {/* Pinned Header */}
            <div className="shrink-0 px-6 py-5 border-b border-[#283149] flex items-center justify-between bg-[#0E1220]">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F5F7FF] flex items-center gap-2">
                  <span>{editingId ? "Edit Campaign Sequence" : "Create Cold Outreach Campaign"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7857FF]/15 text-[#A78BFA] border border-[#7857FF]/30">
                    OutRank Engine
                  </span>
                </h2>
                <p className="text-xs text-[#A3AEC2] mt-0.5">
                  Configure your pitch template, selective lead checklist, and anti-spam delay
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 -mr-2 rounded-xl text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#1B2233] transition-colors"
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
                    <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1.5">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Q4 SaaS Partnership Outreach"
                      className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1.5">
                      Sending Mailbox *
                    </label>
                    <select
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    >
                      {senders.length === 0 ? (
                        <option value="" className="bg-[#0E1220] text-[#F5F7FF]">No mailboxes connected</option>
                      ) : (
                        senders.map((s) => (
                          <option key={s.id} value={s.id} className="bg-[#0E1220] text-[#F5F7FF]">
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
                    <label className="text-[11px] font-bold uppercase text-[#A78BFA] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#7857FF]" />
                      <span>Saved Email Templates Library</span>
                    </label>
                    <a
                      href="/dashboard/templates"
                      target="_blank"
                      className="text-[10px] text-[#438BFF] hover:underline"
                    >
                      + Manage Templates
                    </a>
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                  >
                    <option value="" className="bg-[#0E1220] text-[#F5F7FF]">-- Select from your saved templates or choose preset below --</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id} className="bg-[#0E1220] text-[#F5F7FF]">
                        [{tpl.category}] {tpl.title} &mdash; &quot;{tpl.subject}&quot;
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Presets */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-2">
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
                            ? "bg-[#7857FF]/20 border-[#7857FF] text-[#F5F7FF] font-bold"
                            : "bg-[#0E1220] border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] hover:border-[#7857FF]/40"
                        }`}
                      >
                        <p className="truncate">{PRESETS[key].name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1.5">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                  />
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase text-[#A78BFA]">
                      Email Body Template (Formatted & Multiline Supported)
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#A3AEC2] flex-wrap">
                      <span>Variables:</span>
                      <span className="font-mono text-[#A78BFA] bg-[#7857FF]/15 border border-[#7857FF]/30 px-1.5 py-0.5 rounded">{"{{firstName}}"}</span>
                      <span className="font-mono text-[#A78BFA] bg-[#7857FF]/15 border border-[#7857FF]/30 px-1.5 py-0.5 rounded">{"{{company}}"}</span>
                      <span className="font-mono text-[#A78BFA] bg-[#7857FF]/15 border border-[#7857FF]/30 px-1.5 py-0.5 rounded">{"{{website}}"}</span>
                      <span className="font-mono text-[#A78BFA] bg-[#7857FF]/15 border border-[#7857FF]/30 px-1.5 py-0.5 rounded">{"{{senderName}}"}</span>
                    </div>
                  </div>
                  <textarea
                    rows={10}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-4 bg-[#0E1220] border border-[#283149] rounded-xl text-xs font-mono text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Attachments / References / Photos */}
                <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#F5F7FF] flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#7857FF]" />
                        <span>Email Attachments &amp; References ({attachments.length})</span>
                      </span>
                      <p className="text-[10px] text-[#A3AEC2]">
                        Attach PDF decks, portfolio links, screenshots, proposal documents, or product photos (up to 5MB each)
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-lg bg-[#1B2233] border border-[#283149] hover:border-[#7857FF]/50 text-[#F5F7FF] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                      <Plus className="w-3.5 h-3.5 text-[#7857FF]" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141A29] border border-[#283149] text-xs text-[#F5F7FF]"
                          >
                            {isImage ? (
                              <ImageIcon className="w-3.5 h-3.5 text-[#7857FF]" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 text-[#7857FF]" />
                            )}
                            <span className="max-w-[180px] truncate">{att.filename}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-[#727E96] hover:text-[#F16C7C] p-0.5 rounded transition-colors"
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
                <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#F5F7FF] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#7857FF]" />
                        <span>Select Target Leads ({selectedLeadIds.length} of {displayedLeads.length} selected)</span>
                      </span>
                      <p className="text-[10px] text-[#A3AEC2]">Choose exactly which prospects will receive this campaign</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Filter by folder inside campaign modal */}
                      <select
                        value={selectedFolderFilter}
                        onChange={(e) => setSelectedFolderFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-[#1B2233] border border-[#283149] text-[10px] font-semibold text-[#F5F7FF] focus:outline-none"
                      >
                        <option value="ALL" className="bg-[#0E1220] text-[#F5F7FF]">All Folders ({availableLeads.length})</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id} className="bg-[#0E1220] text-[#F5F7FF]">
                            {f.name} ({f.leads_count})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={selectAllLeads}
                        className="px-2.5 py-1 rounded-lg bg-[#1B2233] border border-[#283149] text-[10px] font-semibold text-[#A3AEC2] hover:text-[#F5F7FF]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllLeads}
                        className="px-2.5 py-1 rounded-lg bg-[#1B2233] border border-[#283149] text-[10px] font-semibold text-[#A3AEC2] hover:text-[#F5F7FF]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[#283149] border border-[#283149] rounded-xl bg-[#090B12] p-2 space-y-1">
                    {leadLoading ? (
                      <div className="p-4 text-center text-xs text-[#727E96]">Loading prospects...</div>
                    ) : displayedLeads.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#727E96]">
                        No available leads in this selection. Run the scraper or import CSV first.
                      </div>
                    ) : (
                      displayedLeads.map((lead) => {
                        const isChecked = selectedLeadIds.includes(lead.id);
                        return (
                          <label
                            key={lead.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1B2233]/40 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLead(lead.id)}
                              className="rounded border-[#283149] text-[#7857FF] focus:ring-0 accent-[#7857FF]"
                            />
                            <span className="font-mono text-[#F5F7FF]">{lead.email}</span>
                            {lead.company && <span className="text-[#A3AEC2]">({lead.company})</span>}
                            <span className="ml-auto text-[10px] uppercase font-bold text-[#727E96]">
                              {lead.status}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Custom Email Input */}
                <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#F5F7FF] flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#7857FF]" />
                      <span>Add Custom Emails Directly</span>
                    </span>
                    <p className="text-[10px] text-[#A3AEC2] mt-0.5">
                      Type or paste email addresses (comma, semicolon, or newline separated). They will be created as leads and auto-selected.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={customEmailInput}
                      onChange={(e) => setCustomEmailInput(e.target.value)}
                      placeholder="john@example.com, jane@startup.co&#10;ceo@company.io"
                      className="flex-1 p-3 bg-[#090B12] border border-[#283149] rounded-xl text-xs font-mono text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none resize-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      disabled={addingCustomEmails || !customEmailInput.trim()}
                      onClick={handleAddCustomEmails}
                      className="px-4 py-2 rounded-xl bg-[#7857FF] hover:bg-[#6845ee] text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 self-end"
                    >
                      {addingCustomEmails ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{addingCustomEmails ? "Adding..." : "Add & Select"}</span>
                    </motion.button>
                  </div>
                </div>

                {/* Anti-spam & Delivery Controls */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#F5F7FF]">
                      <Clock className="w-4 h-4 text-[#7857FF]" />
                      <span>Anti-Spam Human Delay</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={3600}
                        value={sendDelay}
                        onChange={(e) => setSendDelay(parseInt(e.target.value) || 45)}
                        className="w-24 px-3 py-2 bg-[#090B12] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                      />
                      <span className="text-xs text-[#A3AEC2]">sec base delay</span>
                    </div>
                    <p className="text-[10px] text-[#A78BFA] font-medium">
                      ⚡ Auto-adds random 0–120 seconds jitter after every email to mimic human pacing.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F5F7FF] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#7857FF]" />
                        <span>Send Only Once</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={sendOnlyOnce}
                        onChange={(e) => setSendOnlyOnce(e.target.checked)}
                        className="rounded border-[#283149] text-[#7857FF] focus:ring-0 accent-[#7857FF]"
                      />
                    </div>
                    <p className="text-[10px] text-[#A3AEC2]">
                      Guarantees prospects who have previously been sent an email or replied will be safely skipped.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pinned Modal Actions */}
              <div className="shrink-0 px-6 py-4 border-t border-[#283149] flex items-center justify-end gap-3 bg-[#0E1220]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-2"
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
        </div>,
        document.body
      )}
    </div>
  );
}
