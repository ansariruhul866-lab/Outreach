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
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [folders, setFolders] = useState<LeadFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("ALL");
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

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
      const data = await api.leads.list(0, 500, statusFilter, selectedFolderId);
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
    loadFolders();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, selectedFolderId]);

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
            onClick={() => setCreateFolderModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>New Folder</span>
          </motion.button>

          <motion.label
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>{importing ? "Importing..." : "Import CSV"}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={importing}
              className="hidden"
            />
          </motion.label>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAddModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
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
            <Users className="w-8 h-8 mx-auto mb-3 text-purple-400/40" />
            <p className="font-bold text-white text-sm">No leads found in this folder</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? "No leads matching your search" : "Run the scraper or import a CSV to add prospects."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 border-b border-purple-500/20 text-[10px] uppercase font-bold text-zinc-400">
                <tr>
                  <th className="p-4 w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-zinc-400 hover:text-white cursor-pointer"
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
                  <th className="p-4">Folder</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredLeads.map((lead) => {
                  const isChecked = selectedLeadIds.includes(lead.id);
                  const folderObj = folders.find((f) => f.id === lead.folder_id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-purple-950/20 transition-colors ${
                        isChecked ? "bg-purple-600/10" : ""
                      }`}
                    >
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleLead(lead.id)}
                          className="text-zinc-400 hover:text-white cursor-pointer"
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
                          <p className="font-mono text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                            <span>WA:</span> +{lead.phone}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4 text-zinc-300">{lead.first_name || "—"}</td>
                      <td className="p-4">
                        <p className="text-white font-semibold">{lead.company || "—"}</p>
                        {lead.website && (
                          <p className="text-[11px] text-zinc-500 truncate max-w-xs">{lead.website}</p>
                        )}
                      </td>
                      <td className="p-4">
                        {folderObj ? (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-950/40 text-[10px] text-purple-300 font-semibold border border-purple-500/30">
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
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : lead.status === "OPENED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : lead.status === "PENDING"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
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
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-black/95 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/50">
            <button
              onClick={() => setCreateFolderModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create Prospect Folder</h3>
            <p className="text-xs text-zinc-400 mb-6">Group leads for targeted campaign segmentation</p>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. B2B SaaS Leads - Batch 1"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="e.g. Scraped from TechCrunch top 50 SaaS list"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-black/95 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/50">
            <button
              onClick={() => setMoveModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Move Selected Leads</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Moving {selectedLeadIds.length} prospects into a chosen folder
            </p>

            <form onSubmit={handleMoveSelected} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Target Destination Folder
                </label>
                <select
                  value={targetMoveFolderId}
                  onChange={(e) => setTargetMoveFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="" className="bg-black text-white">Select a folder...</option>
                  <option value="UNASSIGNED" className="bg-black text-white">Unassigned (Remove from folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-black text-white">
                      {f.name} ({f.leads_count} leads)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !targetMoveFolderId}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-black/95 border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-950/50">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Add Single Lead</h3>
            <p className="text-xs text-zinc-400 mb-6">Manually input a prospect contact</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Folder Assignment
                </label>
                <select
                  value={newLeadFolderId}
                  onChange={(e) => setNewLeadFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="" className="bg-black text-white">Unassigned</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-black text-white">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="contact@brand.com"
                    className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-emerald-400 mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
