"use client";

import { useEffect, useState } from "react";
import { motion, animate, type Variants } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { Loan, Payment, InterestRecord } from "@/lib/schema";

// ── Formatters ─────────────────────────────────────────────────
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

// ── Animated number counter ────────────────────────────────────
function Counter({
  value,
  formatter = (v: number) => String(Math.round(v)),
  duration = 1.4,
  delay = 0,
}: {
  value: number;
  formatter?: (v: number) => string;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const ctrl = animate(0, value, { duration, delay, ease: "easeOut", onUpdate: setDisplay });
    return () => ctrl.stop();
  }, [value, duration, delay]);
  return <>{formatter(display)}</>;
}

// ── Compact arc ring ───────────────────────────────────────────
function Arc({
  pct,
  color,
  size = 72,
  strokeW = 5,
}: { pct: number; color: string; size?: number; strokeW?: number }) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold" style={{ color }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ── Motion config ──────────────────────────────────────────────
const wrap: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const slide: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ── Types ──────────────────────────────────────────────────────
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

// ── Shared tooltip style ───────────────────────────────────────
const ttStyle = {
  contentStyle: {
    background: "rgba(8,8,16,0.96)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: 12,
  },
};

// ═══════════════════════════════════════════════════════════════
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
  const totalMonths  = loan.tenureYears * 12;
  const pctRepaid    = stats.totalDisbursed > 0 ? (stats.totalPrincipalPaid / stats.totalDisbursed) * 100 : 0;
  const pctTimeDone  = (stats.emiPaymentsCount / totalMonths) * 100;
  const remaining    = totalMonths - stats.emiPaymentsCount;

  const interestData = interestRecords.map((r) => ({
    month: monthLabel(r.month),
    interest: Math.round(r.amount),
  }));

  const trendData = balanceTrendData.map((d) => ({
    month: monthLabel(d.month),
    "With prepayments":  d.actualBalance,
    "Without prepayments": d.baselineBalance,
  }));

  const pieData = [
    { name: "Principal",   value: stats.totalPrincipalPaid || 1, color: "#10b981" },
    { name: "Interest",    value: stats.totalInterestPaid,        color: "#f59e0b" },
    { name: "Own funds",   value: stats.totalPaidToBuilder,       color: "#8b5cf6" },
  ];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // 6 stat cards — each metric appears exactly once
  const statCards = [
    {
      label: "Outstanding principal",
      value: stats.outstandingBalance,
      formatter: fmtL,
      sub: `${((stats.outstandingBalance / stats.totalDisbursed) * 100).toFixed(1)}% of loan still to go`,
      accent: "#ef4444",
    },
    {
      label: "Total disbursed",
      value: stats.totalDisbursed,
      formatter: fmtL,
      sub: `Across ${stats.disbursementCount} tranche${stats.disbursementCount !== 1 ? "s" : ""}`,
      accent: "#3b82f6",
    },
    {
      label: "Paid to bank",
      value: stats.totalPaidToBank,
      formatter: fmtL,
      sub: "EMIs + prepayments combined",
      accent: "#10b981",
    },
    {
      label: "Interest paid",
      value: stats.totalInterestPaid,
      formatter: fmtL,
      sub: `${((stats.totalInterestPaid / stats.totalPaidToBank) * 100).toFixed(1)}% of bank payments`,
      accent: "#f59e0b",
    },
    {
      label: "Principal repaid",
      value: stats.totalPrincipalPaid,
      formatter: fmtL,
      sub: `${pctRepaid.toFixed(1)}% of amount disbursed`,
      accent: "#22c55e",
    },
    {
      label: "Own contribution",
      value: stats.totalPaidToBuilder,
      formatter: fmtL,
      sub: "Paid directly to builder",
      accent: "#a78bfa",
    },
  ];

  return (
    <motion.div variants={wrap} initial="hidden" animate="show" className="space-y-6 pt-6">

      {/* ── HEADER ──────────────────────────────────────── */}
      <motion.div variants={slide} className="flex items-end justify-between gap-4 flex-wrap pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">Home Loan · {loan.interestRate}% p.a. · {loan.tenureYears}-yr tenure</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">{loan.name}</h1>
          <p className="text-sm text-slate-500 mt-1">EMI {fmtINR(loan.emi)}/month</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="text-2xl font-semibold text-white">{fmtL(stats.outstandingBalance)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{fmtINR(stats.outstandingBalance)}</p>
        </div>
      </motion.div>

      {/* ── KPI STRIP — 3 sections in one panel ─────────── */}
      <motion.div variants={slide}
        className="grid grid-cols-3 divide-x rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Progress */}
        <div className="p-5 flex items-center gap-4">
          <Arc pct={pctRepaid} color="#10b981" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Loan repaid</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              <Counter value={pctRepaid} formatter={(v) => `${v.toFixed(1)}%`} />
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-medium">{fmtL(stats.totalPrincipalPaid)}</span>
              {" "}of {fmtL(stats.totalDisbursed)}
            </p>
            {/* Progress bar */}
            <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", width: "100%" }}>
              <motion.div className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${pctRepaid}%` }}
                transition={{ duration: 1.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-5 flex items-center gap-4">
          <Arc pct={pctTimeDone} color="#6366f1" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">EMIs completed</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              <Counter value={stats.emiPaymentsCount} />
              <span className="text-base font-normal text-slate-500"> / {totalMonths}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-indigo-400 font-medium">{remaining}</span> months remaining
            </p>
            <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${pctTimeDone}%` }}
                transition={{ duration: 1.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Tenure saved */}
        <div className="p-5 flex items-center gap-4">
          <div className="flex-none w-[72px] h-[72px] rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Tenure saved</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">
              <Counter value={stats.totalMonthsSaved} />
              <span className="text-base font-normal text-slate-500"> months</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ≈ <span className="text-amber-300 font-medium">{(stats.totalMonthsSaved / 12).toFixed(1)} years</span> off your loan
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS — 3 × 2 grid ─────────────────────── */}
      <motion.div variants={slide} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative rounded-xl p-4 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `3px solid ${s.accent}`,
            }}
          >
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              <Counter value={s.value} formatter={s.formatter} delay={i * 0.04} />
            </p>
            <p className="mt-1 text-xs text-slate-600">{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── BALANCE TREND ────────────────────────────────── */}
      <motion.div variants={slide}
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Outstanding balance over time</h3>
            <p className="text-xs text-slate-500 mt-0.5">Actual vs. without prepayments</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 inline-block rounded bg-emerald-500" />
              With prepayments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 inline-block rounded bg-red-400 opacity-50" />
              Without
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtL} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...ttStyle} formatter={(v: any, name?: any) => [fmtINR(Number(v)), name ?? ""]} />
              <Line type="monotone" dataKey="Without prepayments" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.55} />
              <Line type="monotone" dataKey="With prepayments" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── CHARTS ROW ───────────────────────────────────── */}
      <motion.div variants={slide} className="grid gap-4 lg:grid-cols-5">

        {/* Interest trend */}
        <div className="rounded-2xl p-5 lg:col-span-3"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-white mb-0.5">Monthly interest charged</h3>
          <p className="text-xs text-slate-500 mb-4">From bank statements</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interestData}>
                <defs>
                  <linearGradient id="igr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip {...ttStyle} formatter={(v: any) => [fmtINR(Number(v)), "Interest"]} />
                <Area type="monotone" dataKey="interest" stroke="#f59e0b" fill="url(#igr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment split */}
        <div className="rounded-2xl p-5 lg:col-span-2"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-white mb-0.5">Payment split</h3>
          <p className="text-xs text-slate-500 mb-2">Where money has gone</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip {...ttStyle} formatter={(v: any) => [fmtINR(Number(v)), ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-2">
            {pieData.map((d) => {
              const pct = ((d.value / pieTotal) * 100).toFixed(1);
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-xs font-medium text-white">{fmtL(d.value)}</span>
                  </div>
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: d.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── RECENT PAYMENTS ──────────────────────────────── */}
      <motion.div variants={slide}
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-sm font-semibold text-white">Recent payments</h3>
        </div>
        {recentPayments.map((p, i) => {
          const conf = {
            emi:        { dot: "#6366f1", badge: "rgba(99,102,241,0.12)",  text: "#a5b4fc", label: "EMI" },
            prepayment: { dot: "#10b981", badge: "rgba(16,185,129,0.12)",  text: "#6ee7b7", label: "Prepayment" },
            builder:    { dot: "#a78bfa", badge: "rgba(167,139,250,0.12)", text: "#c4b5fd", label: "Builder" },
          }[p.type] ?? { dot: "#94a3b8", badge: "rgba(148,163,184,0.1)", text: "#94a3b8", label: p.type };
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: i < recentPayments.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full flex-none" style={{ background: conf.dot }} />
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: conf.badge, color: conf.text }}>
                {conf.label}
              </span>
              <span className="text-xs text-slate-500 flex-1">
                {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {p.notes && <span className="text-xs text-slate-600 hidden sm:block truncate max-w-[140px]">{p.notes}</span>}
              <span className="text-sm font-medium text-white">{fmtINR(p.amount)}</span>
            </div>
          );
        })}
      </motion.div>

    </motion.div>
  );
}
