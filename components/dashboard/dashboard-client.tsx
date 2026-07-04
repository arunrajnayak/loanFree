"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, animate } from "framer-motion";
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

// Animated Counter component for that premium SaaS feel
function AnimatedCounter({
  value,
  duration = 1.5,
  formatter = (v: number) => String(Math.round(v)),
  delay = 0,
}: {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [value, duration, delay]);

  return <>{formatter(displayValue)}</>;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
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
    { label: "Outstanding Balance", value: stats.outstandingBalance, formatter: fmtL, sub: fmtINR(stats.outstandingBalance), gradient: "from-red-500/20 to-orange-500/20", glowColor: "rgba(239, 68, 68, 0.15)", accent: "#ef4444" },
    { label: "Total Disbursed", value: stats.totalDisbursed, formatter: fmtL, sub: `${stats.disbursementCount} tranches`, gradient: "from-blue-500/20 to-cyan-500/20", glowColor: "rgba(59, 130, 246, 0.15)", accent: "#3b82f6" },
    { label: "Total Paid to Bank", value: stats.totalPaidToBank, formatter: fmtL, sub: "EMI + Prepayments", gradient: "from-emerald-500/20 to-teal-500/20", glowColor: "rgba(16, 185, 129, 0.15)", accent: "#10b981" },
    { label: "Interest Paid", value: stats.totalInterestPaid, formatter: fmtL, sub: fmtINR(stats.totalInterestPaid), gradient: "from-orange-500/20 to-yellow-500/20", glowColor: "rgba(245, 158, 11, 0.15)", accent: "#f59e0b" },
    { label: "Principal Repaid", value: stats.totalPrincipalPaid, formatter: fmtL, sub: fmtINR(stats.totalPrincipalPaid), gradient: "from-green-500/20 to-emerald-500/20", glowColor: "rgba(34, 197, 94, 0.15)", accent: "#22c55e" },
    { label: "Builder (Own Contribution)", value: stats.totalPaidToBuilder, formatter: fmtL, sub: "Own funds paid", gradient: "from-purple-500/20 to-pink-500/20", glowColor: "rgba(139, 92, 246, 0.15)", accent: "#8b5cf6" },
  ];

  const pctRepaid = stats.totalDisbursed > 0 ? (stats.totalPrincipalPaid / stats.totalDisbursed) * 100 : 0;
  const pctTimeElapsed = (stats.emiPaymentsCount / (loan.tenureYears * 12)) * 100;

  // SVG Circular Ring parameters
  const ringRadius = 36;
  const strokeWidth = 5;
  const normalizedRadius = ringRadius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const repayStrokeOffset = circumference - (pctRepaid / 100) * circumference;
  const elapsedStrokeOffset = circumference - (pctTimeElapsed / 100) * circumference;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      {/* Header with extra glow & animation */}
      <motion.div variants={item} className="flex justify-between items-end border-b pb-4 border-white/5 relative">
        <div className="absolute -top-10 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            Active Loan Tracker
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-3">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-fill-transparent">
              Park East
            </span>{" "}
            Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1.5 font-medium">
            Tracking Home Loan &middot; {loan.interestRate}% Interest Rate &middot; {loan.tenureYears} Years Tenure
          </p>
        </div>
      </motion.div>

      {/* KPI Milestone Cards Strip - Bold, Modern, High Contrast */}
      <motion.div variants={item} className="grid gap-6 sm:grid-cols-3">
        {/* Progress Card (Circular Progress) */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="glass p-6 relative overflow-hidden flex items-center justify-between border-emerald-500/20 hover:border-emerald-500/40"
          style={{ boxShadow: "0 8px 32px 0 rgba(16, 185, 129, 0.05)" }}
        >
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1 z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Loan Repaid Progress
            </p>
            <p className="text-4xl font-black text-white">
              <AnimatedCounter value={pctRepaid} formatter={(v) => `${v.toFixed(1)}%`} />
            </p>
            <p className="text-[11px] text-slate-400 leading-normal pt-1">
              <span className="text-emerald-300 font-semibold">{fmtL(stats.totalPrincipalPaid)}</span> repaid of {fmtL(stats.totalDisbursed)} disbursed
            </p>
          </div>
          <div className="relative flex items-center justify-center z-10">
            <svg height={ringRadius * 2} width={ringRadius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(255, 255, 255, 0.04)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={ringRadius}
                cy={ringRadius}
              />
              <motion.circle
                stroke="#10b981"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: repayStrokeOffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                r={normalizedRadius}
                cx={ringRadius}
                cy={ringRadius}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-emerald-400">
              {Math.round(pctRepaid)}%
            </div>
          </div>
        </motion.div>

        {/* Timeline Progress */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="glass p-6 relative overflow-hidden flex items-center justify-between border-blue-500/20 hover:border-blue-500/40"
          style={{ boxShadow: "0 8px 32px 0 rgba(59, 130, 246, 0.05)" }}
        >
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1 z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
              EMIs Completed
            </p>
            <p className="text-4xl font-black text-white">
              <AnimatedCounter value={stats.emiPaymentsCount} /> Months
            </p>
            <p className="text-[11px] text-slate-400 leading-normal pt-1">
              <span className="text-blue-300 font-semibold">{loan.tenureYears * 12 - stats.emiPaymentsCount}</span> months remaining
            </p>
          </div>
          <div className="relative flex items-center justify-center z-10">
            <svg height={ringRadius * 2} width={ringRadius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(255, 255, 255, 0.04)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={ringRadius}
                cy={ringRadius}
              />
              <motion.circle
                stroke="#3b82f6"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: elapsedStrokeOffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                r={normalizedRadius}
                cx={ringRadius}
                cy={ringRadius}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-blue-400">
              {Math.round(pctTimeElapsed)}%
            </div>
          </div>
        </motion.div>

        {/* Months Saved */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="glass p-6 relative overflow-hidden flex items-center justify-between border-amber-500/20 hover:border-amber-500/40"
          style={{ boxShadow: "0 8px 32px 0 rgba(245, 158, 11, 0.05)" }}
        >
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1 z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Tenure Saved So Far
            </p>
            <p className="text-4xl font-black text-amber-400">
              <AnimatedCounter value={stats.totalMonthsSaved} /> Months
            </p>
            <p className="text-[11px] text-slate-400 leading-normal pt-1">
              Saved ~<span className="text-amber-300 font-semibold">{(stats.totalMonthsSaved / 12).toFixed(1)}</span> years off loan life!
            </p>
          </div>
          <div className="relative flex items-center justify-center z-10">
            {/* Glowing Custom Trophy Icon */}
            <div className="h-[64px] w-[64px] bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid - Modern hover & micro-interactions */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="glass p-5 relative overflow-hidden group border-white/5 hover:border-white/10"
            style={{
              boxShadow: `0 4px 20px 0 ${s.glowColor}`,
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-20 transition-opacity duration-300 group-hover:opacity-30`} />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {s.label}
              </p>
              <p className="mt-2 text-3xl font-extrabold" style={{ color: s.accent }}>
                <AnimatedCounter value={s.value} formatter={s.formatter} />
              </p>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Balance Trend Chart (Full Width) */}
      <motion.div variants={item} className="glass p-6 border-white/5">
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
        <div className="glass p-6 lg:col-span-3 border-white/5">
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
        <div className="glass p-6 lg:col-span-2 border-white/5">
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
      <motion.div variants={item} className="glass p-6 border-white/5">
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
