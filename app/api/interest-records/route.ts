import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
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

  const plain = result.map((r: any) => ({
    id: r.id,
    loanId: r.loanId,
    month: r.month,
    amount: r.amount,
    outstandingBalance: r.outstandingBalance,
  }));

  return new NextResponse(JSON.stringify(plain), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  // Check for duplicate month for this loan
  const existing = await getDb()
    .select()
    .from(interestRecords)
    .where(and(eq(interestRecords.loanId, body.loanId), eq(interestRecords.month, body.month)))
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

  const plain = {
    id: result.id,
    loanId: result.loanId,
    month: result.month,
    amount: result.amount,
    outstandingBalance: result.outstandingBalance,
  };

  return new NextResponse(JSON.stringify(plain), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
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

  const plain = {
    id: result.id,
    loanId: result.loanId,
    month: result.month,
    amount: result.amount,
    outstandingBalance: result.outstandingBalance,
  };

  return new NextResponse(JSON.stringify(plain), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
