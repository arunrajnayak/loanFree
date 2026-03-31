import { NextRequest, NextResponse } from "next/server";
import { getLoanSummary, getScenarios } from "@/lib/queries";
import { predictPayoff, type PredictionConfig } from "@/lib/calculations";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { loanId, config } = body as {
    loanId: number;
    config: PredictionConfig & { interestRate?: number };
  };

  const summary = getLoanSummary(loanId);
  if (!summary) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const { loan, outstandingBalance } = summary;
  const rate = config.interestRate ?? loan.interestRate;

  // Determine start month (next month from today)
  const now = new Date();
  const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;

  const remainingTenureMonths =
    loan.tenureYears * 12 -
    monthsDiff(loan.startDate, startMonth);

  const result = predictPayoff(
    outstandingBalance,
    rate,
    loan.emi,
    startMonth,
    config,
    remainingTenureMonths
  );

  return NextResponse.json({
    ...result,
    currentBalance: outstandingBalance,
    interestRate: rate,
    baseEmi: loan.emi,
  });
}

function monthsDiff(startDate: string, endMonth: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endMonth.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm);
}
