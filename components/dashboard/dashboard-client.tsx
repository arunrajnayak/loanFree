"use client";

import { useEffect, useState } from "react";
import { motion, animate, type Variants } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Loan, Payment, InterestRecord } from "@/lib/schema";

const DONUT_COLORS = ["#10b981", "#f59e0b", "#8b5cf6"];

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

function AnimatedCounter({
  value,
  duration = 1.6,
  formatter = (v: number) => String(Math.round(v)),
  delay = 0,
}: {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const ctrl = animate(0, value, {
      duration, delay, ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => ctrl.stop();
  }, [value, duration, delay]);
  return <>{formatter(display)}</>;
}

// Animated radial ring — bigger, bolder
function RingProgress({
  pct, color, size = 96, stroke = 7, label,
}: { pct: number; color: string; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-black" style={{ color }}>{Math.round(pct)}%</span>
        {label && <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
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
  loan, stats, recentPayments, interestRecords, balanceTrendData,
}: {
  loan: Loan;
  stats: DashboardStats;
  recentPayments: Payment[];
  interestRecords: InterestRecord[];
  balanceTrendData: BalanceTrendItem[];
}) {
  const pctRepaid   = stats.totalDisbursed > 0 ? (stats.totalPrincipalPaid / stats.totalDisbursed) * 100 : 0;
  const pctTimeDone = (stats.emiPaymentsCount / (loan.tenureYears * 12)) * 100;
  const monthsSaved = stats.totalMonthsSaved;

  const interestData = interestRecords.map((r) => ({
    month: monthLabel(r.month),
    interest: Math.round(r.amount),
  }));

  const trendData = balanceTrendData.map((d) => ({
    month: monthLabel(d.month),
    "With Prepay":   d.actualBalance,
    "No Prepay":     d.baselineBalance,
  }));

  const pieData = [
    { name: "Principal", value: stats.totalPrincipalPaid || 1, formatted: fmtL(stats.totalPrincipalPaid) },
    { name: "Interest",  value: stats.totalInterestPaid,       formatted: fmtL(stats.totalInterestPaid) },
    { name: "Builder",   value: stats.totalPaidToBuilder,      formatted: fmtL(stats.totalPaidToBuilder) },
  ];

  const interestSavedVsBaseline =
    (stats.totalDisbursed * (loan.interestRate / 100 / 12) * loan.tenureYears * 12) - stats.totalInterestPaid;

  const tooltip = {
    contentStyle: {
      background: "rgba(10,10,18,0.97)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      color: "#f0f0f5",
      fontSize: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    },
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-8">

      {/* ── HEADER ────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(16,185,129,0.06) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Background orbs */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-12 right-20 w-56 h-56 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Active Loan Tracker
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
              <span style={{
                background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Park East</span>
              <span className="text-white"> Dashboard</span>
            </h1>
            <p className="mt-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
              {loan.name} &nbsp;·&nbsp; {loan.interestRate}% p.a. &nbsp;·&nbsp; {loan.tenureYears}-Year Tenure
              &nbsp;·&nbsp; EMI {fmtINR(loan.emi)}/mo
            </p>
          </div>

          {/* Mini health score badge */}
          <div className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl text-center"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">On-Track Score</span>
            <span className="text-3xl font-black mt-0.5" style={{
              background: "linear-gradient(135deg,#34d399,#10b981)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>A+</span>
            <span className="text-[10px] text-emerald-300/60 mt-0.5">Prepayment ahead</span>
          </div>
        </div>
      </motion.div>

      {/* ── 3 HERO KPI CARDS ──────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-5 sm:grid-cols-3">

        {/* Card 1 — Repaid Progress */}
        <motion.div
          whileHover={{ y: -6, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f766e 100%)",
            boxShadow: "0 12px 48px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "1px solid rgba(52,211,153,0.15)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at top-right, rgba(16,185,129,0.6) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300/80">Loan Repaid</p>
              <p className="mt-1 font-black leading-none" style={{ fontSize: "clamp(2rem,4vw,2.75rem)", color: "#fff" }}>
                <AnimatedCounter value={pctRepaid} formatter={(v) => `${v.toFixed(1)}%`} />
              </p>
              {/* Linear bar */}
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#34d399,#10b981,#0d9488)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctRepaid}%` }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                />
              </div>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs text-emerald-200/70 font-medium">
                  <span className="text-white font-bold">{fmtL(stats.totalPrincipalPaid)}</span> of {fmtL(stats.totalDisbursed)} repaid
                </p>
                <p className="text-xs text-emerald-200/60">
                  {fmtL(stats.totalDisbursed - stats.totalPrincipalPaid)} outstanding principal
                </p>
              </div>
            </div>
            <RingProgress pct={pctRepaid} color="#34d399" size={88} stroke={6} label="done" />
          </div>
        </motion.div>

        {/* Card 2 — EMIs Done */}
        <motion.div
          whileHover={{ y: -6, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 40%, #1d4ed8 100%)",
            boxShadow: "0 12px 48px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "1px solid rgba(129,140,248,0.15)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at top-right, rgba(99,102,241,0.7) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300/80">EMIs Completed</p>
              <p className="mt-1 font-black leading-none" style={{ fontSize: "clamp(2rem,4vw,2.75rem)", color: "#fff" }}>
                <AnimatedCounter value={stats.emiPaymentsCount} />
                <span className="text-2xl font-bold text-indigo-300"> / {loan.tenureYears * 12}</span>
              </p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#818cf8,#6366f1,#4f46e5)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctTimeDone}%` }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                />
              </div>
              <div className="mt-2.5 space-y-1">
                <p className="text-xs text-indigo-200/70 font-medium">
                  <span className="text-white font-bold">{loan.tenureYears * 12 - stats.emiPaymentsCount}</span> months remaining
                </p>
                <p className="text-xs text-indigo-200/60">
                  {(pctTimeDone).toFixed(1)}% of tenure elapsed
                </p>
              </div>
            </div>
            <RingProgress pct={pctTimeDone} color="#818cf8" size={88} stroke={6} label="done" />
          </div>
        </motion.div>

        {/* Card 3 — Tenure Saved */}
        <motion.div
          whileHover={{ y: -6, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #431407 0%, #7c2d12 40%, #b45309 100%)",
            boxShadow: "0 12px 48px rgba(245,158,11,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at top-right, rgba(245,158,11,0.7) 0%, transparent 60%)" }} />

          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-300/80">Tenure Saved</p>
            <p className="mt-1 font-black leading-none" style={{ fontSize: "clamp(2rem,4vw,2.75rem)" }}>
              <span style={{
                background: "linear-gradient(135deg,#fde68a,#fbbf24,#f59e0b)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                <AnimatedCounter value={monthsSaved} />
              </span>
              <span className="text-2xl font-bold text-amber-300"> months</span>
            </p>
            <p className="text-sm font-bold text-amber-200/80 mt-1">
              = {(monthsSaved / 12).toFixed(1)} years saved! 🎉
            </p>

            {/* Two mini sub-stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <p className="text-[10px] text-amber-300/60 font-bold uppercase tracking-wide">Interest Saved</p>
                <p className="text-sm font-black text-white mt-0.5">{fmtL(Math.max(0, interestSavedVsBaseline))}</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <p className="text-[10px] text-amber-300/60 font-bold uppercase tracking-wide">Interest Paid</p>
                <p className="text-sm font-black text-white mt-0.5">{fmtL(stats.totalInterestPaid)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── 6 STAT CARDS ──────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {([
          {
            label: "Outstanding Balance", icon: "⚠️",
            value: stats.outstandingBalance,
            sub: fmtINR(stats.outstandingBalance),
            extra: `${((stats.outstandingBalance / stats.totalDisbursed) * 100).toFixed(1)}% of loan left`,
            grad: "linear-gradient(135deg,#450a0a,#7f1d1d,#991b1b)",
            glow: "rgba(239,68,68,0.2)",
            border: "rgba(252,165,165,0.12)",
            textGrad: "linear-gradient(135deg,#fca5a5,#ef4444)",
          },
          {
            label: "Total Disbursed", icon: "🏦",
            value: stats.totalDisbursed,
            sub: fmtINR(stats.totalDisbursed),
            extra: `${stats.disbursementCount} tranche${stats.disbursementCount !== 1 ? "s" : ""}`,
            grad: "linear-gradient(135deg,#0c1a35,#1e3a5f,#1d4ed8)",
            glow: "rgba(59,130,246,0.2)",
            border: "rgba(147,197,253,0.12)",
            textGrad: "linear-gradient(135deg,#93c5fd,#3b82f6)",
          },
          {
            label: "Total Paid to Bank", icon: "💳",
            value: stats.totalPaidToBank,
            sub: fmtINR(stats.totalPaidToBank),
            extra: "EMIs + Prepayments",
            grad: "linear-gradient(135deg,#022c22,#065f46,#0f766e)",
            glow: "rgba(16,185,129,0.2)",
            border: "rgba(110,231,183,0.12)",
            textGrad: "linear-gradient(135deg,#6ee7b7,#10b981)",
          },
          {
            label: "Interest Paid", icon: "📈",
            value: stats.totalInterestPaid,
            sub: fmtINR(stats.totalInterestPaid),
            extra: `${((stats.totalInterestPaid / stats.totalPaidToBank) * 100).toFixed(1)}% of bank payments`,
            grad: "linear-gradient(135deg,#431407,#78350f,#92400e)",
            glow: "rgba(245,158,11,0.2)",
            border: "rgba(253,211,77,0.12)",
            textGrad: "linear-gradient(135deg,#fcd34d,#f59e0b)",
          },
          {
            label: "Principal Repaid", icon: "✅",
            value: stats.totalPrincipalPaid,
            sub: fmtINR(stats.totalPrincipalPaid),
            extra: `${pctRepaid.toFixed(1)}% of disbursed amount`,
            grad: "linear-gradient(135deg,#052e16,#14532d,#166534)",
            glow: "rgba(34,197,94,0.2)",
            border: "rgba(134,239,172,0.12)",
            textGrad: "linear-gradient(135deg,#86efac,#22c55e)",
          },
          {
            label: "Own Contribution", icon: "🏠",
            value: stats.totalPaidToBuilder,
            sub: fmtINR(stats.totalPaidToBuilder),
            extra: "Paid directly to builder",
            grad: "linear-gradient(135deg,#2e1065,#4c1d95,#6d28d9)",
            glow: "rgba(139,92,246,0.2)",
            border: "rgba(196,181,253,0.12)",
            textGrad: "linear-gradient(135deg,#c4b5fd,#8b5cf6)",
          },
        ] as const).map((s, idx) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -5, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: s.grad,
              boxShadow: `0 8px 32px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              border: `1px solid ${s.border}`,
            }}
          >
            <div className="pointer-events-none absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${s.glow.replace("0.2","0.8")} 0%, transparent 70%)` }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/50">{s.label}</p>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="text-3xl font-black leading-none mt-1">
                <AnimatedCounter
                  value={s.value}
                  delay={idx * 0.05}
                  formatter={fmtL}
                />
              </p>
              <p className="text-xs font-semibold text-white/40 mt-1">{s.sub}</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 font-medium">{s.extra}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── BALANCE TREND ─────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(10,10,20,0.8) 0%, rgba(15,23,42,0.9) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-white text-base">Outstanding Balance Over Time</h3>
            <p className="text-xs text-slate-400 mt-0.5">Actual paydown vs. no-prepayment scenario</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <div className="w-6 h-0.5 rounded-full bg-emerald-400" />
              With Prepay
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <div className="w-6 h-0.5 rounded-full bg-red-400 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(90deg,#f87171 0 4px,transparent 4px 8px)" }} />
              No Prepay
            </div>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltip} formatter={(v: any, name?: any) => [fmtINR(Number(v)), name ?? ""]} />
              <Line type="monotone" dataKey="No Prepay" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 4" dot={false} opacity={0.6} />
              <Line type="monotone" dataKey="With Prepay" stroke="#10b981" strokeWidth={2.5} dot={false}
                style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.4))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── CHARTS ROW ────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-5">

        {/* Interest Area Chart */}
        <div className="relative overflow-hidden rounded-2xl p-6 lg:col-span-3"
          style={{
            background: "linear-gradient(135deg,rgba(10,10,20,0.8),rgba(20,10,30,0.9))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-white text-sm">Monthly Interest Charged</h3>
              <p className="text-xs text-slate-400 mt-0.5">Bank statement — actual interest per month</p>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
              {fmtL(stats.totalInterestPaid)} total
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interestData}>
                <defs>
                  <linearGradient id="igr2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltip} formatter={(v: any) => [fmtINR(Number(v)), "Interest"]} />
                <Area type="monotone" dataKey="interest" stroke="#f59e0b" fill="url(#igr2)" strokeWidth={2.5}
                  style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.3))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut */}
        <div className="relative overflow-hidden rounded-2xl p-6 lg:col-span-2"
          style={{
            background: "linear-gradient(135deg,rgba(10,10,20,0.8),rgba(10,20,30,0.9))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
          <h3 className="font-black text-white text-sm mb-1">Payment Split</h3>
          <p className="text-xs text-slate-400 mb-3">How money has been distributed</p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70}
                  paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip {...tooltip} formatter={(v: any) => [fmtINR(Number(v)), ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2.5 mt-3">
            {pieData.map((d, i) => {
              const total = pieData.reduce((s, x) => s + x.value, 0);
              const pct = ((d.value / total) * 100).toFixed(1);
              return (
                <div key={d.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: DONUT_COLORS[i] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{d.name}</span>
                      <span className="text-[11px] font-black text-white">{d.formatted}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: DONUT_COLORS[i] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.4, ease: "easeOut", delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── RECENT PAYMENTS ───────────────────────────── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg,rgba(10,10,20,0.8),rgba(15,15,30,0.9))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <div>
            <h3 className="font-black text-white text-sm">Recent Payments</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest {recentPayments.length} transactions recorded</p>
          </div>
        </div>
        <div>
          {recentPayments.map((p, idx) => {
            const typeConf = {
              emi:        { bg: "rgba(59,130,246,0.12)",  text: "#93c5fd", label: "EMI",     barColor: "#3b82f6" },
              prepayment: { bg: "rgba(16,185,129,0.12)",  text: "#6ee7b7", label: "Prepay",  barColor: "#10b981" },
              builder:    { bg: "rgba(139,92,246,0.12)",  text: "#c4b5fd", label: "Builder", barColor: "#8b5cf6" },
            }[p.type] ?? { bg: "rgba(255,255,255,0.06)", text: "#cbd5e1", label: p.type, barColor: "#64748b" };
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.025] transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              >
                {/* Color dot */}
                <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: typeConf.barColor, boxShadow: `0 0 8px ${typeConf.barColor}88` }} />
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: typeConf.bg, color: typeConf.text }}>
                  {typeConf.label}
                </span>
                <span className="text-sm flex-1 text-slate-400">
                  {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {p.notes && <span className="text-xs text-slate-600 hidden sm:block truncate max-w-[120px]">{p.notes}</span>}
                <span className="font-black text-sm text-white">{fmtINR(p.amount)}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

    </motion.div>
  );
}
