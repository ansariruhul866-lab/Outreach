"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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
      <div className="min-h-screen bg-[#090B12] flex flex-col items-center justify-center text-[#A3AEC2] gap-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] ambient-glow-purple-lg rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="p-4 rounded-xl bg-[#141A29] border border-[#283149] shadow-xl">
            <Loader2 className="w-7 h-7 animate-spin text-[#7857FF]" />
          </div>
          <p className="text-xs font-mono font-medium tracking-wider uppercase text-[#727E96]">Loading Intelligence Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#090B12] text-[#F5F7FF] antialiased relative overflow-hidden select-none">
      {/* Restrained Ambient Subtle Lighting */}
      <div className="fixed top-[-10%] right-[-5%] w-[650px] h-[650px] ambient-glow-purple-lg rounded-full blur-[160px] pointer-events-none opacity-40" />
      <div className="fixed bottom-[-15%] left-[15%] w-[700px] h-[700px] ambient-glow-purple-accent rounded-full blur-[180px] pointer-events-none opacity-30" />

      {/* Enterprise Workspace Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen relative z-10 p-4 sm:p-6 lg:p-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
