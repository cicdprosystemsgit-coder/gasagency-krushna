"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const BranchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(100),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  phone: z.string().optional(),
  managerId: z.string().optional(),
});

// ── Get all branches ──────────────────────────────────────────────────────────
export async function getBranches() {
  const session = await getSession();
  if (!session || !session.agencyId) return { branches: [] };

  const branches = await prisma.branch.findMany({
    where: { agencyId: session.agencyId, isActive: true },
    orderBy: { name: "asc" },
  });

  return { branches };
}

// ── Create branch ─────────────────────────────────────────────────────────────
export async function createBranch(data: unknown) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const parsed = BranchSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const branch = await prisma.branch.create({
    data: {
      agencyId: session.agencyId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      phone: parsed.data.phone ?? null,
      managerId: parsed.data.managerId ?? null,
    },
  });

  revalidatePath("/admin/branches");
  return { branch };
}

// ── Update branch ─────────────────────────────────────────────────────────────
export async function updateBranch(id: string, data: unknown) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const parsed = BranchSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const branch = await prisma.branch.update({
    where: { id, agencyId: session.agencyId },
    data: parsed.data,
  });

  revalidatePath("/admin/branches");
  return { branch };
}

// ── Deactivate branch ─────────────────────────────────────────────────────────
export async function deactivateBranch(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  await prisma.branch.update({
    where: { id, agencyId: session.agencyId },
    data: { isActive: false },
  });

  revalidatePath("/admin/branches");
  return { success: true };
}

// ── Cross-branch inventory transfer ──────────────────────────────────────────
const TransferSchema = z.object({
  fromBranchId: z.string().min(1, "Source branch is required"),
  toBranchId:   z.string().min(1, "Destination branch is required"),
  productId:    z.string().min(1, "Product is required"),
  qty:          z.number().int().positive("Quantity must be a positive integer"),
  notes:        z.string().optional(),
});

export async function transferBranchStock(data: unknown) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const parsed = TransferSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { fromBranchId, toBranchId, productId, qty, notes } = parsed.data;

  if (fromBranchId === toBranchId) return { error: "Source and destination branch must differ" };

  // Verify both branches belong to this agency
  const [from, to] = await Promise.all([
    prisma.branch.findFirst({ where: { id: fromBranchId, agencyId: session.agencyId, isActive: true } }),
    prisma.branch.findFirst({ where: { id: toBranchId,   agencyId: session.agencyId, isActive: true } }),
  ]);
  if (!from) return { error: "Source branch not found" };
  if (!to)   return { error: "Destination branch not found" };

  // Record as two GodownInventory moves: DISPATCHED from source, RECEIVED at destination
  const now = new Date();
  await prisma.$transaction([
    prisma.godownInventory.create({
      data: {
        date: now, moveType: "DISPATCHED", productId, qty,
        notes: notes ?? `Transfer to ${to.name}`,
        recordedById: session.userId,
        agencyId: session.agencyId,
        batchNo: `XFER-${fromBranchId.slice(-4)}-${toBranchId.slice(-4)}`,
      },
    }),
    prisma.godownInventory.create({
      data: {
        date: now, moveType: "RECEIVED", productId, qty,
        notes: notes ?? `Transfer from ${from.name}`,
        recordedById: session.userId,
        agencyId: session.agencyId,
        batchNo: `XFER-${fromBranchId.slice(-4)}-${toBranchId.slice(-4)}`,
      },
    }),
  ]);

  revalidatePath("/admin/branches");
  return { success: true, from: from.name, to: to.name, qty };
}

// ── Get branch managers (users with MANAGER role) ─────────────────────────────
export async function getBranchManagers() {
  const session = await getSession();
  if (!session || !session.agencyId) return { managers: [] };

  const managers = await prisma.user.findMany({
    where: { agencyId: session.agencyId, role: "MANAGER", isActive: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  return { managers };
}
