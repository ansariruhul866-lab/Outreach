"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showBadge?: boolean;
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  showBadge = true,
  showTagline = true,
  className = "",
  href = "/",
}: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const logoContent = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Precision Vector Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0`}>
        {/* Subtle Accent Glow */}
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-[#7857FF] to-[#438BFF] opacity-40 blur-sm group-hover:opacity-75 transition duration-300" />

        {/* Surface Backing */}
        <div className="relative w-full h-full rounded-lg bg-[#141A29] border border-[#283149] group-hover:border-[#7857FF]/60 flex items-center justify-center p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition duration-200">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="outrank-emblem-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7857FF" />
                <stop offset="0.6" stopColor="#438BFF" />
                <stop offset="1" stopColor="#22D3C5" />
              </linearGradient>
            </defs>

            {/* Precision Hexagonal Shield */}
            <path
              d="M16 2.5L27 8.5V23.5L16 29.5L5 23.5V8.5L16 2.5Z"
              stroke="url(#outrank-emblem-grad)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Ascending Rank Vector (Chevron) */}
            <path
              d="M11 17L16 11.5L21 17"
              stroke="#F5F7FF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Intelligence Focus Point */}
            <circle cx="16" cy="11.5" r="1.5" fill="#22D3C5" />

            {/* Search Baseline Track */}
            <path
              d="M11 21.5H21"
              stroke="#7857FF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-heading font-bold tracking-tight text-[#F5F7FF] ${textSizes[size]}`}>
              OUTRANK
              <span className="ml-1 text-[#7857FF]">AI</span>
            </span>

            {showBadge && (
              <span className="text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#1B2233] text-[#A78BFA] border border-[#283149]">
                PRO
              </span>
            )}
          </div>

          {showTagline && (
            <span className="text-[9.5px] text-[#727E96] font-medium tracking-wide -mt-0.5 hidden sm:block">
              SEO &amp; Marketing Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}
