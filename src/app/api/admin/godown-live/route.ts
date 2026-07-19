import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/godown-live?date=YYYY-MM-DD
 *
 * Scope: Agency-specific
 * Returns:
 * 1. GodownRecords (Supply Vehicles Entry/Exit) with coordinates on target date
 * 2. VehicleTripLogs (Internal Deliveries Departure/Arrival) with coordinates on target date
 * 3. GodownInventory (Inventory movements in/out) with coordinates on target date
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

  // 1. Fetch GodownRecords (Supply Vehicles Entry/Exit)
  const godownRecords = await prisma.godownRecord.findMany({
    where: {
      agencyId: session.agencyId,
      entryDate: { gte: dateStart, lte: dateEnd },
    },
    include: {
      submittedBy: { select: { name: true } },
    },
    orderBy: { entryDate: "desc" },
  });

  // 2. Fetch VehicleTripLogs (Internal Trips Departure/Arrival)
  const tripLogs = await prisma.vehicleTripLog.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: dateStart, lte: dateEnd },
    },
    include: {
      vehicle: { select: { vehicleNo: true, vehicleName: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { departureTime: "desc" },
  });

  // 3. Fetch GodownInventory (Inventory Movements Receipt/Dispatch)
  const inventoryMovements = await prisma.godownInventory.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: dateStart, lte: dateEnd },
    },
    include: {
      product: { select: { name: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(
    {
      godownRecords,
      tripLogs,
      inventoryMovements,
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
