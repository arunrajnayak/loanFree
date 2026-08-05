"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Download, ArrowUpDown, X } from "lucide-react";
import type { Payment, Disbursement } from "@/lib/schema";

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
  emi:        { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", label: "EMI" },
  prepayment: { bg: "rgba(16,185,129,0.15)",  text: "#34d399", label: "Prepay" },
  builder:    { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa", label: "Builder" },
};

const filters = [
  { label: "All",           value: "" },
  { label: "EMI",           value: "emi" },
  { label: "Prepay",        value: "prepayment" },
  { label: "Builder",       value: "builder" },
  { label: "Disbursements", value: "disbursements" },
];

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

// ── Payment Dialog ────────────────────────────────────────────────────────────
function PaymentDialog({
  payment, onClose, onSaved,
}: { payment?: Payment; onClose: () => void; onSaved: () => void }) {
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
      const res = await fetch("/api/payments", {
        method: payment ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payment?.id,
          loanId: payment?.loanId || 1,
          date, type, amount: amt,
          notes: notes || null,
          principalComponent: pComp,
          interestComponent: iComp,
        }),
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

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <motion.div key="dialog" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()} className="glass"
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
                    <button key={t} type="button" onClick={() => setType(t)}
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Total Amount (₹)</label>
              <input type="number" min="1" step="1" placeholder="e.g. 87500" value={amount}
                onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
            </div>

            {type === "emi" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Principal (₹)</label>
                  <input type="number" min="0" step="1" placeholder="Principal" value={principalComponent}
                    onChange={(e) => setPrincipalComponent(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Interest (₹)</label>
                  <input type="number" min="0" step="1" placeholder="Interest" value={interestComponent}
                    onChange={(e) => setInterestComponent(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <input type="text" placeholder="e.g. March EMI" value={notes}
                onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </div>

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(59,130,246,0.25)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : payment ? "Save Changes" : "Add Payment"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Disbursement Dialog ───────────────────────────────────────────────────────
function DisbursementDialog({
  disbursement, onClose, onSaved,
}: { disbursement?: Disbursement; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(disbursement?.date || today);
  const [amount, setAmount] = useState(disbursement?.amount ? String(disbursement.amount) : "");
  const [description, setDescription] = useState(disbursement?.description || "");
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
      const res = await fetch("/api/disbursements", {
        method: disbursement ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: disbursement?.id,
          loanId: disbursement?.loanId || 1,
          date,
          amount: amt,
          description: description || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save disbursement");
      onSaved();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <motion.div key="dialog" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()} className="glass"
          style={{ width: "100%", maxWidth: 440, margin: "16px", padding: "28px", borderRadius: "20px" }}
        >
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-bold font-sans" style={{ color: "var(--text-primary)" }}>
              {disbursement ? "Edit Disbursement" : "Add Disbursement"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Record a bank tranche disbursed to the builder
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Amount (₹)</label>
              <input type="number" min="1" step="1" placeholder="e.g. 2500000" value={amount}
                onChange={(e) => setAmount(e.target.value)} style={inputStyle} required />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Description <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <input type="text" placeholder="e.g. Tranche 1 — Foundation complete"
                value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
            </div>

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : disbursement ? "Save Changes" : "Add Disbursement"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Generic Delete Confirm ────────────────────────────────────────────────────
function DeleteConfirmDialog({
  label, detail, apiUrl, onClose, onDeleted,
}: { label: string; detail: string; apiUrl: string; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(apiUrl, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted();
      onClose();
    } catch {
      setError("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <motion.div key="dialog" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()} className="glass"
          style={{ width: "100%", maxWidth: 400, margin: "16px", padding: "28px", borderRadius: "20px" }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--accent-red)" }}>Delete {label}?</h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {detail} This action cannot be undone.
          </p>
          {error && <p className="text-xs mb-4" style={{ color: "#f87171" }}>{error}</p>}
          <div className="flex gap-3">
            <button type="button" disabled={deleting} onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Cancel
            </button>
            <button type="button" disabled={deleting} onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", opacity: deleting ? 0.6 : 1 }}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────
export function PaymentsClient({
  payments, disbursements, currentType,
}: {
  payments: Payment[];
  disbursements: Disbursement[];
  currentType?: string;
}) {
  const router = useRouter();
  const isDisbTab = currentType === "disbursements";

  const [showAdd, setShowAdd] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);

  const [showAddDisb, setShowAddDisb] = useState(false);
  const [editDisb, setEditDisb] = useState<Disbursement | null>(null);
  const [deleteDisb, setDeleteDisb] = useState<Disbursement | null>(null);

  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [disbSortField, setDisbSortField] = useState<"date" | "amount">("date");
  const [disbSortAsc, setDisbSortAsc] = useState(false);

  const totals = useMemo(() => ({
    emi:        payments.filter((p) => p.type === "emi").reduce((s, p) => s + p.amount, 0),
    prepayment: payments.filter((p) => p.type === "prepayment").reduce((s, p) => s + p.amount, 0),
    builder:    payments.filter((p) => p.type === "builder").reduce((s, p) => s + p.amount, 0),
    all:        payments.reduce((s, p) => s + p.amount, 0),
    principal:  payments.reduce((s, p) => s + (p.principalComponent || 0), 0),
    interest:   payments.reduce((s, p) => s + (p.interestComponent || 0), 0),
  }), [payments]);

  const disbTotal = useMemo(() =>
    disbursements.reduce((s, d) => s + d.amount, 0), [disbursements]);

  const sortedPayments = useMemo(() => {
    const list = [...payments];
    list.sort((a, b) => {
      const valA = sortField === "date" ? new Date(a.date).getTime() : a.amount;
      const valB = sortField === "date" ? new Date(b.date).getTime() : b.amount;
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [payments, sortField, sortAsc]);

  const sortedDisb = useMemo(() => {
    const list = [...disbursements];
    list.sort((a, b) => {
      const valA = disbSortField === "date" ? new Date(a.date).getTime() : a.amount;
      const valB = disbSortField === "date" ? new Date(b.date).getTime() : b.amount;
      return disbSortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [disbursements, disbSortField, disbSortAsc]);

  function handleSort(field: "date" | "amount") {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(field === "amount"); }
  }

  function handleDisbSort(field: "date" | "amount") {
    if (disbSortField === field) setDisbSortAsc(!disbSortAsc);
    else { setDisbSortField(field); setDisbSortAsc(field === "amount"); }
  }

  function exportCSV() {
    const headers = ["Date", "Type", "Notes", "Principal Component", "Interest Component", "Total Amount"];
    const rows = sortedPayments.map((p) => [
      p.date, p.type.toUpperCase(), p.notes || "",
      p.principalComponent || "", p.interestComponent || "", p.amount,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `loanfree_payments_${currentType || "all"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportDisbCSV() {
    const headers = ["Date", "Amount", "Description"];
    const rows = sortedDisb.map((d) => [d.date, d.amount, d.description || ""]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `loanfree_disbursements_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleRefresh = () => router.refresh();

  return (
    <>
      {/* Payment dialogs */}
      {showAdd && <PaymentDialog onClose={() => setShowAdd(false)} onSaved={handleRefresh} />}
      {editPayment && <PaymentDialog payment={editPayment} onClose={() => setEditPayment(null)} onSaved={handleRefresh} />}
      {deletePayment && (
        <DeleteConfirmDialog
          label="Payment"
          detail={`Are you sure you want to delete the ${deletePayment.type.toUpperCase()} payment of ${fmtINR(deletePayment.amount)} made on ${new Date(deletePayment.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}?`}
          apiUrl={`/api/payments?id=${deletePayment.id}`}
          onClose={() => setDeletePayment(null)}
          onDeleted={handleRefresh}
        />
      )}

      {/* Disbursement dialogs */}
      {showAddDisb && <DisbursementDialog onClose={() => setShowAddDisb(false)} onSaved={handleRefresh} />}
      {editDisb && <DisbursementDialog disbursement={editDisb} onClose={() => setEditDisb(null)} onSaved={handleRefresh} />}
      {deleteDisb && (
        <DeleteConfirmDialog
          label="Disbursement"
          detail={`Are you sure you want to delete the ${fmtINR(deleteDisb.amount)} tranche from ${new Date(deleteDisb.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}?`}
          apiUrl={`/api/disbursements?id=${deleteDisb.id}`}
          onClose={() => setDeleteDisb(null)}
          onDeleted={handleRefresh}
        />
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pt-8">

        {/* Header */}
        <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">{isDisbTab ? "Disbursement" : "Payment"}</span> History
            </h1>
            <p style={{ color: "var(--text-secondary)" }} className="mt-1">
              {isDisbTab
                ? `${disbursements.length} tranches · Total: ${fmtINR(disbTotal)}`
                : `${payments.length} payments · Total: ${fmtINR(totals.all)}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={isDisbTab ? exportDisbCSV : exportCSV}
              disabled={isDisbTab ? sortedDisb.length === 0 : sortedPayments.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Download size={15} /> Export CSV
            </button>
            {isDisbTab ? (
              <button
                onClick={() => setShowAddDisb(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                + Add Disbursement
              </button>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
              >
                + Add Payment
              </button>
            )}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
          {isDisbTab ? (
            <>
              <div className="glass p-5 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Total Disbursed
                </p>
                <p className="mt-2 text-xl font-bold" style={{ color: "#4ade80" }}>{fmtINR(disbTotal)}</p>
              </div>
              <div className="glass p-5">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Tranches
                </p>
                <p className="mt-2 text-xl font-bold" style={{ color: "#4ade80" }}>{disbursements.length}</p>
              </div>
            </>
          ) : (
            [
              { label: "EMI Payments",    value: totals.emi,        accent: "#3b82f6" },
              { label: "Prepayments",     value: totals.prepayment, accent: "#10b981" },
              { label: "Builder Payments",value: totals.builder,    accent: "#8b5cf6" },
            ].map((s) => (
              <div key={s.label} className="glass p-5">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="mt-2 text-xl font-bold" style={{ color: s.accent }}>{fmtINR(s.value)}</p>
              </div>
            ))
          )}
        </motion.div>

        {/* Table */}
        <motion.div variants={item} className="glass overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 p-4 border-b overflow-x-auto" style={{ borderColor: "var(--border-glass)" }}>
            {filters.map((f) => {
              const isActive = (currentType || "") === f.value;
              const isDisbFilter = f.value === "disbursements";
              return (
                <button
                  key={f.value}
                  onClick={() => router.push(f.value ? `/payments?type=${f.value}` : "/payments")}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: isActive
                      ? isDisbFilter ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.2)"
                      : "transparent",
                    color: isActive
                      ? isDisbFilter ? "#4ade80" : "#60a5fa"
                      : "var(--text-secondary)",
                    border: `1px solid ${isActive
                      ? isDisbFilter ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"
                      : "transparent"}`,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {isDisbTab ? (
            /* ── Disbursements Table ── */
            <div className="overflow-auto max-h-[600px]">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleDisbSort("date")} className="cursor-pointer hover:text-white transition-colors select-none">
                      <div className="flex items-center gap-1">
                        Date <ArrowUpDown size={12} className={disbSortField === "date" ? "text-green-400" : "opacity-50"} />
                      </div>
                    </th>
                    <th>Description</th>
                    <th onClick={() => handleDisbSort("amount")} className="text-right cursor-pointer hover:text-white transition-colors select-none">
                      <div className="flex items-center justify-end gap-1">
                        Amount <ArrowUpDown size={12} className={disbSortField === "amount" ? "text-green-400" : "opacity-50"} />
                      </div>
                    </th>
                    <th className="text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisb.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                        No disbursements yet. Add your first bank tranche.
                      </td>
                    </tr>
                  ) : sortedDisb.map((d, idx) => (
                    <tr key={d.id}>
                      <td style={{ color: "var(--text-secondary)" }} className="whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ color: "var(--text-muted)" }} className="text-sm max-w-[280px] truncate">
                        {d.description ? (
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-70 flex-none" />
                              {d.description}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-600">Tranche {idx + 1}</span>
                        )}
                      </td>
                      <td className="text-right font-semibold" style={{ color: "#4ade80" }}>{fmtINR(d.amount)}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditDisb(d)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-green-400 transition-all" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteDisb(d)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sortedDisb.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "rgba(255,255,255,0.015)" }}>
                      <td colSpan={2} className="font-semibold text-xs uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>
                        Total:
                      </td>
                      <td className="text-right font-bold text-sm text-emerald-400/90">{fmtINR(disbTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            /* ── Payments Table ── */
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
                  {sortedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                        No payments found.
                      </td>
                    </tr>
                  ) : sortedPayments.map((p) => {
                    const style = typeStyles[p.type] || typeStyles.emi;
                    return (
                      <tr key={p.id}>
                        <td style={{ color: "var(--text-secondary)" }} className="whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td>
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ background: style.bg, color: style.text }}>
                            {style.label}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)" }} className="text-sm max-w-[200px] truncate">{p.notes || "—"}</td>
                        <td className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                          {p.principalComponent ? fmtINR(p.principalComponent) : "—"}
                        </td>
                        <td className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                          {p.interestComponent ? fmtINR(p.interestComponent) : "—"}
                        </td>
                        <td className="text-right font-semibold">{fmtINR(p.amount)}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setEditPayment(p)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-blue-400 transition-all" title="Edit payment">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeletePayment(p)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all" title="Delete payment">
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
                      <td className="text-right font-bold text-sm text-emerald-400/90">{fmtINR(totals.all)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
