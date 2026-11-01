"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hasStoredToken = typeof window !== "undefined" && !!localStorage.getItem("outreach_token");
    if (!isLoading && !token && !hasStoredToken) {
      router.push("/");
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-slate-400 gap-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 ambient-glow-amber rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="p-4 rounded-2xl glass-panel shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
          <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#030712] text-slate-100 antialiased relative overflow-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] ambient-glow-amber rounded-full blur-[120px] pointer-events-none opacity-60 animate-float" />
      <div className="fixed bottom-[-10%] left-[20%] w-[650px] h-[650px] ambient-glow-emerald rounded-full blur-[140px] pointer-events-none opacity-40 animate-pulse-glow" />
      <div className="fixed top-[40%] right-[30%] w-[500px] h-[500px] ambient-glow-purple rounded-full blur-[130px] pointer-events-none opacity-30" />

      {/* Glass Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen relative z-10">
        {children}
      </main>
    </div>
  );
}
