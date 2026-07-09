"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface CylinderItem {
  productId: string;
  productName: string;
  qty: number;
}

export interface GodownItemsJson {
  entryItems: CylinderItem[];
  exitDate?: string;
  exitItems?: CylinderItem[];
  exitNotes?: string;
}

/* ── Create Entry Record ─────────────────────────────────────────────────────── */

export async function createGodownEntry(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const vehicleNo = (formData.get("vehicleNo") as string)?.trim().toUpperCase();
    if (!vehicleNo) return { error: "Vehicle number is required" };

    const entryDateStr = formData.get("entryDate") as string;
    if (!entryDateStr) return { error: "Entry date is required" };

    const entryItemsStr = formData.get("entryItems") as string;
    let entryItems: CylinderItem[] = [];
    if (entryItemsStr) {
      try { entryItems = JSON.parse(entryItemsStr); } catch { /* ignore */ }
    }

    const filledCylindersReceived = entryItems.reduce((s, i) => s + (i.qty || 0), 0);

    const itemsJson: GodownItemsJson = { entryItems };

    const record = await prisma.godownRecord.create({
      data: {
        vehicleNo,
        entryDate: new Date(entryDateStr),
        filledCylindersReceived,
        emptyCylindersReturned: 0,
        items: itemsJson as any,
        notes: (formData.get("notes") as string) || null,
        submittedById: session.userId,
        agencyId: session.agencyId,
        status: "PENDING",
      },
      include: { submittedBy: { select: { name: true } } },
    });

    return {
      record: {
        ...record,
        entryDate: record.entryDate.toISOString(),
        approvedAt: record.approvedAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    console.error("[createGodownEntry]", e);
    return { error: "Failed to save entry. Please try again." };
  }
}

/* ── Record Exit ─────────────────────────────────────────────────────────────── */

export async function recordGodownExit(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const recordId = formData.get("recordId") as string;
    if (!recordId) return { error: "Record ID is required" };

    const exitDateStr = formData.get("exitDate") as string;
    if (!exitDateStr) return { error: "Exit date is required" };

    const exitItemsStr = formData.get("exitItems") as string;
    let exitItems: CylinderItem[] = [];
    if (exitItemsStr) {
      try { exitItems = JSON.parse(exitItemsStr); } catch { /* ignore */ }
    }

    const emptyCylindersReturned = exitItems.reduce((s, i) => s + (i.qty || 0), 0);
    const exitNotes = (formData.get("exitNotes") as string) || undefined;

    // Fetch existing record
    const existing = await prisma.godownRecord.findUnique({
      where: { id: recordId, agencyId: session.agencyId },
    });
    if (!existing) return { error: "Record not found" };

    // Merge items JSON
    const existingItems = (existing.items as any) || { entryItems: [] };
    const updatedItems: GodownItemsJson = {
      entryItems: existingItems.entryItems || [],
      exitDate: exitDateStr,
      exitItems,
      ...(exitNotes ? { exitNotes } : {}),
    };

    const updated = await prisma.godownRecord.update({
      where: { id: recordId },
      data: {
        emptyCylindersReturned,
        items: updatedItems as any,
      },
      include: { submittedBy: { select: { name: true } } },
    });

    return {
      record: {
        ...updated,
        entryDate: updated.entryDate.toISOString(),
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    console.error("[recordGodownExit]", e);
    return { error: "Failed to save exit. Please try again." };
  }
}

/* ── Approve Record ──────────────────────────────────────────────────────────── */

export async function approveGodownRecord(id: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { success: false, error: "Unauthorized" };

    const record = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
    });

    if (!record) return { success: false, error: "Record not found" };
    if (record.status === "APPROVED") return { success: false, error: "Record already approved" };

    // Update status
    await prisma.godownRecord.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });

    // Create GodownInventory movements
    const items = record.items as any;
    if (items) {
      const entryItems = items.entryItems || [];
      const exitItems = items.exitItems || [];

      // Create RECEIVED movements for entry items
      for (const item of entryItems) {
        if (item.productId && item.qty > 0) {
          await prisma.godownInventory.create({
            data: {
              date: record.entryDate,
              moveType: "RECEIVED",
              productId: item.productId,
              qty: item.qty,
              notes: `Approved: Co. Vehicle Entry (${record.vehicleNo})`,
              recordedById: record.submittedById,
              agencyId: record.agencyId,
            },
          });
        }
      }

      // Create DISPATCHED movements for exit items
      const exitDateStr = items.exitDate || record.entryDate.toISOString();
      for (const item of exitItems) {
        if (item.productId && item.qty > 0) {
          await prisma.godownInventory.create({
            data: {
              date: new Date(exitDateStr),
              moveType: "DISPATCHED",
              productId: item.productId,
              qty: item.qty,
              notes: `Approved: Co. Vehicle Exit (${record.vehicleNo})`,
              recordedById: record.submittedById,
              agencyId: record.agencyId,
            },
          });
        }
      }
    }

    return { success: true };
  } catch (e) {
    console.error("[approveGodownRecord]", e);
    return { success: false, error: "Failed to approve record." };
  }
}

/* ── Legacy compat (old form) ────────────────────────────────────────────────── */

export async function createGodownRecord(formData: FormData) {
  return createGodownEntry(formData);
}

/* ── Add Cylinder Type ───────────────────────────────────────────────────────── */

export async function addCylinderType(name: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required" };

    const product = await prisma.product.create({
      data: {
        name: trimmed,
        isCylinder: true,
        isActive: true,
        agencyId: session.agencyId,
      },
    });

    return { product: { id: product.id, name: product.name } };
  } catch (e) {
    console.error("[addCylinderType]", e);
    return { error: "Failed to add cylinder type." };
  }
}
