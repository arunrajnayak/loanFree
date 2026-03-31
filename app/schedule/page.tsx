import { getLoanSummary, getInterestRecords } from "@/lib/queries";
import { buildActualSchedule, predictPayoff, addMonths } from "@/lib/calculations";
import { ScheduleClient } from "@/components/charts/schedule-client";
import type { InterestRecord } from "@/lib/schema";

export default async function SchedulePage() {
  const [summary, interestRecords] = await Promise.all([
    getLoanSummary(1),
    getInterestRecords(1),
  ]);

  if (!summary) return <p>Loan not found</p>;

  const { loan, outstandingBalance } = summary;

  const actualData = interestRecords.map((r: InterestRecord) => ({
    month: r.month,
    emi: loan.emi,
    principal: loan.emi - r.amount,
    interest: r.amount,
    outstandingBalance: r.outstandingBalance ?? 0,
    prepayment: 0,
  }));

  const actualSchedule = buildActualSchedule(actualData);

  const lastMonth = actualSchedule.length > 0
    ? actualSchedule[actualSchedule.length - 1].month
    : loan.startDate.substring(0, 7);

  const nextMonth = addMonths(lastMonth, 1);
  const remainingMonths = loan.tenureYears * 12 - actualSchedule.length;

  const projection = predictPayoff(
    outstandingBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 12500, extraEmiPerYear: 0, annualHikePct: 5 },
    remainingMonths
  );

  const baseline = predictPayoff(
    outstandingBalance, loan.interestRate, loan.emi, nextMonth,
    { extraMonthly: 0, extraEmiPerYear: 0, annualHikePct: 0 },
    remainingMonths
  );

  return (
    <ScheduleClient
      schedule={[...actualSchedule, ...projection.schedule]}
      baselineSchedule={[...actualSchedule, ...baseline.schedule]}
      actualMonths={actualSchedule.length}
    />
  );
}
