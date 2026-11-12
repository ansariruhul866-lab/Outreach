"use client";

import React, { useEffect, useState } from "react";
import { api, getApiBase, Sender } from "@/lib/api";
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const apiUrl = getApiBase();
    window.location.href = `${apiUrl}/auth/google/login?return_url=${encodeURIComponent(origin + "/dashboard/mailboxes")}`;
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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA] text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#7857FF]" />
            <span>Enterprise Mailbox Infrastructure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#F5F7FF] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA]">
              <Mail className="w-5 h-5 text-[#7857FF]" />
            </span>
            <span>Mailbox Dispatcher</span>
          </h1>
          <p className="text-xs text-[#A3AEC2] mt-1">
            Connect mailboxes via official Gmail REST API or standard SMTP App Passwords
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleConnect}
            className="btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2"
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              handleProviderSelect("GMAIL");
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#141A29] border border-[#283149] hover:bg-[#1B2233] text-[#F5F7FF] font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7857FF]" />
            <span>Connect via App Password</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              handleProviderSelect("OUTLOOK");
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#141A29] border border-[#283149] hover:bg-[#1B2233] text-[#A3AEC2] hover:text-[#F5F7FF] font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#7857FF]" />
            <span>Outlook / SMTP</span>
          </motion.button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-[#141A29] border border-[#32C98A]/40 text-[#32C98A] text-xs font-medium flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Highlight Banner */}
      <div className="p-6 rounded-2xl bg-[#141A29] border border-[#283149] flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA] flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-[#7857FF]" />
        </div>
        <div className="space-y-1 relative z-10">
          <h3 className="text-sm font-bold text-[#F5F7FF] flex items-center gap-2">
            <span>Guaranteed Sending via Gmail App Passwords &amp; SMTP</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#32C98A]/15 text-[#32C98A] border border-[#32C98A]/30">
              100% Reliable
            </span>
          </h3>
          <p className="text-xs text-[#A3AEC2] leading-relaxed">
            Connect any Gmail or Google Workspace mailbox using a 16-character <strong>App Password</strong>. It connects in seconds, requires zero Google Cloud verification or test users, never expires, and dispatches your cold email campaigns with high inbox deliverability.
          </p>
        </div>
      </div>

      {/* Mailbox Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-[#727E96] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#7857FF]" />
            <span className="text-xs">Loading mailboxes...</span>
          </div>
        ) : senders.length === 0 ? (
          <div className="p-12 text-center text-[#727E96] rounded-2xl bg-[#141A29] border border-[#283149]">
            <Mail className="w-8 h-8 mx-auto mb-3 text-[#7857FF]/40" />
            <p className="font-bold text-[#F5F7FF] text-sm">No mailboxes connected</p>
            <p className="text-xs text-[#A3AEC2] mt-1 mb-4">
              Click &apos;Connect Google Account&apos; or add an SMTP account to start sending campaigns.
            </p>
          </div>
        ) : (
          senders.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-[#141A29] border border-[#283149] hover:border-[#7857FF]/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm font-bold text-[#F5F7FF]">{s.display_name}</h3>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      s.provider === "GMAIL_API"
                        ? "bg-[#7857FF]/15 text-[#A78BFA] border-[#7857FF]/30"
                        : "bg-[#0E1220] text-[#A3AEC2] border-[#283149]"
                    }`}
                  >
                    {s.provider === "GMAIL_API" ? "⚡ GMAIL REST API (OAuth)" : s.provider}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      s.status === "VERIFIED"
                        ? "bg-[#32C98A]/15 text-[#32C98A] border-[#32C98A]/30"
                        : s.status === "PENDING"
                        ? "bg-[#F3B84C]/15 text-[#F3B84C] border-[#F3B84C]/30"
                        : "bg-[#F16C7C]/15 text-[#F16C7C] border-[#F16C7C]/30"
                    }`}
                  >
                    {s.status === "VERIFIED" ? "✓ Ready to Send" : s.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#A3AEC2] mt-1">{s.email}</p>
                <p className="text-[11px] font-mono text-[#727E96] mt-0.5">
                  Daily Quota: {s.daily_limit} emails &bull; Sent Today: {s.sent_today}
                </p>
              </div>

              <button
                onClick={() => handleDeleteSender(s.id)}
                className="px-3.5 py-2 rounded-xl bg-[#0E1220] border border-[#283149] hover:bg-[#F16C7C]/15 hover:text-[#F16C7C] hover:border-[#F16C7C]/30 text-[#A3AEC2] text-xs font-semibold flex items-center gap-1.5 transition-all w-fit"
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
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-[#141A29] border border-[#283149] rounded-2xl shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-[#A3AEC2] hover:text-[#F5F7FF]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F7FF] mb-1">
              {provider === "GMAIL" ? "Connect Gmail Mailbox" : "Connect Mailbox via SMTP"}
            </h3>
            <p className="text-xs text-[#A3AEC2] mb-4">
              {provider === "GMAIL"
                ? "Uses standard 16-character Google App Password (no Google Cloud verification needed)"
                : "Enter your mail server credentials and test connection"}
            </p>

            {provider === "GMAIL" && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#0E1220] border border-[#283149] text-xs text-[#A3AEC2] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#A78BFA]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#7857FF]" />
                    <span>How to get your App Password:</span>
                  </span>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-[#7857FF]/20 hover:bg-[#7857FF]/35 text-[#A78BFA] border border-[#7857FF]/40 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                  >
                    Open Google Security ↗
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#A3AEC2]">
                  <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google Account.</li>
                  <li>Click <strong>Open Google Security ↗</strong> above to visit the App Passwords page.</li>
                  <li>Type <strong className="text-[#F5F7FF]">OutRank AI</strong> as the app name and click <strong>Create</strong>.</li>
                  <li>Copy the 16-character code (e.g. <span className="font-mono text-[#A78BFA]">abcd efgh ijkl mnop</span>) and paste it below.</li>
                </ol>
              </div>
            )}

            <form onSubmit={handleConnectSmtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                  Mailbox Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                >
                  <option value="GMAIL" className="bg-[#0E1220] text-[#F5F7FF]">Gmail (App Password - Recommended)</option>
                  <option value="OUTLOOK" className="bg-[#0E1220] text-[#F5F7FF]">Outlook / Office 365</option>
                  <option value="CUSTOM" className="bg-[#0E1220] text-[#F5F7FF]">Custom SMTP Server (Zoho, Yahoo, etc.)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul from OutRank"
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                />
              </div>

              {provider !== "GMAIL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      required
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                      className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A78BFA] mb-1">
                  {provider === "GMAIL" ? "16-Character Gmail App Password *" : "App Password / SMTP Password *"}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={provider === "GMAIL" ? "abcd efgh ijkl mnop" : "Password / App Password"}
                  className="w-full px-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] focus:border-[#7857FF] focus:outline-none font-mono tracking-wider"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#283149] text-[#A3AEC2] font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={connecting}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
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
