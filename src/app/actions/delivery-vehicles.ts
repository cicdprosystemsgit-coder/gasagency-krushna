"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Delivery Vehicles ─────────────────────────────────────────────────────

export async function createDeliveryVehicle(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { error: "Unauthorized" };

    const vehicleNo = (formData.get("vehicleNo") as string)?.trim().toUpperCase();
    const vehicleName = (formData.get("vehicleName") as string)?.trim();
    const vehicleType = (formData.get("vehicleType") as string) || "Two-Wheeler";
    const assignedToId = (formData.get("assignedToId") as string) || null;
    const notes = (formData.get("notes") as string) || null;

    if (!vehicleNo) return { error: "Vehicle number is required" };
    if (!vehicleName) return { error: "Vehicle name is required" };

    // If assigning, unassign previous vehicle of that delivery boy first
    if (assignedToId) {
      await prisma.deliveryVehicle.updateMany({
        where: { assignedToId, agencyId: session.agencyId },
        data: { assignedToId: null },
      });
    }

    const vehicle = await prisma.deliveryVehicle.create({
      data: {
        vehicleNo,
        vehicleName,
        vehicleType,
        assignedToId,
        notes,
        agencyId: session.agencyId,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/admin/vehicle-management");
    revalidatePath("/manager/vehicle-management");
    return { vehicle };
  } catch (e) {
    console.error("[createDeliveryVehicle]", e);
    return { error: "Failed to create vehicle. Please try again." };
  }
}

export async function updateDeliveryVehicle(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
      return { error: "Unauthorized" };

    const vehicleNo = (formData.get("vehicleNo") as string)?.trim().toUpperCase();
    const vehicleName = (formData.get("vehicleName") as string)?.trim();
    const vehicleType = (formData.get("vehicleType") as string) || "Two-Wheeler";
    const assignedToId = (formData.get("assignedToId") as string) || null;
    const notes = (formData.get("notes") as string) || null;
    const status = (formData.get("status") as string) || "ACTIVE";

    if (!vehicleNo) return { error: "Vehicle number is required" };

    // If assigning to a new delivery boy, first clear any existing assignment for that boy
    if (assignedToId) {
      await prisma.deliveryVehicle.updateMany({
        where: { assignedToId, agencyId: session.agencyId, id: { not: id } },
        data: { assignedToId: null },
      });
    }

    const vehicle = await prisma.deliveryVehicle.update({
      where: { id },
      data: { vehicleNo, vehicleName, vehicleType, assignedToId, notes, status: status as "ACTIVE" | "INACTIVE" | "MAINTENANCE" },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/admin/vehicle-management");
    revalidatePath("/manager/vehicle-management");
    return { vehicle };
  } catch (e) {
    console.error("[updateDeliveryVehicle]", e);
    return { error: "Failed to update vehicle." };
  }
}

export async function deleteDeliveryVehicle(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN" || !session.agencyId)
      return { error: "Unauthorized" };

    await prisma.deliveryVehicle.delete({ where: { id } });
    revalidatePath("/admin/godown");
    revalidatePath("/admin/vehicle-management");
    return { success: true };
  } catch (e) {
    console.error("[deleteDeliveryVehicle]", e);
    return { error: "Failed to delete vehicle." };
  }
}

// ─── Vehicle Trip Logs ─────────────────────────────────────────────────────

export async function createVehicleTripLog(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER", "GODOWN_KEEPER"].includes(session.role) || !session.agencyId)
      return { error: "Unauthorized" };

    const vehicleId = formData.get("vehicleId") as string;
    if (!vehicleId) return { error: "Vehicle is required" };

    const dateStr = formData.get("date") as string;
    const departureStr = formData.get("departureTime") as string;

    const itemsStr = formData.get("items") as string;
    let items = null;
    let cylindersLoaded = Number(formData.get("cylindersLoaded")) || 0;

    if (itemsStr) {
      try {
        items = JSON.parse(itemsStr);
        if (Array.isArray(items)) {
          cylindersLoaded = items.reduce((sum, item) => sum + (Number(item.loaded) || 0), 0);
        }
      } catch (parseErr) {
        console.error("[createVehicleTripLog] JSON parse error on items:", parseErr);
      }
    }

    const tripLog = await prisma.vehicleTripLog.create({
      data: {
        vehicleId,
        date: dateStr ? new Date(dateStr) : new Date(),
        cylindersLoaded,
        cylindersReturned: 0,
        cylindersDelivered: 0,
        items: items || undefined,
        departureTime: departureStr ? new Date(departureStr) : null,
        returnTime: null,
        tripStatus: "LOADED",
        notes: (formData.get("notes") as string) || null,
        recordedById: session.userId,
        agencyId: session.agencyId,
      },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    });

    revalidatePath("/godown-keeper");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/admin/godown");
    revalidatePath("/admin/vehicle-management");
    revalidatePath("/manager/vehicle-management");
    return {
      tripLog: {
        ...tripLog,
        date:          (tripLog.date as Date).toISOString(),
        departureTime: tripLog.departureTime ? (tripLog.departureTime as Date).toISOString() : null,
        returnTime:    tripLog.returnTime    ? (tripLog.returnTime    as Date).toISOString() : null,
        createdAt:     (tripLog.createdAt    as Date).toISOString(),
        updatedAt:     (tripLog.updatedAt    as Date).toISOString(),
      },
    };
  } catch (e) {
    console.error("[createVehicleTripLog]", e);
    return { error: "Failed to record trip. Please try again." };
  }
}

export async function updateTripStatus(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER", "GODOWN_KEEPER"].includes(session.role) || !session.agencyId)
      return { error: "Unauthorized" };

    const tripStatus = formData.get("tripStatus") as string;
    const returnTimeStr = formData.get("returnTime") as string;
    const itemsStr = formData.get("items") as string;

    let cylindersReturned = Number(formData.get("cylindersReturned")) || 0;
    let cylindersDelivered = Number(formData.get("cylindersDelivered")) || 0;
    let items = null;

    if (itemsStr) {
      try {
        items = JSON.parse(itemsStr);
        if (Array.isArray(items)) {
          cylindersReturned = items.reduce((sum, item) => sum + (Number(item.unsoldReturned) || 0), 0);
          cylindersDelivered = items.reduce((sum, item) => sum + (Number(item.emptyReturned) || 0), 0);
        }
      } catch (parseErr) {
        console.error("[updateTripStatus] JSON parse error on items:", parseErr);
      }
    }

    const updated = await prisma.vehicleTripLog.update({
      where: { id },
      data: {
        tripStatus: tripStatus as "LOADED" | "OUT_FOR_DELIVERY" | "RETURNED" | "PARTIAL_RETURN",
        returnTime: returnTimeStr ? new Date(returnTimeStr) : undefined,
        cylindersReturned,
        cylindersDelivered,
        items: items || undefined,
      },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleName: true, assignedTo: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    });

    revalidatePath("/godown-keeper");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/admin/godown");
    revalidatePath("/admin/vehicle-management");
    revalidatePath("/manager/vehicle-management");
    return {
      tripLog: {
        ...updated,
        date:          (updated.date          as Date).toISOString(),
        departureTime: updated.departureTime ? (updated.departureTime as Date).toISOString() : null,
        returnTime:    updated.returnTime    ? (updated.returnTime    as Date).toISOString() : null,
        createdAt:     (updated.createdAt    as Date).toISOString(),
        updatedAt:     (updated.updatedAt    as Date).toISOString(),
      },
    };
  } catch (e) {
    console.error("[updateTripStatus]", e);
    return { error: "Failed to update trip status." };
  }
}

