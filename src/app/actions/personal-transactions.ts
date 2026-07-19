"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PersonalTxnType } from "@/generated/prisma";
import { recalculateAccountBalance } from "./personal-accounts";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    throw new Error("Unauthorized: ADMIN role required");
  }
  return { agencyId: session.agencyId, userId: session.userId };
}

export async function addTransaction(data: {
  accountId: string;
  date: Date | string;
  type: PersonalTxnType;
  amount: number;
  description: string;
  partyName?: string;
  partyPhone?: string;
  paymentMode?: string;
  referenceNo?: string;
  tags?: string[];
  receiptBase64?: string;
  notes?: string;
  linkedModule?: string;
  linkedRecordId?: string;
  udhaariId?: string;
}) {
  try {
    const { agencyId, userId } = await requireAdmin();



    if (data.amount <= 0) return { error: "Amount must be greater than zero" };
    if (!data.description.trim()) return { error: "Description is required" };

    const transaction = await prisma.personalTransaction.create({
      data: {
        agencyId,
        accountId: data.accountId,
        date: new Date(data.date),
        type: data.type,
        amount: data.amount,
        description: data.description.trim(),
        partyName: data.partyName?.trim() || null,
        partyPhone: data.partyPhone?.trim() || null,
        paymentMode: data.paymentMode || null,
        referenceNo: data.referenceNo?.trim() || null,
        tags: data.tags || [],
        receiptBase64: data.receiptBase64 || null,
        notes: data.notes?.trim() || null,
        linkedModule: data.linkedModule || null,
        linkedRecordId: data.linkedRecordId || null,
        udhaariId: data.udhaariId || null,
        addedById: userId,
      },
    });

    // Update account balance
    await recalculateAccountBalance(data.accountId);

    revalidatePath("/admin/accounts");
    revalidatePath(`/admin/accounts/${data.accountId}`);
    return { success: true, transaction };
  } catch (error: any) {
    return { error: error.message || "Failed to add transaction" };
  }
}

export async function addTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  data: {
    date: Date | string;
    description?: string;
    paymentMode?: string;
    referenceNo?: string;
    notes?: string;
  }
) {
  try {
    const { agencyId, userId } = await requireAdmin();



    if (amount <= 0) return { error: "Amount must be greater than zero" };
    if (fromAccountId === toAccountId) return { error: "Source and destination accounts must be different" };

    const [fromAccount, toAccount] = await Promise.all([
      prisma.personalAccount.findFirst({ where: { id: fromAccountId, agencyId } }),
      prisma.personalAccount.findFirst({ where: { id: toAccountId, agencyId } }),
    ]);

    if (!fromAccount || !toAccount) return { error: "One or both accounts not found" };

    const transferDate = new Date(data.date);
    const refNo = data.referenceNo?.trim() || null;
    const defaultDescription = `Transfer from ${fromAccount.name} to ${toAccount.name}`;
    const desc = data.description?.trim() || defaultDescription;

    // Use Prisma transaction to perform atomic double-entry transfer
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create TRANSFER_OUT txn in source account
      const outTxn = await tx.personalTransaction.create({
        data: {
          agencyId,
          accountId: fromAccountId,
          date: transferDate,
          type: "TRANSFER_OUT",
          amount,
          description: desc,
          paymentMode: data.paymentMode || "BANK_TRANSFER",
          referenceNo: refNo,
          toAccountId,
          notes: data.notes?.trim() || null,
          addedById: userId,
        },
      });

      // 2. Create TRANSFER_IN txn in destination account, referencing the first transaction
      const inTxn = await tx.personalTransaction.create({
        data: {
          agencyId,
          accountId: toAccountId,
          date: transferDate,
          type: "TRANSFER_IN",
          amount,
          description: desc,
          paymentMode: data.paymentMode || "BANK_TRANSFER",
          referenceNo: refNo,
          linkedRecordId: outTxn.id, // Reference companion txn ID
          notes: data.notes?.trim() || null,
          addedById: userId,
        },
      });

      // 3. Update the source transaction's link to point back to destination transaction
      await tx.personalTransaction.update({
        where: { id: outTxn.id },
        data: { linkedRecordId: inTxn.id },
      });

      return { outTxn, inTxn };
    });

    // Recalculate balances
    await Promise.all([
      recalculateAccountBalance(fromAccountId),
      recalculateAccountBalance(toAccountId),
    ]);

    revalidatePath("/admin/accounts");
    revalidatePath(`/admin/accounts/${fromAccountId}`);
    revalidatePath(`/admin/accounts/${toAccountId}`);
    return { success: true, transferOut: result.outTxn, transferIn: result.inTxn };
  } catch (error: any) {
    return { error: error.message || "Failed to execute transfer" };
  }
}

