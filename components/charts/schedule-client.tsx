"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AmortizationRow } from "@/lib/calculations";

function fmtINR(v: number) {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtL(v: number) {
  return `${(v / 100000).toFixed(2)}L`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} '${y.slice(2)}`;
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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

function AddInterestDialog({ onClose, onAdded, lastMonth }: { onClose: () => void; onAdded: () => void; lastMonth: string }) {
  // Default to the month after the last recorded month
  const [year, mon] = lastMonth.split("-").map(Number);
  let nextMon = mon + 1, nextYear = year;
  if (nextMon > 12) { nextMon = 1; nextYear++; }
  const defaultMonth = `${nextYear}-${String(nextMon).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!month || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid month and interest amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/interest-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: 1,
          month,
          amount: amt,
          outstandingBalance: balance ? parseFloat(balance) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="glass"
          style={{ width: "100%", maxWidth: 420, margin: "16px", padding: "28px", borderRadius: "20px" }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Add Interest Record</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Enter the actual interest charged by the bank for a month</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Month</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Interest Charged (₹)</label>
              <input type="number" min="1" step="0.01" placeholder="e.g. 57420" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Outstanding Balance (₹) <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 9350000" value={balance} onChange={(e) => setBalance(e.target.value)} style={inputStyle} />
            </div>
            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: "rgba(59,130,246,0.25)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Add Record"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ScheduleClient({
  schedule,
  baselineSchedule,
  actualMonths,
  lastActualMonth,
}: {
  schedule: AmortizationRow[];
  baselineSchedule: AmortizationRow[];
  actualMonths: number;
  lastActualMonth: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"yearly" | "monthly">("monthly");
  const [showAdd, setShowAdd] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const lastActualRowRef = useRef<HTMLTableRowElement>(null);

  // Recompute cumulative across the full schedule (actual + projected reset individually)
  let runCumPrincipal = 0;
  let runCumInterest = 0;
  const scheduleWithCum = schedule.map((row) => {
    runCumPrincipal += row.principal;
    runCumInterest += row.interest;
    return { ...row, cumPrincipal: runCumPrincipal, cumInterest: runCumInterest };
  });

  const chartData = scheduleWithCum
    .filter((_, i) => i % 3 === 0 || i === scheduleWithCum.length - 1)
    .map((row) => {
      const bl = baselineSchedule.find((b) => b.month === row.month);
      return {
        month: monthLabel(row.month),
        principal: Math.round(row.principal),
        interest: Math.round(row.interest),
        balance: Math.round(row.outstandingBalance),
        baseline: bl ? Math.round(bl.outstandingBalance) : undefined,
        cumPrincipal: Math.round(row.cumPrincipal),
        cumInterest: Math.round(row.cumInterest),
      };
    });

  const monthlyBarData = scheduleWithCum.map((row) => ({
    month: monthLabel(row.month),
    principal: Math.round(row.principal),
    interest: Math.round(row.interest),
  }));

  const yearlyData = aggregateByYear(schedule);

  useEffect(() => {
    if (view === "monthly" && lastActualRowRef.current) {
      lastActualRowRef.current.scrollIntoView({ block: "center" });
    }
  }, [view, actualMonths]);

  return (
    <>
    {showAdd && (
      <AddInterestDialog
        lastMonth={lastActualMonth}
        onClose={() => setShowAdd(false)}
        onAdded={() => { setShowAdd(false); setView("monthly"); router.refresh(); }}
      />
    )}
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Amortization</span> Schedule
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="mt-1">
            {actualMonths} actual months + {schedule.length - actualMonths} projected
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          + Add Interest
        </button>
      </motion.div>

      {/* Balance Curve */}
      <motion.div variants={item} className="glass p-6">
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Outstanding Balance Over Time
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [fmtINR(Number(v)), n === "balance" ? "With Prepay" : "No Prepay"]} />
            <Legend formatter={(v) => v === "balance" ? "With Prepayment" : "Without Prepayment"} wrapperStyle={{ color: "#8b8b9e", fontSize: "12px" }} />
            <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={false} opacity={0.6} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Cumulative Stacked Area */}
      <motion.div variants={item} className="glass p-6">
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Cumulative Principal vs Interest
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cpg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cig" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [fmtINR(Number(v)), n]} />
            <Legend wrapperStyle={{ color: "#8b8b9e", fontSize: "12px" }} />
            <Area type="monotone" dataKey="cumPrincipal" stackId="1" stroke="#10b981" fill="url(#cpg)" name="Principal" />
            <Area type="monotone" dataKey="cumInterest" stackId="1" stroke="#f59e0b" fill="url(#cig)" name="Interest" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Monthly Bar */}
      <motion.div variants={item} className="glass p-6">
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Monthly Payment Split
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtL} tick={{ fontSize: 11, fill: "#5a5a6e" }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => [fmtINR(Number(v)), n]} />
            <Legend wrapperStyle={{ color: "#8b8b9e", fontSize: "12px" }} />
            <Bar dataKey="principal" stackId="a" fill="#10b981" name="Principal" radius={[2, 2, 0, 0]} />
            <Bar dataKey="interest" stackId="a" fill="#f59e0b" name="Interest" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} className="glass overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-glass)" }}>
          <h3 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Schedule Table</h3>
          <div className="flex gap-1 rounded-full p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["yearly", "monthly"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all capitalize"
                style={{
                  background: view === v ? "rgba(59,130,246,0.2)" : "transparent",
                  color: view === v ? "#60a5fa" : "var(--text-secondary)",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div ref={tableContainerRef} className="overflow-auto max-h-[500px]">
          {view === "yearly" ? (
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="text-right">Total Paid</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Interest</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((yr) => (
                  <tr key={yr.year}>
                    <td className="font-medium">{yr.year}</td>
                    <td className="text-right">{fmtINR(yr.totalPaid)}</td>
                    <td className="text-right" style={{ color: "#10b981" }}>{fmtINR(yr.principal)}</td>
                    <td className="text-right" style={{ color: "#f59e0b" }}>{fmtINR(yr.interest)}</td>
                    <td className="text-right">{fmtINR(yr.endBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Status</th>
                  <th className="text-right">EMI</th>
                  <th className="text-right">Prepayment</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Interest</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr
                    key={row.month}
                    ref={i === actualMonths - 1 ? lastActualRowRef : undefined}
                    style={{ opacity: row.isActual ? 1 : 0.6 }}
                  >
                    <td>{monthLabel(row.month)}</td>
                    <td>
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          background: row.isActual ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                          color: row.isActual ? "#34d399" : "var(--text-muted)",
                        }}
                      >
                        {row.isActual ? "Actual" : "Projected"}
                      </span>
                    </td>
                    <td className="text-right">{fmtINR(row.emi)}</td>
                    <td className="text-right" style={{ color: row.prepayment > 0 ? "#a78bfa" : undefined }}>
                      {row.prepayment > 0 ? fmtINR(row.prepayment) : "—"}
                    </td>
                    <td className="text-right" style={{ color: "#10b981" }}>{fmtINR(row.principal)}</td>
                    <td className="text-right" style={{ color: "#f59e0b" }}>{fmtINR(row.interest)}</td>
                    <td className="text-right">{fmtINR(row.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
    </>
  );
}

function aggregateByYear(schedule: AmortizationRow[]) {
  const byYear: Record<string, { totalPaid: number; principal: number; interest: number; endBalance: number }> = {};
  for (const row of schedule) {
    const year = row.month.split("-")[0];
    if (!byYear[year]) byYear[year] = { totalPaid: 0, principal: 0, interest: 0, endBalance: 0 };
    byYear[year].totalPaid += row.emi + row.prepayment;
    byYear[year].principal += row.principal;
    byYear[year].interest += row.interest;
    byYear[year].endBalance = row.outstandingBalance;
  }
  return Object.entries(byYear).map(([year, data]) => ({ year, ...data }));
}
