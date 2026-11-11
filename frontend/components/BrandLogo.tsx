"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showBadge?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  showBadge = true,
  className = "",
  href = "/",
}: BrandLogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const logoContent = (
    <div className={`flex items-center gap-3 group select-none ${className}`}>
      {/* Precision Vector SVG Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0`}>
        {/* Ambient Hover Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 transition duration-500" />

        {/* Crisp Glass Card Backing */}
        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-zinc-900 via-black to-purple-950/80 border border-purple-500/40 flex items-center justify-center p-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-400/30 rounded-full blur-md pointer-events-none" />

          {/* SVG Vector Mark: Radar Beam + Ascending Rank Chevron */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-white"
          >
            <defs>
              <linearGradient id="outrank-grad-a" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#C084FC" />
                <stop offset="0.5" stopColor="#A855F7" />
                <stop offset="1" stopColor="#7E22CE" />
              </linearGradient>
              <linearGradient id="outrank-grad-b" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFFFF" />
                <stop offset="0.7" stopColor="#E9D5FF" />
                <stop offset="1" stopColor="#A855F7" />
              </linearGradient>
            </defs>

            {/* Hexagonal Outer Frame */}
            <path
              d="M16 2.5L28 9.5V22.5L16 29.5L4 22.5V9.5L16 2.5Z"
              stroke="url(#outrank-grad-a)"
              strokeWidth="2"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
            />

            {/* Ascending Growth Chevron (Outrank) */}
            <path
              d="M10 18L16 12L22 18"
              stroke="url(#outrank-grad-b)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Center Signal Pulse Dot */}
            <circle cx="16" cy="12" r="2" fill="#FFFFFF" className="animate-pulse" />

            {/* Horizontal Forward Reach Bar */}
            <path
              d="M12 22H20"
              stroke="#A855F7"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-tight text-white flex items-center ${textSizes[size]}`}
            >
              <span>OutRank</span>
              <span className="ml-1 bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-200 bg-clip-text text-transparent font-black">
                AI
              </span>
            </span>

            {showBadge && (
              <span className="text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                Pro
              </span>
            )}
          </div>

          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase -mt-0.5 hidden sm:block">
            SERP &bull; Outreach OS
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}
