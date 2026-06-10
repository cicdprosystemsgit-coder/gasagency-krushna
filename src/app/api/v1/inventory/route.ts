import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, requireScope } from "../_middleware";
import { prisma } from "@/lib/prisma";

// GET /api/v1/inventory — current stock from GodownInventory moves (aggregated)
export async function GET(req: NextRequest) {
  return withApiAuth(req, async (agencyId, scopes) => {
    if (!requireScope(scopes, "inventory:read")) {
      return NextResponse.json({ error: "Insufficient scope: inventory:read required" }, { status: 403 });
    }

    // Aggregate qty by product and moveType
    const moves = await prisma.godownInventory.findMany({
      where: { agencyId },
      include: { product: { select: { name: true, unitCost: true, saleRate: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Group by product
    const productMap = new Map<string, { name: string; unitCost: number; saleRate: number; inQty: number; outQty: number }>();
    for (const move of moves) {
      const key = move.productId;
      if (!productMap.has(key)) {
        productMap.set(key, { name: move.product.name, unitCost: move.product.unitCost, saleRate: move.product.saleRate, inQty: 0, outQty: 0 });
      }
      const entry = productMap.get(key)!;
      if (move.moveType === "RECEIVED") entry.inQty += move.qty;
      else entry.outQty += move.qty;
    }

    const data = Array.from(productMap.entries()).map(([productId, v]) => ({
      productId,
      product: v.name,
      unitCost: v.unitCost,
      saleRate: v.saleRate,
      totalIn: v.inQty,
      totalOut: v.outQty,
      netStock: v.inQty - v.outQty,
    }));

    return NextResponse.json({
      data,
      meta: { total: data.length, timestamp: new Date().toISOString() },
    });
  });
}
