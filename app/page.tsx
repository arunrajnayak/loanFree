import { getLoanSummary, getPayments, getInterestRecords, getDisbursements } from "@/lib/queries";
import { buildActualSchedule, predictPayoff, addMonths } from "@/lib/calculations";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { InterestRecord, Disbursement, Payment } from "@/lib/schema";

export const dynamic = "force-dynamic";

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

  // Build actual schedule month-by-month
  let runningBalance = 0;
  const actualData = interestRecords.map((r: InterestRecord) => {
    const m = r.month;
    const monthDisb = (disbursementsList as Disbursement[])
      .filter((d) => d.date.substring(0, 7) === m)
      .reduce((s, d) => s + d.amount, 0);
    runningBalance += monthDisb;
    runningBalance += r.amount;

    const bankPmts = (allPayments as Payment[]).filter(
      (p) => p.type !== "builder" && p.date.substring(0, 7) === m
    );
    const monthPaid = bankPmts.reduce((s, p) => s + p.amount, 0);
    runningBalance -= monthPaid;

    const monthEmi = bankPmts.find((p) => p.type === "emi")?.amount ?? 0;
    const monthPrepay = bankPmts
      .filter((p) => p.type === "prepayment")
      .reduce((s, p) => s + p.amount, 0);
    const principal = Math.max(0, monthPaid - r.amount);

    return {
      month: m,
      emi: monthEmi,
      principal,
      interest: r.amount,
      outstandingBalance: runningBalance,
      prepayment: monthPrepay,
    };
  });

  const actualSchedule = buildActualSchedule(actualData);

  // Build baseline schedule (no prepayments)
  let runningBalanceNoPrep = 0;
  const actualDataNoPrep = (interestRecords as InterestRecord[]).map((r: InterestRecord) => {
    const m = r.month;
    const monthDisb = (disbursementsList as Disbursement[])
      .filter((d) => d.date.substring(0, 7) === m)
      .reduce((s, d) => s + d.amount, 0);
    runningBalanceNoPrep += monthDisb;
    runningBalanceNoPrep += r.amount;

    const emiOnly = (allPayments as Payment[]).find(
      (p) => p.type === "emi" && p.date.substring(0, 7) === m
    )?.amount ?? 0;
    runningBalanceNoPrep -= emiOnly;

    return {
      month: m,
      emi: emiOnly,
      principal: Math.max(0, emiOnly - r.amount),
      interest: r.amount,
      outstandingBalance: runningBalanceNoPrep,
      prepayment: 0,
    };
  });

  const actualScheduleNoPrep = buildActualSchedule(actualDataNoPrep);

  const lastMonth =
    actualSchedule.length > 0
      ? actualSchedule[actualSchedule.length - 1].month
      : loan.startDate.substring(0, 7);

  const nextMonth = addMonths(lastMonth, 1);
  const remainingMonths = loan.tenureYears * 12 - actualSchedule.length;

  // Project future with prepayment config (excel default: extraMonthly 12500, hike 5%)
  const projection = predictPayoff(
    runningBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 12500, extraEmiPerYear: 0, annualHikePct: 5 },
    remainingMonths
  );

  // Project baseline (no prepayments)
  const baseline = predictPayoff(
    runningBalanceNoPrep, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 0, extraEmiPerYear: 0, annualHikePct: 0 },
    remainingMonths
  );

  const fullSchedule = [...actualSchedule, ...projection.schedule];
  const fullBaselineSchedule = [...actualScheduleNoPrep, ...baseline.schedule];

  // Map to dashboard balance trend chart data (sampled to keep it responsive)
  const balanceTrendData = fullSchedule
    .filter((_, i) => i % 3 === 0 || i === fullSchedule.length - 1)
    .map((row) => {
      const bl = fullBaselineSchedule.find((b) => b.month === row.month);
      return {
        month: row.month,
        actualBalance: Math.round(row.outstandingBalance),
        baselineBalance: bl ? Math.round(bl.outstandingBalance) : undefined,
      };
    });

  const totalMonthsSaved = Math.max(0, baseline.schedule.length - projection.schedule.length);
  const emiPaymentsCount = (allPayments as Payment[]).filter((p) => p.type === "emi").length;

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
        totalMonthsSaved,
        emiPaymentsCount,
      }}
      recentPayments={allPayments.slice(0, 8)}
      interestRecords={interestRecords}
      balanceTrendData={balanceTrendData}
    />
  );
}
