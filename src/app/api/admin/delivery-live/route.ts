import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/delivery-live?date=YYYY-MM-DD
 *
 * Scope: Agency-specific
 * Returns:
 * 1. Deliveries completed on target date (with GPS tags)
 * 2. Live location heartbeats of delivery boys currently active
 */
export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const url = new URL(request.url);
  const dateQs = url.searchParams.get("date");
  const targetDate = dateQs ? new Date(dateQs) : new Date();
  
  const dateStart = new Date(targetDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(targetDate);
  dateEnd.setHours(23, 59, 59, 999);

  // 1. Fetch completed deliveries for agency on date
  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: dateStart, lte: dateEnd },
    },
    include: {
      customer: { select: { name: true, phone: true, address: true, type: true } },
      product: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch active attendance records for today (to show who has punched in)
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      date: dateStart,
      employee: { role: "DELIVERY_BOY" },
    },
    select: {
      employeeId: true,
      status: true,
      punchIn: true,
      punchOut: true,
      punchInLat: true,
      punchInLng: true,
      punchOutLat: true,
      punchOutLng: true,
      employee: { select: { name: true, role: true } },
    },
  });

  // 3. Build live locations from the latest completed delivery or punch-in
  const activeDeliveryBoys = new Map<string, {
    id: string;
    userId: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    updatedAt: string;
    user: { name: string; role: string };
  }>();

  // Start with punch-in locations
  attendanceRecords.forEach((att) => {
    if (att.punchInLat && att.punchInLng) {
      activeDeliveryBoys.set(att.employeeId, {
        id: `live-${att.employeeId}`,
        userId: att.employeeId,
        lat: att.punchInLat,
        lng: att.punchInLng,
        accuracy: null,
        updatedAt: att.punchIn ? new Date(att.punchIn).toISOString() : new Date().toISOString(),
        user: { name: att.employee.name, role: att.employee.role },
      });
    }
  });

  // Overwrite with the latest delivery coordinates (sorted oldest to newest)
  const sortedDeliveries = [...deliveries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  sortedDeliveries.forEach((d) => {
    if (d.deliveryLat && d.deliveryLng) {
      activeDeliveryBoys.set(d.deliveredById, {
        id: `live-${d.deliveredById}`,
        userId: d.deliveredById,
        lat: d.deliveryLat,
        lng: d.deliveryLng,
        accuracy: d.deliveryAccuracy,
        updatedAt: new Date(d.createdAt).toISOString(),
        user: { name: d.deliveredBy.name, role: "DELIVERY_BOY" },
      });
    }
  });

  const liveLocations = Array.from(activeDeliveryBoys.values());

  return NextResponse.json(
    {
      deliveries,
      liveLocations,
      attendanceRecords,
      fetchedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "X-Fetched-At": new Date().toISOString(),
      },
    }
  );
}
