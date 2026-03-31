"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Payment } from "@/lib/schema";

function fmtINR(v: number) {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
  emi: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "EMI" },
  prepayment: { bg: "rgba(16,185,129,0.15)", text: "#34d399", label: "Prepay" },
  builder: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa", label: "Builder" },
};

const filters = [
  { label: "All", value: "" },
  { label: "EMI", value: "emi" },
  { label: "Prepay", value: "prepayment" },
  { label: "Builder", value: "builder" },
];

function AddPaymentDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [type, setType] = useState<"emi" | "prepayment" | "builder">("emi");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid date and amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId: 1, date, type, amount: amt, notes: notes || null }),
      });
      if (!res.ok) throw new Error("Failed to save payment");
      onAdded();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="glass"
          style={{ width: "100%", maxWidth: 440, margin: "16px", padding: "28px", borderRadius: "20px" }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Add Payment
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Record an EMI, prepayment, or builder payment</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Type</label>
              <div className="flex gap-2">
                {(["emi", "prepayment", "builder"] as const).map((t) => {
                  const styles = typeStyles[t];
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: active ? styles.bg : "rgba(255,255,255,0.04)",
                        color: active ? styles.text : "var(--text-muted)",
                        border: `1px solid ${active ? styles.text + "44" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {styles.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 87500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. March EMI"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(59,130,246,0.25)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Add Payment"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function PaymentsClient({
  payments,
  currentType,
}: {
  payments: Payment[];
  currentType?: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  const totals = {
    emi: payments.filter((p) => p.type === "emi").reduce((s, p) => s + p.amount, 0),
    prepayment: payments.filter((p) => p.type === "prepayment").reduce((s, p) => s + p.amount, 0),
    builder: payments.filter((p) => p.type === "builder").reduce((s, p) => s + p.amount, 0),
    all: payments.reduce((s, p) => s + p.amount, 0),
  };

  return (
    <>
    {showAdd && (
      <AddPaymentDialog
        onClose={() => setShowAdd(false)}
        onAdded={() => router.refresh()}
      />
    )}
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Payment</span> History
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="mt-1">
            {payments.length} payments &middot; Total: {fmtINR(totals.all)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
        >
          + Add Payment
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "EMI Payments", value: totals.emi, accent: "#3b82f6" },
          { label: "Prepayments", value: totals.prepayment, accent: "#10b981" },
          { label: "Builder Payments", value: totals.builder, accent: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} className="glass p-5">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </p>
            <p className="mt-2 text-xl font-bold" style={{ color: s.accent }}>
              {fmtINR(s.value)}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filters + Table */}
      <motion.div variants={item} className="glass overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b" style={{ borderColor: "var(--border-glass)" }}>
          {filters.map((f) => {
            const isActive = (currentType || "") === f.value;
            return (
              <button
                key={f.value}
                onClick={() => router.push(f.value ? `/payments?type=${f.value}` : "/payments")}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: isActive ? "rgba(59,130,246,0.2)" : "transparent",
                  color: isActive ? "#60a5fa" : "var(--text-secondary)",
                  border: `1px solid ${isActive ? "rgba(59,130,246,0.3)" : "transparent"}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Notes</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const style = typeStyles[p.type] || typeStyles.emi;
                return (
                  <tr key={p.id}>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }} className="text-sm">
                      {p.notes || "—"}
                    </td>
                    <td className="text-right font-medium">{fmtINR(p.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
    </>
  );
}
