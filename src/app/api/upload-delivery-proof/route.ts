import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { burnTimestamp } from "@/lib/watermark";
import { uploadDeliveryProof } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30; // allow up to 30s for sharp + cloudinary

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file       = formData.get("file") as File | null;
    const proofType  = formData.get("proofType") as string | null;
    const tempId     = formData.get("tempId") as string | null;   // random ID generated client-side
    const capturedAt = formData.get("capturedAt") as string | null;

    // ── Validation ──────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const validProofTypes = ["payment-receipt", "customer-card", "additional"];
    if (!proofType || !validProofTypes.includes(proofType)) {
      return NextResponse.json({ error: "Invalid proofType. Must be payment-receipt, customer-card, or additional" }, { status: 400 });
    }

    const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload JPEG, PNG or WEBP." }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // ── Fetch agency name for watermark ─────────────────────────
    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { name: true },
    });

    const photoTime = capturedAt ? new Date(capturedAt) : new Date();
    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // ── Burn timestamp watermark ─────────────────────────────────
    const watermarked = await burnTimestamp(
      rawBuffer,
      agency?.name ?? "Gas Agency",
      photoTime
    );

    // ── Upload to Cloudinary ─────────────────────────────────────
    const deliveryTempId = tempId || `tmp_${Date.now()}`;
    const result = await uploadDeliveryProof(
      watermarked,
      session.agencyId,
      deliveryTempId,
      proofType as "payment-receipt" | "customer-card" | "additional"
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      proofType,
    });
  } catch (error: any) {
    console.error("[upload-delivery-proof] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload delivery proof photo" },
      { status: 500 }
    );
  }
}
