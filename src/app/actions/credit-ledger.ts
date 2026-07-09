"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createCreditEntry(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  const amount = Number(formData.get("amount"));
  if (!customerId || !amount || amount <= 0) return { error: "Invalid data" };

  const entry = await prisma.creditLedgerEntry.create({
    data: {
      customerId,
      type: formData.get("type") as string,
      amount,
      description: (formData.get("description") as string) || null,
      date: new Date(),
      addedById: session.userId,
      agencyId: session.agencyId,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      addedBy: { select: { name: true } },
    },
  });
  return { entry };
}

export async function addCustomer(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const customerCode = (formData.get("customerCode") as string)?.trim() || null;

  if (!name) return { error: "Name is required" };
  if (!/^[a-zA-Z\s]+$/.test(name)) return { error: "Name: only alphabetic characters allowed" };
  if (!phone) return { error: "Phone is required" };
  if (!/^\d{10}$/.test(phone)) return { error: "Phone: must be exactly 10 digits" };

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      address: (formData.get("address") as string) || null,
      type: (formData.get("type") as "COMMERCIAL" | "DOMESTIC") || "COMMERCIAL",
      customerCode: customerCode ? customerCode.toUpperCase() : null,
      agencyId: session.agencyId,
    },
  });
  return { customer };
}
