"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculateAccountBalance } from "./personal-accounts";

// Helper to get agency account for an agency (supports preferred specific account)
async function getAgencyAccount(agencyId: string, preferredAccountId?: string) {
  if (preferredAccountId) {
    const specific = await prisma.personalAccount.findFirst({
      where: { id: preferredAccountId, agencyId, isAgencyAccount: true, isActive: true },
    });
    if (specific) return specific;
  }
  return await prisma.personalAccount.findFirst({
    where: { agencyId, isAgencyAccount: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function syncExpenseToPersonalAccount(expenseId: string, preferredAccountId?: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, agencyId: session.agencyId },
    });
    if (!expense) return { error: "Expense not found or unauthorized" };

    const agencyAccount = await getAgencyAccount(expense.agencyId, preferredAccountId);
    if (!agencyAccount) return { success: true, message: "No active agency account registered for auto-sync" };

    // Check if transaction is already linked or exists
    const existing = await prisma.personalTransaction.findFirst({
      where: { linkedModule: "EXPENSE", linkedRecordId: expense.id },
    });

    if (existing) {
      await prisma.personalTransaction.update({
        where: { id: existing.id },
        data: {
          accountId: agencyAccount.id,
          amount: expense.amount,
          date: expense.date,
          description: `Sync Expense: ${expense.description}`,
        },
      });
    } else {
      await prisma.personalTransaction.create({
        data: {
          agencyId: expense.agencyId,
          accountId: agencyAccount.id,
          date: expense.date,
          type: "EXPENSE",
          amount: expense.amount,
          description: `Sync Expense: ${expense.description}`,
          linkedModule: "EXPENSE",
          linkedRecordId: expense.id,
          addedById: expense.addedById,
        },
      });
    }

    await recalculateAccountBalance(agencyAccount.id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to sync expense" };
  }
}

export async function removeExpenseSync(expenseId: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const existing = await prisma.personalTransaction.findFirst({
      where: { agencyId: session.agencyId, linkedModule: "EXPENSE", linkedRecordId: expenseId },
    });
    if (existing) {
      await prisma.personalTransaction.delete({
        where: { id: existing.id },
      });
      await recalculateAccountBalance(existing.accountId);
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove expense sync" };
  }
}

export async function syncSalaryToPersonalAccount(drawingId: string, preferredAccountId?: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const drawing = await prisma.salaryDrawing.findFirst({
      where: { id: drawingId, agencyId: session.agencyId },
      include: { employee: { select: { name: true } } },
    });
    if (!drawing) return { error: "Salary drawing not found or unauthorized" };

    const agencyAccount = await getAgencyAccount(drawing.agencyId, preferredAccountId);
    if (!agencyAccount) return { success: true, message: "No active agency account registered for auto-sync" };

    const existing = await prisma.personalTransaction.findFirst({
      where: { agencyId: session.agencyId, linkedModule: "SALARY", linkedRecordId: drawing.id },
    });

    const description = `Salary/Drawing: ${drawing.type} paid to ${drawing.employee.name} (${drawing.month}/${drawing.year})`;

    if (existing) {
      await prisma.personalTransaction.update({
        where: { id: existing.id },
        data: {
          accountId: agencyAccount.id,
          amount: drawing.amount,
          date: drawing.date,
          description,
        },
      });
    } else {
      // Find admin user for this agency to associate transaction creation
      const adminUser = await prisma.user.findFirst({
        where: { agencyId: drawing.agencyId, role: "ADMIN" },
      });
      if (!adminUser) return { error: "No admin user found to add transaction" };

      await prisma.personalTransaction.create({
        data: {
          agencyId: drawing.agencyId,
          accountId: agencyAccount.id,
          date: drawing.date,
          type: "EXPENSE", // salary is outflow/expense
          amount: drawing.amount,
          description,
          linkedModule: "SALARY",
          linkedRecordId: drawing.id,
          addedById: adminUser.id,
        },
      });
    }

    await recalculateAccountBalance(agencyAccount.id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to sync salary" };
  }
}

export async function removeSalarySync(drawingId: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const existing = await prisma.personalTransaction.findFirst({
      where: { agencyId: session.agencyId, linkedModule: "SALARY", linkedRecordId: drawingId },
    });
    if (existing) {
      await prisma.personalTransaction.delete({
        where: { id: existing.id },
      });
      await recalculateAccountBalance(existing.accountId);
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove salary sync" };
  }
}

export async function syncCompanyPaymentToPersonalAccount(paymentId: string, preferredAccountId?: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const payment = await prisma.companyPayment.findFirst({
      where: { id: paymentId, agencyId: session.agencyId },
    });
    if (!payment) return { error: "Company payment not found or unauthorized" };

    const agencyAccount = await getAgencyAccount(payment.agencyId, preferredAccountId);
    if (!agencyAccount) return { success: true, message: "No active agency account registered for auto-sync" };

    const existing = await prisma.personalTransaction.findFirst({
      where: { agencyId: session.agencyId, linkedModule: "COMPANY_PAYMENT", linkedRecordId: payment.id },
    });

    const description = `Company Payment to ${payment.oilCompany || "Oil Company"}${payment.invoiceNo ? ` (Invoice: ${payment.invoiceNo})` : ""}`;

    if (existing) {
      await prisma.personalTransaction.update({
        where: { id: existing.id },
        data: {
          accountId: agencyAccount.id,
          amount: payment.amount,
          date: payment.date,
          description,
          paymentMode: payment.paymentMode,
          referenceNo: payment.referenceNo,
        },
      });
    } else {
      await prisma.personalTransaction.create({
        data: {
          agencyId: payment.agencyId,
          accountId: agencyAccount.id,
          date: payment.date,
          type: "EXPENSE", // oil company payment is outflow/expense
          amount: payment.amount,
          description,
          paymentMode: payment.paymentMode,
          referenceNo: payment.referenceNo,
          linkedModule: "COMPANY_PAYMENT",
          linkedRecordId: payment.id,
          addedById: payment.addedById,
        },
      });
    }

    await recalculateAccountBalance(agencyAccount.id);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to sync company payment" };
  }
}

export async function removeCompanyPaymentSync(paymentId: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const existing = await prisma.personalTransaction.findFirst({
      where: { agencyId: session.agencyId, linkedModule: "COMPANY_PAYMENT", linkedRecordId: paymentId },
    });
    if (existing) {
      await prisma.personalTransaction.delete({
        where: { id: existing.id },
      });
      await recalculateAccountBalance(existing.accountId);
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove company payment sync" };
  }
}
