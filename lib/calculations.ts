export interface AmortizationRow {
  month: string; // "2024-03"
  emi: number;
  principal: number;
  interest: number;
  outstandingBalance: number;
  prepayment: number;
  isActual: boolean; // true = from bank data, false = projected
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface PredictionConfig {
  extraMonthly: number;
  extraEmiPerYear: number;
  annualHikePct: number;
  lumpSumAmount?: number;
  lumpSumMonth?: string;
}

export interface PredictionResult {
  schedule: AmortizationRow[];
  totalInterest: number;
  totalPaid: number;
  payoffDate: string;
  tenureMonths: number;
  interestSaved: number;
  tenureReduced: number; // months saved vs original
}

export interface LoanSummary {
  outstandingBalance: number;
  totalDisbursed: number;
  totalPaidToBank: number;
  totalPaidToBuilder: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  emiAmount: number;
  interestRate: number;
  tenureYears: number;
  originalTenureMonths: number;
}

// Standard EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + r, tenureMonths);
  return (principal * r * factor) / (factor - 1);
}

// Generate amortization schedule without any prepayment (baseline)
export function generateBaselineSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startMonth: string, // "2024-03"
  emi?: number
): AmortizationRow[] {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyEmi = emi ?? calculateEMI(principal, annualRate, tenureMonths);
  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let cumPrincipal = 0;
  let cumInterest = 0;

  let [year, month] = startMonth.split("-").map(Number);

  for (let i = 0; i < tenureMonths && balance > 0; i++) {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyEmi - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    cumPrincipal += principalPaid;
    cumInterest += interest;

    schedule.push({
      month: monthStr,
      emi: monthlyEmi,
      principal: principalPaid,
      interest,
      outstandingBalance: balance,
      prepayment: 0,
      isActual: false,
      cumulativePrincipal: cumPrincipal,
      cumulativeInterest: cumInterest,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return schedule;
}

// Build schedule from actual payment/interest data + projected future
export function buildActualSchedule(
  actualData: {
    month: string;
    emi: number;
    principal: number;
    interest: number;
    outstandingBalance: number;
    prepayment: number;
  }[]
): AmortizationRow[] {
  let cumPrincipal = 0;
  let cumInterest = 0;

  return actualData.map((row) => {
    cumPrincipal += row.principal;
    cumInterest += row.interest;
    return {
      ...row,
      isActual: true,
      cumulativePrincipal: cumPrincipal,
      cumulativeInterest: cumInterest,
    };
  });
}

// Project future schedule from current state with prepayment config
export function predictPayoff(
  currentBalance: number,
  annualRate: number,
  baseEmi: number,
  startMonth: string, // first projected month
  config: PredictionConfig,
  originalTenureMonths: number
): PredictionResult {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: AmortizationRow[] = [];
  let balance = currentBalance;
  let currentEmi = baseEmi;
  let cumPrincipal = 0;
  let cumInterest = 0;
  let [year, month] = startMonth.split("-").map(Number);
  let monthCount = 0;
  const startYear = year;
  const startMonthNum = month;

  const MAX_MONTHS = 600; // 50 years safety cap

  while (balance > 0 && monthCount < MAX_MONTHS) {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const monthsSinceStart = (year - startYear) * 12 + (month - startMonthNum);

    // Apply annual hike at the start of each new year (every 12 months)
    if (config.annualHikePct > 0 && monthsSinceStart > 0 && monthsSinceStart % 12 === 0) {
      currentEmi = currentEmi * (1 + config.annualHikePct / 100);
    }

    const interest = balance * monthlyRate;
    const emiForMonth = Math.min(currentEmi, balance + interest);
    const principalPaid = emiForMonth - interest;

    let prepayment = config.extraMonthly;

    // Extra EMIs spread across the year
    if (config.extraEmiPerYear > 0) {
      const interval = Math.floor(12 / config.extraEmiPerYear);
      if (interval > 0 && monthsSinceStart % interval === 0 && monthsSinceStart > 0) {
        prepayment += currentEmi;
      }
    }

    // One-time lump sum
    if (
      config.lumpSumAmount &&
      config.lumpSumMonth &&
      monthStr === config.lumpSumMonth
    ) {
      prepayment += config.lumpSumAmount;
    }

    // Cap prepayment so balance doesn't go negative
    prepayment = Math.min(prepayment, Math.max(0, balance - principalPaid));

    balance = Math.max(0, balance - principalPaid - prepayment);
    cumPrincipal += principalPaid + prepayment;
    cumInterest += interest;

    schedule.push({
      month: monthStr,
      emi: emiForMonth,
      principal: principalPaid + prepayment,
      interest,
      outstandingBalance: balance,
      prepayment,
      isActual: false,
      cumulativePrincipal: cumPrincipal,
      cumulativeInterest: cumInterest,
    });

    monthCount++;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  const totalInterest = cumInterest;
  const totalPaid = cumPrincipal + cumInterest;
  const payoffDate =
    schedule.length > 0 ? schedule[schedule.length - 1].month : startMonth;

  // Calculate baseline (no prepayment) for comparison
  const baselineSchedule = generateBaselineSchedule(
    currentBalance,
    annualRate,
    originalTenureMonths,
    startMonth,
    baseEmi
  );
  const baselineTotalInterest = baselineSchedule.reduce(
    (sum, r) => sum + r.interest,
    0
  );

  return {
    schedule,
    totalInterest,
    totalPaid,
    payoffDate,
    tenureMonths: monthCount,
    interestSaved: baselineTotalInterest - totalInterest,
    tenureReduced: baselineSchedule.length - monthCount,
  };
}

// Compare multiple scenarios
export function compareScenarios(
  currentBalance: number,
  annualRate: number,
  baseEmi: number,
  startMonth: string,
  originalTenureMonths: number,
  scenarios: (PredictionConfig & { name: string })[]
): (PredictionResult & { name: string })[] {
  return scenarios.map((scenario) => ({
    name: scenario.name,
    ...predictPayoff(
      currentBalance,
      annualRate,
      baseEmi,
      startMonth,
      scenario,
      originalTenureMonths
    ),
  }));
}

// Helper: advance month string by N months
export function addMonths(monthStr: string, n: number): string {
  let [year, month] = monthStr.split("-").map(Number);
  month += n;
  while (month > 12) {
    month -= 12;
    year++;
  }
  while (month < 1) {
    month += 12;
    year--;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}
