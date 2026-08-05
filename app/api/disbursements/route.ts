import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { disbursements } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const loanId = request.nextUrl.searchParams.get("loanId");
  if (!loanId) {
    return NextResponse.json({ error: "loanId required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .select()
    .from(disbursements)
    .where(eq(disbursements.loanId, parseInt(loanId)))
    .orderBy(disbursements.date)
    .all();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  const result = db
    .insert(disbursements)
    .values({
      loanId: body.loanId,
      date: body.date,
      amount: body.amount,
      description: body.description ?? null,
    })
    .returning()
    .get();
  return NextResponse.json(result, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .update(disbursements)
    .set({
      date: body.date,
      amount: body.amount,
      description: body.description ?? null,
    })
    .where(eq(disbursements.id, body.id))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "Disbursement not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .delete(disbursements)
    .where(eq(disbursements.id, parseInt(id)))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "Disbursement not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, deleted: result });
}
