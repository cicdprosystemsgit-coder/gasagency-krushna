"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createGodownRecord(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const vehicleNo = (formData.get("vehicleNo") as string)?.trim().toUpperCase();
    if (!vehicleNo) return { error: "Vehicle number required" };

    const entryDateStr = formData.get("entryDate") as string;
    if (!entryDateStr) return { error: "Entry date required" };

    const itemsStr = formData.get("items") as string;
    let items = null;
    let filledCylindersReceived = Number(formData.get("filledCylindersReceived")) || 0;
    let emptyCylindersReturned = Number(formData.get("emptyCylindersReturned")) || 0;

    if (itemsStr) {
      try {
        items = JSON.parse(itemsStr);
        if (Array.isArray(items)) {
          filledCylindersReceived = items.reduce((sum, item) => sum + (Number(item.filledReceived) || 0), 0);
          emptyCylindersReturned = items.reduce((sum, item) => sum + (Number(item.emptyReturned) || 0), 0);
        }
      } catch (parseErr) {
        console.error("[createGodownRecord] JSON parse error on items:", parseErr);
      }
    }

    const record = await prisma.godownRecord.create({
      data: {
        vehicleNo,
        entryDate: new Date(entryDateStr),
        filledCylindersReceived,
        emptyCylindersReturned,
        items: items || undefined,
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
    console.error("[createGodownRecord]", e);
    return { error: "Failed to save record. Please try again." };
  }
}

export async function approveGodownRecord(id: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { success: false, error: "Unauthorized" };

    await prisma.godownRecord.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    return { success: true };
  } catch (e) {
    console.error("[approveGodownRecord]", e);
    return { success: false, error: "Failed to approve record." };
  }
}
