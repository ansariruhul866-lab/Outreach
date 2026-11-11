import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OutRank AI — See the Opportunity. Own the Search.",
  description:
    "AI-powered SEO and marketing intelligence platform. Real-time SERP deconstruction, competitor gap analysis, humanized content synthesis, and high-deliverability outreach.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} font-sans min-h-screen bg-[#090B12] text-[#F5F7FF] antialiased selection:bg-[#7857FF]/30 selection:text-[#F5F7FF]`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
