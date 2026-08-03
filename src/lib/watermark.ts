import sharp from "sharp";

/**
 * Burns a permanent timestamp bar at the bottom of the image.
 * The watermark contains date/time (IST) + agency name.
 *
 * This runs server-side before Cloudinary upload — the pixel data
 * is permanently modified, making it tamper-evident proof.
 */
export async function burnTimestamp(
  buffer: Buffer,
  agencyName: string,
  capturedAt: Date
): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const W = meta.width ?? 1080;

  // Format: "03 Aug 2026  18:14:32 IST"
  const timestamp = capturedAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }) + " IST";

  // Truncate agency name if too long
  const agencyLabel = agencyName.length > 40
    ? agencyName.slice(0, 37) + "..."
    : agencyName;

  // SVG bar — 52px tall black semi-transparent band, white text
  const barH = 52;
  const svgOverlay = Buffer.from(`
    <svg width="${W}" height="${barH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${barH}" fill="rgba(0,0,0,0.80)"/>
      <text
        x="14" y="22"
        font-family="'Courier New', monospace"
        font-size="15"
        font-weight="bold"
        fill="#FFFFFF"
      >&#128197; ${timestamp}</text>
      <text
        x="14" y="43"
        font-family="'Courier New', monospace"
        font-size="12"
        fill="#BBBBBB"
      >${agencyLabel}</text>
    </svg>
  `);

  return sharp(buffer)
    .composite([{
      input: svgOverlay,
      gravity: "south",   // bottom of image
      blend: "over",
    }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
