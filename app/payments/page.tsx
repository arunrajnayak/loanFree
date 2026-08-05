import { getPayments, getLoanById, getDisbursements } from "@/lib/queries";
import { PaymentsClient } from "@/components/payments/payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const [loan, allPayments, allDisbursements] = await Promise.all([
    getLoanById(1),
    getPayments(1, type === "disbursements" ? undefined : type),
    getDisbursements(1),
  ]);

  if (!loan) return <p>Loan not found</p>;

  return (
    <PaymentsClient
      payments={allPayments}
      disbursements={allDisbursements}
      currentType={type}
    />
  );
}
