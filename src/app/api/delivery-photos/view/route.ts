import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getS3Client, DEFAULT_BUCKET, extractS3Key, extractS3Bucket, getPresignedS3Url } from "@/lib/s3-backup";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url") || searchParams.get("key");
    const download = searchParams.get("download") === "1";
    const presigned = searchParams.get("presigned") === "1";

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing photo url or key parameter" }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const s3Key = extractS3Key(rawUrl);

    // Enforce tenant isolation: non-SYSTEM_ADMIN can only view photos of their own agency
    if (session.role !== "SYSTEM_ADMIN") {
      if (!session.agencyId) {
        return NextResponse.json({ error: "Forbidden: No agency assigned" }, { status: 403 });
      }

      const expectedAgencyPrefix = `agencies/${session.agencyId}/`;
      if (s3Key.startsWith("agencies/") && !s3Key.startsWith(expectedAgencyPrefix)) {
        return NextResponse.json(
          { error: "Forbidden: You cannot view photos belonging to another agency" },
          { status: 403 }
        );
      }
    }

    const bucket = searchParams.get("bucket") || extractS3Bucket(rawUrl) || DEFAULT_BUCKET;

    // Case 1: If it's a Cloudinary or regular external web URL, redirect or proxy
    if (rawUrl.includes("cloudinary.com") || (!rawUrl.includes("amazonaws.com") && rawUrl.startsWith("http"))) {
      return NextResponse.redirect(rawUrl);
    }

    // Case 2: If user explicitly requested a pre-signed direct S3 URL
    if (presigned) {
      const signedUrl = await getPresignedS3Url(rawUrl, 86400, bucket);
      return NextResponse.redirect(signedUrl);
    }

    // Case 3: Stream image directly from S3 using server credentials
    const s3 = getS3Client();

    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      })
    );

    if (!s3Response.Body) {
      return NextResponse.json({ error: "Image body empty" }, { status: 404 });
    }

    const bytes = await s3Response.Body.transformToByteArray();
    const contentType = s3Response.ContentType || "image/jpeg";
    const filename = s3Key.split("/").pop() || "delivery-proof.jpg";

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Disposition": download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("[Photo View Proxy Error]:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to load image";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
