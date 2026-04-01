import { NextResponse } from "next/server";
import { eq, and, like } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/schema";

export const dynamic = "force-dynamic";

const PREPAY_AMOUNT = 12500;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  const monthPrefix = `${year}-${month}`;

  const db = getDb();

  // Skip if a prepayment already exists for this month
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.loanId, 1),
        eq(payments.type, "prepayment"),
        like(payments.date, `${monthPrefix}%`)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json({
      skipped: true,
      reason: `Prepayment already recorded for ${monthPrefix}`,
      existing,
    });
  }

  const result = await db
    .insert(payments)
    .values({
      loanId: 1,
      date,
      amount: PREPAY_AMOUNT,
      type: "prepayment",
      notes: "Auto-recorded by monthly cron",
    })
    .returning()
    .get();

  return NextResponse.json({ created: true, payment: result });
}
