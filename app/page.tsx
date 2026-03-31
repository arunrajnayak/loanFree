import { getLoanSummary, getPayments, getInterestRecords, getDisbursements } from "@/lib/queries";
import { formatINR, formatLakhs, formatPercent } from "@/lib/format";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  const summary = getLoanSummary(1);
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-secondary)" }}>No loan data found. Run the seed script first.</p>
      </div>
    );
  }

  const { loan, outstandingBalance, totalDisbursed, totalPaidToBank, totalPaidToBuilder, totalInterestPaid, totalPrincipalPaid } = summary;
  const recentPayments = getPayments(1).slice(0, 8);
  const interestRecords = getInterestRecords(1);
  const disbursementsList = getDisbursements(1);

  return (
    <DashboardClient
      loan={loan}
      stats={{
        outstandingBalance,
        totalDisbursed,
        totalPaidToBank,
        totalPaidToBuilder,
        totalInterestPaid,
        totalPrincipalPaid,
        disbursementCount: disbursementsList.length,
      }}
      recentPayments={recentPayments}
      interestRecords={interestRecords}
    />
  );
}
