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
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple Template Engine</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-900/40">
              <FileText className="w-6 h-6" />
            </span>
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Email Templates Library
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Craft reusable templates for cold pitches, follow-ups, and promotional offers with variables and multimedia attachments.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Template</span>
        </motion.button>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl glass-panel border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-950/40">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Categories Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-purple-500/20">
        {CATEGORIES.map((c) => (
          <motion.button
            key={c.key}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCategoryFilter(c.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === c.key
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50"
                : "glass-card text-zinc-400 hover:text-white"
            }`}
          >
            {c.label}
          </motion.button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          <span className="text-xs">Loading email templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-16 text-center rounded-3xl glass-card text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-orange-400" />
          <p className="font-bold text-white text-sm">No templates in this category</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;New Template&quot; above to create one for your sequences.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((t) => {
            const catInfo =
              CATEGORIES.find((c) => c.key === t.category) || {
                label: t.category,
                color: "text-slate-300 bg-slate-800 border-slate-700",
              };

            return (
              <div
                key={t.id}
                className="p-6 rounded-3xl glass-panel hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${catInfo.color}`}
                    >
                      {catInfo.label}
                    </span>
                    {t.is_default && (
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Built-in
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">
                      Subject: {t.subject}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850/60 text-[11px] text-slate-400 font-mono line-clamp-4 leading-relaxed whitespace-pre-wrap">
                    {t.body.replace(/<[^>]*>?/gm, "")}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                  <span className="text-[10px] text-slate-500">
                    Updated {t.updated_at || t.created_at}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.is_default)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? "Edit Email Template" : "Create New Email Template"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Save structured outreach templates for quick reuse in campaigns
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Q4 Growth Pitch, Follow-Up #1, Black Friday Discount"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="PITCH">Cold Pitch</option>
                      <option value="FOLLOW_UP">Follow-Up (Bump)</option>
                      <option value="OFFER">Offer &amp; Discount</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                    Default Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Quick question for {{company}}"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-[11px] font-bold uppercase text-slate-400">
                      Email Body Template (HTML supported) *
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                      <span>Dynamic Tags:</span>
                      <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{firstName}}"}</span>
                      <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{company}}"}</span>
                      <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{website}}"}</span>
                      <span className="font-mono text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">{"{{senderName}}"}</span>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Attachments / References / Photos */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-orange-400" />
                        <span>Template Default Attachments &amp; References ({attachments.length})</span>
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Include pitch decks, portfolio samples, brochures, or image references automatically whenever this template is selected
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                      <Plus className="w-3.5 h-3.5 text-orange-400" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                          >
                            {isImage ? (
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                            )}
                            <span className="max-w-[180px] truncate">{att.filename}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
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

              <div className="shrink-0 px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/95">
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
