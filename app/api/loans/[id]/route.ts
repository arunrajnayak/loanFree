import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loans } from "@/lib/schema";
import { getLoanSummary } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = getLoanSummary(parseInt(id));
  if (!summary) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const db = getDb();
  const result = db
    .update(loans)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(loans.id, parseInt(id)))
    .returning()
    .get();
  return NextResponse.json(result);
}
