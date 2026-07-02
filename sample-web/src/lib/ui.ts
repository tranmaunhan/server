export function fallbackAvatar(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#d8efe7" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0f4d43">
        ${initials || "U"}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEqualSplit(total: number, count: number) {
  if (!total || !count) {
    return [];
  }

  const base = Math.floor((total * 100) / count) / 100;
  const shares = Array.from({ length: count }, () => base);
  const assigned = roundMoney(base * count);
  let remainderCents = Math.round((roundMoney(total) - assigned) * 100);
  let index = 0;

  while (remainderCents > 0) {
    shares[index] = roundMoney(shares[index] + 0.01);
    remainderCents -= 1;
    index = (index + 1) % count;
  }

  return shares;
}
