"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Loan, Payment, InterestRecord } from "@/lib/schema";

const COLORS = ["#10b981", "#f59e0b", "#8b5cf6"];

function fmtINR(v: number) {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtL(v: number) {
  const l = v / 100000;
  if (l >= 100) return `${(l / 100).toFixed(2)} Cr`;
  return `${l.toFixed(2)}L`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} '${y.slice(2)}`;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

interface DashboardStats {
  outstandingBalance: number;
  totalDisbursed: number;
  totalPaidToBank: number;
  totalPaidToBuilder: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  disbursementCount: number;
}

export function DashboardClient({
  loan,
  stats,
  recentPayments,
  interestRecords,
}: {
  loan: Loan;
  stats: DashboardStats;
  recentPayments: Payment[];
  interestRecords: InterestRecord[];
}) {
  const interestData = interestRecords.map((r) => ({
    month: monthLabel(r.month),
    interest: Math.round(r.amount),
  }));

  const pieData = [
    { name: "Principal", value: stats.totalPrincipalPaid || 1 },
    { name: "Interest", value: stats.totalInterestPaid },
    { name: "Builder", value: stats.totalPaidToBuilder },
  ];

  const statCards = [
    { label: "Outstanding", value: fmtL(stats.outstandingBalance), sub: fmtINR(stats.outstandingBalance), gradient: "from-red-500/20 to-orange-500/20", accent: "#ef4444" },
    { label: "Disbursed", value: fmtL(stats.totalDisbursed), sub: `${stats.disbursementCount} tranches`, gradient: "from-blue-500/20 to-cyan-500/20", accent: "#3b82f6" },
    { label: "Paid to Bank", value: fmtL(stats.totalPaidToBank), sub: "EMI + Prepay", gradient: "from-emerald-500/20 to-teal-500/20", accent: "#10b981" },
    { label: "Interest Paid", value: fmtL(stats.totalInterestPaid), sub: fmtINR(stats.totalInterestPaid), gradient: "from-orange-500/20 to-yellow-500/20", accent: "#f59e0b" },
    { label: "Principal Repaid", value: fmtL(stats.totalPrincipalPaid), sub: fmtINR(stats.totalPrincipalPaid), gradient: "from-green-500/20 to-emerald-500/20", accent: "#22c55e" },
    { label: "Builder (Own)", value: fmtL(stats.totalPaidToBuilder), sub: "Own contribution", gradient: "from-purple-500/20 to-pink-500/20", accent: "#8b5cf6" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Park East</span> Dashboard
        </h1>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass glow-border p-5 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: s.accent }}>
                {s.value}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-5">
        {/* Interest Trend */}
        <div className="glass p-6 lg:col-span-3">
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Monthly Interest Charged
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={interestData}>
              <defs>
                <linearGradient id="igr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f0f0f5" }}
                formatter={(v: any) => [fmtINR(Number(v)), "Interest"]}
              />
              <Area type="monotone" dataKey="interest" stroke="#f59e0b" fill="url(#igr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="glass p-6 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Payment Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f0f0f5" }}
                formatter={(v: any) => [fmtINR(Number(v)), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 -mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Payments */}
      <motion.div variants={item} className="glass p-6">
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Recent Payments
        </h3>
        <div className="space-y-1">
          {recentPayments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: p.type === "emi" ? "rgba(59,130,246,0.15)" : p.type === "prepayment" ? "rgba(16,185,129,0.15)" : "rgba(139,92,246,0.15)",
                    color: p.type === "emi" ? "#60a5fa" : p.type === "prepayment" ? "#34d399" : "#a78bfa",
                  }}
                >
                  {p.type === "emi" ? "EMI" : p.type === "prepayment" ? "Prepay" : "Builder"}
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <span className="font-medium text-sm">{fmtINR(p.amount)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
