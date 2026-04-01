import { getLoanSummary, getInterestRecords, getDisbursements, getPayments } from "@/lib/queries";
import { buildActualSchedule, predictPayoff, addMonths } from "@/lib/calculations";
import { ScheduleClient } from "@/components/charts/schedule-client";
import type { InterestRecord, Disbursement, Payment } from "@/lib/schema";

export default async function SchedulePage() {
  const [summary, interestRecords, disbursementsList, allPayments] = await Promise.all([
    getLoanSummary(1),
    getInterestRecords(1),
    getDisbursements(1),
    getPayments(1),
  ]);

  if (!summary) return <p>Loan not found</p>;

  const { loan } = summary;

  // Build balance month-by-month from actual disbursements + interest - bank payments
  // This is the correct calculation: no assumption about full 1.1Cr sanctioned amount
  let runningBalance = 0;

  const actualData = interestRecords.map((r: InterestRecord) => {
    const m = r.month; // "YYYY-MM"

    // Add disbursements that fall in this month
    const monthDisb = (disbursementsList as Disbursement[])
      .filter((d) => d.date.substring(0, 7) === m)
      .reduce((s, d) => s + d.amount, 0);
    runningBalance += monthDisb;

    // Add interest charged by bank
    runningBalance += r.amount;

    // Subtract all EMI + prepayments made in this month
    const bankPmts = (allPayments as Payment[]).filter(
      (p) => p.type !== "builder" && p.date.substring(0, 7) === m
    );
    const monthPaid = bankPmts.reduce((s, p) => s + p.amount, 0);
    runningBalance -= monthPaid;

    // Use actual paid amount; 0 if no payment this month (e.g. pre-EMI construction phase)
    const monthEmi = bankPmts.find((p) => p.type === "emi")?.amount ?? 0;
    const monthPrepay = bankPmts
      .filter((p) => p.type === "prepayment")
      .reduce((s, p) => s + p.amount, 0);
    // Principal = total bank payment minus interest charged (can be 0 or negative if pre-EMI)
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

  const lastMonth =
    actualSchedule.length > 0
      ? actualSchedule[actualSchedule.length - 1].month
      : loan.startDate.substring(0, 7);

  const nextMonth = addMonths(lastMonth, 1);
  const remainingMonths = loan.tenureYears * 12 - actualSchedule.length;
  // Use the actual running balance (not the seeded/summary value) for projection
  const currentBalance = runningBalance;

  const projection = predictPayoff(
    currentBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 12500, extraEmiPerYear: 0, annualHikePct: 5 },
    remainingMonths
  );

  const baseline = predictPayoff(
    currentBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 0, extraEmiPerYear: 0, annualHikePct: 0 },
    remainingMonths
  );

  return (
    <ScheduleClient
      schedule={[...actualSchedule, ...projection.schedule]}
      baselineSchedule={[...actualSchedule, ...baseline.schedule]}
      actualMonths={actualSchedule.length}
      lastActualMonth={lastMonth}
    />
  );
}
