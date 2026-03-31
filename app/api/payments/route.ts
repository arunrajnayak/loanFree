import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const loanId = request.nextUrl.searchParams.get("loanId");
  const type = request.nextUrl.searchParams.get("type");

  if (!loanId) {
    return NextResponse.json({ error: "loanId required" }, { status: 400 });
  }

  const db = getDb();
  const conditions = [eq(payments.loanId, parseInt(loanId))];
  if (type) {
    conditions.push(eq(payments.type, type as "emi" | "prepayment" | "builder"));
  }

  const result = await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.date))
    .all();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  const result = await db
    .insert(payments)
    .values({
      loanId: body.loanId,
      date: body.date,
      amount: body.amount,
      type: body.type,
      principalComponent: body.principalComponent,
      interestComponent: body.interestComponent,
      notes: body.notes,
    })
    .returning()
    .get();
  return NextResponse.json(result, { status: 201 });
}
