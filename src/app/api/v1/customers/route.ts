import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, requireScope } from "../_middleware";
import { prisma } from "@/lib/prisma";

// GET /api/v1/customers — list customers
export async function GET(req: NextRequest) {
  return withApiAuth(req, async (agencyId, scopes) => {
    if (!requireScope(scopes, "customers:read")) {
      return NextResponse.json({ error: "Insufficient scope: customers:read required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const search = searchParams.get("search") ?? "";

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: {
          agencyId,
          isActive: true,
          ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        },
        select: {
          id: true, name: true, phone: true, address: true,
          type: true, customerCode: true, createdAt: true,
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where: { agencyId, isActive: true } }),
    ]);

    return NextResponse.json({
      data: customers,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}
