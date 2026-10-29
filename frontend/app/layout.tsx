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
  title: "OutreachBot — Next.js Cold Outreach & Deep Email Scraper",
  description:
    "Automated deep web scraper, 7-layer MX spam verification, and Gmail API cold outreach dispatcher.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${jakarta.variable} font-sans min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-orange-500/30 selection:text-orange-200`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
