const sharp = require("sharp");
const path = require("path");

const sizes = [192, 512];
const outDir = path.join(__dirname, "..", "public", "icons");

// Barcode-style icon with RbA green branding
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#1a1a1a"/>

  <!-- Barcode lines -->
  <g fill="#6CC14C">
    <rect x="96"  y="120" width="12" height="200" rx="3"/>
    <rect x="118" y="120" width="6"  height="200" rx="2"/>
    <rect x="134" y="120" width="16" height="200" rx="3"/>
    <rect x="160" y="120" width="8"  height="200" rx="2"/>
    <rect x="178" y="120" width="12" height="200" rx="3"/>
    <rect x="200" y="120" width="6"  height="200" rx="2"/>
    <rect x="216" y="120" width="20" height="200" rx="3"/>
    <rect x="246" y="120" width="8"  height="200" rx="2"/>
    <rect x="264" y="120" width="14" height="200" rx="3"/>
    <rect x="288" y="120" width="6"  height="200" rx="2"/>
    <rect x="304" y="120" width="18" height="200" rx="3"/>
    <rect x="332" y="120" width="8"  height="200" rx="2"/>
    <rect x="350" y="120" width="12" height="200" rx="3"/>
    <rect x="372" y="120" width="6"  height="200" rx="2"/>
    <rect x="388" y="120" width="16" height="200" rx="3"/>
  </g>

  <!-- Scan line -->
  <rect x="70" y="210" width="372" height="3" rx="1.5" fill="#ffffff" opacity="0.6"/>

  <!-- NWO text -->
  <text x="256" y="410" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="100" fill="#ffffff" letter-spacing="6">NWO</text>
</svg>`;

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");

  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, "favicon-32.png"));
  console.log("Generated favicon-32.png");
}

generate().catch(console.error);
