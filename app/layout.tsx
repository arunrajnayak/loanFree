import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/layout/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LoanFree - Home Loan Tracker",
  description: "Track your home loan and predict your loan-free date",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-svh dot-pattern" style={{ background: "var(--bg-primary)" }}>
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "var(--gradient-bg)" }}
        />
        <div className="relative">
          <NavBar />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
