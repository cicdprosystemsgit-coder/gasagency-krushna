import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyRolesWithLink } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
  let session = await getSession();
  if (!session) {
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      session = await verifySession(auth.slice(7));
    }
  }
  return session;
}

/**
 * GET /api/daily-closing
 * Query params: ?date=YYYY-MM-DD
 * Returns shift closing metrics for the current user (or agency for managers)
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const isManagement = ["ADMIN", "MANAGER", "SYSTEM_ADMIN"].includes(session.role);

  const where: Record<string, unknown> = {
    agencyId: session.agencyId,
    date: { gte: start, lte: end },
  };

  // If not admin/manager, filter to own deliveries only
  if (!isManagement) {
    where.deliveredById = session.userId;
  }

  const [deliveries, submittedSummary] = await Promise.all([
    prisma.deliveryRecord.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.dailySummary.findFirst({
      where: {
        agencyId: session.agencyId,
        date: { gte: start, lte: end },
        ...(isManagement ? {} : { submittedById: session.userId }),
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let totalDelivered = 0;
  let totalReturned = 0;
  let totalPending = 0;
  let totalCash = 0;
  let totalOnline = 0;
  let totalCredit = 0;

  for (const d of deliveries) {
    totalDelivered += d.deliveredQty || 0;
    totalReturned += d.returnedQty || 0;
    totalPending += d.pendingQty || 0;

    if (d.paymentMode === "CREDIT") {
      totalCredit += d.creditAmount || d.cashCollected || 0;
    } else if (["GPay", "PhonePe", "Paytm", "ONLINE", "UPI"].includes(d.paymentMode)) {
      totalOnline += d.cashCollected || 0;
    } else {
      totalCash += d.cashCollected || 0;
    }
  }

  return NextResponse.json({
    date: dateStr,
    totalDeliveries: deliveries.length,
    totalDelivered,
    totalReturned,
    totalPending,
    totalCash,
    totalOnline,
    totalCredit,
    grandTotalValue: totalCash + totalOnline + totalCredit,
    submittedSummary,
    deliveries: deliveries.slice(0, 50),
  });
}

/**
 * POST /api/daily-closing
 * Body: { date: string, notes?: string, physicalCashHandover?: number }
 * Submits shift closing record
 */
export async function POST(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { date, notes, physicalCashHandover } = body ?? {};

  const summaryDate = date ? new Date(date) : new Date();
  summaryDate.setHours(0, 0, 0, 0);

  const start = new Date(summaryDate);
  const end = new Date(summaryDate);
  end.setHours(23, 59, 59, 999);

  // Calculate stats at the moment of closing
  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId,
      deliveredById: session.userId,
      date: { gte: start, lte: end },
    },
  });

  let totalDelivered = 0;
  let totalReturned = 0;
  let totalCash = 0;
  let totalOnline = 0;
  let totalCredit = 0;

  for (const d of deliveries) {
    totalDelivered += d.deliveredQty || 0;
    totalReturned += d.returnedQty || 0;
    if (d.paymentMode === "CREDIT") {
      totalCredit += d.creditAmount || d.cashCollected || 0;
    } else if (["GPay", "PhonePe", "Paytm", "ONLINE", "UPI"].includes(d.paymentMode)) {
      totalOnline += d.cashCollected || 0;
    } else {
      totalCash += d.cashCollected || 0;
    }
  }

  const summary = await prisma.dailySummary.create({
    data: {
      date: summaryDate,
      submittedById: session.userId,
      agencyId: session.agencyId,
      status: "PENDING",
      summaryData: {
        deliveriesCount: deliveries.length,
        totalDelivered,
        totalReturned,
        totalCash,
        totalOnline,
        totalCredit,
        physicalCashHandover: Number(physicalCashHandover) || totalCash,
        notes: notes || "",
        submittedAt: new Date().toISOString(),
      },
    },
  });

  const dateStr = summaryDate.toISOString().split("T")[0];
  await notifyRolesWithLink({
    agencyId: session.agencyId,
    roles: ["ADMIN", "MANAGER"],
    type: "DAILY_SUMMARY",
    title: "Daily Closing Submitted",
    body: `${session.name || "An employee"} submitted daily closing for ${dateStr} (${deliveries.length} deliveries, ₹${totalCash} cash).`,
    subPath: "/approvals?tab=daily",
    excludeUserId: session.userId,
  });

  return NextResponse.json({ success: true, summary });
}

