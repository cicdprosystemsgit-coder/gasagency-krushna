/**
 * src/lib/cloudinary.ts
 * Cloudinary upload helper for delivery proof photos.
 * Uses per-agency folder isolation for clean multi-tenant storage.
 */

import { v2 as cloudinary } from "cloudinary";

// Initialise Cloudinary SDK from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export type ProofPhotoType = "payment_receipt" | "customer_card" | "additional";

interface UploadDeliveryProofResult {
  url: string;
  publicId: string;
}

/**
 * Uploads a watermarked delivery proof photo Buffer to Cloudinary.
 *
 * Storage path: gasagency/agencies/{agencyId}/delivery-proofs/{YYYY-MM}/{deliveryId}_{type}
 * Tagged for future S3 backup queries: agency_{agencyId}, delivery_proof, {YYYY-MM}
 */
export async function uploadDeliveryProof(
  imageBuffer: Buffer,
  params: {
    agencyId: string;
    deliveryId: string; // Use "pending" during upload-before-submit flow
    type: ProofPhotoType;
    agencyName?: string;
  }
): Promise<UploadDeliveryProofResult> {
  const { agencyId, deliveryId, type } = params;

  // Build date-based folder path: YYYY-MM
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Public ID for the asset (no extension — Cloudinary appends automatically)
  const publicId = `gasagency/agencies/${agencyId}/delivery-proofs/${yearMonth}/${deliveryId}_${type}`;

  // Upload as a stream from buffer
  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
          format: "jpg",
          tags: [`agency_${agencyId}`, "delivery_proof", yearMonth],
          // Transformation: resize to max 1600px wide preserving aspect ratio (saves storage)
          transformation: [{ width: 1600, crop: "limit", quality: "auto:good" }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload failed"));
          resolve(result as { secure_url: string; public_id: string });
        }
      );

      uploadStream.end(imageBuffer);
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadReceiptToCloudinary(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "gasagency/expense-receipts",
        resource_type: "auto",
        public_id: `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Failed to upload image to Cloudinary"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Extracts public_id from a full Cloudinary URL.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let path = parts[1];
    // Strip version prefix e.g. v123456789/
    path = path.replace(/^v\d+\//, "");
    // Remove file extension (.jpg, .png, etc.)
    const dotIndex = path.lastIndexOf(".");
    if (dotIndex !== -1) {
      path = path.substring(0, dotIndex);
    }
    return path;
  } catch {
    return null;
  }
}

/**
 * Deletes an image from Cloudinary by its publicId.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === "ok" || res.result === "not_found";
  } catch (err) {
    console.warn(`[Cloudinary Destroy Warning] Failed to delete ${publicId}:`, err);
    return false;
  }
}

export { cloudinary };
