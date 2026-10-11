/**
 * src/lib/watermark.ts
 * Server-side IST timestamp and Geo-tag watermarking using Sharp.
 * Burns a tamper-evident GPS Geo-tag band at the bottom of every delivery proof photo.
 */

import sharp from "sharp";

export interface WatermarkOptions {
  agencyName?: string;
  deliveryBoyName?: string;
  customerName?: string;
  customerId?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  timestamp?: Date;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/**
 * Burns an IST timestamp + GPS Geo-tag + delivery boy + customer info text band onto the bottom of an image buffer.
 * Returns a new JPEG buffer with the watermark permanently embedded.
 */
export async function burnWatermark(
  inputBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const agencyName = options.agencyName?.trim() || "Gas Agency";
  const deliveryBoyName = options.deliveryBoyName?.trim() || "Delivery Agent";
  const customerName = options.customerName?.trim() || "Customer";
  const customerId = options.customerId?.trim() || "N/A";

  const hasGps = options.lat != null && options.lng != null && !isNaN(options.lat) && !isNaN(options.lng);
  const latStr = hasGps ? `${Number(options.lat).toFixed(6)}°` : "Not Available";
  const lngStr = hasGps ? `${Number(options.lng).toFixed(6)}°` : "Not Available";
  const accStr = hasGps && options.accuracy != null ? ` (±${Math.round(options.accuracy)}m)` : "";

  // Format current time as IST
  const now = options.timestamp || new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Get image dimensions
  const meta = await sharp(inputBuffer).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 600;

  // Bar height tailored for 4 lines of clean metadata
  // Relative to image height, with reasonable min and max
  const barHeight = Math.min(180, Math.max(90, Math.round(height * 0.16)));
  const fontSize = Math.max(11, Math.min(18, Math.round(barHeight * 0.14)));
  const titleFontSize = Math.max(12, Math.min(20, Math.round(barHeight * 0.16)));

  const padLeft = Math.round(width * 0.03);
  const lineSpacing = Math.round((barHeight - 20) / 4);
  const y1 = 20 + Math.round(lineSpacing * 0.4);
  const y2 = y1 + lineSpacing;
  const y3 = y2 + lineSpacing;
  const y4 = y3 + lineSpacing;

  const escAgency = escapeXml(agencyName);
  const escDeliveryBoy = escapeXml(deliveryBoyName);
  const escCustName = escapeXml(customerName);
  const escCustId = escapeXml(customerId);

  const gpsLine = hasGps
    ? `📍 GPS: Lat ${latStr}, Lng ${lngStr}${accStr}`
    : `📍 GPS: Location Not Captured`;

  // Create SVG overlay with high-contrast dark semi-transparent banner and crisp readable text
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${barHeight}" fill="rgba(10, 15, 29, 0.88)" />
      <line x1="0" y1="0" x2="${width}" y2="0" stroke="#2563EB" stroke-width="4" />
      
      <!-- Line 1: Header / Agency & Delivery Agent -->
      <text
        x="${padLeft}"
        y="${y1}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${titleFontSize}"
        font-weight="bold"
        fill="#60A5FA"
      >🏢 ${escAgency}  •  🚚 Delivered By: ${escDeliveryBoy}</text>

      <!-- Line 2: Customer Details -->
      <text
        x="${padLeft}"
        y="${y2}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="#F3F4F6"
      >👤 Customer: ${escCustName}  [ID / Code: ${escCustId}]</text>

      <!-- Line 3: Geo Coordinates -->
      <text
        x="${padLeft}"
        y="${y3}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="${hasGps ? "#34D399" : "#FBBF24"}"
      >${gpsLine}</text>

      <!-- Line 4: Date, Time (IST) -->
      <text
        x="${padLeft}"
        y="${y4}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="500"
        fill="#E5E7EB"
      >📅 ${dateStr}  •  ⏰ ${timeStr} IST  •  [VERIFIED PROOF]</text>
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

