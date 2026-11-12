"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  User as FirebaseUser,
} from "firebase/auth";
import { api, getApiBase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, X, CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "signup";
  onClose: () => void;
}

export function AuthModal({ isOpen, initialMode = "signup", onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [lastUser, setLastUser] = useState<FirebaseUser | null>(null);

  const { login } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleGoogleSignIn = () => {
    setError(null);
    setLoading(true);
    // Direct Server-Side Google OAuth 2.0 with permanent Gmail sending permissions & refresh token
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const apiUrl = getApiBase();
    window.location.href = `${apiUrl}/auth/google/login?return_url=${encodeURIComponent(origin + "/dashboard")}`;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");

        // 1. Try direct backend signup for immediate, frictionless access
        try {
          const res = await api.auth.signup(name.trim(), email.trim(), password);
          login(res.access_token, res.user);
          onClose();
          const redirect = (typeof window !== "undefined" && sessionStorage.getItem("pending_search")) || "/dashboard";
          if (typeof window !== "undefined") sessionStorage.removeItem("pending_search");
          window.location.href = redirect;
          return;
        } catch (backendErr: any) {
          // If already exists or direct signup threw specific error, throw or fallback
          if (backendErr?.message && !backendErr.message.includes("connect")) {
            throw backendErr;
          }
        }

        // 2. Firebase Fallback
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCred.user;
        setLastUser(fbUser);
        await updateProfile(fbUser, { displayName: name.trim() });
        await sendEmailVerification(fbUser);
        setTargetEmail(email.trim());
        setVerificationSent(true);
      } else {
        // LOGIN: 1. Try direct backend login first!
        try {
          const res = await api.auth.login(email.trim(), password);
          login(res.access_token, res.user);
          onClose();
          const redirect = (typeof window !== "undefined" && sessionStorage.getItem("pending_search")) || "/dashboard";
          if (typeof window !== "undefined") sessionStorage.removeItem("pending_search");
          window.location.href = redirect;
          return;
        } catch (backendErr: any) {
          // If invalid credentials or user not found, throw immediately
          if (backendErr?.message && !backendErr.message.includes("connect")) {
            throw backendErr;
          }
        }

        // 2. Firebase Fallback
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCred.user;
        const idToken = await fbUser.getIdToken();
        const res = await api.auth.firebaseLogin(idToken, fbUser.displayName || undefined);
        login(res.access_token, res.user);
        onClose();
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (lastUser) {
      try {
        await sendEmailVerification(lastUser);
        setNotice("✓ Verification link resent! Check your inbox.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to resend";
        setError(msg);
      }
    } else {
      setError("Please sign in to trigger a new verification email.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#090B12]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-7 sm:p-8 bg-[#141A29] border border-[#283149] rounded-2xl shadow-2xl text-[#F5F7FF]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A3AEC2] hover:text-[#F5F7FF] transition-colors p-1 rounded-lg hover:bg-[#1B2233]"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#7857FF]/15 border border-[#7857FF]/30 text-[#A78BFA] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#7857FF]/20">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold font-heading text-[#F5F7FF]">Verify Your Email</h3>
            <p className="text-xs text-[#A3AEC2] mt-2">
              We sent a verification link to:
              <span className="block font-semibold text-[#F5F7FF] mt-1 break-all">{targetEmail}</span>
            </p>

            <div className="p-4 my-6 text-left rounded-xl bg-[#0E1220] border border-[#283149] text-xs text-[#A3AEC2] space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="text-[#7857FF] font-bold">1.</span>
                <span>Open your email inbox (or spam folder).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#7857FF] font-bold">2.</span>
                <span>Click the confirmation link from Firebase.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#7857FF] font-bold">3.</span>
                <span>Return here and log in to open your workspace.</span>
              </div>
            </div>

            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-[#7857FF]/10 border border-[#7857FF]/30 text-[#A78BFA] text-xs font-semibold">
                {notice}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResend}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1B2233] border border-[#283149] hover:bg-[#232B40] text-xs font-medium transition-all text-[#F5F7FF]"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => {
                  setVerificationSent(false);
                  setMode("login");
                }}
                className="w-full py-2.5 px-4 rounded-xl btn-primary text-xs font-semibold shadow-lg transition-all"
              >
                I&apos;ve Verified My Email &rarr; Sign In
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <BrandLogo size="md" />
              </div>
              <h2 className="text-xl font-bold font-heading text-[#F5F7FF]">
                {mode === "signup" ? "Create Your Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-[#A3AEC2] mt-1">
                {mode === "signup"
                  ? "Access next-gen SERP intelligence & autonomous outreach"
                  : "Sign in to access your OutRank AI workspace"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#F16C7C]/10 border border-[#F16C7C]/25 text-[#F16C7C] text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-[#32C98A]/10 border border-[#32C98A]/25 text-[#32C98A] text-xs font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* Google Sign In with 1-Click Mailbox Setup */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0E1220] border border-[#283149] hover:bg-[#1B2233] hover:border-[#438BFF]/40 rounded-xl text-xs font-semibold text-[#F5F7FF] flex items-center justify-center gap-3 transition-all mb-4 shadow-sm group"
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
              <span>Continue with Google (Auto-Connect Mailbox)</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-[#283149]"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-[#727E96] font-bold">
                Or with email
              </span>
              <div className="flex-grow border-t border-[#283149]"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A3AEC2] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-[#727E96]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A3AEC2] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#727E96]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A3AEC2] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#727E96]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0E1220] border border-[#283149] rounded-xl text-xs text-[#F5F7FF] placeholder-[#727E96] focus:border-[#7857FF] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-semibold btn-primary rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F5F7FF]" />
                ) : (
                  <>
                    <span>{mode === "signup" ? "Create Account & Verify Email" : "Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#727E96]">
              <span>{mode === "signup" ? "Already have an account?" : "Don't have an account?"}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setMode(mode === "signup" ? "login" : "signup");
                }}
                className="ml-1 text-[#7857FF] font-semibold hover:text-[#A78BFA] transition-colors"
              >
                {mode === "signup" ? "Sign In" : "Sign Up Free"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
