import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  loans,
  disbursements,
  payments,
  interestRecords,
  predictionScenarios,
  type Loan,
  type Payment,
} from "./schema";

export async function getLoanById(id: number) {
  return await getDb().select().from(loans).where(eq(loans.id, id)).get();
}

export async function getDisbursements(loanId: number) {
  return await getDb()
    .select()
    .from(disbursements)
    .where(eq(disbursements.loanId, loanId))
    .orderBy(disbursements.date)
    .all();
}

export async function getPayments(loanId: number, type?: string) {
  const conditions = [eq(payments.loanId, loanId)];
  if (type) {
    conditions.push(eq(payments.type, type as Payment["type"]));
  }
  return await getDb()
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.date))
    .all();
}

export async function getInterestRecords(loanId: number) {
  return await getDb()
    .select()
    .from(interestRecords)
    .where(eq(interestRecords.loanId, loanId))
    .orderBy(interestRecords.month)
    .all();
}

export async function getScenarios(loanId: number) {
  return await getDb()
    .select()
    .from(predictionScenarios)
    .where(eq(predictionScenarios.loanId, loanId))
    .all();
}

export async function getLoanSummary(loanId: number) {
  const loan = await getLoanById(loanId);
  if (!loan) return null;

  const [disbRow, bankRow, builderRow, interestRow] = await Promise.all([
    getDb()
      .select({ total: sql<number>`COALESCE(SUM(${disbursements.amount}), 0)` })
      .from(disbursements)
      .where(eq(disbursements.loanId, loanId))
      .get(),
    getDb()
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        totalPrincipal: sql<number>`COALESCE(SUM(${payments.principalComponent}), 0)`,
        totalInterest: sql<number>`COALESCE(SUM(${payments.interestComponent}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.loanId, loanId), sql`${payments.type} IN ('emi', 'prepayment')`))
      .get(),
    getDb()
      .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.loanId, loanId), eq(payments.type, "builder")))
      .get(),
    getDb()
      .select({ total: sql<number>`COALESCE(SUM(${interestRecords.amount}), 0)` })
      .from(interestRecords)
      .where(eq(interestRecords.loanId, loanId))
      .get(),
  ]);

  const totalDisbursed = disbRow!.total;
  const bankPayments = bankRow!;
  const builderPayments = builderRow!.total;
  const interestTotal = interestRow!.total;

  // Correct outstanding balance:
  // disbursed + all_interest_charged - all_bank_payments (construction loan: disbursements in tranches)
  const outstandingBalance = totalDisbursed + interestTotal - bankPayments.total;

  return {
    loan,
    outstandingBalance,
    totalDisbursed,
    totalPaidToBank: bankPayments.total,
    totalPaidToBuilder: builderPayments,
    totalInterestPaid: interestTotal,
    totalPrincipalPaid: bankPayments.total - interestTotal,
  };
}
