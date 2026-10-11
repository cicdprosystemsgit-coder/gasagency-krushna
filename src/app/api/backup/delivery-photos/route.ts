/**
 * src/app/api/backup/delivery-photos/route.ts
 *
 * POST — Admin triggers a backup of delivery proof photos for a given date range.
 *        Accepts { startDate, endDate } in the request body (ISO date strings).
 *        Creates a DeliveryPhotoBackup log record and returns stats on completion.
 *
 * GET  — Two modes:
 *   1. ?preview=true&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *        Returns per-day breakdown of photos that WOULD be backed up, without
 *        actually triggering any backup. Used for pre-confirmation preview.
 *   2. (no preview param) → Returns the last 15 backup log entries.
 *
 * HEAD — Poll a single backup status by ID (?id=<backupId>).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeFullBackup } from "@/lib/backup-orchestrator";
import { isS3Configured, buildAgencyFolderName } from "@/lib/s3-backup";
import { isDriveBackupConfigured } from "@/lib/gdrive-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large date-range backups

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse and validate a date range from startDate / endDate strings.
 * Returns { fromDate, toDate } or an error string.
 */
function parseDateRange(
  startDateStr: string | null,
  endDateStr: string | null
): { fromDate: Date; toDate: Date } | { error: string } {
  if (!startDateStr || !endDateStr) {
    return { error: "Both startDate and endDate are required." };
  }

  // Append time so Date() doesn't drift due to UTC interpretation
  const fromDate = new Date(`${startDateStr}T00:00:00`);
  const toDate = new Date(`${endDateStr}T23:59:59`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { error: "Invalid date format. Use YYYY-MM-DD." };
  }
  if (fromDate > toDate) {
    return { error: "Start date must be on or before end date." };
  }

  const maxRange = 365; // safety ceiling
  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > maxRange) {
    return { error: `Date range too large (max ${maxRange} days).` };
  }

  return { fromDate, toDate };
}

// ── Backup Executor ───────────────────────────────────────────────────────────

/**
 * Direct async backup runner — coordinates S3 + Google Drive via orchestrator.
 */
