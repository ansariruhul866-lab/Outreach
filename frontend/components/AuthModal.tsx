"use client";

import React, { useState } from "react";
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, X, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

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

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken || null;
      const idToken = await user.getIdToken();

      const res = await api.auth.firebaseLogin(idToken, user.displayName || undefined);
      login(res.access_token, res.user);
      onClose();
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google Sign-In failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
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

        // 1. Create account in Firebase
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCred.user;
        setLastUser(fbUser);

        // 2. Update display name
        await updateProfile(fbUser, { displayName: name.trim() });

        // 3. Send official verification email
        await sendEmailVerification(fbUser);

        // 4. Show Verification Sent screen
        setTargetEmail(email.trim());
        setVerificationSent(true);
      } else {
        // LOGIN
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCred.user;

        // Strict email verification check
        if (!fbUser.emailVerified) {
          setLastUser(fbUser);
          await signOut(auth); // Sign out unverified session
          setError(
            `Your email (${email}) has not been verified yet. Please check your inbox or click resend below.`
          );
          setLoading(false);
          return;
        }

        // Verified! Exchange token with backend
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-8 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Verify Your Email</h3>
            <p className="text-sm text-slate-400 mt-2">
              We sent a verification link to:
              <span className="block font-bold text-white mt-1 break-all">{targetEmail}</span>
            </p>

            <div className="p-4 my-6 text-left rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="text-orange-400 font-bold">1.</span>
                <span>Open your email inbox (or spam folder).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 font-bold">2.</span>
                <span>Click the confirmation link from Firebase.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 font-bold">3.</span>
                <span>Return here and log in to open your workspace.</span>
              </div>
            </div>

            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {notice}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResend}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all text-slate-200"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => {
                  setVerificationSent(false);
                  setMode("login");
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-xs font-bold text-white shadow-lg shadow-orange-600/25 hover:from-orange-600 hover:to-amber-700 transition-all"
              >
                I&apos;ve Verified My Email &rarr; Sign In
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/20 mx-auto mb-3">
                ⚡
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {mode === "signup" ? "Create an Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === "signup"
                  ? "Start cold outreach with verified email & Gmail integration"
                  : "Sign in to access your outreach workspace"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* Google Sign In with 1-Click Mailbox Setup */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-3 transition-all mb-4 shadow-sm group"
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
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Or with email
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "signup" ? "Create Account & Verify Email" : "Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              <span>{mode === "signup" ? "Already have an account?" : "Don't have an account?"}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setMode(mode === "signup" ? "login" : "signup");
                }}
                className="ml-1 text-orange-400 font-bold hover:underline"
              >
                {mode === "signup" ? "Sign In" : "Sign Up Free"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
