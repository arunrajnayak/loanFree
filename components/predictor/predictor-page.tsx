"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { predictPayoff } from "@/lib/calculations";
import type { Loan } from "@/lib/schema";

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

function monthToFull(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function yearsMonths(months: number) {
  const y = Math.floor(Math.abs(months) / 12);
  const m = Math.abs(months) % 12;
  if (y === 0) return `${m}m`;
  if (m === 0) return `${y}y`;
  return `${y}y ${m}m`;
}

const tooltipStyle = {
  contentStyle: {
    background: "rgba(17,17,24,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#f0f0f5",
    fontSize: "13px",
  },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const presets = [
  { name: "No Prepay", extra: 0, emis: 0, hike: 0 },
  { name: "Current (Excel)", extra: 12500, emis: 0, hike: 5 },
  { name: "Moderate", extra: 25000, emis: 1, hike: 5 },
  { name: "Aggressive", extra: 25000, emis: 2, hike: 10 },
  { name: "Max Attack", extra: 50000, emis: 4, hike: 15 },
];

export function PredictorPage({
  loan,
  currentBalance,
  startMonth,
  remainingMonths,
}: {
  loan: Loan;
  currentBalance: number;
  startMonth: string;
  remainingMonths: number;
}) {
  const [extraMonthly, setExtraMonthly] = useState(12500);
  const [extraEmiPerYear, setExtraEmiPerYear] = useState(0);
  const [annualHikePct, setAnnualHikePct] = useState(5);
  const [interestRate, setInterestRate] = useState(loan.interestRate);

  const withPrepay = useMemo(
    () => predictPayoff(currentBalance, interestRate, loan.emi, startMonth,
      { extraMonthly, extraEmiPerYear, annualHikePct }, remainingMonths),
    [currentBalance, interestRate, loan.emi, startMonth, extraMonthly, extraEmiPerYear, annualHikePct, remainingMonths]
  );

  const noPrepay = useMemo(
    () => predictPayoff(currentBalance, interestRate, loan.emi, startMonth,
      { extraMonthly: 0, extraEmiPerYear: 0, annualHikePct: 0 }, remainingMonths),
    [currentBalance, interestRate, loan.emi, startMonth, remainingMonths]
  );

  const maxLen = Math.max(withPrepay.schedule.length, noPrepay.schedule.length);
  const chartData = [];
  for (let i = 0; i < maxLen; i += 3) {
    const wp = withPrepay.schedule[Math.min(i, withPrepay.schedule.length - 1)];
    const np = noPrepay.schedule[Math.min(i, noPrepay.schedule.length - 1)];
    chartData.push({
      month: wp ? monthLabel(wp.month) : np ? monthLabel(np.month) : "",
      withPrepay: i < withPrepay.schedule.length ? Math.round(wp.outstandingBalance) : 0,
      noPrepay: i < noPrepay.schedule.length ? Math.round(np.outstandingBalance) : undefined,
    });
  }

  const emiComposition = withPrepay.schedule
    .filter((_, i) => i % 3 === 0)
    .map((row) => ({
      month: monthLabel(row.month),
      principal: Math.round(row.principal),
      interest: Math.round(row.interest),
    }));

  const comparisonStats = [
    { label: "Payoff Date", with: monthToFull(withPrepay.payoffDate), without: monthToFull(noPrepay.payoffDate) },
    { label: "Tenure", with: yearsMonths(withPrepay.tenureMonths), without: yearsMonths(noPrepay.tenureMonths) },
    { label: "Total Interest", with: fmtL(withPrepay.totalInterest), without: fmtL(noPrepay.totalInterest) },
    { label: "Total Paid", with: fmtL(withPrepay.totalPaid), without: fmtL(noPrepay.totalPaid) },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Loan</span> Predictor
        </h1>
        <p style={{ color: "var(--text-secondary)" }} className="mt-1">
          Outstanding: {fmtL(currentBalance)} · Configure prepayment strategies below
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Panel */}
        <motion.div variants={item} className="space-y-4">
          {/* Sliders */}
          <div className="glass p-6 space-y-6">
            <h3 className="text-sm font-medium gradient-text">Prepayment Config</h3>

            <SliderField
              label="Interest Rate"
              value={interestRate}
              onChange={setInterestRate}
              min={5} max={15} step={0.1}
              display={`${interestRate.toFixed(1)}%`}
              accent="#3b82f6"
            />
            <SliderField
              label="Extra Monthly"
              value={extraMonthly}
              onChange={setExtraMonthly}
              min={0} max={100000} step={2500}
              display={fmtINR(extraMonthly)}
              accent="#10b981"
            />
            <SliderField
              label="Extra EMIs / Year"
              value={extraEmiPerYear}
              onChange={setExtraEmiPerYear}
              min={0} max={6} step={1}
              display={`${extraEmiPerYear}`}
              accent="#8b5cf6"
            />
            <SliderField
              label="Annual EMI Hike"
              value={annualHikePct}
              onChange={setAnnualHikePct}
              min={0} max={20} step={1}
              display={`${annualHikePct}%`}
              accent="#f59e0b"
            />
          </div>

          {/* Presets */}
          <div className="glass p-4 space-y-1.5">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Quick Presets</p>
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => { setExtraMonthly(p.extra); setExtraEmiPerYear(p.emis); setAnnualHikePct(p.hike); }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                <span className="text-xs ml-2">
                  {p.extra > 0 ? `${fmtINR(p.extra)}/m` : ""}{p.emis > 0 ? ` + ${p.emis} EMIs` : ""}{p.hike > 0 ? ` + ${p.hike}% hike` : ""}
                  {p.extra === 0 && p.emis === 0 && p.hike === 0 ? "Baseline" : ""}
                </span>
              </button>
            ))}
          </div>

          {/* Savings Card */}
          <div className="glass p-6 text-center pulse-glow" style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: "#34d399" }}>Interest Saved</p>
            <p className="text-4xl font-bold mt-2 gradient-text-emerald">{fmtL(withPrepay.interestSaved)}</p>
            <p className="text-sm mt-1" style={{ color: "#34d399" }}>{yearsMonths(withPrepay.tenureReduced)} earlier</p>
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div variants={item} className="space-y-4">
          {/* Comparison Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {comparisonStats.map((s) => (
              <div key={s.label} className="glass p-4">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mb-1" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                      No Prepay
                    </span>
                    <p className="text-lg font-bold" style={{ color: "#f87171" }}>{s.without}</p>
                  </div>
                  <div>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mb-1" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>
                      With Prepay
                    </span>
                    <p className="text-lg font-bold" style={{ color: "#34d399" }}>{s.with}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Balance Comparison Chart */}
          <div className="glass p-6">
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Balance Payoff Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [fmtINR(Number(v)), n === "withPrepay" ? "With Prepay" : "No Prepay"]} />
                <Legend formatter={(v) => v === "withPrepay" ? "With Prepayment" : "Without Prepayment"} wrapperStyle={{ color: "#8b8b9e", fontSize: "12px" }} />
                <Area type="monotone" dataKey="noPrepay" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="6 4" opacity={0.5} />
                <Area type="monotone" dataKey="withPrepay" stroke="#10b981" fill="url(#wpg)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* EMI Composition */}
          <div className="glass p-6">
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Monthly Payment Composition</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={emiComposition}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [fmtINR(Number(v)), n]} />
                <Legend wrapperStyle={{ color: "#8b8b9e", fontSize: "12px" }} />
                <Area type="monotone" dataKey="principal" stackId="1" stroke="#10b981" fill="url(#pg)" name="Principal" />
                <Area type="monotone" dataKey="interest" stackId="1" stroke="#f59e0b" fill="url(#ig)" name="Interest" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SliderField({
  label, value, onChange, min, max, step, display, accent,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; display: string; accent: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: accent }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
    </div>
  );
}
