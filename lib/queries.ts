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

export function getLoanById(id: number) {
  return getDb().select().from(loans).where(eq(loans.id, id)).get();
}

export function getDisbursements(loanId: number) {
  return getDb()
    .select()
    .from(disbursements)
    .where(eq(disbursements.loanId, loanId))
    .orderBy(disbursements.date)
    .all();
}

export function getPayments(loanId: number, type?: string) {
  const conditions = [eq(payments.loanId, loanId)];
  if (type) {
    conditions.push(eq(payments.type, type as Payment["type"]));
  }
  return getDb()
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.date))
    .all();
}

export function getInterestRecords(loanId: number) {
  return getDb()
    .select()
    .from(interestRecords)
    .where(eq(interestRecords.loanId, loanId))
    .orderBy(interestRecords.month)
    .all();
}

export function getScenarios(loanId: number) {
  return getDb()
    .select()
    .from(predictionScenarios)
    .where(eq(predictionScenarios.loanId, loanId))
    .all();
}

export function getLoanSummary(loanId: number) {
  const loan = getLoanById(loanId);
  if (!loan) return null;

  const totalDisbursed = getDb()
    .select({ total: sql<number>`COALESCE(SUM(${disbursements.amount}), 0)` })
    .from(disbursements)
    .where(eq(disbursements.loanId, loanId))
    .get()!.total;

  const bankPayments = getDb()
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
      totalPrincipal: sql<number>`COALESCE(SUM(${payments.principalComponent}), 0)`,
      totalInterest: sql<number>`COALESCE(SUM(${payments.interestComponent}), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.loanId, loanId),
        sql`${payments.type} IN ('emi', 'prepayment')`
      )
    )
    .get()!;

  const builderPayments = getDb()
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.loanId, loanId), eq(payments.type, "builder")))
    .get()!.total;

  const interestTotal = getDb()
    .select({ total: sql<number>`COALESCE(SUM(${interestRecords.amount}), 0)` })
    .from(interestRecords)
    .where(eq(interestRecords.loanId, loanId))
    .get()!.total;

  const lastInterest = getDb()
    .select()
    .from(interestRecords)
    .where(eq(interestRecords.loanId, loanId))
    .orderBy(desc(interestRecords.month))
    .limit(1)
    .get();

  const outstandingBalance = lastInterest?.outstandingBalance ??
    (loan.sanctionedAmount - bankPayments.totalPrincipal);

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
