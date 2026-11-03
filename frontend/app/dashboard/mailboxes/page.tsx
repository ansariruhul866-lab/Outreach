"use client";

import React, { useEffect, useState } from "react";
import { api, Sender } from "@/lib/api";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  Server,
  Zap,
  Sparkles,
} from "lucide-react";

export default function MailboxesPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual SMTP Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [provider, setProvider] = useState("GMAIL");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(587);
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSenders = async () => {
    try {
      setLoading(true);
      const data = await api.senders.list();
      setSenders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSenders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleProviderSelect = (p: string) => {
    setProvider(p);
    if (p === "GMAIL") {
      setHost("smtp.gmail.com");
      setPort(587);
    } else if (p === "OUTLOOK") {
      setHost("smtp.office365.com");
      setPort(587);
    } else {
      setHost("");
      setPort(587);
    }
  };

  const handleGoogleConnect = () => {
    // Direct Server-Side Google OAuth 2.0 with permanent Gmail sending permissions
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    window.location.href = `${apiUrl}/auth/google/login?return_url=/dashboard/mailboxes`;
  };

  const handleConnectSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setConnecting(true);
    setNotice(null);
    try {
      const res = await api.senders.connect({
        email: email.trim(),
        display_name: name.trim() || email.split("@")[0],
        provider,
        smtp_host: host,
        smtp_port: port,
        smtp_user: email.trim(),
        smtp_password: password,
      });

      setNotice(res.message || "✓ Mailbox connected successfully!");
      setModalOpen(false);
      setEmail("");
      setPassword("");
      loadSenders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDeleteSender = async (id: string) => {
    if (!confirm("Disconnect this sending mailbox?")) return;
    try {
      await api.senders.delete(id);
      loadSenders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Black &amp; Purple Mailbox Infrastructure</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-900/40">
              <Mail className="w-6 h-6" />
            </span>
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Mailbox Dispatcher
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Connect mailboxes via official Gmail REST API or standard SMTP App Passwords
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleConnect}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>1-Click Connect Google (Instant)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              handleProviderSelect("GMAIL");
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Connect via App Password</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              handleProviderSelect("OUTLOOK");
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Outlook / SMTP</span>
          </motion.button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl glass-panel border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-950/40">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Highlight Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-purple-500/30 flex items-start gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 ambient-glow-purple-accent opacity-25 blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/35 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1 relative z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Guaranteed Sending via Gmail App Passwords &amp; SMTP</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500/25 text-purple-200 border border-purple-500/40">100% Reliable</span>
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Connect any Gmail or Google Workspace mailbox using a 16-character <strong>App Password</strong>. It connects in seconds, requires zero Google Cloud verification or test users, never expires, and dispatches your cold email campaigns with high inbox deliverability.
          </p>
        </div>
      </div>

      {/* Mailbox Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Loading mailboxes...</span>
          </div>
        ) : senders.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 rounded-3xl glass-panel border border-purple-500/20">
            <Mail className="w-8 h-8 mx-auto mb-3 text-purple-400/50" />
            <p className="font-bold text-white text-sm">No mailboxes connected</p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Click &apos;Connect Google Account&apos; or add an SMTP account to start sending campaigns.
            </p>
          </div>
        ) : (
          senders.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-3xl glass-panel border border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white">{s.display_name}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      s.provider === "GMAIL_API"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {s.provider === "GMAIL_API" ? "⚡ GMAIL REST API (OAuth)" : s.provider}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                      s.status === "VERIFIED"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : s.status === "PENDING"
                        ? "bg-purple-950/60 text-purple-300 border-purple-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {s.status === "VERIFIED" ? "✓ Ready to Send" : s.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{s.email}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Daily Quota: {s.daily_limit} emails &bull; Sent Today: {s.sent_today}
                </p>
              </div>

              <button
                onClick={() => handleDeleteSender(s.id)}
                className="px-3.5 py-2 rounded-xl glass-card hover:bg-red-500/15 hover:text-red-400 text-zinc-400 text-xs font-semibold flex items-center gap-1.5 transition-all w-fit"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Manual SMTP Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 glass-panel border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {provider === "GMAIL" ? "Connect Gmail Mailbox" : "Connect Mailbox via SMTP"}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              {provider === "GMAIL"
                ? "Uses standard 16-character Google App Password (no Google Cloud verification needed)"
                : "Enter your mail server credentials and test connection"}
            </p>

            {provider === "GMAIL" && (
              <div className="mb-4 p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center justify-between font-bold text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>How to get your App Password:</span>
                  </span>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                  >
                    Open Google Security ↗
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                  <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google Account.</li>
                  <li>Click <strong>Open Google Security ↗</strong> above to visit the App Passwords page.</li>
                  <li>Type <strong className="text-white">OutreachBot</strong> as the app name and click <strong>Create</strong>.</li>
                  <li>Copy the 16-character code (e.g. <span className="font-mono text-purple-300">abcd efgh ijkl mnop</span>) and paste it below.</li>
                </ol>
              </div>
            )}

            <form onSubmit={handleConnectSmtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Mailbox Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderSelect(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="GMAIL" className="bg-zinc-950 text-white">Gmail (App Password - Recommended)</option>
                  <option value="OUTLOOK" className="bg-zinc-950 text-white">Outlook / Office 365</option>
                  <option value="CUSTOM" className="bg-zinc-950 text-white">Custom SMTP Server (Zoho, Yahoo, etc.)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul from Acme"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {provider !== "GMAIL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      required
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                      className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                  {provider === "GMAIL" ? "16-Character Gmail App Password *" : "App Password / SMTP Password *"}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={provider === "GMAIL" ? "abcd efgh ijkl mnop" : "Password / App Password"}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none font-mono tracking-wider"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={connecting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center gap-1.5"
                >
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : "Test & Connect"}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
