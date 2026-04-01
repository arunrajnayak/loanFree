import { getPayments, getLoanById } from "@/lib/queries";
import { PaymentsClient } from "@/components/payments/payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const [loan, allPayments] = await Promise.all([getLoanById(1), getPayments(1, type)]);

  if (!loan) return <p>Loan not found</p>;

  return <PaymentsClient payments={allPayments} currentType={type} />;
}
