import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/attendance-live?date=YYYY-MM-DD
 *
 * Returns the full attendance summary for the given date (or today if omitted).
 * Polled by the Live Map view every 30 seconds to get fresh punch-in/out data.
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
  const today = dateQs ? new Date(dateQs) : new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all active employees for this agency
  const employees = await prisma.user.findMany({
    where: {
      agencyId: session.agencyId,
      isActive: true,
      role: { not: "SYSTEM_ADMIN" },
    },
    select: { id: true, name: true, role: true },
  });

  // Fetch attendance records for today
  const records = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      date: today,
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
    },
  });

  const recordMap = new Map(records.map((r) => [r.employeeId, r]));

  const data = employees.map((emp) => {
    const rec = recordMap.get(emp.id);
    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      status: rec?.status ?? "ABSENT",
      punchIn: rec?.punchIn ?? null,
      punchOut: rec?.punchOut ?? null,
      punchInLat: rec?.punchInLat ?? null,
      punchInLng: rec?.punchInLng ?? null,
      punchOutLat: rec?.punchOutLat ?? null,
      punchOutLng: rec?.punchOutLng ?? null,
    };
  });

  return NextResponse.json(
    { data, fetchedAt: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "X-Fetched-At": new Date().toISOString(),
      },
    }
  );
}
