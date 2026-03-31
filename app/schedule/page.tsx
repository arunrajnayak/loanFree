import { getLoanSummary, getInterestRecords } from "@/lib/queries";
import { buildActualSchedule, predictPayoff, addMonths } from "@/lib/calculations";
import { ScheduleClient } from "@/components/charts/schedule-client";

export default function SchedulePage() {
  const summary = getLoanSummary(1);
  if (!summary) return <p>Loan not found</p>;

  const { loan, outstandingBalance } = summary;
  const interestRecords = getInterestRecords(1);

  const actualData = interestRecords.map((r) => ({
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
