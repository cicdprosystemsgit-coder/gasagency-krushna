import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

export function getDaysUntilRenewal(nextRenewalDate: Date | string): number {
  return differenceInDays(new Date(nextRenewalDate), new Date());
}

export function getRenewalStatus(daysLeft: number): "expired" | "urgent" | "warning" | "ok" {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "urgent";
  if (daysLeft <= 30) return "warning";
  return "ok";
}

export function generateInvoiceNo(): string {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  GODOWN_KEEPER: "Godown Keeper",
  STAFF: "Staff",
  DELIVERY_BOY: "Delivery Boy",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CORRECTION_NEEDED: "bg-orange-100 text-orange-800",
};
