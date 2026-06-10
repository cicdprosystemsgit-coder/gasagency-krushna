"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createExpense(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const description = (formData.get("description") as string)?.trim();
  const amount = Number(formData.get("amount"));
  if (!description) return { error: "Description required" };
  if (!amount || amount <= 0) return { error: "Valid amount required" };

  const expense = await prisma.expense.create({
    data: {
      description,
      amount,
      category: (formData.get("category") as string) || "GENERAL",
      date: new Date(),
      addedById: session.userId,
      agencyId: session.agencyId,
    },
    include: { addedBy: { select: { name: true } } },
  });
  return { expense };
}

export async function createAsset(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const registrationDate = formData.get("registrationDate") as string;
  if (!name || !registrationDate) return { error: "Name and registration date required" };

  const lastRenewal = formData.get("lastRenewalDate") as string;
  const nextRenewal = formData.get("nextRenewalDate") as string;

  const asset = await prisma.vehicleAgencyAsset.create({
    data: {
      assetType: (formData.get("assetType") as "VEHICLE" | "AGENCY") || "VEHICLE",
      name,
      registrationDate: new Date(registrationDate),
      lastRenewalDate: lastRenewal ? new Date(lastRenewal) : null,
      nextRenewalDate: nextRenewal ? new Date(nextRenewal) : null,
      price: Number(formData.get("price")) || 0,
      comment: (formData.get("comment") as string) || null,
      agencyId: session.agencyId,
    },
  });
  return { asset };
}

export async function deleteAsset(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false };

  await prisma.vehicleAgencyAsset.update({
    where: { id, agencyId: session.agencyId },
    data: { isActive: false },
  });
  return { success: true };
}
