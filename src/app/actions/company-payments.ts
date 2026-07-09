"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type CompanyPayment } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function getCompanyPayments(filters?: {
  from?: string;
  to?: string;
  productId?: string;
  oilCompany?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", payments: [] };

  const where: any = { agencyId: session.agencyId };

  if (filters?.from || filters?.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }

  if (filters?.productId && filters.productId !== "ALL") {
    where.productId = filters.productId;
  }

  if (filters?.oilCompany && filters.oilCompany !== "ALL") {
    where.oilCompany = filters.oilCompany;
  }

  const payments = await prisma.companyPayment.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      product: { select: { name: true } },
      addedBy: { select: { name: true } },
    },
  });

  return { payments };
}

export async function createCompanyPayment(formData: FormData): Promise<{ payment?: CompanyPayment; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const dateStr = formData.get("date") as string;
  const amountVal = Number(formData.get("amount"));
  const paymentMode = (formData.get("paymentMode") as string) || "NEFT";
  const referenceNo = (formData.get("referenceNo") as string)?.trim() || null;
  const invoiceNo = (formData.get("invoiceNo") as string)?.trim() || null;
  const productId = (formData.get("productId") as string) || null;
  const qtyCylinders = formData.get("qtyCylinders") ? Number(formData.get("qtyCylinders")) : null;
  const oilCompany = (formData.get("oilCompany") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!dateStr) return { error: "Date is required" };
  if (isNaN(amountVal) || amountVal <= 0) return { error: "Valid amount is required" };

  try {
    const payment = await prisma.companyPayment.create({
      data: {
        date: new Date(dateStr),
        amount: amountVal,
        paymentMode,
        referenceNo,
        invoiceNo,
        productId: productId === "NONE" || !productId ? null : productId,
        qtyCylinders,
        oilCompany,
        description,
        agencyId: session.agencyId,
        addedById: session.userId,
      },
    });

    revalidatePath("/admin/company-payments");
    revalidatePath("/admin/assets");
    return { payment };
  } catch (err: any) {
    console.error("createCompanyPayment error:", err);
    return { error: "Failed to record payment" };
  }
}

export async function updateCompanyPayment(id: string, formData: FormData): Promise<{ payment?: CompanyPayment; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const dateStr = formData.get("date") as string;
  const amountVal = Number(formData.get("amount"));
  const paymentMode = (formData.get("paymentMode") as string) || "NEFT";
  const referenceNo = (formData.get("referenceNo") as string)?.trim() || null;
  const invoiceNo = (formData.get("invoiceNo") as string)?.trim() || null;
  const productId = (formData.get("productId") as string) || null;
  const qtyCylinders = formData.get("qtyCylinders") ? Number(formData.get("qtyCylinders")) : null;
  const oilCompany = (formData.get("oilCompany") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!dateStr) return { error: "Date is required" };
  if (isNaN(amountVal) || amountVal <= 0) return { error: "Valid amount is required" };

  try {
    const payment = await prisma.companyPayment.update({
      where: { id, agencyId: session.agencyId },
      data: {
        date: new Date(dateStr),
        amount: amountVal,
        paymentMode,
        referenceNo,
        invoiceNo,
        productId: productId === "NONE" || !productId ? null : productId,
        qtyCylinders,
        oilCompany,
        description,
      },
    });

    revalidatePath("/admin/company-payments");
    revalidatePath("/admin/assets");
    return { payment };
  } catch (err: any) {
    console.error("updateCompanyPayment error:", err);
    return { error: "Failed to update payment" };
  }
}

export async function deleteCompanyPayment(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.companyPayment.delete({
      where: { id, agencyId: session.agencyId },
    });

    revalidatePath("/admin/company-payments");
    revalidatePath("/admin/assets");
    return { success: true };
  } catch (err: any) {
    console.error("deleteCompanyPayment error:", err);
    return { success: false, error: "Failed to delete payment" };
  }
}
