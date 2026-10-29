"use client";

import React, { useEffect, useState } from "react";
import { api, Lead } from "@/lib/api";
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
  FileSpreadsheet,
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Add lead modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.leads.list(0, 200, statusFilter);
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setModalLoading(true);
    try {
      await api.leads.create({
        email: newEmail.trim(),
        first_name: newFirstName.trim() || undefined,
        company: newCompany.trim() || undefined,
        website: newWebsite.trim() || undefined,
      });
      setAddModalOpen(false);
      setNewEmail("");
      setNewFirstName("");
      setNewCompany("");
      setNewWebsite("");
      loadLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      await api.leads.delete(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
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

        // Parse header
        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const emailIdx = header.findIndex((h) => h.includes("email"));
        const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("first"));
        const companyIdx = header.findIndex((h) => h.includes("company"));
        const webIdx = header.findIndex((h) => h.includes("web") || h.includes("site") || h.includes("url"));

        const payload: Array<{ email: string; first_name?: string; company?: string; website?: string }> = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const leadEmail = emailIdx !== -1 ? row[emailIdx] : row[0];
          if (leadEmail && leadEmail.includes("@")) {
            payload.push({
              email: leadEmail,
              first_name: nameIdx !== -1 ? row[nameIdx] : undefined,
              company: companyIdx !== -1 ? row[companyIdx] : undefined,
              website: webIdx !== -1 ? row[webIdx] : undefined,
            });
          }
        }

        if (payload.length === 0) {
          alert("No valid email rows found in CSV");
          setImporting(false);
          return;
        }

        const res = await api.leads.importCsv(payload);
        setNotice(`✓ Imported ${res.imported} leads (${res.duplicates} duplicates skipped)`);
        loadLeads();
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
      l.email.toLowerCase().includes(term) ||
      (l.company && l.company.toLowerCase().includes(term)) ||
      (l.first_name && l.first_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Leads Database</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified prospect contacts extracted from scraper or uploaded via CSV
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5 text-orange-400" />
            <span>{importing ? "Importing CSV..." : "Import CSV"}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={importing}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Lead</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, company..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {["ALL", "PENDING", "SENT", "OPENED", "REPLIED", "SKIPPED", "FAILED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                statusFilter === s
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            <span className="text-xs">Loading prospects...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-white text-sm">No leads found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? "No leads matching your search" : "Run the scraper or import a CSV to add prospects."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="p-4">Email</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Company &amp; Website</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-850/30 transition-colors">
                    <td className="p-4 font-mono text-white font-medium">{lead.email}</td>
                    <td className="p-4 text-slate-300">{lead.first_name || "—"}</td>
                    <td className="p-4">
                      <p className="text-white font-semibold">{lead.company || "—"}</p>
                      {lead.website && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{lead.website}</p>
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
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : lead.status === "SKIPPED"
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Add Single Lead</h3>
            <p className="text-xs text-slate-400 mb-6">Manually input a prospect contact</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contact@brand.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5"
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