export async function editTransaction(
  id: string,
  data: {
    date?: Date | string;
    amount?: number;
    description?: string;
    partyName?: string;
    partyPhone?: string;
    paymentMode?: string;
    referenceNo?: string;
    tags?: string[];
    notes?: string;
  }
) {
  try {
    const { agencyId } = await requireAdmin();

    const existingTxn = await prisma.personalTransaction.findFirst({
      where: { id, agencyId },
    });
    if (!existingTxn) return { error: "Transaction not found" };



    const originalAmount = existingTxn.amount;
    const isAmountChanged = data.amount !== undefined && data.amount !== originalAmount;

    // Handle Transfer companion update if this is a transfer
    if (existingTxn.type === "TRANSFER_OUT" || existingTxn.type === "TRANSFER_IN") {
      const companionId = existingTxn.linkedRecordId;
      if (companionId) {
        await prisma.personalTransaction.updateMany({
          where: { id: companionId, agencyId },
          data: {
            ...(data.date ? { date: new Date(data.date) } : {}),
            ...(data.amount ? { amount: data.amount } : {}),
            ...(data.description ? { description: data.description.trim() } : {}),
            ...(data.paymentMode ? { paymentMode: data.paymentMode } : {}),
            ...(data.referenceNo ? { referenceNo: data.referenceNo.trim() } : {}),
            ...(data.notes ? { notes: data.notes.trim() } : {}),
          },
        });
      }
    }

    const updatedTxn = await prisma.personalTransaction.update({
      where: { id, agencyId },
      data: {
        ...(data.date ? { date: new Date(data.date) } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        partyName: data.partyName !== undefined ? data.partyName?.trim() || null : existingTxn.partyName,
        partyPhone: data.partyPhone !== undefined ? data.partyPhone?.trim() || null : existingTxn.partyPhone,
        paymentMode: data.paymentMode !== undefined ? data.paymentMode || null : existingTxn.paymentMode,
        referenceNo: data.referenceNo !== undefined ? data.referenceNo?.trim() || null : existingTxn.referenceNo,
        tags: data.tags !== undefined ? data.tags : existingTxn.tags,
        notes: data.notes !== undefined ? data.notes?.trim() || null : existingTxn.notes,
      },
    });

    // Recalculate balance for this account
    await recalculateAccountBalance(existingTxn.accountId);

    // If it's a transfer, recalculate the companion account balance too
    if (existingTxn.type === "TRANSFER_OUT" && existingTxn.toAccountId) {
      await recalculateAccountBalance(existingTxn.toAccountId);
    } else if (existingTxn.type === "TRANSFER_IN" && existingTxn.linkedRecordId) {
      const comp = await prisma.personalTransaction.findFirst({
        where: { id: existingTxn.linkedRecordId, agencyId },
        select: { accountId: true },
      });
      if (comp) {
        await recalculateAccountBalance(comp.accountId);
      }
    }

    revalidatePath("/admin/accounts");
    revalidatePath(`/admin/accounts/${existingTxn.accountId}`);
    return { success: true, transaction: updatedTxn };
  } catch (error: any) {
    return { error: error.message || "Failed to edit transaction" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const { agencyId } = await requireAdmin();

    const existingTxn = await prisma.personalTransaction.findFirst({
      where: { id, agencyId },
    });
    if (!existingTxn) return { error: "Transaction not found" };



    const companionId = existingTxn.linkedRecordId;
    const isTransfer = existingTxn.type === "TRANSFER_OUT" || existingTxn.type === "TRANSFER_IN";

    // Delete transaction(s)
    await prisma.$transaction(async (tx) => {
      await tx.personalTransaction.delete({
        where: { id, agencyId },
      });

      if (isTransfer && companionId) {
        await tx.personalTransaction.deleteMany({
          where: { id: companionId, agencyId },
        });
      }
    });

    // Recalculate main account balance
    await recalculateAccountBalance(existingTxn.accountId);

    // Recalculate companion account balance if it was a transfer
    if (existingTxn.type === "TRANSFER_OUT" && existingTxn.toAccountId) {
      await recalculateAccountBalance(existingTxn.toAccountId);
    } else if (existingTxn.type === "TRANSFER_IN" && companionId) {
      // Find companion accountId to recalculate
      const comp = await prisma.personalTransaction.findFirst({
        where: { id: companionId, agencyId },
      });
      if (comp) {
        await recalculateAccountBalance(comp.accountId);
      }
    }

    revalidatePath("/admin/accounts");
    revalidatePath(`/admin/accounts/${existingTxn.accountId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete transaction" };
  }
}

export async function getTransactions(
  accountId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: PersonalTxnType;
    fromDate?: string;
    toDate?: string;
  }
) {
  try {
    const { agencyId } = await requireAdmin();

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
      accountId,
    };

    if (params?.search) {
      where.OR = [
        { description: { contains: params.search, mode: "insensitive" } },
        { partyName: { contains: params.search, mode: "insensitive" } },
        { referenceNo: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.fromDate || params?.toDate) {
      where.date = {};
      if (params.fromDate) {
        where.date.gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        where.date.lte = new Date(params.toDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.personalTransaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.personalTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch transactions" };
  }
}

export async function getAccountStatement(
  accountId: string,
  fromDate: string,
  toDate: string
) {
  try {
    const { agencyId } = await requireAdmin();

    const transactions = await prisma.personalTransaction.findMany({
      where: {
        agencyId,
        accountId,
        date: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      orderBy: { date: "asc" },
    });

    return { transactions };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch statement data" };
  }
}

export async function linkToAgencyOperation(
  txnId: string,
  module: "SALARY" | "EXPENSE" | "COMPANY_PAYMENT" | "TRANSFER",
  recordId: string
) {
  try {
    const { agencyId } = await requireAdmin();

    const txn = await prisma.personalTransaction.update({
      where: { id: txnId, agencyId },
      data: {
        linkedModule: module,
        linkedRecordId: recordId,
      },
    });

    return { success: true, transaction: txn };
  } catch (error: any) {
    return { error: error.message || "Failed to link transaction" };
  }
}
