import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { interestRecords } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const loanId = request.nextUrl.searchParams.get("loanId");
  if (!loanId) return NextResponse.json({ error: "loanId required" }, { status: 400 });

  const result = await getDb()
    .select()
    .from(interestRecords)
    .where(eq(interestRecords.loanId, parseInt(loanId)))
    .orderBy(desc(interestRecords.month))
    .all();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();

  // Check for duplicate month
  const existing = await getDb()
    .select()
    .from(interestRecords)
    .where(eq(interestRecords.month, body.month))
    .get();

  if (existing) {
    return NextResponse.json(
      { error: `Interest record for ${body.month} already exists` },
      { status: 409 }
    );
  }

  const result = await getDb()
    .insert(interestRecords)
    .values({
      loanId: body.loanId,
      month: body.month,
      amount: body.amount,
      outstandingBalance: body.outstandingBalance ?? null,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();

  const result = await getDb()
    .update(interestRecords)
    .set({
      amount: body.amount,
      outstandingBalance: body.outstandingBalance ?? null,
    })
    .where(eq(interestRecords.id, body.id))
    .returning()
    .get();

  return NextResponse.json(result);
}
