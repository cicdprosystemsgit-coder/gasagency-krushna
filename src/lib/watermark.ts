/**
 * src/lib/watermark.ts
 * Server-side IST timestamp watermarking using Sharp.
 * Burns a tamper-evident text band at the bottom of every delivery proof photo.
 */

import sharp from "sharp";

interface WatermarkOptions {
  agencyName?: string;
}

/**
 * Burns an IST timestamp + agency name text onto the bottom of an image buffer.
 * Returns a new JPEG buffer with the watermark permanently embedded.
 */
export async function burnWatermark(
  inputBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const agencyName = options.agencyName ?? "Gas Agency";

  // Format current time as IST
  const now = new Date();
  const istString = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const watermarkText = `VERIFIED DELIVERY PROOF  |  ${istString} IST  |  ${agencyName}`;

  // Get image dimensions
  const meta = await sharp(inputBuffer).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 600;

  // Bar height = 10% of image height, minimum 40px, maximum 80px
  const barHeight = Math.min(80, Math.max(40, Math.round(height * 0.10)));
  const fontSize = Math.max(14, Math.round(barHeight * 0.38));

  // Create SVG overlay with black semi-transparent bar + white text
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.75)" />
      <text
        x="${width / 2}"
        y="${barHeight / 2 + fontSize / 3}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >${watermarkText}</text>
    </svg>
  `);

  // Composite the SVG bar at the bottom of the image
  const watermarked = await sharp(inputBuffer)
    .jpeg({ quality: 88 })
    .composite([
      {
        input: svgOverlay,
        gravity: "south", // bottom of image
      },
    ])
    .toBuffer();

  return watermarked;
}
