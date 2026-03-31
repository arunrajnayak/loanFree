"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Payments", href: "/payments" },
  { label: "Schedule", href: "/schedule" },
  { label: "Predictor", href: "/predict" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ borderColor: "var(--border-glass)", background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(20px)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
              <div className="absolute inset-0" style={{ background: "var(--gradient-blue-purple)" }} />
              <span className="relative font-bold text-white text-sm">LF</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                LoanFree
              </h1>
            </div>
          </Link>

          <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium rounded-full transition-colors"
                  style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-full"
                      style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
