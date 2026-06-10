import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, requireScope } from "../_middleware";
import { prisma } from "@/lib/prisma";

// GET /api/v1/deliveries — delivery records
export async function GET(req: NextRequest) {
  return withApiAuth(req, async (agencyId, scopes) => {
    if (!requireScope(scopes, "deliveries:read")) {
      return NextResponse.json({ error: "Insufficient scope: deliveries:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    const where: Record<string, unknown> = { agencyId };
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
          id: true, date: true, deliveredQty: true, pendingQty: true,
          cashCollected: true, createdAt: true,
          customer: { select: { name: true, phone: true } },
          product: { select: { name: true } },
          deliveredBy: { select: { name: true } },
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
