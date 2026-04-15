import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toString(): string } | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const raw = typeof amount === "object" ? amount.toString() : amount;
  const num = typeof raw === "string" ? parseFloat(raw) : raw;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function generateSKUCode(name: string, category: string): string {
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const catPart = category
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${catPart}-${namePart}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "INACTIVE":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "DISCONTINUED":
      return "bg-red-100 text-red-700 border-red-200";
    case "OUT_OF_STOCK":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function formatStatus(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "DISCONTINUED":
      return "Discontinued";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    default:
      return status;
  }
}

export function formatMountingType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function buildApiUrl(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${baseUrl}${path}`;
}
