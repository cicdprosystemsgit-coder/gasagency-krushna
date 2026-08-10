/**
 * src/app/api/backup/delivery-photos/route.ts
 *
 * POST — Admin triggers a backup of all delivery proof photos (last 15 days) to S3.
 *        Creates a DeliveryPhotoBackup log record and fires an Inngest event.
 *        Returns immediately with backupId.
 *
 * GET  — Returns the last 15 backup log entries for the current agency.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backupDeliveryPhotos } from "@/lib/s3-backup";

/**
 * Direct async background runner for S3 sync (No Inngest account required)
 */
async function executeDirectS3Backup(
  backupId: string,
  agencyId: string,
  fromDate: Date,
  toDate: Date
) {
  try {
    const records = await prisma.deliveryRecord.findMany({
      where: {
        agencyId,
        date: { gte: fromDate, lte: toDate },
        OR: [
          { paymentReceiptUrl: { not: null } },
          { customerCardUrl: { not: null } },
          { additionalImageUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        agencyId: true,
        date: true,
        paymentReceiptUrl: true,
        customerCardUrl: true,
        additionalImageUrl: true,
      },
    });

    const bucket = process.env.AWS_S3_BACKUP_BUCKET!;
    const counts = await backupDeliveryPhotos(records, { bucket });

    await prisma.deliveryPhotoBackup.update({
      where: { id: backupId },
      data: {
        status: counts.failed > 0 && counts.copied === 0 && counts.skipped === 0 ? "FAILED" : "COMPLETED",
        finishedAt: new Date(),
        totalPhotos: counts.total,
        copiedPhotos: counts.copied,
        skippedPhotos: counts.skipped,
        failedPhotos: counts.failed,
        errorMessage: counts.failed > 0 ? `${counts.failed} photo(s) failed to sync` : null,
      },
    });
  } catch (err) {
    console.error("[Direct S3 Backup Error]:", err);
    await prisma.deliveryPhotoBackup.update({
      where: { id: backupId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

// ── POST: Trigger backup ──────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  try {
    // Auth — only ADMIN allowed
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can trigger backups." },
        { status: 403 }
      );
    }

    // Check for AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BACKUP_BUCKET) {
      return NextResponse.json(
        {
          error:
            "AWS credentials not configured. Add AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BACKUP_BUCKET to your .env file.",
        },
        { status: 503 }
      );
    }

    const now = new Date();
    const fromDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

    // Create backup log record with RUNNING status
    const backup = await prisma.deliveryPhotoBackup.create({
      data: {
        agencyId: session.agencyId,
        triggeredById: session.userId,
        status: "RUNNING",
        fromDate,
        toDate: now,
        s3Bucket: process.env.AWS_S3_BACKUP_BUCKET,
        s3Prefix: `agencies/${session.agencyId}`,
      },
    });

    // Fire direct backup execution
    await executeDirectS3Backup(backup.id, session.agencyId, fromDate, now);

    // Fetch updated backup record
    const updatedBackup = await prisma.deliveryPhotoBackup.findUnique({
      where: { id: backup.id },
    });

    return NextResponse.json(
      {
        backupId: backup.id,
        status: updatedBackup?.status ?? "COMPLETED",
        totalPhotos: updatedBackup?.totalPhotos ?? 0,
        copiedPhotos: updatedBackup?.copiedPhotos ?? 0,
        skippedPhotos: updatedBackup?.skippedPhotos ?? 0,
        failedPhotos: updatedBackup?.failedPhotos ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Backup API POST Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate photo backup" },
      { status: 500 }
    );
  }
}

// ── GET: Backup history ───────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Auto-cleanup stale RUNNING records older than 30 seconds
    const thirtySecAgo = new Date(Date.now() - 30 * 1000);
    await prisma.deliveryPhotoBackup.updateMany({
      where: {
        agencyId: session.agencyId,
        status: "RUNNING",
        startedAt: { lt: thirtySecAgo },
      },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    const backups = await prisma.deliveryPhotoBackup.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { startedAt: "desc" },
      take: 15,
      include: {
        triggeredBy: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json({ backups: backups || [] }, { status: 200 });
  } catch (error) {
    console.error("[Backup API GET Error]:", error);
    return NextResponse.json({ backups: [], error: "Failed to fetch backup logs" }, { status: 200 });
  }
}

// ── GET by ID: Poll single backup status ──────────────────────────────────────
// Used by UI to poll until COMPLETED/FAILED
export async function HEAD(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return new NextResponse(null, { status: 401 });

    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get("id");
    if (!backupId) return new NextResponse(null, { status: 400 });

    const backup = await prisma.deliveryPhotoBackup.findFirst({
      where: { id: backupId, agencyId: session.agencyId },
      select: { status: true },
    });

    if (!backup) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, { status: 200, headers: { "X-Backup-Status": backup.status } });
  } catch (error) {
    console.error("[Backup API HEAD Error]:", error);
    return new NextResponse(null, { status: 500 });
  }
}
