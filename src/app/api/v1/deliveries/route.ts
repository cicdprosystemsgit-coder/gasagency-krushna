import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, requireScope } from "../_middleware";
import { prisma } from "@/lib/prisma";

// GET /api/v1/deliveries — delivery records (list or single by id)
export async function GET(req: NextRequest) {
  return withApiAuth(req, async (agencyId, scopes, userId) => {
    if (!requireScope(scopes, "deliveries:read")) {
      return NextResponse.json({ error: "Insufficient scope: deliveries:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Single delivery detail
    if (id) {
      const delivery = await prisma.deliveryRecord.findFirst({
        where: { id, agencyId },
        select: {
          id: true,
          date: true,
          deliveredQty: true,
          returnedQty: true,
          pendingQty: true,
          cashCollected: true,
          paymentMode: true,
          creditAmount: true,
          status: true,
          notes: true,
          deliveryLat: true,
          deliveryLng: true,
          deliveryAccuracy: true,
          paymentReceiptUrl: true,
          customerCardUrl: true,
          additionalImageUrl: true,
          photosCapturedAt: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              customerCode: true,
              areaRoute: true,
            },
          },
          product: { select: { id: true, name: true } },
          deliveredBy: { select: { id: true, name: true } },
        },
      });

      if (!delivery) {
        return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
      }

      return NextResponse.json({ data: delivery });
    }

    // List deliveries
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const mineOnly = searchParams.get("mine") === "true";

    const where: Record<string, unknown> = { agencyId };
    if (mineOnly && userId) {
      where.deliveredById = userId;
    }

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveryRecord.findMany({
        where,
        select: {
          id: true,
          date: true,
          deliveredQty: true,
          returnedQty: true,
          pendingQty: true,
          cashCollected: true,
          paymentMode: true,
          creditAmount: true,
          status: true,
          deliveryLat: true,
          deliveryLng: true,
          paymentReceiptUrl: true,
          customerCardUrl: true,
          additionalImageUrl: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              customerCode: true,
              areaRoute: true,
            },
          },
          product: { select: { id: true, name: true } },
          deliveredBy: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deliveryRecord.count({ where }),
    ]);

    return NextResponse.json({
      data: deliveries,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}

// PATCH /api/v1/deliveries — update delivery record (status, GPS, photos, payment)
export async function PATCH(req: NextRequest) {
  return withApiAuth(req, async (agencyId, scopes) => {
    if (!requireScope(scopes, "deliveries:write")) {
      return NextResponse.json({ error: "Insufficient scope: deliveries:write required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      status,
      deliveredQty,
      returnedQty,
      pendingQty,
      cashCollected,
      paymentMode,
      creditAmount,
      notes,
      deliveryLat,
      deliveryLng,
      deliveryAccuracy,
      paymentReceiptUrl,
      customerCardUrl,
      additionalImageUrl,
    } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "Delivery id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (deliveredQty !== undefined) updateData.deliveredQty = Number(deliveredQty);
    if (returnedQty !== undefined) updateData.returnedQty = Number(returnedQty);
    if (pendingQty !== undefined) updateData.pendingQty = Number(pendingQty);
    if (cashCollected !== undefined) updateData.cashCollected = Number(cashCollected);
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (creditAmount !== undefined) updateData.creditAmount = Number(creditAmount);
    if (notes !== undefined) updateData.notes = notes;
    if (deliveryLat !== undefined) updateData.deliveryLat = Number(deliveryLat);
    if (deliveryLng !== undefined) updateData.deliveryLng = Number(deliveryLng);
    if (deliveryAccuracy !== undefined) updateData.deliveryAccuracy = Number(deliveryAccuracy);
    if (paymentReceiptUrl !== undefined) updateData.paymentReceiptUrl = paymentReceiptUrl;
    if (customerCardUrl !== undefined) updateData.customerCardUrl = customerCardUrl;
    if (additionalImageUrl !== undefined) updateData.additionalImageUrl = additionalImageUrl;

    if (paymentReceiptUrl || customerCardUrl || additionalImageUrl) {
      updateData.photosCapturedAt = new Date();
    }

    const updated = await prisma.deliveryRecord.update({
      where: { id, agencyId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  });
}
