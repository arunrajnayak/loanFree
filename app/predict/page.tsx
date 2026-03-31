import { getLoanSummary, getScenarios, getInterestRecords } from "@/lib/queries";
import { addMonths } from "@/lib/calculations";
import { PredictorPage } from "@/components/predictor/predictor-page";

export default function PredictPage() {
  const summary = getLoanSummary(1);
  if (!summary) return <p>Loan not found</p>;

  const { loan, outstandingBalance } = summary;
  const interestRecords = getInterestRecords(1);

  const lastMonth = interestRecords.length > 0
    ? interestRecords[interestRecords.length - 1].month
    : loan.startDate.substring(0, 7);

  const nextMonth = addMonths(lastMonth, 1);
  const remainingMonths = loan.tenureYears * 12 - interestRecords.length;

  return (
    <PredictorPage
      loan={loan}
      currentBalance={outstandingBalance}
      startMonth={nextMonth}
      remainingMonths={remainingMonths}
    />
  );
}
