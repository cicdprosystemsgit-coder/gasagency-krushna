"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PersonalAccountType } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    throw new Error("Unauthorized: ADMIN role required");
  }
  return { agencyId: session.agencyId, userId: session.userId };
}

export async function createPersonalAccount(data: {
  name: string;
  accountType: PersonalAccountType;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  openingBalance: number;
  isAgencyAccount?: boolean;
  color?: string;
  notes?: string;
}) {
  try {
    const { agencyId, userId } = await requireAdmin();

    if (!data.name.trim()) return { error: "Account name is required" };

    // If setting as primary agency account, clear isAgencyAccount on other accounts of this agency
    if (data.isAgencyAccount) {
      await prisma.personalAccount.updateMany({
        where: { agencyId, isAgencyAccount: true },
        data: { isAgencyAccount: false },
      });
    }

    const account = await prisma.personalAccount.create({
      data: {
        agencyId,
        ownerId: userId,
        name: data.name.trim(),
        accountType: data.accountType,
        bankName: data.bankName?.trim() || null,
        accountNo: data.accountNo?.trim() || null,
        ifscCode: data.ifscCode?.trim() || null,
        openingBalance: data.openingBalance,
        currentBalance: data.openingBalance, // Initial current balance is opening balance
        isAgencyAccount: !!data.isAgencyAccount,
        color: data.color || "#4F46E5", // Default Tailwind Indigo-600
        notes: data.notes?.trim() || null,
        isActive: true,
      },
    });

    revalidatePath("/admin/accounts");
    return { success: true, account };
  } catch (error: any) {
    return { error: error.message || "Failed to create account" };
  }
}

export async function updatePersonalAccount(
  id: string,
  data: {
    name: string;
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    openingBalance: number;
    isAgencyAccount?: boolean;
    color?: string;
    notes?: string;
    isActive?: boolean;
  }
) {
  try {
    const { agencyId } = await requireAdmin();

    if (!data.name.trim()) return { error: "Account name is required" };

    const existingAccount = await prisma.personalAccount.findFirst({
      where: { id, agencyId },
    });
    if (!existingAccount) return { error: "Account not found" };

    // If changing to primary agency account, clear others
    if (data.isAgencyAccount && !existingAccount.isAgencyAccount) {
      await prisma.personalAccount.updateMany({
        where: { agencyId, isAgencyAccount: true },
        data: { isAgencyAccount: false },
      });
    }

    const account = await prisma.personalAccount.update({
      where: { id, agencyId },
      data: {
        name: data.name.trim(),
        bankName: data.bankName?.trim() || null,
        accountNo: data.accountNo?.trim() || null,
        ifscCode: data.ifscCode?.trim() || null,
        openingBalance: data.openingBalance,
        isAgencyAccount: !!data.isAgencyAccount,
        color: data.color || "#4F46E5",
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : existingAccount.isActive,
      },
    });

    // Recalculate balance if opening balance has changed
    if (data.openingBalance !== existingAccount.openingBalance) {
      await recalculateAccountBalance(id);
    }

    revalidatePath("/admin/accounts");
    revalidatePath(`/admin/accounts/${id}`);
    return { success: true, account };
  } catch (error: any) {
    return { error: error.message || "Failed to update account" };
  }
}

export async function deletePersonalAccount(id: string) {
  try {
    const { agencyId } = await requireAdmin();

    // Soft delete by setting isActive to false
    const account = await prisma.personalAccount.update({
      where: { id, agencyId },
      data: { isActive: false },
    });

    revalidatePath("/admin/accounts");
    return { success: true, account };
  } catch (error: any) {
    return { error: error.message || "Failed to delete account" };
  }
}

export async function getPersonalAccounts() {
  try {
    const { agencyId } = await requireAdmin();

    const accounts = await prisma.personalAccount.findMany({
      where: { agencyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return { accounts };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch accounts" };
  }
}

export async function getPersonalAccountById(id: string) {
  try {
    const { agencyId } = await requireAdmin();

    const account = await prisma.personalAccount.findFirst({
      where: { id, agencyId },
    });

    if (!account) return { error: "Account not found" };
    return { account };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch account" };
  }
}

export async function recalculateAccountBalance(accountId: string) {
  try {
    const account = await prisma.personalAccount.findUnique({
      where: { id: accountId },
      include: { transactions: true },
    });

    if (!account) throw new Error("Account not found");

    let balance = account.openingBalance;
    for (const txn of account.transactions) {
      if (
        [
          "INCOME",
          "RECEIVED_FROM",
          "UDHAARI_RECEIVED",
          "TRANSFER_IN",
          "AGENCY_DEPOSIT",
        ].includes(txn.type)
      ) {
        balance += txn.amount;
      } else {
        balance -= txn.amount;
      }
    }

    const updatedAccount = await prisma.personalAccount.update({
      where: { id: accountId },
      data: { currentBalance: balance },
    });

    return { success: true, currentBalance: updatedAccount.currentBalance };
  } catch (error: any) {
    return { error: error.message || "Failed to recalculate balance" };
  }
}
