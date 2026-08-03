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

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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

  // 3 ── Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum allowed size is 5 MB. Got ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
      { status: 413 }
    );
  }

  // 4 ── Validate file type
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp"];
  if (!allowedMimes.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Please use JPEG or PNG.` },
      { status: 415 }
    );
  }

  // 5 ── Convert file to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  // 6 ── Fetch agency name for watermark
  let agencyName = "Gas Agency";
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { name: true },
    });
    if (agency?.name) agencyName = agency.name;
  } catch {
    // Non-fatal — use fallback name
  }

  // 7 ── Burn IST timestamp watermark
  let watermarkedBuffer: Buffer;
  try {
    watermarkedBuffer = await burnWatermark(inputBuffer, { agencyName });
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
