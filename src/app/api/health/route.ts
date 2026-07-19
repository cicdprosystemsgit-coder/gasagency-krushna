import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("health_check_failed", { error: String(err) });
    return NextResponse.json(
      { status: "error", db: "disconnected", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
