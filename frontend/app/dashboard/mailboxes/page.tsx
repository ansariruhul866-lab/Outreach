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

  const handleGoogleConnect = async () => {
    setNotice(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken || null;
      const idToken = await user.getIdToken();

      await api.auth.firebaseLogin(idToken, user.displayName || undefined, googleAccessToken);
      setNotice("✓ Google Account connected and authorized for Gmail sending!");
      loadSenders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to connect Google account");
    }
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs font-bold mb-2 shadow-sm dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Black &amp; Purple Mailbox Infrastructure</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-100 dark:bg-purple-500/15 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-sm">
              <Mail className="w-6 h-6" />
            </span>
            <span>Mailbox Dispatcher</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            Connect mailboxes via official Gmail REST API or standard SMTP App Passwords
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleConnect}
            className="px-5 py-2.5 rounded-2xl glass-card hover:border-purple-500/50 text-white font-bold text-xs flex items-center gap-2.5 transition-all shadow-lg"
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
            <span>Connect Google Account</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add SMTP Mailbox</span>
          </motion.button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl glass-panel border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-950/40">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Gmail API Highlight Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-purple-500/30 flex items-start gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 ambient-glow-purple-accent opacity-25 blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/35 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1 relative z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Recommended: 1-Click Gmail REST API</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500/25 text-purple-200 border border-purple-500/40">Official</span>
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Logging in with Google automatically connects your mailbox. Emails dispatch over <strong>HTTPS (port 443)</strong>, eliminating all cloud firewall timeouts (Render, Vercel, Railway) and bypassing manual App Password setups.
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
          <div className="p-12 text-center text-zinc-500 rounded-3xl glass-card border-purple-500/20">
            <Mail className="w-8 h-8 mx-auto mb-3 text-purple-400/40" />
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
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        : "bg-black/60 text-zinc-400 border border-purple-500/20"
                    }`}
                  >
                    {s.provider === "GMAIL_API" ? "⚡ GMAIL REST API (OAuth)" : s.provider}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                      s.status === "VERIFIED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : s.status === "PENDING"
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
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
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-red-500/15 hover:text-red-400 text-zinc-400 text-xs font-semibold flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-transparent hover:border-red-500/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-black/95 border border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-950/50">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Connect SMTP Mailbox</h3>
            <p className="text-xs text-zinc-400 mb-6">Enter your mail credentials &amp; test connection</p>

            <form onSubmit={handleConnectSmtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Mailbox Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="GMAIL" className="bg-black text-white">Gmail (App Password)</option>
                  <option value="OUTLOOK" className="bg-black text-white">Outlook / Office 365</option>
                  <option value="CUSTOM" className="bg-black text-white">Custom SMTP Server</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul from Acme"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                    className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  App Password / SMTP Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="16-character App Password"
                  className="w-full px-4 py-2.5 bg-black/60 border border-purple-500/30 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