async function executeBackup(
  backupId: string,
  agencyId: string,
  fromDate: Date,
  toDate: Date
) {
  try {
    // Fetch agency name for human-readable folder formatting ({agencyName}_{agencyId})
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { name: true },
    });
    const agencyName = agency?.name ?? null;

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

    const bucket = process.env.AWS_S3_BACKUP_BUCKET;
    const result = await executeFullBackup(records, {
      bucket: bucket || undefined,
      agencyName,
    });

    // Determine overall status
    const s3AllFailed =
      result.s3.enabled && result.s3.copied === 0 && result.s3.skipped === 0 && result.s3.failed > 0;
    const driveAllFailed =
      result.drive.enabled && result.drive.copied === 0 && result.drive.skipped === 0 && result.drive.failed > 0;

    const allEnabledFailed =
      (result.s3.enabled ? s3AllFailed : true) && (result.drive.enabled ? driveAllFailed : true);

    const status = allEnabledFailed && result.total > 0 ? "FAILED" : "COMPLETED";

    const errorParts: string[] = [];
    if (result.s3.enabled && result.s3.failed > 0)
      errorParts.push(
        `S3: ${result.s3.failed} failed${result.s3.lastError ? ` (${result.s3.lastError})` : ""}`
      );
    if (result.drive.enabled && result.drive.failed > 0)
      errorParts.push(
        `Drive: ${result.drive.failed} failed${result.drive.lastError ? ` (${result.drive.lastError})` : ""}`
      );

    await prisma.deliveryPhotoBackup.update({
      where: { id: backupId },
      data: {
        status,
        finishedAt: new Date(),
        totalPhotos: result.total,
        copiedPhotos: result.s3.copied,
        skippedPhotos: result.s3.skipped,
        failedPhotos: result.s3.failed,
        driveEnabled: result.drive.enabled,
        driveCopiedPhotos: result.drive.copied,
        driveSkippedPhotos: result.drive.skipped,
        driveFailedPhotos: result.drive.failed,
        errorMessage: errorParts.length > 0 ? errorParts.join("; ") : null,
      },
    });
  } catch (err) {
    console.error("[Backup Error]:", err);
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

export async function POST(req: NextRequest) {
  try {
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

    const s3Ready = isS3Configured();
    const driveReady = isDriveBackupConfigured();
    if (!s3Ready && !driveReady) {
      return NextResponse.json(
        {
          error:
            "No backup backend configured. Add AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BACKUP_BUCKET) or Google Drive credentials (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN) to your .env file.",
        },
        { status: 503 }
      );
    }

    // Parse date range from request body
    const body = await req.json().catch(() => ({}));
    const dateRange = parseDateRange(
      body.startDate as string | null,
      body.endDate as string | null
    );

    if ("error" in dateRange) {
      return NextResponse.json({ error: dateRange.error }, { status: 400 });
    }

    const { fromDate, toDate } = dateRange;

    // Fetch agency for folder naming ({agencyName}_{agencyId})
    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { name: true },
    });
    const agencyFolder = buildAgencyFolderName(session.agencyId, agency?.name);

    // Create backup log record with RUNNING status
    const backup = await prisma.deliveryPhotoBackup.create({
      data: {
        agencyId: session.agencyId,
        triggeredById: session.userId,
        status: "RUNNING",
        fromDate,
        toDate,
        s3Bucket: s3Ready ? process.env.AWS_S3_BACKUP_BUCKET : null,
        s3Prefix: s3Ready ? `agencies/${agencyFolder}/backups` : null,
        driveEnabled: driveReady,
      },
    });

    // Execute backup synchronously (within serverless timeout)
    await executeBackup(backup.id, session.agencyId, fromDate, toDate);

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
        driveEnabled: updatedBackup?.driveEnabled ?? false,
        driveCopiedPhotos: updatedBackup?.driveCopiedPhotos ?? 0,
        driveSkippedPhotos: updatedBackup?.driveSkippedPhotos ?? 0,
        driveFailedPhotos: updatedBackup?.driveFailedPhotos ?? 0,
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

// ── GET: Backup history  OR  Date-range preview ───────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    // ── Preview mode: return per-day photo counts without triggering backup ──
    if (searchParams.get("preview") === "true") {
      const dateRange = parseDateRange(
        searchParams.get("startDate"),
        searchParams.get("endDate")
      );

      if ("error" in dateRange) {
        return NextResponse.json({ error: dateRange.error }, { status: 400 });
      }

      const { fromDate, toDate } = dateRange;

      // Fetch agency details for folder preview
      const agency = await prisma.agency.findUnique({
        where: { id: session.agencyId },
        select: { name: true },
      });
      const agencyFolder = buildAgencyFolderName(session.agencyId, agency?.name);

      const records = await prisma.deliveryRecord.findMany({
        where: {
          agencyId: session.agencyId,
          date: { gte: fromDate, lte: toDate },
          OR: [
            { paymentReceiptUrl: { not: null } },
            { customerCardUrl: { not: null } },
            { additionalImageUrl: { not: null } },
          ],
        },
        select: {
          date: true,
          paymentReceiptUrl: true,
          customerCardUrl: true,
          additionalImageUrl: true,
        },
        orderBy: { date: "asc" },
      });

      // Build per-day summary for pre-confirmation display
      const dayMap = new Map<
        string,
        { date: string; deliveries: number; photos: number }
      >();

      let totalPhotos = 0;
      let totalDeliveries = 0;

      for (const rec of records) {
        const dateKey = rec.date.toISOString().split("T")[0]; // YYYY-MM-DD
        const photoCount =
          (rec.paymentReceiptUrl ? 1 : 0) +
          (rec.customerCardUrl ? 1 : 0) +
          (rec.additionalImageUrl ? 1 : 0);

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { date: dateKey, deliveries: 0, photos: 0 });
          totalDeliveries++;
        }
        const day = dayMap.get(dateKey)!;
        day.deliveries++;
        day.photos += photoCount;
        totalPhotos += photoCount;
      }

      return NextResponse.json({
        preview: true,
        agencyName: agency?.name || null,
        agencyFolder,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        totalDeliveries: records.length,
        totalPhotos,
        days: Array.from(dayMap.values()),
      });
    }

    // ── History mode: return last 15 backup log entries ──────────────────────

    // Auto-cleanup stale RUNNING records older than 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.deliveryPhotoBackup.updateMany({
      where: {
        agencyId: session.agencyId,
        status: "RUNNING",
        startedAt: { lt: tenMinAgo },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Timed out — backup did not complete within 10 minutes.",
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

// ── HEAD: Poll single backup status ───────────────────────────────────────────
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
