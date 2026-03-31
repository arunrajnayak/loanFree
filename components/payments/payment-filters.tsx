"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const types = [
  { label: "All", value: "" },
  { label: "EMI", value: "emi" },
  { label: "Prepay", value: "prepayment" },
  { label: "Builder", value: "builder" },
];

export function PaymentFilters({
  currentType,
  loanId,
}: {
  currentType?: string;
  loanId: number;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1">
      {types.map((t) => (
        <Button
          key={t.value}
          variant={currentType === t.value || (!currentType && !t.value) ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            const url = t.value
              ? `/loans/${loanId}/payments?type=${t.value}`
              : `/loans/${loanId}/payments`;
            router.push(url);
          }}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
