"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Download, ArrowUpDown, X } from "lucide-react";
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

function PaymentDialog({
  payment,
  onClose,
  onSaved,
}: {
  payment?: Payment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(payment?.date || today);
  const [type, setType] = useState<"emi" | "prepayment" | "builder">(payment?.type || "emi");
  const [amount, setAmount] = useState(payment?.amount ? String(payment.amount) : "");
  const [notes, setNotes] = useState(payment?.notes || "");
  const [principalComponent, setPrincipalComponent] = useState(
    payment?.principalComponent ? String(payment.principalComponent) : ""
  );
  const [interestComponent, setInterestComponent] = useState(
    payment?.interestComponent ? String(payment.interestComponent) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid date and amount.");
      return;
    }

    const pComp = principalComponent ? parseFloat(principalComponent) : null;
    const iComp = interestComponent ? parseFloat(interestComponent) : null;

    if (pComp !== null && iComp !== null && Math.abs((pComp + iComp) - amt) > 1) {
      setError("Principal and Interest components must add up to the Total Amount.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const isEdit = !!payment;
      const url = "/api/payments";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        id: payment?.id,
        loanId: payment?.loanId || 1,
        date,
        type,
        amount: amt,
        notes: notes || null,
        principalComponent: pComp,
        interestComponent: iComp,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save payment");
      onSaved();
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
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-bold font-sans" style={{ color: "var(--text-primary)" }}>
              {payment ? "Edit Payment" : "Add Payment"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Record or modify EMI, prepayment, or builder payment details
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Date
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Type
              </label>
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Total Amount (₹)
              </label>
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

            {type === "emi" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Principal component (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Principal"
                    value={principalComponent}
                    onChange={(e) => setPrincipalComponent(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Interest component (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Interest"
                    value={interestComponent}
                    onChange={(e) => setInterestComponent(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
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
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(59,130,246,0.25)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59,130,246,0.3)",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : payment ? "Save Changes" : "Add Payment"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeleteConfirmDialog({
  payment,
  onClose,
  onDeleted,
}: {
  payment: Payment;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/payments?id=${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete payment");
      onDeleted();
      onClose();
    } catch {
      setError("Failed to delete payment. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          style={{ width: "100%", maxWidth: 400, margin: "16px", padding: "28px", borderRadius: "20px" }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--accent-red)" }}>
            Delete Payment?
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Are you sure you want to delete the{" "}
            <span className="font-semibold text-white">{payment.type.toUpperCase()}</span> payment of{" "}
            <span className="font-semibold text-white">{fmtINR(payment.amount)}</span> made on{" "}
            <span className="font-semibold text-white">
              {new Date(payment.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            ? This action cannot be undone.
          </p>

          {error && <p className="text-xs mb-4" style={{ color: "#f87171" }}>{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-secondary)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
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
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false); // Default descending for dates

  const totals = useMemo(() => {
    return {
      emi: payments.filter((p) => p.type === "emi").reduce((s, p) => s + p.amount, 0),
      prepayment: payments.filter((p) => p.type === "prepayment").reduce((s, p) => s + p.amount, 0),
      builder: payments.filter((p) => p.type === "builder").reduce((s, p) => s + p.amount, 0),
      all: payments.reduce((s, p) => s + p.amount, 0),
      principal: payments.reduce((s, p) => s + (p.principalComponent || 0), 0),
      interest: payments.reduce((s, p) => s + (p.interestComponent || 0), 0),
    };
  }, [payments]);

  // Handle local client-side sorting of payments
  const sortedPayments = useMemo(() => {
    const list = [...payments];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "date") {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [payments, sortField, sortAsc]);

  function handleSort(field: "date" | "amount") {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "amount"); // default asc for amount, desc for date
    }
  }

  function exportCSV() {
    const headers = ["Date", "Type", "Notes", "Principal Component", "Interest Component", "Total Amount"];
    const rows = sortedPayments.map((p) => [
      p.date,
      p.type.toUpperCase(),
      p.notes || "",
      p.principalComponent || "",
      p.interestComponent || "",
      p.amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `loanfree_payments_${currentType || "all"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      {showAdd && (
        <PaymentDialog
          onClose={() => setShowAdd(false)}
          onSaved={handleRefresh}
        />
      )}

      {editPayment && (
        <PaymentDialog
          payment={editPayment}
          onClose={() => setEditPayment(null)}
          onSaved={handleRefresh}
        />
      )}

      {deletePayment && (
        <DeleteConfirmDialog
          payment={deletePayment}
          onClose={() => setDeletePayment(null)}
          onDeleted={handleRefresh}
        />
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">
        <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">Payment</span> History
            </h1>
            <p style={{ color: "var(--text-secondary)" }} className="mt-1">
              {payments.length} payments &middot; Total: {fmtINR(totals.all)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCSV}
              disabled={sortedPayments.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              + Add Payment
            </button>
          </div>
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
                  <th onClick={() => handleSort("date")} className="cursor-pointer hover:text-white transition-colors select-none">
                    <div className="flex items-center gap-1">
                      Date <ArrowUpDown size={12} className={sortField === "date" ? "text-blue-400" : "opacity-50"} />
                    </div>
                  </th>
                  <th>Type</th>
                  <th>Notes</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Interest</th>
                  <th onClick={() => handleSort("amount")} className="text-right cursor-pointer hover:text-white transition-colors select-none">
                    <div className="flex items-center justify-end gap-1">
                      Amount <ArrowUpDown size={12} className={sortField === "amount" ? "text-blue-400" : "opacity-50"} />
                    </div>
                  </th>
                  <th className="text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p) => {
                  const style = typeStyles[p.type] || typeStyles.emi;
                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-secondary)" }} className="whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <span
                          className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }} className="text-sm max-w-[200px] truncate">
                        {p.notes || "—"}
                      </td>
                      <td className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {p.principalComponent ? fmtINR(p.principalComponent) : "—"}
                      </td>
                      <td className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                        {p.interestComponent ? fmtINR(p.interestComponent) : "—"}
                      </td>
                      <td className="text-right font-semibold">{fmtINR(p.amount)}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditPayment(p)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-blue-400 transition-all"
                            title="Edit payment"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletePayment(p)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                            title="Delete payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {sortedPayments.length > 0 && (
                <tfoot>
                  <tr style={{ background: "rgba(255,255,255,0.015)" }}>
                    <td colSpan={3} className="font-semibold text-xs uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>
                      Running Total:
                    </td>
                    <td className="text-right font-bold text-sm text-blue-400/90">
                      {totals.principal > 0 ? fmtINR(totals.principal) : "—"}
                    </td>
                    <td className="text-right font-bold text-sm text-amber-500/90">
                      {totals.interest > 0 ? fmtINR(totals.interest) : "—"}
                    </td>
                    <td className="text-right font-bold text-sm text-emerald-400/90">
                      {fmtINR(totals.all)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
