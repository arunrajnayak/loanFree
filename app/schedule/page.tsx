import { getLoanSummary, getInterestRecords, getDisbursements, getPayments } from "@/lib/queries";
import { buildActualSchedule, predictPayoff, addMonths } from "@/lib/calculations";
import { ScheduleClient } from "@/components/charts/schedule-client";
import type { InterestRecord, Disbursement, Payment } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [summary, interestRecords, disbursementsList, allPayments] = await Promise.all([
    getLoanSummary(1),
    getInterestRecords(1),
    getDisbursements(1),
    getPayments(1),
  ]);

  if (!summary) return <p>Loan not found</p>;

  const { loan } = summary;

  // Collect all unique months that have either an interest record or a disbursement
  const interestByMonth = new Map<string, InterestRecord>(
    (interestRecords as InterestRecord[]).map((r) => [r.month, r])
  );
  const disbMonths = new Set<string>(
    (disbursementsList as Disbursement[]).map((d) => d.date.substring(0, 7))
  );
  const allMonths = Array.from(
    new Set([...interestByMonth.keys(), ...disbMonths])
  ).sort();

  // Build balance month-by-month
  let runningBalance = 0;

  const actualData = allMonths.map((m) => {
    const r = interestByMonth.get(m);

    // Add disbursements for this month
    const monthDisbAmount = (disbursementsList as Disbursement[])
      .filter((d) => d.date.substring(0, 7) === m)
      .reduce((s, d) => s + d.amount, 0);
    runningBalance += monthDisbAmount;

    // Add interest charged (0 if no interest record yet)
    const interestCharged = r?.amount ?? 0;
    runningBalance += interestCharged;

    // Subtract all EMI + prepayments made in this month
    const bankPmts = (allPayments as Payment[]).filter(
      (p) => p.type !== "builder" && p.date.substring(0, 7) === m
    );
    const monthPaid = bankPmts.reduce((s, p) => s + p.amount, 0);
    runningBalance -= monthPaid;

    const monthEmi = bankPmts.find((p) => p.type === "emi")?.amount ?? 0;
    const monthPrepay = bankPmts
      .filter((p) => p.type === "prepayment")
      .reduce((s, p) => s + p.amount, 0);
    const principal = Math.max(0, monthPaid - interestCharged);

    return {
      month: m,
      emi: monthEmi,
      principal,
      interest: interestCharged,
      outstandingBalance: runningBalance,
      prepayment: monthPrepay,
      disbursed: monthDisbAmount,
      interestRecordId: r?.id,
      actualOutstandingBalance: r?.outstandingBalance ?? null,
    };
  });

  const actualSchedule = buildActualSchedule(actualData);

  // Baseline: same disbursements + interest, but only subtract EMI (no prepayments)
  let runningBalanceNoPrep = 0;

  const actualDataNoPrep = allMonths.map((m) => {
    const r = interestByMonth.get(m);

    const monthDisbAmount = (disbursementsList as Disbursement[])
      .filter((d) => d.date.substring(0, 7) === m)
      .reduce((s, d) => s + d.amount, 0);
    runningBalanceNoPrep += monthDisbAmount;

    const interestCharged = r?.amount ?? 0;
    runningBalanceNoPrep += interestCharged;

    const emiOnly = (allPayments as Payment[]).find(
      (p) => p.type === "emi" && p.date.substring(0, 7) === m
    )?.amount ?? 0;
    runningBalanceNoPrep -= emiOnly;

    return {
      month: m,
      emi: emiOnly,
      principal: Math.max(0, emiOnly - interestCharged),
      interest: interestCharged,
      outstandingBalance: runningBalanceNoPrep,
      prepayment: 0,
      disbursed: monthDisbAmount,
    };
  });

  const actualScheduleNoPrep = buildActualSchedule(actualDataNoPrep);

  const lastMonth =
    actualSchedule.length > 0
      ? actualSchedule[actualSchedule.length - 1].month
      : loan.startDate.substring(0, 7);

  const nextMonth = addMonths(lastMonth, 1);
  const remainingMonths = loan.tenureYears * 12 - actualSchedule.length;
  const currentBalance = runningBalance;

  const projection = predictPayoff(
    currentBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 12500, extraEmiPerYear: 0, annualHikePct: 5 },
    remainingMonths
  );

  const baseline = predictPayoff(
    runningBalanceNoPrep, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 0, extraEmiPerYear: 0, annualHikePct: 0 },
    remainingMonths
  );

  return (
    <ScheduleClient
      schedule={[...actualSchedule, ...projection.schedule]}
      baselineSchedule={[...actualScheduleNoPrep, ...baseline.schedule]}
      actualMonths={actualSchedule.length}
      lastActualMonth={lastMonth}
    />
  );
}
