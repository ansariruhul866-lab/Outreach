import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "OutRank AI — Autonomous SERP Intelligence & Multi-Channel Outreach OS",
  description:
    "Crawl Google SERP, analyze competitor gaps, draft humanized SEO blogs with schema, extract verified emails, and dispatch automated cold outreach.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${jakarta.variable} font-sans min-h-screen bg-black text-white antialiased selection:bg-purple-600/40 selection:text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
