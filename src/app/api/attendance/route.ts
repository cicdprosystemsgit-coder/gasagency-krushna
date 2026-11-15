import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
 * GET /api/attendance
 * Returns today's attendance record and past 14 days history for the current employee
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [todayRecord, history] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        agencyId: session.agencyId,
        employeeId: session.userId,
        date: today,
      },
    }),
    prisma.attendance.findMany({
      where: {
        agencyId: session.agencyId,
        employeeId: session.userId,
        date: { gte: fourteenDaysAgo },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    today: todayRecord,
    history,
  });
}

/**
 * POST /api/attendance
 * Body: { action: "punch_in" | "punch_out", lat?: number, lng?: number }
 */
export async function POST(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, lat, lng } = body ?? {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: today,
    },
  });

  if (action === "punch_in") {
    if (existing?.punchIn) {
      return NextResponse.json(
        { error: "Already punched in today" },
        { status: 400 }
      );
    }

    const now = new Date();
    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            punchIn: now,
            status: "PRESENT",
            punchInLat: typeof lat === "number" ? lat : null,
            punchInLng: typeof lng === "number" ? lng : null,
          },
        })
      : await prisma.attendance.create({
          data: {
            agencyId: session.agencyId,
            employeeId: session.userId,
            date: today,
            punchIn: now,
            status: "PRESENT",
            punchInLat: typeof lat === "number" ? lat : null,
            punchInLng: typeof lng === "number" ? lng : null,
          },
        });

    return NextResponse.json({ success: true, attendance });
  }

  if (action === "punch_out") {
    if (!existing?.punchIn) {
      return NextResponse.json(
        { error: "Must punch in before punching out" },
        { status: 400 }
      );
    }
    if (existing.punchOut) {
      return NextResponse.json(
        { error: "Already punched out today" },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        punchOut: new Date(),
        punchOutLat: typeof lat === "number" ? lat : null,
        punchOutLng: typeof lng === "number" ? lng : null,
      },
    });

    return NextResponse.json({ success: true, attendance });
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'punch_in' or 'punch_out'" },
    { status: 400 }
  );
}
