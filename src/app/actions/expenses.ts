"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncExpenseToPersonalAccount } from "./agency-account-sync";
import { revalidatePath } from "next/cache";

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

  if (formData.get("syncToAgencyAccount") === "true") {
    await syncExpenseToPersonalAccount(expense.id);
  }

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

// ─── Employee Expense Management Actions ──────────────────────────────────────

export async function submitEmployeeExpense(data: {
  expenseDate: string;
  categoryId?: string;
  categoryLabel: string;
  amount: number;
  receiptUrl?: string;
  receiptPublicId?: string;
  note?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  if (!data.categoryLabel?.trim()) return { error: "Category is required" };
  if (!data.amount || data.amount <= 0) return { error: "Valid expense amount is required" };

  try {
    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date();
    const isAdmin = session.role === "ADMIN";
    const initialStatus = isAdmin ? "APPROVED" : "PENDING";

    const expense = await prisma.employeeExpense.create({
      data: {
        agencyId: session.agencyId,
        submittedById: session.userId,
        expenseDate,
        categoryId: data.categoryId || null,
        categoryLabel: data.categoryLabel.trim(),
        amount: data.amount,
        receiptUrl: data.receiptUrl || null,
        receiptPublicId: data.receiptPublicId || null,
        note: data.note?.trim() || null,
        status: initialStatus,
        ...(isAdmin
          ? {
              adminId: session.userId,
              adminReviewedAt: new Date(),
            }
          : {}),
      },
      include: {
        submittedBy: { select: { name: true, email: true, role: true } },
        expenseCategory: { select: { name: true, color: true } },
      },
    });

    if (isAdmin) {
      try {
        await prisma.expense.create({
          data: {
            agencyId: session.agencyId,
            addedById: session.userId,
            description: data.note?.trim() ? `[${data.categoryLabel}] ${data.note.trim()}` : data.categoryLabel.trim(),
            amount: data.amount,
            category: data.categoryLabel.trim(),
            categoryId: data.categoryId || null,
            date: expenseDate,
          },
        });
      } catch (err) {
        console.error("Failed to sync admin expense into main ledger:", err);
      }
    }

    revalidatePath("/staff/expenses");
    revalidatePath("/delivery-boy/expenses");
    revalidatePath("/godown-keeper/expenses");
    revalidatePath("/manager/expenses");
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/expense-categories");
    revalidatePath("/admin/approvals");

    return { expense };
  } catch (err: any) {
    console.error("submitEmployeeExpense error:", err);
    return { error: "Failed to submit expense request" };
  }
}

export async function getMyEmployeeExpenses() {
  const session = await getSession();
  if (!session || !session.agencyId) return { expenses: [] };

  const expenses = await prisma.employeeExpense.findMany({
    where: { agencyId: session.agencyId, submittedById: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, email: true, role: true } },
      expenseCategory: { select: { name: true, color: true } },
      manager: { select: { name: true } },
      admin: { select: { name: true } },
    },
    take: 100,
  });

  return { expenses };
}

export async function getAgencyEmployeeExpensesForManager() {
  const session = await getSession();
  if (!session || !session.agencyId || !["ADMIN", "MANAGER"].includes(session.role)) {
    return { expenses: [] };
  }

  const expenses = await prisma.employeeExpense.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, email: true, role: true } },
      expenseCategory: { select: { name: true, color: true } },
      manager: { select: { name: true } },
      admin: { select: { name: true } },
    },
    take: 200,
  });

  return { expenses };
}

export async function getAgencyEmployeeExpensesForAdmin() {
  const session = await getSession();
  if (!session || !session.agencyId || session.role !== "ADMIN") {
    return { expenses: [] };
  }

  const expenses = await prisma.employeeExpense.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, email: true, role: true } },
      expenseCategory: { select: { name: true, color: true } },
      manager: { select: { name: true } },
      admin: { select: { name: true } },
    },
    take: 200,
  });

  return { expenses };
}

export async function managerReviewEmployeeExpense(
  id: string,
  action: "APPROVE" | "REJECT",
  managerNote?: string
) {
  const session = await getSession();
  if (!session || !session.agencyId || !["ADMIN", "MANAGER"].includes(session.role)) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.employeeExpense.findFirst({
    where: { id, agencyId: session.agencyId },
  });

  if (!target) return { error: "Expense record not found" };

  const newStatus = action === "APPROVE" ? "MANAGER_APPROVED" : "REJECTED";

  const updated = await prisma.employeeExpense.update({
    where: { id },
    data: {
      status: newStatus,
      managerId: session.userId,
      managerNote: managerNote?.trim() || null,
      managerReviewedAt: new Date(),
    },
    include: {
      submittedBy: { select: { name: true, email: true, role: true } },
      expenseCategory: { select: { name: true, color: true } },
      manager: { select: { name: true } },
      admin: { select: { name: true } },
    },
  });

  revalidatePath("/manager/expenses");
  revalidatePath("/admin/approvals");
  revalidatePath("/staff/expenses");
  revalidatePath("/delivery-boy/expenses");
  revalidatePath("/godown-keeper/expenses");

  return { expense: updated };
}

export async function adminReviewEmployeeExpense(
  id: string,
  action: "APPROVE" | "REJECT",
  adminNote?: string
) {
  const session = await getSession();
  if (!session || !session.agencyId || session.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const target = await prisma.employeeExpense.findFirst({
    where: { id, agencyId: session.agencyId },
  });

  if (!target) return { error: "Expense record not found" };

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await prisma.employeeExpense.update({
    where: { id },
    data: {
      status: newStatus,
      adminId: session.userId,
      adminNote: adminNote?.trim() || null,
      adminReviewedAt: new Date(),
    },
    include: {
      submittedBy: { select: { name: true, email: true, role: true } },
      expenseCategory: { select: { name: true, color: true } },
      manager: { select: { name: true } },
      admin: { select: { name: true } },
    },
  });

  if (newStatus === "APPROVED") {
    try {
      await prisma.expense.create({
        data: {
          agencyId: session.agencyId,
          addedById: target.submittedById,
          description: `[Employee Expense] ${target.categoryLabel}: ${target.note || "No note"}`,
          amount: target.amount,
          category: target.categoryLabel,
          categoryId: target.categoryId,
          date: target.expenseDate,
        },
      });
    } catch (e) {
      console.error("Failed to sync approved employee expense to main expense ledger:", e);
    }
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/expenses");
  revalidatePath("/manager/expenses");
  revalidatePath("/staff/expenses");
  revalidatePath("/delivery-boy/expenses");
  revalidatePath("/godown-keeper/expenses");

  return { expense: updated };
}

export async function deleteEmployeeExpense(id: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const target = await prisma.employeeExpense.findFirst({
    where: { id, agencyId: session.agencyId },
  });

  if (!target) return { error: "Record not found" };

  if (target.submittedById !== session.userId && session.role !== "ADMIN") {
    return { error: "You can only delete your own pending expense records" };
  }

  if (target.status !== "PENDING" && session.role !== "ADMIN") {
    return { error: "Cannot delete an expense that has already been reviewed" };
  }

  await prisma.employeeExpense.delete({ where: { id } });

  revalidatePath("/staff/expenses");
  revalidatePath("/delivery-boy/expenses");
  revalidatePath("/godown-keeper/expenses");
  revalidatePath("/manager/expenses");
  revalidatePath("/admin/approvals");

  return { success: true };
}

