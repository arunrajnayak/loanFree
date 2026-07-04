"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  totalMonthsSaved: number;
  emiPaymentsCount: number;
}

interface BalanceTrendItem {
  month: string;
  actualBalance: number;
  baselineBalance?: number;
}

export function DashboardClient({
  loan,
  stats,
  recentPayments,
  interestRecords,
  balanceTrendData,
}: {
  loan: Loan;
  stats: DashboardStats;
  recentPayments: Payment[];
  interestRecords: InterestRecord[];
  balanceTrendData: BalanceTrendItem[];
}) {
  const interestData = interestRecords.map((r) => ({
    month: monthLabel(r.month),
    interest: Math.round(r.amount),
  }));

  const formattedTrendData = balanceTrendData.map((d) => ({
    month: monthLabel(d.month),
    "Actual Balance": d.actualBalance,
    "No-Prepay Baseline": d.baselineBalance,
  }));

  const pieData = [
    { name: "Principal Repaid", value: stats.totalPrincipalPaid || 1, formattedValue: fmtL(stats.totalPrincipalPaid) },
    { name: "Interest Paid", value: stats.totalInterestPaid, formattedValue: fmtL(stats.totalInterestPaid) },
    { name: "Builder Paid", value: stats.totalPaidToBuilder, formattedValue: fmtL(stats.totalPaidToBuilder) },
  ];

  const statCards = [
    { label: "Outstanding Balance", value: fmtL(stats.outstandingBalance), sub: fmtINR(stats.outstandingBalance), gradient: "from-red-500/10 to-orange-500/10", borderGlow: "from-red-500 to-orange-500", accent: "#ef4444" },
    { label: "Total Disbursed", value: fmtL(stats.totalDisbursed), sub: `${stats.disbursementCount} tranches`, gradient: "from-blue-500/10 to-cyan-500/10", borderGlow: "from-blue-500 to-cyan-500", accent: "#3b82f6" },
    { label: "Total Paid to Bank", value: fmtL(stats.totalPaidToBank), sub: "EMI + Prepayments", gradient: "from-emerald-500/10 to-teal-500/10", borderGlow: "from-emerald-500 to-teal-500", accent: "#10b981" },
    { label: "Interest Paid", value: fmtL(stats.totalInterestPaid), sub: fmtINR(stats.totalInterestPaid), gradient: "from-orange-500/10 to-yellow-500/10", borderGlow: "from-orange-500 to-yellow-500", accent: "#f59e0b" },
    { label: "Principal Repaid", value: fmtL(stats.totalPrincipalPaid), sub: fmtINR(stats.totalPrincipalPaid), gradient: "from-green-500/10 to-emerald-500/10", borderGlow: "from-green-500 to-emerald-500", accent: "#22c55e" },
    { label: "Builder (Own Contribution)", value: fmtL(stats.totalPaidToBuilder), sub: "Own funds paid", gradient: "from-purple-500/10 to-pink-500/10", borderGlow: "from-purple-500 to-pink-500", accent: "#8b5cf6" },
  ];

  const pctRepaid = stats.totalDisbursed > 0 ? (stats.totalPrincipalPaid / stats.totalDisbursed) * 100 : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Park East</span> Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
            Tracking Home Loan &middot; {loan.interestRate}% Interest Rate &middot; {loan.tenureYears} Years Tenure
          </p>
        </div>
      </motion.div>

      {/* KPI Milestone Cards Strip */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        {/* Progress Card */}
        <div className="glass p-5 flex flex-col justify-between relative overflow-hidden pulse-glow">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-50" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Loan Repaid Progress
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {pctRepaid.toFixed(1)}%
            </p>
            <div className="w-full bg-white/5 rounded-full h-2.5 mt-3 overflow-hidden border border-white/5">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full" style={{ width: `${pctRepaid}%` }} />
            </div>
            <p className="text-[11px] mt-2 text-slate-400">
              {fmtL(stats.totalPrincipalPaid)} repaid of {fmtL(stats.totalDisbursed)} disbursed
            </p>
          </div>
        </div>

        {/* Timeline Progress */}
        <div className="glass p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-50" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              EMIs Completed
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {stats.emiPaymentsCount} Months
            </p>
            <p className="text-[11px] mt-4 text-slate-400">
              {loan.tenureYears * 12 - stats.emiPaymentsCount} months remaining in original schedule
            </p>
          </div>
        </div>

        {/* Months Saved */}
        <div className="glass p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 opacity-50" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Tenure Saved So Far
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-400">
              {stats.totalMonthsSaved} Months
            </p>
            <p className="text-[11px] mt-4 text-slate-400">
              Saved ~{(stats.totalMonthsSaved / 12).toFixed(1)} years off the life of the loan!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass p-5 relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-20 transition-opacity duration-300 group-hover:opacity-30`} />
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

      {/* Balance Trend Chart (Full Width) */}
      <motion.div variants={item} className="glass p-6">
        <h3 className="text-sm font-semibold mb-4 text-slate-300">
          Cumulative Outstanding Balance Trend (Prepay vs No-Prepay)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b8b9e" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#8b8b9e" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f0f0f5" }}
                formatter={(v: any) => [fmtINR(Number(v)), ""]}
              />
              <Legend wrapperStyle={{ color: "#8b8b9e", fontSize: "12px", paddingTop: "10px" }} />
              <Line type="monotone" dataKey="No-Prepay Baseline" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.6} />
              <Line type="monotone" dataKey="Actual Balance" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 lg:grid-cols-5">
        {/* Interest Trend */}
        <div className="glass p-6 lg:col-span-3">
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Monthly Interest Charged
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interestData}>
                <defs>
                  <linearGradient id="igr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b8b9e" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#8b8b9e" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#f0f0f5" }}
                  formatter={(v: any) => [fmtINR(Number(v)), "Interest"]}
                />
                <Area type="monotone" dataKey="interest" stroke="#f59e0b" fill="url(#igr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut with Detail Legend */}
        <div className="glass p-6 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Payment Breakdown
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
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
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-semibold text-white">{d.formattedValue}</span>
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
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
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
