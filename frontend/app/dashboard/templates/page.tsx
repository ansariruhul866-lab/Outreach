"use client";

import React, { useEffect, useState } from "react";
import { api, EmailTemplate, AttachmentItem } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Tag,
  Copy,
  Info,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";

const CATEGORIES = [
  { key: "ALL", label: "All Templates" },
  { key: "PITCH", label: "Cold Pitch", color: "text-purple-300 bg-purple-500/20 border-purple-500/40" },
  { key: "FOLLOW_UP", label: "Follow-Up", color: "text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/40" },
  { key: "OFFER", label: "Discount / Offer", color: "text-white bg-purple-500/30 border-purple-400/50" },
  { key: "CUSTOM", label: "Custom", color: "text-zinc-300 bg-zinc-800 border-zinc-700" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("PITCH");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.templates.list();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle("");
    setCategory("PITCH");
    setSubject("Quick idea for {{company}}");
    setBody("<p>Hi {{firstName}},</p>\n<p>I noticed what you are doing at <strong>{{company}}</strong> and wanted to connect.</p>\n<p>Would you be open to exchanging ideas?</p>\n<p>Best,<br><strong>{{senderName}}</strong></p>");
    setAttachments([]);
    setModalOpen(true);
  };

  const openEditModal = (t: EmailTemplate) => {
    setEditingId(t.id);
    setTitle(t.title);
    setCategory(t.category);
    setSubject(t.subject);
    setBody(t.body);
    setAttachments(t.attachments || []);
    setModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 5MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !body.trim()) {
      alert("Please fill in Title, Subject, and Email Body.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.templates.update(editingId, {
          title: title.trim(),
          category,
          subject: subject.trim(),
          body,
          attachments,
        });
        setNotice("✓ Template updated successfully");
      } else {
        await api.templates.create({
          title: title.trim(),
          category,
          subject: subject.trim(),
          body,
          attachments,
        });
        setNotice("✓ New template created");
      }
      setModalOpen(false);
      loadTemplates();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (!confirm("Are you sure you want to delete this email template?")) return;
    try {
      await api.templates.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setNotice("✓ Template deleted");
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter === "ALL") return true;
    return t.category.toUpperCase() === categoryFilter.toUpperCase();
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7857FF]/10 border border-[#7857FF]/30 text-[#A78BFA] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#22D3C5]" />
            <span>Template Architecture Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F7FF] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA]">
              <FileText className="w-5 h-5" />
            </span>
            <span>Email Templates Library</span>
          </h1>
          <p className="text-xs text-[#A3AEC2] mt-1">
            Craft reusable templates for cold pitches, follow-ups, and promotional offers with variables and multimedia attachments.
          </p>
        </div>

        <div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2 transition-all w-fit shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-[#32C98A]/10 border border-[#32C98A]/25 text-[#32C98A] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Categories Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#283149]">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategoryFilter(c.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              categoryFilter === c.key
                ? "bg-[#7857FF] text-[#F5F7FF] shadow-sm"
                : "bg-[#0E1220] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#727E96] flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#7857FF]" />
          <span className="text-xs">Loading email templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-[#141A29] text-[#A3AEC2] border border-[#283149]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#7857FF]" />
          <p className="font-bold text-[#F5F7FF] text-sm">No templates in this category</p>
          <p className="text-xs text-[#727E96] mt-1">
            Click &quot;New Template&quot; above to create one for your sequences.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t) => {
            const catInfo =
              CATEGORIES.find((c) => c.key === t.category) || {
                label: t.category,
                color: "text-zinc-300 bg-zinc-800 border-zinc-700",
              };

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-[#141A29] border border-[#283149] hover:border-[#3B4665] transition-all duration-200 flex flex-col justify-between space-y-4 group shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md border ${
                        t.category === "PITCH"
                          ? "bg-[#7857FF]/15 text-[#A78BFA] border-[#7857FF]/30"
                          : t.category === "FOLLOW_UP"
                          ? "bg-[#438BFF]/15 text-[#438BFF] border-[#438BFF]/30"
                          : "bg-[#22D3C5]/15 text-[#22D3C5] border-[#22D3C5]/30"
                      }`}
                    >
                      {catInfo.label}
                    </span>
                    {t.is_default && (
                      <span className="text-[10px] text-[#22D3C5] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#22D3C5]" />
                        Built-in
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold font-heading text-sm text-[#F5F7FF] group-hover:text-[#A78BFA] transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-[#A3AEC2] font-mono mt-1 truncate">
                      Subject: {t.subject}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E1220] border border-[#283149] text-[11px] text-[#A3AEC2] font-mono line-clamp-4 leading-relaxed whitespace-pre-wrap">
                    {t.body.replace(/<[^>]*>?/gm, "")}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#283149] text-xs">
                  <span className="text-[10px] text-[#727E96]">
                    Updated {t.updated_at || t.created_at}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#232B40] transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.is_default)}
                      className="p-1.5 rounded-lg bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F16C7C] hover:bg-[#232B40] transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#090B12]/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#141A29] border border-[#283149] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#F5F7FF]">
            <div className="shrink-0 px-6 py-5 border-b border-[#283149] flex items-center justify-between bg-[#0E1220]">
              <div>
                <h2 className="text-base font-bold font-heading text-[#F5F7FF]">
                  {editingId ? "Edit Email Template" : "Create New Email Template"}
                </h2>
                <p className="text-xs text-[#A3AEC2] mt-0.5">
                  Save structured outreach templates for quick reuse in campaigns
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#A3AEC2] hover:text-[#F5F7FF] hover:bg-[#1B2233]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-[#A3AEC2] mb-1.5">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Q4 Growth Pitch, Follow-Up #1"
                      className="w-full px-3.5 py-2 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A3AEC2] mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    >
                      <option value="PITCH" className="bg-[#0E1220] text-[#F5F7FF]">Cold Pitch</option>
                      <option value="FOLLOW_UP" className="bg-[#0E1220] text-[#F5F7FF]">Follow-Up (Bump)</option>
                      <option value="OFFER" className="bg-[#0E1220] text-[#F5F7FF]">Offer &amp; Discount</option>
                      <option value="CUSTOM" className="bg-[#0E1220] text-[#F5F7FF]">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#A3AEC2] mb-1.5">
                    Default Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Quick question for {{company}}"
                    className="w-full px-3.5 py-2 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-[11px] font-bold uppercase text-[#A3AEC2]">
                      Email Body Template (HTML supported) *
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#727E96] flex-wrap">
                      <span>Dynamic Tags:</span>
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
                    className="w-full p-3.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs font-mono text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Attachments / References / Photos */}
                <div className="p-4 rounded-xl bg-[#0E1220] border border-[#283149] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#F5F7FF] flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#7857FF]" />
                        <span>Template Default Attachments &amp; References ({attachments.length})</span>
                      </span>
                      <p className="text-[10px] text-[#727E96]">
                        Include pitch decks, portfolio samples, brochures, or image references automatically
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#232B40] text-[#F5F7FF] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                      <Plus className="w-3.5 h-3.5 text-[#22D3C5]" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141A29] border border-[#283149] text-xs text-[#A3AEC2]"
                          >
                            {isImage ? (
                              <ImageIcon className="w-3.5 h-3.5 text-[#A78BFA]" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 text-[#7857FF]" />
                            )}
                            <span className="max-w-[180px] truncate text-[#F5F7FF]">{att.filename}</span>
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
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-[#283149] flex items-center justify-end gap-3 bg-[#0E1220]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1B2233] border border-[#283149] text-[#A3AEC2] hover:text-[#F5F7FF] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl btn-primary text-xs font-semibold shadow-md transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F5F7FF]" />
                  ) : (
                    <span>{editingId ? "Update Template" : "Save Template"}</span>
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
