"use server";

// Public-facing server actions for customer self-service portal
// NO authentication required — access via unique customer code

import { prisma } from "@/lib/prisma";

// ── Look up customer by code ──────────────────────────────────────────────────
export async function getCustomerPortalData(code: string) {
  if (!code?.trim()) return { error: "Invalid customer code" };

  const customer = await prisma.customer.findFirst({
    where: { customerCode: code.trim().toUpperCase(), isActive: true },
    include: {
      agency: { select: { name: true, phone: true, address: true, city: true } },
    },
  });

  if (!customer) return { error: "Customer not found. Please check your code." };

  // Last 10 deliveries
  const deliveries = await prisma.deliveryRecord.findMany({
    where: { customerId: customer.id },
    orderBy: { date: "desc" },
    take: 10,
    include: { product: { select: { name: true } } },
  });

  // Outstanding credit balance
  const creditEntries = await prisma.creditLedgerEntry.findMany({
    where: { customerId: customer.id },
    orderBy: { date: "desc" },
    take: 20,
    select: { date: true, type: true, amount: true, description: true },
  });

  const outstandingBalance = creditEntries.reduce((sum, entry) => {
    if (entry.type === "CREDIT") return sum + entry.amount;
    if (entry.type === "PAYMENT") return sum - entry.amount;
    return sum;
  }, 0);

  // Recent complaints
  const complaints = await prisma.customerComplaint.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, category: true, status: true, description: true, createdAt: true, resolvedAt: true },
  });

  // Recent payment receipts
  const receipts = await prisma.paymentReceipt.findMany({
    where: { customerId: customer.id },
    orderBy: { date: "desc" },
    take: 10,
    select: { receiptNo: true, amount: true, paymentMode: true, date: true },
  });

  return {
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      type: customer.type,
      customerCode: customer.customerCode,
      agency: customer.agency,
    },
    deliveries: deliveries.map((d) => ({
      date: d.date.toISOString(),
      product: d.product.name,
      qty: d.deliveredQty,
      status: d.status,
    })),
    creditEntries: creditEntries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    })),
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    complaints: complaints.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
    })),
    receipts: receipts.map((r) => ({
      ...r,
      date: r.date.toISOString(),
    })),
  };
}

// ── Raise complaint from customer portal ─────────────────────────────────────
export async function raiseComplaintFromPortal(data: {
  customerCode: string;
  category: string;
  description: string;
}) {
  if (!data.customerCode?.trim()) return { error: "Invalid customer code" };
  if (!data.description?.trim() || data.description.trim().length < 10) {
    return { error: "Please provide a detailed description (at least 10 characters)" };
  }

  const customer = await prisma.customer.findFirst({
    where: { customerCode: data.customerCode.trim().toUpperCase(), isActive: true },
    select: { id: true, agencyId: true },
  });

  if (!customer) return { error: "Customer not found" };

  const complaint = await prisma.customerComplaint.create({
    data: {
      agencyId: customer.agencyId,
      customerId: customer.id,
      category: data.category || "OTHER",
      description: data.description.trim(),
      status: "OPEN",
    },
  });

  return { complaint: { id: complaint.id, status: complaint.status } };
}
