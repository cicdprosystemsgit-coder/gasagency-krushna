import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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
 * Uploads a delivery proof photo to Cloudinary.
 * Folder structure: gasagency/agencies/{agencyId}/delivery-proofs/{YYYY-MM}/
 * Tagged with agencyId + proofType for easy querying during S3 backup (Phase 2).
 */
export async function uploadDeliveryProof(
  fileBuffer: Buffer,
  agencyId: string,
  deliveryTempId: string,
  proofType: "payment-receipt" | "customer-card" | "additional"
): Promise<{ url: string; publicId: string }> {
  const month = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const safeId = deliveryTempId.replace(/[^a-zA-Z0-9_-]/g, "_");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `gasagency/agencies/${agencyId}/delivery-proofs/${month}`,
        public_id: `${safeId}_${proofType}`,
        resource_type: "image",
        // Tags allow filtering by agency & type during Phase 2 S3 backup
        tags: [`agency:${agencyId}`, `proof:${proofType}`],
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Failed to upload delivery proof to Cloudinary"));
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

export { cloudinary };

