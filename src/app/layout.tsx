import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sponsor pipeline", template: "%s — Sponsor" },
  description: "Work the UK sponsor register: daily batches, persona fit, live roles, and application tracking.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="page-bloom antialiased">
        <Nav />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
