/**
 * src/app/api/upload-delivery-proof/route.ts
 * Receives a delivery proof photo, burns IST watermark, uploads to Cloudinary.
 * Returns the Cloudinary URL.
 *
 * POST /api/upload-delivery-proof
 * FormData fields:
 *   file      — image file (JPEG/PNG/HEIC) ≤ 5 MB
 *   agencyId  — agency tenant ID
 *   deliveryId — delivery record ID (or "pending" before form submit)
 *   type      — "payment_receipt" | "customer_card" | "additional"
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { burnWatermark } from "@/lib/watermark";
import { uploadDeliveryProof } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  // 1 ── Auth check
  const session = await getSession();
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2 ── Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const deliveryId = (formData.get("deliveryId") as string) || "pending";
  const type = (formData.get("type") as string) || "payment_receipt";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 3 ── Validate file size (allows images up to 50 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum allowed size is 50 MB. Got ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
      { status: 413 }
    );
  }

  // 4 ── Validate file type
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp"];
  const isImageMime = allowedMimes.includes(file.type) || file.type.startsWith("image/");
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name);
  if (!isImageMime && !isImageExt) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}. Please use a JPEG, PNG, or WEBP image.` },
      { status: 415 }
    );
  }

  // 5 ── Convert file to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  // 6 ── Fetch agency name & delivery boy name for Geo-tag watermark
  let agencyName = "Gas Agency";
  let deliveryBoyName = (formData.get("deliveryBoyName") as string) || "";
  try {
    const [agency, user] = await Promise.all([
      prisma.agency.findUnique({
        where: { id: session.agencyId },
        select: { name: true },
      }),
      !deliveryBoyName
        ? prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true },
          })
        : null,
    ]);
    if (agency?.name) agencyName = agency.name;
    if (user?.name) deliveryBoyName = user.name;
  } catch {
    // Non-fatal — use fallback names
  }

  // Parse GPS & Customer details for Geo-tag
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const accuracyRaw = formData.get("accuracy");
  const customerId = (formData.get("customerId") as string) || "";
  const customerName = (formData.get("customerName") as string) || "";

  const lat = latRaw && !isNaN(Number(latRaw)) ? Number(latRaw) : null;
  const lng = lngRaw && !isNaN(Number(lngRaw)) ? Number(lngRaw) : null;
  const accuracy = accuracyRaw && !isNaN(Number(accuracyRaw)) ? Number(accuracyRaw) : null;

  // 7 ── Burn Geo-tag structure watermark
  let watermarkedBuffer: Buffer;
  try {
    watermarkedBuffer = await burnWatermark(inputBuffer, {
      agencyName,
      deliveryBoyName: deliveryBoyName || "Delivery Agent",
      customerName: customerName || "Customer",
      customerId: customerId || "N/A",
      lat,
      lng,
      accuracy,
    });
  } catch (err) {
    console.error("[upload-delivery-proof] Watermark error:", err);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }

  // 8 ── Upload to Cloudinary
  try {
    const { url } = await uploadDeliveryProof(watermarkedBuffer, {
      agencyId: session.agencyId,
      deliveryId,
      type: type as "payment_receipt" | "customer_card" | "additional",
      agencyName,
    });

    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    console.error("[upload-delivery-proof] Cloudinary upload error:", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
