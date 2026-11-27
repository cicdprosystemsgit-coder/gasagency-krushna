import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Ensure output directories exist
const resourcesDir = path.join(rootDir, 'resources');
const playstoreDir = path.join(rootDir, 'playstore-assets');
const publicIconsDir = path.join(rootDir, 'public', 'icons');
const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

for (const dir of [resourcesDir, playstoreDir, publicIconsDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Core GasAgency Emblem SVG (centered in 1024x1024 canvas).
 * Designed to sit comfortably inside the 66% Android Adaptive Icon safe zone
 * (approx x: 200..824, y: 170..854) while looking bold and balanced at 48px and 512px.
 */
const emblemSvg = `
  <defs>
    <!-- Flame outer gradient: gold to vivid orange -->
    <linearGradient id="flameOuter" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="45%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>

    <!-- Flame inner core: clean gas blue -->
    <linearGradient id="flameInner" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="60%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>

    <!-- Cylinder body metallic white-slate gradient -->
    <linearGradient id="cylBody" x1="0" y1="0" x2="1" y2="0.2">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="55%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>

    <!-- Cylinder collar/handle gradient -->
    <linearGradient id="cylCollar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F1F5F9"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>

    <!-- Cylinder accent band -->
    <linearGradient id="cylBand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="50%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>

    <!-- Soft drop shadow for emblem -->
    <filter id="emblemShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#020617" flood-opacity="0.42"/>
    </filter>

    <!-- Warm glow behind flame -->
    <radialGradient id="flameGlow" cx="50%" cy="32%" r="28%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.38"/>
      <stop offset="60%" stop-color="#F97316" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Subtle warm ambient glow behind flame -->
  <circle cx="512" cy="315" r="240" fill="url(#flameGlow)"/>

  <g filter="url(#emblemShadow)">
    <!-- ── FLAME ─────────────────────────────────────────── -->
    <!-- Outer warm flame -->
    <path d="M512 182
             C512 182, 594 268, 594 334
             C594 382, 558 416, 512 416
             C466 416, 430 382, 430 334
             C430 296, 456 260, 476 238
             C474 264, 488 278, 496 280
             C488 242, 512 182, 512 182 Z"
          fill="url(#flameOuter)"/>

    <!-- Inner clean-gas blue core -->
    <path d="M512 276
             C512 276, 550 318, 550 350
             C550 375, 533 394, 512 394
             C491 394, 474 375, 474 350
             C474 328, 492 302, 512 276 Z"
          fill="url(#flameInner)"/>

    <!-- ── CYLINDER COLLAR & VALVE ───────────────────────── -->
    <!-- Top handle ring -->
    <rect x="412" y="434" width="200" height="28" rx="14" fill="url(#cylCollar)"/>
    <!-- Left & Right collar struts -->
    <rect x="424" y="454" width="24" height="66" rx="6" fill="url(#cylCollar)"/>
    <rect x="576" y="454" width="24" height="66" rx="6" fill="url(#cylCollar)"/>

    <!-- Valve stem & handwheel -->
    <rect x="502" y="482" width="20" height="36" rx="4" fill="#E2E8F0"/>
    <rect x="486" y="472" width="52" height="14" rx="7" fill="#38BDF8"/>
    <rect x="520" y="492" width="22" height="12" rx="5" fill="#CBD5E1"/>

    <!-- ── CYLINDER BODY ─────────────────────────────────── -->
    <!-- Main tank body -->
    <rect x="372" y="508" width="280" height="278" rx="64" fill="url(#cylBody)"/>

    <!-- Specular left highlight on cylinder -->
    <path d="M402 558 C402 536, 418 526, 434 526 L442 526 C428 530, 420 544, 420 564 L420 732 C420 748, 426 760, 436 766 L426 766 C410 766, 402 752, 402 732 Z"
          fill="#FFFFFF" opacity="0.7"/>

    <!-- Center signature band -->
    <rect x="372" y="616" width="280" height="58" fill="url(#cylBand)"/>
    <!-- Thin bright accent line inside band -->
    <rect x="372" y="616" width="280" height="5" fill="#38BDF8" opacity="0.85"/>
    <rect x="372" y="669" width="280" height="5" fill="#1E3A8A" opacity="0.5"/>

    <!-- Center welded seam ridge -->
    <rect x="360" y="641" width="304" height="8" rx="4" fill="#E2E8F0" opacity="0.35"/>

    <!-- Flame emblem badge inside the blue band -->
    <circle cx="512" cy="645" r="18" fill="#FFFFFF" opacity="0.95"/>
    <path d="M512 633 C512 633, 521 642, 521 649 C521 654, 517 658, 512 658 C507 658, 503 654, 503 649 C503 644, 508 638, 512 633 Z"
          fill="#F97316"/>

    <!-- Cylinder base foot ring -->
    <rect x="406" y="776" width="212" height="32" rx="14" fill="url(#cylCollar)"/>
  </g>
`;

const backgroundDefs = `
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1437"/>
      <stop offset="48%" stop-color="#172B6B"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="30%" cy="22%" r="75%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#1E3A8A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgVignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="#020617" stop-opacity="0"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.4"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  <rect width="1024" height="1024" fill="url(#bgGlow)"/>
  <rect width="1024" height="1024" fill="url(#bgVignette)"/>
`;

// 1. Full-bleed square icon SVG (for Play Store 512x512, PWA, legacy mipmaps)
const iconOnlySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${backgroundDefs}
  ${emblemSvg}
</svg>`;

// 2. Rounded-square icon SVG (for browser favicon & nice previews)
const roundedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="roundedClip">
      <rect width="1024" height="1024" rx="224" ry="224"/>
    </clipPath>
  </defs>
  <g clip-path="url(#roundedClip)">
    ${backgroundDefs}
    ${emblemSvg}
  </g>
</svg>`;

// 3. Adaptive icon foreground SVG (transparent background, scaled slightly to fit 66% safe zone)
const iconForegroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(512, 512) scale(0.84) translate(-512, -512)">
    ${emblemSvg}
  </g>
</svg>`;

// 4. Adaptive icon background SVG
const iconBackgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${backgroundDefs}
</svg>`;

// 5. Play Store Feature Graphic (1024x500)
const featureGraphicSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <defs>
    <linearGradient id="fgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09112E"/>
      <stop offset="55%" stop-color="#172B6B"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <radialGradient id="fgGlow1" cx="22%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fgGlow2" cx="85%" cy="15%" r="40%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="appIconClip">
      <rect x="86" y="102" width="296" height="296" rx="66" ry="66"/>
    </clipPath>
    <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#020617" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect width="1024" height="500" fill="url(#fgBg)"/>
  <rect width="1024" height="500" fill="url(#fgGlow1)"/>
  <rect width="1024" height="500" fill="url(#fgGlow2)"/>

  <!-- Subtle decorative circles -->
  <circle cx="940" cy="430" r="190" fill="#FFFFFF" opacity="0.03"/>
  <circle cx="940" cy="430" r="130" fill="#FFFFFF" opacity="0.03"/>

  <!-- Left App Icon Card -->
  <g filter="url(#cardShadow)">
    <rect x="86" y="102" width="296" height="296" rx="66" fill="#0F172A"/>
  </g>
  <g clip-path="url(#appIconClip)">
    <g transform="translate(86, 102) scale(0.2890625)">
      ${backgroundDefs}
      ${emblemSvg}
    </g>
  </g>
  <!-- Crisp border around icon card -->
  <rect x="86" y="102" width="296" height="296" rx="66" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>

  <!-- Right Brand Typography -->
  <text x="432" y="218" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#FFFFFF" letter-spacing="-1.5">GasAgency</text>
  <text x="434" y="270" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="27" font-weight="500" fill="#BFDBFE">Smart Gas Distribution &amp; Delivery</text>

  <!-- Feature Pills -->
  <g transform="translate(434, 310)">
    <rect x="0" y="0" width="128" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1"/>
    <text x="64" y="26" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#F8FAFC">Deliveries</text>

    <rect x="142" y="0" width="126" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1"/>
    <text x="205" y="26" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#F8FAFC">Inventory</text>

    <rect x="282" y="0" width="110" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1"/>
    <text x="337" y="26" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#F8FAFC">Billing</text>

    <rect x="406" y="0" width="120" height="40" rx="20" fill="#F59E0B" fill-opacity="0.22" stroke="#FBBF24" stroke-opacity="0.5" stroke-width="1"/>
    <text x="466" y="26" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#FDE68A">Live Track</text>
  </g>
</svg>`;

// Save source SVGs
fs.writeFileSync(path.join(resourcesDir, 'icon-only.svg'), iconOnlySvg);
fs.writeFileSync(path.join(resourcesDir, 'icon-foreground.svg'), iconForegroundSvg);
fs.writeFileSync(path.join(resourcesDir, 'icon-background.svg'), iconBackgroundSvg);
fs.writeFileSync(path.join(resourcesDir, 'feature-graphic.svg'), featureGraphicSvg);
fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.svg'), roundedIconSvg);

/**
 * Build a multi-resolution .ico buffer containing PNG-encoded frames (16, 32, 48).
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.data)]);
}

async function renderAssets() {
  const iconBuf = Buffer.from(iconOnlySvg);
  const roundedBuf = Buffer.from(roundedIconSvg);
  const fgBuf = Buffer.from(iconForegroundSvg);
  const fgGraphicBuf = Buffer.from(featureGraphicSvg);

  // Multi-size favicon.ico (16x16, 32x32, 48x48)
  const icoFrames = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await sharp(roundedBuf).resize(size, size).png({ compressionLevel: 9 }).toBuffer(),
    }))
  );
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), buildIco(icoFrames));

  // Play Store 512x512 (full-bleed square PNG) & 1024x500 feature graphic
  await sharp(iconBuf).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(playstoreDir, 'app-icon-512x512.png'));
  await sharp(fgGraphicBuf).resize(1024, 500).png({ compressionLevel: 9 }).toFile(path.join(playstoreDir, 'feature-graphic-1024x500.png'));

  // PWA / Web icons
  await sharp(iconBuf).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(publicIconsDir, 'icon-192.png'));
  await sharp(iconBuf).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(publicIconsDir, 'icon-512.png'));
  await sharp(iconBuf).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(rootDir, 'public', 'apple-touch-icon.png'));

  // Android mipmaps
  const densities = [
    { name: 'mdpi', icon: 48, fg: 108 },
    { name: 'hdpi', icon: 72, fg: 162 },
    { name: 'xhdpi', icon: 96, fg: 216 },
    { name: 'xxhdpi', icon: 144, fg: 324 },
    { name: 'xxxhdpi', icon: 192, fg: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(resDir, `mipmap-${d.name}`);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png (rounded-square icon for legacy launchers)
    await sharp(roundedBuf).resize(d.icon, d.icon).png({ compressionLevel: 9 }).toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png (circular masked icon)
    const circleMask = Buffer.from(`<svg width="${d.icon}" height="${d.icon}"><circle cx="${d.icon / 2}" cy="${d.icon / 2}" r="${d.icon / 2}" fill="#fff"/></svg>`);
    await sharp(iconBuf)
      .resize(d.icon, d.icon)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (adaptive icon foreground)
    await sharp(fgBuf).resize(d.fg, d.fg).png({ compressionLevel: 9 }).toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  // Android Splash Screens: preserve exact dimensions of every existing splash.png
  const splashDirs = fs.readdirSync(resDir).filter((d) => d === 'drawable' || d.startsWith('drawable-'));
  for (const d of splashDirs) {
    const splashPath = path.join(resDir, d, 'splash.png');
    if (!fs.existsSync(splashPath)) continue;

    const meta = await sharp(splashPath).metadata();
    const w = meta.width || 480;
    const h = meta.height || 320;
    const minDim = Math.min(w, h);
    const logoSize = Math.round(minDim * 0.28);
    const showText = minDim >= 480;

    const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs>
        <linearGradient id="sBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#09112E"/>
          <stop offset="55%" stop-color="#172B6B"/>
          <stop offset="100%" stop-color="#1E40AF"/>
        </linearGradient>
        <radialGradient id="sGlow" cx="50%" cy="46%" r="42%">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#sBg)"/>
      <rect width="${w}" height="${h}" fill="url(#sGlow)"/>
      ${showText ? `<text x="${w / 2}" y="${Math.round(h / 2 + logoSize * 0.72)}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(minDim * 0.068)}" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">GasAgency</text>` : ''}
    </svg>`;

    const logoLayer = await sharp(roundedBuf).resize(logoSize, logoSize).png().toBuffer();
    const topOffset = showText ? Math.round(h / 2 - logoSize * 0.65) : Math.round((h - logoSize) / 2);

    await sharp(Buffer.from(splashSvg))
      .composite([{
        input: logoLayer,
        left: Math.round((w - logoSize) / 2),
        top: topOffset,
      }])
      .png({ compressionLevel: 9 })
      .toFile(splashPath);
  }

  console.log('✅ All GasAgency brand icons, splash screens, and Play Store assets generated!');
}

renderAssets().catch((err) => {
  console.error('❌ Failed to generate assets:', err);
  process.exit(1);
});

