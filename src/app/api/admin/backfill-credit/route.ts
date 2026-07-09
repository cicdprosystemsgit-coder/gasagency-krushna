import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/admin/backfill-credit
 * One-time admin tool: creates missing CreditLedgerEntry records for deliveries
 * where the delivery boy had selected "Credit (Pending)" payment mode (stored in notes).
 * Only accessible by ADMIN role.
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Find all deliveries with Credit in notes for this agency
  const creditDeliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId!,
      notes: { contains: "Credit", mode: "insensitive" },
    },
    include: {
      customer: { select: { id: true, name: true, type: true } },
      product: { select: { name: true, saleRate: true } },
    },
  });

  const results: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const delivery of creditDeliveries) {
    // Skip if a credit entry with same date already exists for this customer
    const existing = await prisma.creditLedgerEntry.findFirst({
      where: {
        customerId: delivery.customerId,
        agencyId: delivery.agencyId,
        type: "CREDIT",
        date: {
          gte: new Date(new Date(delivery.date).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(delivery.date).setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existing) {
      results.push(`SKIP: ${delivery.customer.name} on ${delivery.date.toLocaleDateString("en-IN")} — already has credit entry`);
      skipped++;
      continue;
    }

    const creditAmount =
      delivery.cashCollected > 0
        ? delivery.cashCollected
        : delivery.product.saleRate > 0
        ? delivery.product.saleRate * delivery.deliveredQty
        : 0;

    if (creditAmount <= 0) {
      results.push(`SKIP: ${delivery.customer.name} — can't determine amount (cashCollected=0, saleRate=0)`);
      skipped++;
      continue;
    }

    await prisma.creditLedgerEntry.create({
      data: {
        customerId: delivery.customerId,
        agencyId: delivery.agencyId,
        type: "CREDIT",
        amount: creditAmount,
        description: `Cylinder delivery — ${delivery.product.name} × ${delivery.deliveredQty} [${delivery.customer.type}] (Backfill — Credit pending)`,
        date: delivery.date,
        addedById: delivery.deliveredById,
      },
    });

    results.push(`CREATED: ${delivery.customer.name} — ₹${creditAmount} on ${delivery.date.toLocaleDateString("en-IN")}`);
    created++;
  }

  return NextResponse.json({
    summary: `${created} entries created, ${skipped} skipped out of ${creditDeliveries.length} credit delivery records`,
    results,
  });
}
