"use client";

import { useEffect, useState } from "react";
import { motion, animate, type Variants } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { Loan, Payment, InterestRecord } from "@/lib/schema";

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtINR(v: number) {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function fmtL(v: number) {
  const l = v / 100000;
  return l >= 100 ? `${(l / 100).toFixed(2)} Cr` : `${l.toFixed(2)}L`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo - 1]} '${y.slice(2)}`;
}

// ── Animated counter ────────────────────────────────────────────────────────
function Counter({
  value, formatter = (v: number) => String(Math.round(v)),
  duration = 1.5, delay = 0,
}: { value: number; formatter?: (v: number) => string; duration?: number; delay?: number }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration, delay, ease: "easeOut", onUpdate: setD });
    return () => c.stop();
  }, [value, duration, delay]);
  return <>{formatter(d)}</>;
}

// ── Glowing arc ring ────────────────────────────────────────────────────────
function GlowRing({
  pct, color, size = 84, sw = 6, bg = "rgba(255,255,255,0.05)",
}: { pct: number; color: string; size?: number; sw?: number; bg?: string }) {
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <div className="relative flex-none flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: "visible" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={sw} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center gap-0.5">
        <span className="text-[13px] font-bold leading-none" style={{ color }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────────
function Bar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: gradient }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 1.7, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Gradient text helper ────────────────────────────────────────────────────
function GText({ gradient, children, className = "" }: {
  gradient: string; children: React.ReactNode; className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        background: gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

// ── Motion presets ──────────────────────────────────────────────────────────
const wrap: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

// ── Tooltip style ───────────────────────────────────────────────────────────
const tt = {
  contentStyle: {
    background: "rgba(8,8,18,0.97)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#e2e8f0", fontSize: 12,
    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
  },
};

// ── Types ───────────────────────────────────────────────────────────────────
interface DashboardStats {
  outstandingBalance: number; totalDisbursed: number;
  totalPaidToBank: number; totalPaidToBuilder: number;
  totalInterestPaid: number; totalPrincipalPaid: number;
  disbursementCount: number; totalMonthsSaved: number;
  emiPaymentsCount: number;
}
interface BalanceTrendItem { month: string; actualBalance: number; baselineBalance?: number }

// ════════════════════════════════════════════════════════════════════════════
export function DashboardClient({
  loan, stats, recentPayments, interestRecords, balanceTrendData,
}: {
  loan: Loan; stats: DashboardStats; recentPayments: Payment[];
  interestRecords: InterestRecord[]; balanceTrendData: BalanceTrendItem[];
}) {
  const totalMonths = loan.tenureYears * 12;
  const pctRepaid   = stats.totalDisbursed > 0 ? (stats.totalPrincipalPaid / stats.totalDisbursed) * 100 : 0;
  const pctTime     = (stats.emiPaymentsCount / totalMonths) * 100;
  const remaining   = totalMonths - stats.emiPaymentsCount;

  const interestData = interestRecords.map((r) => ({
    month: monthLabel(r.month), interest: Math.round(r.amount),
  }));
  const trendData = balanceTrendData.map((d) => ({
    month: monthLabel(d.month),
    "With prepayments":    d.actualBalance,
    "Without prepayments": d.baselineBalance,
  }));
  const pieData = [
    { name: "Principal",  value: stats.totalPrincipalPaid || 1, color: "#10b981" },
    { name: "Interest",   value: stats.totalInterestPaid,       color: "#f59e0b" },
    { name: "Own funds",  value: stats.totalPaidToBuilder,      color: "#8b5cf6" },
  ];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div variants={wrap} initial="hidden" animate="show" className="space-y-6 pt-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.05) 50%, rgba(16,185,129,0.05) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* ambient blobs */}
        <div className="pointer-events-none absolute -top-20 -left-10 w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 65%)" }} />
        <div className="pointer-events-none absolute -bottom-16 right-10 w-56 h-56 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 65%)" }} />

        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">
              Home Loan &nbsp;·&nbsp; {loan.interestRate}% p.a. &nbsp;·&nbsp; {loan.tenureYears}-yr tenure &nbsp;·&nbsp; EMI {fmtINR(loan.emi)}/mo
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">{loan.name}</h1>
          </div>

          {/* Outstanding balance pill */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Outstanding</p>
              <p className="text-xl font-bold text-white mt-0.5">{fmtL(stats.outstandingBalance)}</p>
              <p className="text-xs text-slate-500">{fmtINR(stats.outstandingBalance)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3 KPI CARDS ────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">

        {/* KPI 1 — Loan Repaid */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(6,78,59,0.5) 0%, rgba(4,47,46,0.35) 100%)",
            border: "1px solid rgba(52,211,153,0.2)",
            boxShadow: "0 4px 32px rgba(16,185,129,0.1)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%)" }} />

          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-medium text-emerald-300/70">Loan repaid</p>
            <GlowRing pct={pctRepaid} color="#34d399" size={72} sw={5} bg="rgba(52,211,153,0.08)" />
          </div>
          <p className="text-[2.25rem] font-bold leading-none mb-2">
            <GText gradient="linear-gradient(135deg,#6ee7b7,#34d399,#10b981)">
              <Counter value={pctRepaid} formatter={(v) => `${v.toFixed(1)}%`} />
            </GText>
          </p>
          <Bar pct={pctRepaid} gradient="linear-gradient(90deg,#34d399,#10b981)" />
          <p className="mt-2 text-xs text-emerald-200/50">
            {fmtL(stats.totalPrincipalPaid)} repaid &nbsp;·&nbsp; {fmtL(stats.outstandingBalance)} remaining
          </p>
        </motion.div>

        {/* KPI 2 — EMIs Completed */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(30,27,75,0.6) 0%, rgba(29,62,170,0.3) 100%)",
            border: "1px solid rgba(129,140,248,0.2)",
            boxShadow: "0 4px 32px rgba(99,102,241,0.1)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)" }} />

          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-medium text-indigo-300/70">EMIs completed</p>
            <GlowRing pct={pctTime} color="#818cf8" size={72} sw={5} bg="rgba(129,140,248,0.08)" />
          </div>
          <div className="text-[2.25rem] font-bold leading-none mb-2">
            <GText gradient="linear-gradient(135deg,#a5b4fc,#818cf8,#6366f1)">
              <Counter value={stats.emiPaymentsCount} />
            </GText>
            <span className="text-xl text-indigo-300/50 font-normal ml-1">/ {totalMonths}</span>
          </div>
          <Bar pct={pctTime} gradient="linear-gradient(90deg,#a5b4fc,#6366f1)" />
          <p className="mt-2 text-xs text-indigo-200/50">
            {remaining} months remaining
          </p>
        </motion.div>

        {/* KPI 3 — Tenure Saved */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(67,20,7,0.6) 0%, rgba(120,53,15,0.4) 100%)",
            border: "1px solid rgba(251,191,36,0.2)",
            boxShadow: "0 4px 32px rgba(245,158,11,0.1)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.8) 0%, transparent 70%)" }} />

          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-medium text-amber-300/70">Tenure saved</p>
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-none"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span className="text-2xl">🏆</span>
            </div>
          </div>
          <p className="text-[2.25rem] font-bold leading-none mb-2">
            <GText gradient="linear-gradient(135deg,#fde68a,#fbbf24,#f59e0b)">
              <Counter value={stats.totalMonthsSaved} />
            </GText>
            <span className="text-xl text-amber-300/50 font-normal ml-1">months</span>
          </p>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full w-full" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b)" }} />
          </div>
          <p className="mt-2 text-xs text-amber-200/50">
            ≈ {(stats.totalMonthsSaved / 12).toFixed(1)} years ahead of schedule
          </p>
        </motion.div>
      </motion.div>

      {/* ── 6 STAT CARDS ───────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {([
          {
            label: "Outstanding principal", value: stats.outstandingBalance,
            sub: `${((stats.outstandingBalance / stats.totalDisbursed) * 100).toFixed(1)}% of disbursed`,
            accent: "#ef4444", glow: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.18)",
            grad: "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(220,38,38,0.03))",
          },
          {
            label: "Total disbursed", value: stats.totalDisbursed,
            sub: `${stats.disbursementCount} tranches from bank`,
            accent: "#60a5fa", glow: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.18)",
            grad: "linear-gradient(135deg,rgba(59,130,246,0.08),rgba(37,99,235,0.03))",
          },
          {
            label: "Paid to bank", value: stats.totalPaidToBank,
            sub: "EMIs + prepayments combined",
            accent: "#34d399", glow: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.18)",
            grad: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.03))",
          },
          {
            label: "Interest paid", value: stats.totalInterestPaid,
            sub: `${((stats.totalInterestPaid / stats.totalPaidToBank) * 100).toFixed(1)}% of bank payments`,
            accent: "#fbbf24", glow: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.18)",
            grad: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(217,119,6,0.03))",
          },
          {
            label: "Principal repaid", value: stats.totalPrincipalPaid,
            sub: `${pctRepaid.toFixed(1)}% of disbursed amount`,
            accent: "#4ade80", glow: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.18)",
            grad: "linear-gradient(135deg,rgba(34,197,94,0.08),rgba(22,163,74,0.03))",
          },
          {
            label: "Own contribution", value: stats.totalPaidToBuilder,
            sub: "Paid directly to builder",
            accent: "#c084fc", glow: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.18)",
            grad: "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(109,40,217,0.03))",
          },
        ] as const).map((s, i) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative overflow-hidden rounded-xl p-4"
            style={{
              background: s.grad, border: `1px solid ${s.border}`,
              boxShadow: `0 4px 24px ${s.glow}`,
            }}
          >
            <div className="pointer-events-none absolute -right-4 -bottom-4 w-20 h-20 rounded-full"
              style={{ background: `radial-gradient(circle, ${s.glow.replace("0.12","0.4")} 0%, transparent 70%)` }} />
            <p className="text-xs font-medium text-slate-400 mb-2">{s.label}</p>
            <p className="text-[1.75rem] font-bold leading-none" style={{ color: s.accent }}>
              <Counter value={s.value} formatter={fmtL} delay={i * 0.05} />
            </p>
            <p className="mt-2 text-xs text-slate-600">{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── BALANCE TREND CHART ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="glass p-5" style={{ boxShadow: "0 4px 32px rgba(16,185,129,0.06)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Outstanding balance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Actual paydown vs. no-prepayment scenario</p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded inline-block bg-emerald-400" style={{ boxShadow: "0 0 6px #10b981" }} />
              With prepayments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 inline-block border-t border-dashed border-red-400 opacity-60" />
              Without
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <defs>
                <filter id="glow-line">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtL} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} formatter={(v: any, name?: any) => [fmtINR(Number(v)), name ?? ""]} />
              <Line type="monotone" dataKey="Without prepayments" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 4" dot={false} opacity={0.5} />
              <Line type="monotone" dataKey="With prepayments" stroke="#10b981" strokeWidth={2.5} dot={false}
                style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.6))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── CHARTS ROW ─────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-5">

        {/* Interest area chart */}
        <div className="glass p-5 lg:col-span-3" style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly interest charged</h3>
              <p className="text-xs text-slate-500 mt-0.5">From bank statements</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-base font-bold" style={{ color: "#fbbf24" }}>{fmtL(stats.totalInterestPaid)}</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interestData}>
                <defs>
                  <linearGradient id="igr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip {...tt} formatter={(v: any) => [fmtINR(Number(v)), "Interest"]} />
                <Area type="monotone" dataKey="interest" stroke="#f59e0b" fill="url(#igr)" strokeWidth={2.5}
                  style={{ filter: "drop-shadow(0 0 5px rgba(245,158,11,0.4))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut */}
        <div className="glass p-5 lg:col-span-2" style={{ boxShadow: "0 4px 24px rgba(139,92,246,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-0.5">Payment split</h3>
          <p className="text-xs text-slate-500 mb-3">Where the money went</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={64}
                  paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip {...tt} formatter={(v: any) => [fmtINR(Number(v)), ""]} />
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
                      <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-xs font-semibold text-white">{fmtL(d.value)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: d.color, opacity: 0.85 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── RECENT PAYMENTS ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="glass overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <h3 className="text-sm font-semibold text-white">Recent payments</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest {recentPayments.length} transactions</p>
          </div>
        </div>
        {recentPayments.map((p, idx) => {
          const conf = {
            emi:        { dot: "#6366f1", badge: "rgba(99,102,241,0.13)",  text: "#a5b4fc", label: "EMI" },
            prepayment: { dot: "#10b981", badge: "rgba(16,185,129,0.13)",  text: "#6ee7b7", label: "Prepayment" },
            builder:    { dot: "#a78bfa", badge: "rgba(167,139,250,0.13)", text: "#c4b5fd", label: "Builder" },
          }[p.type] ?? { dot: "#94a3b8", badge: "rgba(148,163,184,0.1)", text: "#94a3b8", label: p.type };
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.025] transition-colors"
              style={{ borderBottom: idx < recentPayments.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full flex-none" style={{ background: conf.dot, boxShadow: `0 0 8px ${conf.dot}` }} />
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold flex-none"
                style={{ background: conf.badge, color: conf.text }}>{conf.label}</span>
              <span className="text-xs text-slate-500 flex-1">
                {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {p.notes && <span className="text-xs text-slate-600 hidden sm:block truncate max-w-[140px]">{p.notes}</span>}
              <span className="text-sm font-semibold text-white">{fmtINR(p.amount)}</span>
            </motion.div>
          );
        })}
      </motion.div>

    </motion.div>
  );
}
