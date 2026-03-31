const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatterDecimal = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function formatINR(amount: number, decimals = false): string {
  return decimals
    ? inrFormatterDecimal.format(amount)
    : inrFormatter.format(amount);
}

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000;
  if (lakhs >= 100) {
    return `${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `${lakhs.toFixed(2)} L`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatYearsMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} months`;
  if (months === 0) return `${years} years`;
  return `${years}y ${months}m`;
}
