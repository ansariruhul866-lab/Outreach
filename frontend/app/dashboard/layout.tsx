"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-purple-200 gap-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] ambient-glow-purple-lg rounded-full blur-[130px] animate-pulse-glow pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="p-4 rounded-2xl glass-panel shadow-2xl border border-purple-500/30">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
          <p className="text-xs font-bold tracking-widest uppercase text-purple-300">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-black text-white dark:bg-black dark:text-white antialiased relative overflow-hidden select-none dashboard-root">
      {/* Black & Purple Ambient Glow Mesh */}
      <div className="fixed top-[-10%] right-[-5%] w-[700px] h-[700px] ambient-glow-purple-lg rounded-full blur-[140px] pointer-events-none opacity-60 animate-float" />
      <div className="fixed bottom-[-15%] left-[15%] w-[750px] h-[750px] ambient-glow-purple-accent rounded-full blur-[160px] pointer-events-none opacity-40 animate-pulse-glow" />
      <div className="fixed top-[35%] left-[45%] w-[500px] h-[500px] ambient-glow-white-subtle rounded-full blur-[120px] pointer-events-none opacity-20" />

      {/* Luxury Black & Purple Glass Sidebar */}
      <Sidebar />

      {/* Main Content Area with Smooth Framer Motion Transition */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen relative z-10"
      >
        {children}
      </motion.main>
    </div>
  );
}
