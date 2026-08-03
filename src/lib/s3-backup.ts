/**
 * src/lib/s3-backup.ts
 * AWS S3 utility for backing up Cloudinary delivery proof photos.
 *
 * Design:
 *  - Downloads each image from its Cloudinary URL as a Buffer
 *  - Uploads to S3 using PutObjectCommand
 *  - Uses HeadObjectCommand to check existence before upload (idempotent)
 *  - All per-agency data isolated under agencies/{agencyId}/ prefix
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";

import { prisma } from "@/lib/prisma";
import { extractCloudinaryPublicId, deleteFromCloudinary } from "@/lib/cloudinary";

// ── S3 Client Singleton ───────────────────────────────────────────────────────

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION ?? "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

const DEFAULT_BUCKET = process.env.AWS_S3_BACKUP_BUCKET ?? "gasagency-delivery-proofs-backup";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CopyResult {
  success: boolean;
  s3Key: string;
  s3Url: string;
  skipped: boolean; // true = already existed in S3
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the S3 key for a delivery proof photo.
 * Format: agencies/{agencyId}/{YYYY-MM}/{deliveryId}_{type}.jpg
 */
export function buildS3Key(
  agencyId: string,
  deliveryId: string,
  type: "payment_receipt" | "customer_card" | "additional",
  date: Date
): string {
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `agencies/${agencyId}/${yearMonth}/${deliveryId}_${type}.jpg`;
}

/**
 * Check if an S3 object already exists (HEAD request — no data transfer).
 * Returns false if the object doesn't exist or if AWS credentials are missing.
 */
export async function doesS3ObjectExist(
  s3Key: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return false;
  }
  try {
    const s3 = getS3Client();
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key })) as HeadObjectCommandOutput;
    return true;
  } catch (err: unknown) {
    // NoSuchKey or 404 = doesn't exist
    if (
      err instanceof Error &&
      ("name" in err) &&
      (err.name === "NotFound" || err.name === "NoSuchKey" || (err as NodeJS.ErrnoException).code === "404")
    ) {
      return false;
    }
    // Re-throw unexpected errors
    throw err;
  }
}

/**
 * Download an image from a URL and return it as a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Copy one Cloudinary URL to S3.
 * - Checks S3 first (idempotent — skips if already backed up)
 * - Downloads the image and streams it to S3
 * - Returns a structured result object
 */
export async function copyCloudinaryToS3(params: {
  cloudinaryUrl: string;
  s3Key: string;
  contentType?: string;
  bucket?: string;
}): Promise<CopyResult> {
  const { cloudinaryUrl, s3Key, contentType = "image/jpeg", bucket = DEFAULT_BUCKET } = params;

  const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION ?? "ap-south-1"}.amazonaws.com/${s3Key}`;

  try {
    // Idempotency check — skip if already in S3
    const exists = await doesS3ObjectExist(s3Key, bucket);
    if (exists) {
      return { success: true, s3Key, s3Url, skipped: true };
    }

    // Download from Cloudinary
    const imageBuffer = await fetchImageBuffer(cloudinaryUrl);

    // Upload to S3
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: contentType,
        // Server-side encryption at rest
        ServerSideEncryption: "AES256",
        Metadata: {
          "source-url": cloudinaryUrl,
          "backup-timestamp": new Date().toISOString(),
        },
      })
    );

    return { success: true, s3Key, s3Url, skipped: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, s3Key, s3Url, skipped: false, error: errorMsg };
  }
}

/**
 * Back up all photos from a set of DeliveryRecord entries to S3.
 * Processes in configurable batches to manage memory.
 *
 * Returns counts: { total, copied, skipped, failed }
 */
export async function backupDeliveryPhotos(
  records: Array<{
    id: string;
    agencyId: string;
    date: Date;
    paymentReceiptUrl?: string | null;
    customerCardUrl?: string | null;
    additionalImageUrl?: string | null;
  }>,
  options: { batchSize?: number; bucket?: string } = {}
): Promise<{ total: number; copied: number; skipped: number; failed: number }> {
  const { batchSize = 20, bucket = DEFAULT_BUCKET } = options;

  // Build flat list of (record, type, url) tuples
  type PhotoJob = {
    deliveryId: string;
    agencyId: string;
    date: Date;
    type: "payment_receipt" | "customer_card" | "additional";
    url: string;
  };

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

  let copied = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (job) => {
        const s3Key = buildS3Key(job.agencyId, job.deliveryId, job.type, job.date);
        const result = await copyCloudinaryToS3({ cloudinaryUrl: job.url, s3Key, bucket });

        if (result.success) {
          // 1. Update Database record URL to point to S3 URL
          const updateData: Record<string, string> = {};
          if (job.type === "payment_receipt") updateData.paymentReceiptUrl = result.s3Url;
          else if (job.type === "customer_card") updateData.customerCardUrl = result.s3Url;
          else if (job.type === "additional") updateData.additionalImageUrl = result.s3Url;

          try {
            await prisma.deliveryRecord.update({
              where: { id: job.deliveryId },
              data: updateData,
            });
          } catch (dbErr) {
            console.warn(`[S3 Backup DB Update Warning] Failed to update delivery ${job.deliveryId}:`, dbErr);
          }

          // 2. Delete photo from Cloudinary to free storage quota
          if (job.url.includes("cloudinary.com")) {
            const publicId = extractCloudinaryPublicId(job.url);
            if (publicId) {
              await deleteFromCloudinary(publicId);
            }
          }
        }

        return result;
      })
    );

    for (const result of results) {
      if (!result.success) failed++;
      else if (result.skipped) skipped++;
      else copied++;
    }
  }

  return { total: jobs.length, copied, skipped, failed };
}
