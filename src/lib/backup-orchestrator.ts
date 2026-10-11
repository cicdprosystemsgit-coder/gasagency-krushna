/**
 * src/lib/backup-orchestrator.ts
 * Unified backup coordinator for delivery proof photos.
 *
 * Design:
 *  - Downloads each Cloudinary image ONCE, uploads to both S3 and Google Drive
 *  - Handles DB URL updates (S3 is primary URL source)
 *  - Handles Cloudinary cleanup (only after at least one backend succeeds)
 *  - Error isolation: one backend failing doesn't block the other
 */

import { prisma } from "@/lib/prisma";
import { buildS3Key, uploadBufferToS3, isS3Configured, fetchBufferFromS3OrHttp } from "@/lib/s3-backup";
import { copyBufferToDrive, isDriveBackupConfigured, clearFolderCache } from "@/lib/gdrive-backup";
import { extractCloudinaryPublicId, deleteFromCloudinary } from "@/lib/cloudinary";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackupCounts {
  enabled: boolean;
  copied: number;
  skipped: number;
  failed: number;
  lastError?: string;
}

export interface BackupResult {
  total: number;
  s3: BackupCounts;
  drive: BackupCounts;
}

type PhotoType = "payment_receipt" | "customer_card" | "additional";

interface PhotoJob {
  deliveryId: string;
  agencyId: string;
  date: Date;
  type: PhotoType;
  url: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a flat list of photo jobs from delivery records.
 */
function buildPhotoJobs(
  records: Array<{
    id: string;
    agencyId: string;
    date: Date;
    paymentReceiptUrl?: string | null;
    customerCardUrl?: string | null;
    additionalImageUrl?: string | null;
  }>
): PhotoJob[] {
  const jobs: PhotoJob[] = [];
  for (const rec of records) {
    if (rec.paymentReceiptUrl) {
      jobs.push({ deliveryId: rec.id, agencyId: rec.agencyId, date: rec.date, type: "payment_receipt", url: rec.paymentReceiptUrl });
    }
    if (rec.customerCardUrl) {
      jobs.push({ deliveryId: rec.id, agencyId: rec.agencyId, date: rec.date, type: "customer_card", url: rec.customerCardUrl });
    }
    if (rec.additionalImageUrl) {
      jobs.push({ deliveryId: rec.id, agencyId: rec.agencyId, date: rec.date, type: "additional", url: rec.additionalImageUrl });
    }
  }
  return jobs;
}

/**
 * Update the DeliveryRecord URL in the database to point to the S3 URL.
 */
async function updateDeliveryRecordUrl(
  deliveryId: string,
  type: PhotoType,
  s3Url: string
): Promise<void> {
  const updateData: Record<string, string> = {};
  if (type === "payment_receipt") updateData.paymentReceiptUrl = s3Url;
  else if (type === "customer_card") updateData.customerCardUrl = s3Url;
  else if (type === "additional") updateData.additionalImageUrl = s3Url;

  try {
    await prisma.deliveryRecord.update({
      where: { id: deliveryId },
      data: updateData,
    });
  } catch (dbErr) {
    console.warn(`[Backup DB Update Warning] Failed to update delivery ${deliveryId}:`, dbErr);
  }
}

/**
 * Delete a photo from Cloudinary if the URL is a Cloudinary URL.
 */
async function cleanupCloudinary(url: string): Promise<void> {
  if (!url.includes("cloudinary.com")) return;
  const publicId = extractCloudinaryPublicId(url);
  if (publicId) {
    await deleteFromCloudinary(publicId);
  }
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * Execute a full backup of delivery photos to all configured backends (S3 + Google Drive).
 *
 * For each photo:
 *  1. Downloads the image from Cloudinary/current URL once
 *  2. Uploads the buffer to AWS S3 (if configured)
 *  3. Uploads the buffer to Google Drive (if configured)
 *  4. Updates DB URL to point to S3 (if S3 succeeded)
 *  5. Deletes from Cloudinary (if at least one backend succeeded)
 *
 * @returns Combined backup stats for both backends
 */
export async function executeFullBackup(
  records: Array<{
    id: string;
    agencyId: string;
    date: Date;
    paymentReceiptUrl?: string | null;
    customerCardUrl?: string | null;
    additionalImageUrl?: string | null;
  }>,
  options: { bucket?: string; batchSize?: number; agencyName?: string | null } = {}
): Promise<BackupResult> {
  const { bucket, batchSize = 10, agencyName } = options;

  const s3Enabled = isS3Configured();
  const driveEnabled = isDriveBackupConfigured();

  const s3Counts: BackupCounts = { enabled: s3Enabled, copied: 0, skipped: 0, failed: 0 };
  const driveCounts: BackupCounts = { enabled: driveEnabled, copied: 0, skipped: 0, failed: 0 };

  // Build flat job list
  const jobs = buildPhotoJobs(records);

  if (jobs.length === 0) {
    return { total: 0, s3: s3Counts, drive: driveCounts };
  }

  // Clear Drive folder cache for a fresh backup run
  if (driveEnabled) {
    clearFolderCache();
  }

  // Process in batches (sequential within each batch to respect Drive API rate limits)
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    for (const job of batch) {
      const alreadyInS3 = job.url.includes("amazonaws.com");

      // If already in S3 and Drive is not enabled, mark skipped and continue
      if (alreadyInS3 && !driveEnabled) {
        if (s3Enabled) s3Counts.skipped++;
        continue;
      }

      // ── Step 1: Download image once (from Cloudinary HTTP or S3 GetObject)
      let imageBuffer: Buffer;
      try {
        imageBuffer = await fetchBufferFromS3OrHttp(job.url, bucket);
      } catch (downloadErr) {
        console.error(`[Backup Download Error] ${job.url}:`, downloadErr);
        if (s3Enabled && !alreadyInS3) s3Counts.failed++;
        if (s3Enabled && alreadyInS3) s3Counts.skipped++;
        if (driveEnabled) driveCounts.failed++;
        continue;
      }

      let s3Success = alreadyInS3;
      let driveSuccess = false;
      let s3Url: string | null = null;

      // ── Step 2: Upload to AWS S3 ────────────────────────────────────────
      if (s3Enabled) {
        if (alreadyInS3) {
          s3Counts.skipped++;
          s3Success = true;
        } else {
          const s3Key = buildS3Key(job.agencyId, job.deliveryId, job.type, job.date, agencyName);
          const result = await uploadBufferToS3({
            imageBuffer,
            s3Key,
            sourceUrl: job.url,
            bucket,
          });

          if (result.success) {
            s3Success = true;
            s3Url = result.s3Url;
            if (result.skipped) s3Counts.skipped++;
            else s3Counts.copied++;
          } else {
            s3Counts.failed++;
            if (result.error && !s3Counts.lastError) s3Counts.lastError = result.error;
          }
        }
      }

      // ── Step 3: Upload to Google Drive ──────────────────────────────────
      if (driveEnabled) {
        const result = await copyBufferToDrive({
          imageBuffer,
          agencyId: job.agencyId,
          deliveryId: job.deliveryId,
          type: job.type,
          date: job.date,
          agencyName,
        });

        if (result.success) {
          driveSuccess = true;
          if (result.skipped) driveCounts.skipped++;
          else driveCounts.copied++;
        } else {
          driveCounts.failed++;
          if (result.error && !driveCounts.lastError) {
            driveCounts.lastError = result.error.includes("invalid_grant")
              ? "Token expired/revoked (invalid_grant)"
              : result.error;
          }
        }
      }

      // ── Step 4: Update DB URL to S3 (primary) ──────────────────────────
      if (s3Success && s3Url) {
        await updateDeliveryRecordUrl(job.deliveryId, job.type, s3Url);
      }

      // ── Step 5: Cleanup Cloudinary (if at least one backend succeeded) ─
      if (s3Success || driveSuccess) {
        await cleanupCloudinary(job.url);
      }
    }
  }

  return { total: jobs.length, s3: s3Counts, drive: driveCounts };
}
