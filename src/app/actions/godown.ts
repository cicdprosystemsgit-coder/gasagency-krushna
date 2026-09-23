"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

    const entryLat = formData.get("entryLat") ? Number(formData.get("entryLat")) : null;
    const entryLng = formData.get("entryLng") ? Number(formData.get("entryLng")) : null;
    const entryAccuracy = formData.get("entryAccuracy") ? Number(formData.get("entryAccuracy")) : null;

    const ervNo = (formData.get("ervNo") as string)?.trim() || null;
    const ervDateStr = formData.get("ervDate") as string;
    const ervDate = ervDateStr ? new Date(ervDateStr) : null;

    const itemsJson: GodownItemsJson = { entryItems };

    const record = await prisma.godownRecord.create({
      data: {
        vehicleNo,
        entryDate: new Date(entryDateStr),
        filledCylindersReceived,
        emptyCylindersReturned: 0,
        items: itemsJson as any,
        notes: (formData.get("notes") as string) || null,
        ervNo,
        ervDate,
        submittedById: session.userId,
        agencyId: session.agencyId,
        status: "PENDING",
        entryLat,
        entryLng,
        entryAccuracy,
      },
      include: { submittedBy: { select: { name: true } } },
    });

    return {
      record: {
        ...record,
        entryDate: record.entryDate.toISOString(),
        ervDate: record.ervDate?.toISOString() ?? null,
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

    const ervNo = (formData.get("ervNo") as string)?.trim() || null;
    const ervDateStr = formData.get("ervDate") as string;
    const ervDate = ervDateStr ? new Date(ervDateStr) : null;

    const exitLat = formData.get("exitLat") ? Number(formData.get("exitLat")) : null;
    const exitLng = formData.get("exitLng") ? Number(formData.get("exitLng")) : null;
    const exitAccuracy = formData.get("exitAccuracy") ? Number(formData.get("exitAccuracy")) : null;

    const updated = await prisma.godownRecord.update({
      where: { id: recordId },
      data: {
        emptyCylindersReturned,
        items: updatedItems as any,
        exitLat,
        exitLng,
        exitAccuracy,
        ervNo,
        ervDate,
      },
      include: { submittedBy: { select: { name: true } } },
    });

    // Sync DISPATCHED inventory movements: delete previous, create new
    await prisma.godownInventory.deleteMany({
      where: {
        agencyId: session.agencyId,
        moveType: "DISPATCHED",
        notes: {
          contains: `Co. Vehicle Exit (${existing.vehicleNo})`,
        },
      },
    });

    for (const item of exitItems) {
      if (item.productId && item.qty > 0) {
        await prisma.godownInventory.create({
          data: {
            date: new Date(exitDateStr),
            moveType: "DISPATCHED",
            productId: item.productId,
            qty: item.qty,
            notes: `Co. Vehicle Exit (${existing.vehicleNo})`,
            recordedById: existing.submittedById,
            agencyId: existing.agencyId,
          },
        });
      }
    }

    return {
      record: {
        ...updated,
        entryDate: updated.entryDate.toISOString(),
        ervDate: updated.ervDate?.toISOString() ?? null,
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

/* ── Reject Record ──────────────────────────────────────────────────────────── */

export async function rejectGodownRecord(id: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { success: false, error: "Unauthorized" };

    const record = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
    });

    if (!record) return { success: false, error: "Record not found" };
    if (record.status === "APPROVED") return { success: false, error: "Record already approved" };

    // Update status to REJECTED
    await prisma.godownRecord.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return { success: true };
  } catch (e) {
    console.error("[rejectGodownRecord]", e);
    return { success: false, error: "Failed to reject record." };
  }
}

/* ── Update Entry Record ─────────────────────────────────────────────────────── */

export async function updateGodownEntry(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { error: "Unauthorized" };

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

    const ervNo = (formData.get("ervNo") as string)?.trim() || null;
    const ervDateStr = formData.get("ervDate") as string;
    const ervDate = ervDateStr ? new Date(ervDateStr) : null;

    // Fetch existing record to merge items JSON and get previous status
    const existing = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
    });
    if (!existing) return { error: "Record not found" };

    const existingItems = (existing.items as any) || {};
    const itemsJson: GodownItemsJson = {
      entryItems,
      exitDate: existingItems.exitDate,
      exitItems: existingItems.exitItems,
      exitNotes: existingItems.exitNotes,
    };

    const updated = await prisma.godownRecord.update({
      where: { id, agencyId: session.agencyId },
      data: {
        vehicleNo,
        entryDate: new Date(entryDateStr),
        filledCylindersReceived,
        items: itemsJson as any,
        notes: (formData.get("notes") as string) || null,
        ervNo,
        ervDate,
      },
      include: { submittedBy: { select: { name: true } } },
    });

    // If already approved, sync RECEIVED inventory movements
    if (existing.status === "APPROVED") {
      await prisma.godownInventory.deleteMany({
        where: {
          agencyId: session.agencyId,
          moveType: "RECEIVED",
          notes: {
            contains: `Co. Vehicle Entry (${existing.vehicleNo})`,
          },
        },
      });

      for (const item of entryItems) {
        if (item.productId && item.qty > 0) {
          await prisma.godownInventory.create({
            data: {
              date: new Date(entryDateStr),
              moveType: "RECEIVED",
              productId: item.productId,
              qty: item.qty,
              notes: `Approved: Co. Vehicle Entry (${vehicleNo})`,
              recordedById: existing.submittedById,
              agencyId: existing.agencyId,
            },
          });
        }
      }
    }

    return {
      record: {
        ...updated,
        entryDate: updated.entryDate.toISOString(),
        ervDate: updated.ervDate?.toISOString() ?? null,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    console.error("[updateGodownEntry]", e);
    return { error: "Failed to update entry. Please try again." };
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

/* ── Soft Delete Godown Record ────────────────────────────────────────────────── */

export async function softDeleteGodownRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
      return { success: false, error: "Unauthorized" };
    }
    if (!id) return { success: false, error: "Record ID is required" };

    const record = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
    });
    if (!record) return { success: false, error: "Record not found" };

    await prisma.godownRecord.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // If record was approved, remove associated inventory movements so stock count reflects deletion
    if (record.status === "APPROVED") {
      await prisma.godownInventory.deleteMany({
        where: {
          agencyId: session.agencyId,
          notes: {
            contains: `(${record.vehicleNo})`,
          },
        },
      });
    }

    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper/inventory");
    revalidatePath("/admin/inventory");
    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("[softDeleteGodownRecord]", err);
    return { success: false, error: err?.message || "Failed to delete record" };
  }
}

