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
 * GET /api/notifications
 * Returns user's in-app notifications
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        agencyId: session.agencyId,
        userId: session.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: {
        agencyId: session.agencyId,
        userId: session.userId,
        isRead: false,
      },
    }),
  ]);

  return NextResponse.json({ data: notifications, unreadCount });
}

/**
 * PATCH /api/notifications
 * Body: { id?: string, all?: boolean }
 * Marks single notification or all as read
 */
export async function PATCH(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, all } = body ?? {};

  if (all) {
    await prisma.notification.updateMany({
      where: { agencyId: session.agencyId, userId: session.userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (id) {
    await prisma.notification.updateMany({
      where: { id, agencyId: session.agencyId, userId: session.userId },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or all=true" }, { status: 400 });
}

/**
 * POST /api/notifications
 * Body: { pushToken: string }
 * Register an Expo push notification token
 */
export async function POST(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { pushToken } = body ?? {};

  if (!pushToken || typeof pushToken !== "string") {
    return NextResponse.json({ error: "pushToken is required" }, { status: 400 });
  }

  // Create an initial welcome notification if none exists
  const existingCount = await prisma.notification.count({
    where: { agencyId: session.agencyId, userId: session.userId },
  });

  if (existingCount === 0) {
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: session.userId,
        type: "SYSTEM_WELCOME",
        title: "Mobile App Connected",
        body: "Your device is now registered to receive alerts and notifications.",
      },
    });
  }

  return NextResponse.json({ success: true, message: "Push token registered" });
}

