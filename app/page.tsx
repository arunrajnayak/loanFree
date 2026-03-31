import { getLoanSummary, getPayments, getInterestRecords, getDisbursements } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [summary, allPayments, interestRecords, disbursementsList] = await Promise.all([
    getLoanSummary(1),
    getPayments(1),
    getInterestRecords(1),
    getDisbursements(1),
  ]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-secondary)" }}>No loan data found. Run the seed script first.</p>
      </div>
    );
  }

  const { loan, outstandingBalance, totalDisbursed, totalPaidToBank, totalPaidToBuilder, totalInterestPaid, totalPrincipalPaid } = summary;

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
      recentPayments={allPayments.slice(0, 8)}
      interestRecords={interestRecords}
    />
  );
}
