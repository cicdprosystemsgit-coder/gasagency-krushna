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
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { prisma } from "@/lib/prisma";
import { extractCloudinaryPublicId, deleteFromCloudinary } from "@/lib/cloudinary";

// ── S3 Client Singleton ───────────────────────────────────────────────────────

let _s3: S3Client | null = null;

export function getS3Client(): S3Client {
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

export const DEFAULT_BUCKET = process.env.AWS_S3_BACKUP_BUCKET ?? "gasagency-delivery-proofs-backup";

/**
 * Extract the S3 bucket name from an S3 URL or return DEFAULT_BUCKET.
 */
export function extractS3Bucket(urlOrKey: string): string {
  if (!urlOrKey || !urlOrKey.startsWith("http")) return DEFAULT_BUCKET;
  try {
    const parsed = new URL(urlOrKey);
    // Virtual hosted style: bucket.s3.region.amazonaws.com or bucket.s3.amazonaws.com
    const vhostMatch = parsed.hostname.match(/^([a-z0-9.\-_]+)\.s3[.-]/i);
    if (vhostMatch && vhostMatch[1]) {
      return vhostMatch[1];
    }
    // Path style: s3.region.amazonaws.com/bucket/... or s3.amazonaws.com/bucket/...
    if (parsed.hostname.startsWith("s3.") || parsed.hostname.startsWith("s3-") || parsed.hostname === "s3.amazonaws.com") {
      const parts = parsed.pathname.replace(/^\/+/, "").split("/");
      if (parts.length > 1) {
        return parts[0];
      }
    }
  } catch {}
  return DEFAULT_BUCKET;
}

/**
 * Extract the raw S3 object key from an S3 URL or return the key if already relative.
 */
export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey) return "";
  if (!urlOrKey.startsWith("http")) return urlOrKey.replace(/^\/+/, "");
  try {
    const parsed = new URL(urlOrKey);
    let path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    // If path-style URL (hostname starts with s3. or s3-), first segment is bucket name
    if (parsed.hostname.startsWith("s3.") || parsed.hostname.startsWith("s3-") || parsed.hostname === "s3.amazonaws.com") {
      const parts = path.split("/");
      if (parts.length > 1) {
        return parts.slice(1).join("/");
      }
    }
    return path;
  } catch {
    return urlOrKey;
  }
}

/**
 * Generate a secure AWS S3 Pre-signed URL for direct browser access.
 * Default expiration: 24 hours (86400s).
 */
export async function getPresignedS3Url(
  s3KeyOrUrl: string,
  expiresInSeconds: number = 86400,
  bucket?: string
): Promise<string> {
  const s3Key = extractS3Key(s3KeyOrUrl);
  const targetBucket = bucket || extractS3Bucket(s3KeyOrUrl) || DEFAULT_BUCKET;
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: s3Key,
  });
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Check if AWS S3 backup credentials are configured in env.
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BACKUP_BUCKET
  );
}

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
 * Helper to build a clean, human-readable yet unique folder name for an agency:
 * Format: {sanitizedAgencyName}_{agencyId}
 * Example: "Krushna_Gas_Agency_cm2ouyktb000054l0rnbv0xez"
 * If agencyName is not available, falls back to agencyId.
 */
export function buildAgencyFolderName(agencyId: string, agencyName?: string | null): string {
  if (!agencyName || !agencyName.trim()) {
    return agencyId;
  }
  // Sanitize agency name: keep alphanumeric, replace spaces/special chars with underscores
  const cleanName = agencyName
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleanName ? `${cleanName}_${agencyId}` : agencyId;
}

/**
 * Build the S3 key for a delivery proof photo.
 * Format (multi-tenant, daily sub-folders):
 *   agencies/{agencyName}_{agencyId}/backups/{YYYY-MM-DD}/{deliveryId}_{type}.jpg
 *
 * Structure rationale:
 *  - agencies/{agencyName}_{agencyId}/ → human readable agency name joined with agency ID for audit & multi-tenant isolation
 *  - backups/                          → logical namespace, separates from other assets
 *  - {YYYY-MM-DD}/                     → daily granularity for targeted restore & audit
 *  - {deliveryId}_{type}               → unique file per delivery proof type
 */
export function buildS3Key(
  agencyId: string,
  deliveryId: string,
  type: "payment_receipt" | "customer_card" | "additional",
  date: Date,
  agencyName?: string | null
): string {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const agencyFolder = buildAgencyFolderName(agencyId, agencyName);
  return `agencies/${agencyFolder}/backups/${dateStr}/${deliveryId}_${type}.jpg`;
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
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Download an image buffer from either S3 (using AWS credentials) or an external HTTP URL (Cloudinary).
 */
export async function fetchBufferFromS3OrHttp(url: string, bucket: string = DEFAULT_BUCKET): Promise<Buffer> {
  if (url.includes("amazonaws.com")) {
    try {
      const urlObj = new URL(url);
      const s3Key = decodeURIComponent(urlObj.pathname.replace(/^\//, ""));
      const s3 = getS3Client();
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
      const stream = response.Body;
      if (!stream) throw new Error(`Empty body for S3 key: ${s3Key}`);
      const bytes = await stream.transformToByteArray();
      return Buffer.from(bytes);
    } catch (s3Err) {
      throw new Error(`Failed to fetch from S3: ${s3Err instanceof Error ? s3Err.message : String(s3Err)}`);
    }
  }
  return fetchImageBuffer(url);
}

/**
 * Upload a pre-downloaded image buffer to S3.
 * - Checks S3 first for idempotency (skips if already exists)
 * - Returns a structured result object
 *
 * Used by the backup-orchestrator to avoid downloading each image twice
 * (once for S3, once for Google Drive).
 */
export async function uploadBufferToS3(params: {
  imageBuffer: Buffer;
  s3Key: string;
  sourceUrl?: string;
  contentType?: string;
  bucket?: string;
}): Promise<CopyResult> {
  const {
    imageBuffer,
    s3Key,
    sourceUrl = "",
    contentType = "image/jpeg",
    bucket = DEFAULT_BUCKET,
  } = params;
  const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION ?? "ap-south-1"}.amazonaws.com/${s3Key}`;

  try {
    // Idempotency check — skip if already in S3
    const exists = await doesS3ObjectExist(s3Key, bucket);
    if (exists) {
      return { success: true, s3Key, s3Url, skipped: true };
    }

    // Upload buffer to S3
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
        Metadata: {
          "source-url": sourceUrl,
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
  options: { batchSize?: number; bucket?: string; agencyName?: string | null } = {}
): Promise<{ total: number; copied: number; skipped: number; failed: number }> {
  const { batchSize = 20, bucket = DEFAULT_BUCKET, agencyName } = options;

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
        const s3Key = buildS3Key(job.agencyId, job.deliveryId, job.type, job.date, agencyName);
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