/* ── Restore Godown Record ────────────────────────────────────────────────────── */

export async function restoreGodownRecord(id: string): Promise<{ success: boolean; record?: any; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
      return { success: false, error: "Unauthorized" };
    }
    if (!id) return { success: false, error: "Record ID is required" };

    const record = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
      include: { submittedBy: { select: { name: true } } },
    });
    if (!record) return { success: false, error: "Record not found" };

    const updated = await prisma.godownRecord.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
      include: { submittedBy: { select: { name: true } } },
    });

    // If record was approved, restore GodownInventory movements
    if (record.status === "APPROVED" && record.items) {
      const items = record.items as any;
      const entryItems = items.entryItems || [];
      const exitItems = items.exitItems || [];

      // Clean any existing first to avoid duplicate movements
      await prisma.godownInventory.deleteMany({
        where: {
          agencyId: session.agencyId,
          notes: {
            contains: `(${record.vehicleNo})`,
          },
        },
      });

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

    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper/inventory");
    revalidatePath("/admin/inventory");
    revalidatePath("/manager/inventory");
    return {
      success: true,
      record: {
        ...updated,
        entryDate: updated.entryDate.toISOString(),
        ervDate: updated.ervDate?.toISOString() ?? null,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("[restoreGodownRecord]", err);
    return { success: false, error: err?.message || "Failed to restore record" };
  }
}

/* ── Permanent Delete Godown Record ───────────────────────────────────────────── */

export async function permanentDeleteGodownRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN" || !session.agencyId) {
      return { success: false, error: "Unauthorized: Admin access required for permanent deletion" };
    }
    if (!id) return { success: false, error: "Record ID is required" };

    const record = await prisma.godownRecord.findUnique({
      where: { id, agencyId: session.agencyId },
    });
    if (!record) return { success: false, error: "Record not found" };

    // Clean up any inventory movement records
    await prisma.godownInventory.deleteMany({
      where: {
        agencyId: session.agencyId,
        notes: {
          contains: `(${record.vehicleNo})`,
        },
      },
    });

    await prisma.godownRecord.delete({
      where: { id },
    });

    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper/inventory");
    revalidatePath("/admin/inventory");
    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("[permanentDeleteGodownRecord]", err);
    return { success: false, error: err?.message || "Failed to permanently delete record" };
  }
}

