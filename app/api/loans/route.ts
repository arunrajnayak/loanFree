import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { loans } from "@/lib/schema";

export async function GET() {
  const db = getDb();
  const allLoans = db.select().from(loans).all();
  return NextResponse.json(allLoans);
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  const result = db
    .insert(loans)
    .values({
      name: body.name,
      loanType: body.loanType || "home",
      sanctionedAmount: body.sanctionedAmount,
      interestRate: body.interestRate,
      tenureYears: body.tenureYears,
      emi: body.emi,
      startDate: body.startDate,
      status: "active",
    })
    .returning()
    .get();
  return NextResponse.json(result, { status: 201 });
}
