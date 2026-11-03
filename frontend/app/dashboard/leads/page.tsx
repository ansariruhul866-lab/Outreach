"use client";

import React, { useEffect, useState } from "react";
import { api, Lead, LeadFolder, FolderListResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Folder,
  FolderPlus,
  FolderCheck,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  FileSpreadsheet,
  FileText,
  FileUp,
  Phone,
  Mail,
  Globe,
  Bot,
  Send,
  Copy,
  ExternalLink,
  MessageSquare,
  Settings2,
  ArrowUpDown,
  Flame,
  Check,
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [folders, setFolders] = useState<LeadFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("ALL");
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);

  // Gemini AI Pitch State
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [pitchLead, setPitchLead] = useState<Lead | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchData, setPitchData] = useState<{
    strategy: string;
    subject: string;
    problem: string;
    solution: string;
    why_choose_me: string;
    email_body: string;
    whatsapp_message: string;
    model_used?: string;
  } | null>(null);
  const [pitchTab, setPitchTab] = useState<"email" | "whatsapp">("email");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("Growth Specialist");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Batch AI Pitch State
  const [batchPitchModalOpen, setBatchPitchModalOpen] = useState(false);
  const [batchPitching, setBatchPitching] = useState(false);

  // Multi-select state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Create folder modal state
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // Move leads modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>("");

  // Add single lead modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newLeadFolderId, setNewLeadFolderId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Smart Sheet / Doc File Extractor state
  const [extractorModalOpen, setExtractorModalOpen] = useState(false);
  const [extractorFile, setExtractorFile] = useState<File | null>(null);
  const [extractorFolderName, setExtractorFolderName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadFolders = async () => {
    try {
      const data: FolderListResponse = await api.folders.list();
      setFolders(data.folders || []);
      setTotalLeadsCount(data.total_leads || 0);
      setUnassignedCount(data.unassigned_leads || 0);
    } catch (e) {
      console.error("Error loading folders", e);
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.leads.list(0, 500, statusFilter, selectedFolderId, segmentFilter, sortBy, sortOrder);
      setLeads(Array.isArray(data) ? data : []);
      setSelectedLeadIds([]);
    } catch (e) {
      console.error(e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem("outreach_gemini_api_key");
    if (savedKey) setGeminiApiKey(savedKey);
    const savedName = localStorage.getItem("outreach_sender_name");
    if (savedName) setSenderName(savedName);
  }, []);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, selectedFolderId, segmentFilter, sortBy, sortOrder]);

  const handleOpenPitch = async (lead: Lead) => {
    setPitchLead(lead);
    setPitchModalOpen(true);
    setPitchTab(lead.phone && !lead.email ? "whatsapp" : "email");

    if (lead.ai_pitch_body && lead.ai_pitch_subject) {
      setPitchData({
        strategy: lead.ai_pitch_strategy || "NO_WEBSITE",
        subject: lead.ai_pitch_subject,
        problem: "Lead profile previously analyzed by Gemini AI",
        solution: "High-converting web presence + automated marketing systems",
        why_choose_me: "Direct execution, 7-day delivery, conversion-first architecture",
        email_body: lead.ai_pitch_body,
        whatsapp_message: lead.ai_pitch_whatsapp || "",
      });
      return;
    }

    await generatePitchForLead(lead);
  };

  const generatePitchForLead = async (lead: Lead) => {
    setPitchLoading(true);
    try {
      const res = await api.leads.generatePitch(lead.id, {
        sender_name: senderName,
        api_key: geminiApiKey.trim() || undefined,
      });
      setPitchData({
        strategy: res.strategy,
        subject: res.subject,
        problem: res.problem,
        solution: res.solution,
        why_choose_me: res.why_choose_me,
        email_body: res.email_body,
        whatsapp_message: res.whatsapp_message,
        model_used: res.model_used,
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                ai_pitch_subject: res.subject,
                ai_pitch_body: res.email_body,
                ai_pitch_whatsapp: res.whatsapp_message,
                ai_pitch_strategy: res.strategy,
              }
            : l
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate pitch with Gemini");
    } finally {
      setPitchLoading(false);
    }
  };

  const handleBatchGeneratePitches = async () => {
    if (selectedLeadIds.length === 0) return;
    setBatchPitching(true);
    try {
      const res = await api.leads.batchGeneratePitches({
        lead_ids: selectedLeadIds,
        sender_name: senderName,
        api_key: geminiApiKey.trim() || undefined,
      });
      setNotice(res.message);
      setBatchPitchModalOpen(false);
      loadLeads();
      setTimeout(() => setNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to batch generate pitches");
    } finally {
      setBatchPitching(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("outreach_gemini_api_key", geminiApiKey.trim());
    localStorage.setItem("outreach_sender_name", senderName.trim());
    setApiKeyModalOpen(false);
    setNotice("✓ Gemini API settings saved successfully");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.folders.create({
        name: newFolderName.trim(),
        description: newFolderDesc.trim() || undefined,
      });
      setNewFolderName("");
      setNewFolderDesc("");
      setCreateFolderModalOpen(false);
      setNotice("✓ Folder created successfully");
      loadFolders();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const deleteLeadsToo = confirm(
      `Do you want to delete folder "${folderName}"?\n\nClick OK to also DELETE all leads inside it, or Cancel to only unassign them.`
    );
    try {
      await api.folders.delete(folderId, deleteLeadsToo);
      if (selectedFolderId === folderId) setSelectedFolderId("ALL");
      setNotice(`✓ Folder "${folderName}" deleted`);
      loadFolders();
      loadLeads();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete folder failed");
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() && !newPhone.trim()) {
      alert("Please provide either an email or a phone number.");
      return;
    }

    setModalLoading(true);
    try {
      await api.leads.create({
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        first_name: newFirstName.trim() || undefined,
        company: newCompany.trim() || undefined,
        website: newWebsite.trim() || undefined,
        folder_id: newLeadFolderId || undefined,
      });
      setAddModalOpen(false);
      setNewEmail("");
      setNewPhone("");
      setNewFirstName("");
      setNewCompany("");
      setNewWebsite("");
      setNotice("✓ Lead saved");
      loadLeads();
      loadFolders();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setModalLoading(false);
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete selected leads
  const handleDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete the ${selectedLeadIds.length} selected leads?`
      )
    )
      return;

    setActionLoading(true);
    try {
      const res = await api.leads.batchDelete(selectedLeadIds);
      setNotice(`✓ Deleted ${res.deleted} leads successfully`);
      setSelectedLeadIds([]);
      loadLeads();
      loadFolders();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Batch delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete all leads in view / folder
  const handleDeleteAll = async () => {
    const scopeName =
      selectedFolderId === "ALL"
        ? "ALL leads across the entire database"
        : selectedFolderId === "UNASSIGNED"
        ? "all unassigned leads"
        : `all leads in this folder`;

    if (
      !confirm(
        `⚠️ DANGER: Are you sure you want to delete ${scopeName}? This action CANNOT be undone.`
      )
    )
      return;

    setActionLoading(true);
    try {
      const res = await api.leads.deleteAll(selectedFolderId);
      setNotice(`✓ Successfully deleted ${res.deleted} leads`);
      setSelectedLeadIds([]);
      loadLeads();
      loadFolders();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete all failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Move selected leads to folder
  const handleMoveSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeadIds.length === 0) return;

    setActionLoading(true);
    try {
      const targetFolder = targetMoveFolderId === "UNASSIGNED" ? null : targetMoveFolderId;
      await api.leads.moveToFolder(selectedLeadIds, targetFolder);
      setNotice(`✓ Moved ${selectedLeadIds.length} leads to folder`);
      setMoveModalOpen(false);
      setSelectedLeadIds([]);
      loadLeads();
      loadFolders();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to move leads");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingleLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      await api.leads.delete(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setSelectedLeadIds((prev) => prev.filter((itemId) => itemId !== id));
      loadFolders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setNotice(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) return;

        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const emailIdx = header.findIndex((h) => h.includes("email"));
        const phoneIdx = header.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("whatsapp") || h.includes("number"));
        const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("first"));
        const companyIdx = header.findIndex((h) => h.includes("company"));
        const webIdx = header.findIndex((h) => h.includes("web") || h.includes("site") || h.includes("url"));

        const payload: Array<{ email?: string; phone?: string; first_name?: string; company?: string; website?: string }> = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const leadEmail = emailIdx !== -1 ? row[emailIdx] : "";
          const leadPhone = phoneIdx !== -1 ? row[phoneIdx] : "";
          if ((leadEmail && leadEmail.includes("@")) || (leadPhone && leadPhone.length >= 7)) {
            payload.push({
              email: leadEmail || undefined,
              phone: leadPhone || undefined,
              first_name: nameIdx !== -1 ? row[nameIdx] : undefined,
              company: companyIdx !== -1 ? row[companyIdx] : undefined,
              website: webIdx !== -1 ? row[webIdx] : undefined,
            });
          }
        }

        if (payload.length === 0) {
          alert("No valid email or phone rows found in CSV");
          setImporting(false);
          return;
        }

        const targetFolder = selectedFolderId !== "ALL" && selectedFolderId !== "UNASSIGNED" ? selectedFolderId : undefined;
        const res = await api.leads.importCsv(payload, targetFolder);
        setNotice(`✓ Imported ${res.imported} leads (${res.duplicates} duplicates skipped)`);
        loadLeads();
        loadFolders();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error parsing CSV");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExtractFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractorFile) return;

    setExtracting(true);
    setNotice(null);

    try {
      const res = await api.leads.uploadExtract(extractorFile, extractorFolderName.trim() || undefined);
      setNotice(res.message);
      setExtractorModalOpen(false);
      setExtractorFile(null);
      setExtractorFolderName("");
      await loadFolders();
      // Auto-select the newly created folder so user sees the extracted leads immediately!
      setSelectedFolderId(res.folder_id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to extract leads from file");
    } finally {
      setExtracting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const term = search.toLowerCase();
    return (
      (l.email && l.email.toLowerCase().includes(term)) ||
      (l.phone && l.phone.toLowerCase().includes(term)) ||
      (l.company && l.company.toLowerCase().includes(term)) ||
      (l.first_name && l.first_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple Lead Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-900/40">
              <Users className="w-6 h-6" />
            </span>
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Leads &amp; Folders
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Organize extracted prospects into folders of 50, batch select, delete, or export leads
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExtractorModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Sheet / Doc (Auto-Extract)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreateFolderModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>New Folder</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Add Single Lead</span>
          </motion.button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl glass-panel border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-950/40">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Folders Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Folder className="w-4 h-4 text-purple-400" />
            <span>Prospect Folders ({folders.length})</span>
          </span>
          <span className="text-[11px] text-zinc-500">
            Crawl jobs automatically segment every ~50 prospects into separate folders
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedFolderId("ALL")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
              selectedFolderId === "ALL"
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50"
                : "glass-card text-zinc-300 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Leads ({totalLeadsCount})</span>
          </motion.button>

          {unassignedCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedFolderId("UNASSIGNED")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                selectedFolderId === "UNASSIGNED"
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50"
                : "glass-card text-zinc-300 hover:text-white"
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-zinc-400" />
              <span>Unassigned ({unassignedCount})</span>
            </motion.button>
          )}

          {folders.map((f) => (
            <div
              key={f.id}
              className={`flex items-center rounded-2xl transition-all shrink-0 ${
                selectedFolderId === f.id
                  ? "bg-purple-500/25 border border-purple-500/60 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                  : "glass-card hover:border-purple-500/30 text-zinc-300"
              }`}
            >
              <button
                onClick={() => setSelectedFolderId(f.id)}
                className="px-3.5 py-2 text-xs font-bold flex items-center gap-2"
              >
                <Folder className="w-3.5 h-3.5 text-purple-400" />
                <span className="max-w-[180px] truncate">{f.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 font-mono text-purple-300 border border-purple-500/30">
                  {f.leads_count}
                </span>
              </button>
              <button
                onClick={() => handleDeleteFolder(f.id, f.name)}
                className="p-2 pr-3 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Segments & Sorting Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-purple-500/20 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Leads" },
            { id: "NO_WEBSITE", label: "🌐 No Website (Pitch Web+Mktg)", highlight: true },
            { id: "HAS_WEBSITE", label: "⚡ Has Website" },
            { id: "PHONE_ONLY", label: "📱 Phone / WA Only" },
            { id: "EMAIL_ONLY", label: "📧 Email Only" },
            { id: "FULL_CONTACT", label: "⭐ Full Contact" },
          ].map((seg) => (
            <button
              key={seg.id}
              onClick={() => setSegmentFilter(seg.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                segmentFilter === seg.id
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-900/40 border border-purple-400/40"
                  : seg.highlight
                  ? "bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:border-purple-400"
                  : "glass-card text-zinc-400 hover:text-white"
              }`}
            >
              <span>{seg.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-purple-500/20 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="created_at" className="bg-zinc-950 text-white">Date Added</option>
              <option value="phone" className="bg-zinc-950 text-white">Phone Number</option>
              <option value="email" className="bg-zinc-950 text-white">Email Address</option>
              <option value="website" className="bg-zinc-950 text-white">Website</option>
              <option value="company" className="bg-zinc-950 text-white">Company Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 text-zinc-400 hover:text-purple-300 transition-colors"
              title={`Order: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {/* Gemini AI Settings button */}
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl glass-card hover:border-purple-500/50 text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Configure Gemini API Key & Sender Profile"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>
        </div>
      </div>

      {/* Filter, Search, and Batch Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, name, company..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "PENDING", "SENT", "OPENED", "REPLIED", "SKIPPED", "FAILED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  statusFilter === s
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-900/40"
                    : "glass-card text-zinc-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons: Delete All or Batch Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedLeadIds.length > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setBatchPitchModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Pitch ({selectedLeadIds.length})</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setMoveModalOpen(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl glass-card hover:border-purple-500/50 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Folder className="w-3.5 h-3.5 text-purple-400" />
                <span>Move ({selectedLeadIds.length})</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleDeleteSelected}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedLeadIds.length})</span>
              </motion.button>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleDeleteAll}
            disabled={actionLoading || filteredLeads.length === 0}
            className="px-4 py-2 rounded-xl glass-card hover:bg-red-500/15 hover:border-red-500/40 text-zinc-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Delete all leads in current view"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All ({filteredLeads.length})</span>
          </motion.button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-3xl glass-panel overflow-hidden border border-purple-500/20">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Loading prospects...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-3 text-purple-400/50" />
            <p className="font-bold text-white text-sm">No leads found in this filter</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? "No leads matching your search" : "Try selecting 'All Leads' or importing a new sheet/document."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 border-b border-purple-500/20 text-[10px] uppercase font-bold text-zinc-400">
                <tr>
                  <th className="p-4 w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-zinc-400 hover:text-white"
                      title="Select all on this page"
                    >
                      {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Company &amp; Website</th>
                  <th className="p-4">AI Proposal</th>
                  <th className="p-4">Folder</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredLeads.map((lead) => {
                  const isChecked = selectedLeadIds.includes(lead.id);
                  const folderObj = folders.find((f) => f.id === lead.folder_id);
                  const hasWebsite = Boolean(
                    lead.website &&
                    lead.website.trim() &&
                    !["none", "null", "n/a", "no website", "no"].includes(lead.website.trim().toLowerCase())
                  );

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isChecked ? "bg-purple-600/15" : ""
                      }`}
                    >
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleLead(lead.id)}
                          className="text-zinc-400 hover:text-white"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        {lead.email && !lead.email.endsWith("@outreachbot.local") ? (
                          <p className="font-mono text-white font-medium">{lead.email}</p>
                        ) : null}
                        {lead.phone ? (
                          <p className="font-mono text-purple-300 text-[11px] font-semibold flex items-center gap-1">
                            <span>WA:</span> +{lead.phone}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4 text-zinc-300">{lead.first_name || "—"}</td>
                      <td className="p-4">
                        <p className="text-white font-semibold">{lead.company || "—"}</p>
                        {hasWebsite ? (
                          <a
                            href={lead.website!.startsWith("http") ? lead.website! : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 truncate max-w-xs transition-colors mt-0.5"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{lead.website}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
                            <Globe className="w-2.5 h-2.5 text-purple-400" />
                            No Website
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {lead.ai_pitch_subject ? (
                          <button
                            onClick={() => handleOpenPitch(lead)}
                            className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-200 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Sparkles className="w-3 h-3 text-purple-300" />
                            <span>View Pitch</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenPitch(lead)}
                            className="px-2.5 py-1 rounded-xl glass-card hover:border-purple-500/50 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span>Pitch</span>
                          </button>
                        )}
                      </td>
                      <td className="p-4">
                        {folderObj ? (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-950/40 text-[10px] text-purple-300 font-semibold border border-purple-500/20">
                            {folderObj.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            lead.status === "SENT"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : lead.status === "OPENED"
                              ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40"
                              : lead.status === "PENDING"
                              ? "bg-purple-950/60 text-purple-200 border-purple-500/30"
                              : lead.status === "SKIPPED"
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteSingleLead(lead.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete single lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {createFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md p-6 glass-panel border border-purple-500/30 rounded-3xl shadow-2xl">
            <button
              onClick={() => setCreateFolderModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create Prospect Folder</h3>
            <p className="text-xs text-zinc-400 mb-6">Group leads for targeted campaign segmentation</p>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. B2B SaaS Leads - Batch 1"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="e.g. Scraped from TechCrunch top 50 SaaS list"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Selected Leads Modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md p-6 glass-panel border border-purple-500/30 rounded-3xl shadow-2xl">
            <button
              onClick={() => setMoveModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Move Selected Leads</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Moving {selectedLeadIds.length} prospects into a chosen folder
            </p>

            <form onSubmit={handleMoveSelected} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Target Destination Folder
                </label>
                <select
                  value={targetMoveFolderId}
                  onChange={(e) => setTargetMoveFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="" className="bg-zinc-950 text-white">Select a folder...</option>
                  <option value="UNASSIGNED" className="bg-zinc-950 text-white">Unassigned (Remove from folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-zinc-950 text-white">
                      {f.name} ({f.leads_count} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !targetMoveFolderId}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40"
                >
                  Confirm Move
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 glass-panel border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Add Single Lead</h3>
            <p className="text-xs text-zinc-400 mb-6">Manually input a prospect contact</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Folder Assignment
                </label>
                <select
                  value={newLeadFolderId}
                  onChange={(e) => setNewLeadFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="" className="bg-zinc-950 text-white">Unassigned</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-zinc-950 text-white">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="contact@brand.com"
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center gap-1.5"
                >
                  {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : "Save Lead"}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Smart Sheet / Doc File Extractor Modal */}
      {extractorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-lg p-6 glass-panel border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl">
            <button
              onClick={() => {
                setExtractorModalOpen(false);
                setExtractorFile(null);
              }}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-white">Smart Document &amp; Sheet Extractor</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Upload any Spreadsheet or Document. We will automatically parse and extract all phone numbers &amp; emails, and organize them into a brand new folder.
            </p>

            <form onSubmit={handleExtractFile} className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) {
                    const f = e.dataTransfer.files[0];
                    setExtractorFile(f);
                    if (!extractorFolderName) {
                      const name = f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                      setExtractorFolderName(`Imported: ${name}`);
                    }
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive
                    ? "border-purple-400 bg-purple-500/10 scale-[1.01]"
                    : extractorFile
                    ? "border-purple-500/50 bg-purple-950/20"
                    : "border-purple-500/25 hover:border-purple-500/40 bg-black/40"
                }`}
              >
                <input
                  type="file"
                  id="sheetDocFileInput"
                  accept=".csv,.xlsx,.xls,.docx,.doc,.pdf,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setExtractorFile(f);
                      if (!extractorFolderName) {
                        const name = f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                        setExtractorFolderName(`Imported: ${name}`);
                      }
                    }
                  }}
                  className="hidden"
                />

                {extractorFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white max-w-xs truncate mx-auto">{extractorFile.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {(extractorFile.size / 1024).toFixed(1)} KB &bull; Ready to extract
                      </p>
                    </div>
                    <label
                      htmlFor="sheetDocFileInput"
                      className="inline-block text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer font-semibold"
                    >
                      Change file
                    </label>
                  </div>
                ) : (
                  <label htmlFor="sheetDocFileInput" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        Click to browse or drag &amp; drop your file here
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Supports <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, <strong>Word (.docx)</strong>, <strong>PDF (.pdf)</strong>, or <strong>Text (.txt)</strong>
                      </p>
                    </div>
                    <span className="inline-block px-3 py-1 rounded-xl glass-card text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                      Auto-detects emails &amp; phone numbers
                    </span>
                  </label>
                )}
              </div>

              {/* Target Folder Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Destination Folder Name (Auto-created)
                </label>
                <div className="relative">
                  <Folder className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    required
                    value={extractorFolderName}
                    onChange={(e) => setExtractorFolderName(e.target.value)}
                    placeholder="e.g. Imported: SaaS Founders Sheet"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  All extracted leads will be grouped together into this folder.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setExtractorModalOpen(false);
                    setExtractorFile(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={extracting || !extractorFile}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Extracting Contacts...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract &amp; Create Folder</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Pitch Drawer / Modal */}
      {pitchModalOpen && pitchLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 glass-panel border border-purple-500/40 rounded-3xl shadow-2xl shadow-purple-950/60">
            <button
              onClick={() => {
                setPitchModalOpen(false);
                setPitchData(null);
              }}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-500/20 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gemini AI Lead Intelligence</span>
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{pitchLead.company || "Business Proposal"}</span>
                  {pitchLead.first_name && (
                    <span className="text-xs font-normal text-zinc-400">({pitchLead.first_name})</span>
                  )}
                </h3>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                  {pitchLead.email && <span>Email: {pitchLead.email}</span>}
                  {pitchLead.phone && <span>WA: +{pitchLead.phone}</span>}
                  {pitchLead.website ? (
                    <span className="text-purple-300">Web: {pitchLead.website}</span>
                  ) : (
                    <span className="text-purple-400 font-semibold">No Website Detected</span>
                  )}
                </div>
              </div>

              {pitchData && (
                <div className="self-start sm:self-center">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {pitchData.strategy === "NO_WEBSITE"
                        ? "🌐 Website First + Marketing Offer"
                        : pitchData.strategy === "PHONE_ONLY"
                        ? "📱 Phone & WhatsApp Direct Offer"
                        : "⚡ Web Redesign & Marketing Offer"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {pitchLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-sm font-bold text-white">Analyzing credentials with Gemini AI...</p>
                <p className="text-xs text-zinc-400 max-w-md">
                  Formulating 3-pillar proposal: Identifying business pain points, designing the Website First + Marketing offer, and structuring competitive differentiators.
                </p>
              </div>
            ) : pitchData ? (
              <div className="space-y-6">
                {/* 3 Pillar Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-red-500/20 text-xs">
                    <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">
                      1. Problem Identified
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{pitchData.problem}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                      2. Proposed Solution
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{pitchData.solution}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/30 text-xs">
                    <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                      3. Why Choose Me
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{pitchData.why_choose_me}</p>
                  </div>
                </div>

                {/* Pitch Tabs */}
                <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3">
                  <button
                    onClick={() => setPitchTab("email")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      pitchTab === "email"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                        : "glass-card text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Cold Email Proposal</span>
                  </button>

                  <button
                    onClick={() => setPitchTab("whatsapp")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      pitchTab === "whatsapp"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                        : "glass-card text-zinc-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp / SMS Script</span>
                  </button>
                </div>

                {/* Email Tab Content */}
                {pitchTab === "email" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase text-purple-300">
                          Subject Line
                        </label>
                        <button
                          onClick={() => copyToClipboard(pitchData.subject, "subject")}
                          className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedField === "subject" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Subject</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pitchData.subject}
                        onChange={(e) => setPitchData({ ...pitchData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase text-purple-300">
                          Personalized Pitch Body
                        </label>
                        <button
                          onClick={() => copyToClipboard(pitchData.email_body, "body")}
                          className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedField === "body" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Email</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        rows={11}
                        value={pitchData.email_body}
                        onChange={(e) => setPitchData({ ...pitchData, email_body: e.target.value })}
                        className="w-full p-4 glass-input rounded-2xl text-xs text-white focus:border-purple-500 focus:outline-none font-sans leading-relaxed"
                      />
                    </div>

                    {/* Email Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() => generatePitchForLead(pitchLead)}
                        className="px-4 py-2.5 rounded-xl glass-card hover:border-purple-500/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Regenerate Pitch</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {pitchLead.email && (
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                              pitchLead.email
                            )}&su=${encodeURIComponent(pitchData.subject)}&body=${encodeURIComponent(
                              pitchData.email_body
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send via Gmail</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp Tab Content */}
                {pitchTab === "whatsapp" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase text-purple-300">
                          Direct WhatsApp Script
                        </label>
                        <button
                          onClick={() => copyToClipboard(pitchData.whatsapp_message, "wa")}
                          className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedField === "wa" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy WhatsApp Script</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        rows={10}
                        value={pitchData.whatsapp_message}
                        onChange={(e) =>
                          setPitchData({ ...pitchData, whatsapp_message: e.target.value })
                        }
                        className="w-full p-4 glass-input rounded-2xl text-xs text-white focus:border-purple-500 focus:outline-none font-sans leading-relaxed"
                      />
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() => generatePitchForLead(pitchLead)}
                        className="px-4 py-2.5 rounded-xl glass-card hover:border-purple-500/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Regenerate Pitch</span>
                      </button>

                      {pitchLead.phone && (
                        <a
                          href={`https://wa.me/${pitchLead.phone.replace(
                            /\D/g,
                            ""
                          )}?text=${encodeURIComponent(pitchData.whatsapp_message)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open in WhatsApp (+{pitchLead.phone})</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Batch AI Pitch Modal */}
      {batchPitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md p-6 glass-panel border border-purple-500/30 rounded-3xl shadow-2xl">
            <button
              onClick={() => setBatchPitchModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Batch AI Pitch Generator</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Generate AI Pitches for {selectedLeadIds.length} Leads
            </h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Gemini AI will inspect each prospect&apos;s credentials, detect whether they lack a website or have phone only, and generate custom proposals following the Problem &rarr; Solution &rarr; Why Me framework.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Sender Identity Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Ruhul (Growth & Web Specialist)"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setBatchPitchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBatchGeneratePitches}
                  disabled={batchPitching}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {batchPitching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Generating Pitches...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate {selectedLeadIds.length} Pitches</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Settings Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md p-6 glass-panel border border-purple-500/30 rounded-3xl shadow-2xl">
            <button
              onClick={() => setApiKeyModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
              <Settings2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini AI Configuration</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">AI Pitch Engine Settings</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Configure your Gemini API credentials and outreach signature
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Defaults to server's configured key if empty"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Leave blank to use the pre-configured server environment key.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Your Name / Signature
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Ruhul"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setApiKeyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
