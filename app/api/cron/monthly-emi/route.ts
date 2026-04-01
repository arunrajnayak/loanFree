import { NextResponse } from "next/server";
import { eq, and, like } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments, loans } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (or manually with the right secret)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get the loan to read EMI amount
  const loan = await db.select().from(loans).where(eq(loans.id, 1)).get();
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

  // Today's date — Vercel Cron fires on the 4th, so use that
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  const monthPrefix = `${year}-${month}`;

  // Skip if an EMI payment already exists for this month
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.loanId, 1),
        eq(payments.type, "emi"),
        like(payments.date, `${monthPrefix}%`)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json({
      skipped: true,
      reason: `EMI already recorded for ${monthPrefix}`,
      existing,
    });
  }

  const result = await db
    .insert(payments)
    .values({
      loanId: 1,
      date,
      amount: loan.emi,
      type: "emi",
      notes: "Auto-recorded by monthly cron",
    })
    .returning()
    .get();

  return NextResponse.json({ created: true, payment: result });
}
