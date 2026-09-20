"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DeliveryRequestStatus } from "@/generated/prisma";

export interface DeliveryCountItemInput {
  productId: string;
  productName: string;
  requestedQty: number;
}

export interface FulfillItemInput {
  productId: string;
  productName: string;
  loadedQty: number;
}

export async function submitDeliveryCountRequest(data: {
  date: string;
  items: DeliveryCountItemInput[];
  notes?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  if (!["DELIVERY_BOY", "ADMIN", "MANAGER"].includes(session.role)) {
    return { error: "Only delivery boys or managers can submit delivery count requests" };
  }

  if (!data.items || data.items.length === 0) {
    return { error: "Please specify at least one product quantity" };
  }

  const validItems = data.items.filter((item) => Number(item.requestedQty) > 0);
  if (validItems.length === 0) {
    return { error: "Total requested quantity must be greater than 0" };
  }

  const totalRequested = validItems.reduce((sum, item) => sum + Number(item.requestedQty), 0);

  const parsedDate = new Date(data.date || new Date().toISOString());

  try {
    const request = await prisma.deliveryCountRequest.create({
      data: {
        date: parsedDate,
        requestedById: session.userId,
        items: validItems as any,
        totalRequested,
        notes: data.notes?.trim() || null,
        status: DeliveryRequestStatus.PENDING,
        agencyId: session.agencyId,
      },
      include: {
        requestedBy: { select: { id: true, name: true, phone: true } },
      },
    });

    revalidatePath("/delivery-boy/delivery-count");
    revalidatePath("/delivery-boy/monthly-report");
    revalidatePath("/delivery-boy");
    revalidatePath("/admin/approvals");
    revalidatePath("/manager/approvals");
    revalidatePath("/admin/delivery-requests");
    revalidatePath("/manager/delivery-requests");
    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper/godown");

    return { success: true, request };
  } catch (error) {
    console.error("[submitDeliveryCountRequest]", error);
    return { error: "Failed to submit delivery count request" };
  }
}

export async function cancelDeliveryCountRequest(id: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  try {
    const existing = await prisma.deliveryCountRequest.findFirst({
      where: {
        id,
        agencyId: session.agencyId,
        requestedById: session.role === "DELIVERY_BOY" ? session.userId : undefined,
        status: DeliveryRequestStatus.PENDING,
      },
    });

    if (!existing) {
      return { error: "Request not found or cannot be cancelled" };
    }

    await prisma.deliveryCountRequest.delete({
      where: { id },
    });

    revalidatePath("/delivery-boy/delivery-count");
    revalidatePath("/delivery-boy/monthly-report");
    revalidatePath("/delivery-boy");
    revalidatePath("/admin/approvals");
    revalidatePath("/manager/approvals");

    return { success: true };
  } catch (error) {
    console.error("[cancelDeliveryCountRequest]", error);
    return { error: "Failed to cancel request" };
  }
}

export async function reviewDeliveryCountRequest(
  id: string,
  action: "APPROVED" | "REJECTED",
  reviewNote?: string
) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  if (action === "REJECTED" && !reviewNote?.trim()) {
    return { error: "Rejection note is required" };
  }

  try {
    const updated = await prisma.deliveryCountRequest.update({
      where: { id, agencyId: session.agencyId },
      data: {
        status: action as DeliveryRequestStatus,
        reviewedById: session.userId,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, name: true, phone: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/manager/approvals");
    revalidatePath("/admin/delivery-requests");
    revalidatePath("/manager/delivery-requests");
    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper/delivery-requests");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/delivery-boy/delivery-count");
    revalidatePath("/delivery-boy/monthly-report");
    revalidatePath("/delivery-boy");

    return { success: true, request: updated };
  } catch (error) {
    console.error("[reviewDeliveryCountRequest]", error);
    return { error: "Failed to review delivery count request" };
  }
}

export async function bulkReviewDeliveryCountRequests(
  ids: string[],
  action: "APPROVED" | "REJECTED",
  reviewNote?: string
) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.deliveryCountRequest.updateMany({
      where: {
        id: { in: ids },
        agencyId: session.agencyId,
        status: DeliveryRequestStatus.PENDING,
      },
      data: {
        status: action as DeliveryRequestStatus,
        reviewedById: session.userId,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/manager/approvals");
    revalidatePath("/admin/delivery-requests");
    revalidatePath("/manager/delivery-requests");
    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/godown-keeper/delivery-requests");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/delivery-boy/delivery-count");
    revalidatePath("/delivery-boy/monthly-report");
    revalidatePath("/delivery-boy");

    return { success: true, count: ids.length };
  } catch (error) {
    console.error("[bulkReviewDeliveryCountRequests]", error);
    return { error: "Failed to perform bulk review" };
  }
}

export async function fulfillDeliveryCountRequest(
  id: string,
  data: {
    fulfilledItems: FulfillItemInput[];
    fuelLitres?: number;
    fuelAmount?: number;
    fuelType?: string;
    godownNotes?: string;
  }
) {
  const session = await getSession();
  if (
    !session ||
    !["GODOWN_KEEPER", "ADMIN", "MANAGER"].includes(session.role) ||
    !session.agencyId
  ) {
    return { error: "Unauthorized. Godown keeper access required." };
  }

  try {
    const existing = await prisma.deliveryCountRequest.findFirst({
      where: { id, agencyId: session.agencyId },
    });

    if (!existing) return { error: "Request not found" };
    if (existing.status !== DeliveryRequestStatus.APPROVED) {
      return { error: `Request must be APPROVED before vehicle loading (Current status: ${existing.status})` };
    }

    const totalLoaded = (data.fulfilledItems || []).reduce(
      (sum, item) => sum + (Number(item.loadedQty) || 0),
      0
    );

    const tripItems = (data.fulfilledItems || []).map((it) => ({
      productId: it.productId,
      productName: it.productName,
      loaded: Number(it.loadedQty) || 0,
      unsoldReturned: 0,
      emptyReturned: 0,
    }));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the delivery count request to FULFILLED
      const updated = await tx.deliveryCountRequest.update({
        where: { id },
        data: {
          status: DeliveryRequestStatus.FULFILLED,
          fulfilledById: session.userId,
          fulfilledItems: (data.fulfilledItems as any) || [],
          totalLoaded,
          fuelLitres: data.fuelLitres != null && !isNaN(Number(data.fuelLitres)) ? Number(data.fuelLitres) : null,
          fuelAmount: data.fuelAmount != null && !isNaN(Number(data.fuelAmount)) ? Number(data.fuelAmount) : null,
          fuelType: data.fuelType?.trim() || null,
          godownNotes: data.godownNotes?.trim() || null,
          fulfilledAt: new Date(),
        },
        include: {
          requestedBy: { select: { id: true, name: true, phone: true } },
          fulfilledBy: { select: { id: true, name: true } },
        },
      });

      // 2. Synchronize with Old Flow: Find delivery boy's assigned vehicle
      const vehicle = await tx.deliveryVehicle.findUnique({
        where: { assignedToId: existing.requestedById },
      });

      if (vehicle) {
        // Range for today's date of this request
        const todayStart = new Date(existing.date);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(existing.date);
        todayEnd.setHours(23, 59, 59, 999);

        // Check if there is an existing VehicleTripLog for this vehicle today
        const existingTrip = await tx.vehicleTripLog.findFirst({
          where: {
            vehicleId: vehicle.id,
            date: { gte: todayStart, lte: todayEnd },
          },
        });

        if (existingTrip) {
          await tx.vehicleTripLog.update({
            where: { id: existingTrip.id },
            data: {
              cylindersLoaded: totalLoaded,
              items: tripItems as any,
              departureTime: existingTrip.departureTime || new Date(),
              tripStatus: "OUT_FOR_DELIVERY",
              notes: data.godownNotes || existingTrip.notes,
            },
          });
        } else {
          await tx.vehicleTripLog.create({
            data: {
              vehicleId: vehicle.id,
              date: existing.date,
              cylindersLoaded: totalLoaded,
              cylindersReturned: 0,
              cylindersDelivered: 0,
              items: tripItems as any,
              departureTime: new Date(),
              tripStatus: "OUT_FOR_DELIVERY",
              notes: data.godownNotes || "Loaded via daily delivery count request",
              recordedById: session.userId,
              agencyId: session.agencyId!,
            },
          });
        }
      }

      // 3. Synchronize with Old Flow: Automatically record Fuel Expense if fuelAmount > 0
      if (data.fuelAmount && Number(data.fuelAmount) > 0) {
        const fuelCategory = await tx.expenseCategory.findFirst({
          where: { agencyId: session.agencyId!, name: { equals: "Fuel", mode: "insensitive" } },
        });

        await tx.expense.create({
          data: {
            date: existing.date,
            amount: Number(data.fuelAmount),
            category: fuelCategory?.name || "Fuel",
            categoryId: fuelCategory?.id || null,
            description: `Vehicle Fuel (${data.fuelType || "Petrol"} ${data.fuelLitres || 0}L) - ${
              vehicle ? `${vehicle.vehicleNo} (${vehicle.vehicleName})` : "Delivery Vehicle"
            } [${updated.requestedBy.name}]`,
            addedById: session.userId,
            agencyId: session.agencyId!,
          },
        });
      }

      return updated;
    });

    // Revalidate all pages across BOTH old and new flows
    revalidatePath("/godown-keeper/delivery-requests");
    revalidatePath("/godown-keeper/godown");
    revalidatePath("/godown-keeper");
    revalidatePath("/admin/delivery-requests");
    revalidatePath("/manager/delivery-requests");
    revalidatePath("/admin/godown");
    revalidatePath("/manager/godown");
    revalidatePath("/admin/vehicle-management");
    revalidatePath("/manager/vehicle-management");
    revalidatePath("/admin/expenses");
    revalidatePath("/manager/expenses");
    revalidatePath("/delivery-boy/delivery-count");
    revalidatePath("/delivery-boy/monthly-report");
    revalidatePath("/delivery-boy");
    revalidatePath("/delivery-boy/my-deliveries");

    return { success: true, request: result };
  } catch (error) {
    console.error("[fulfillDeliveryCountRequest]", error);
    return { error: "Failed to fulfill vehicle loading request" };
  }
}

