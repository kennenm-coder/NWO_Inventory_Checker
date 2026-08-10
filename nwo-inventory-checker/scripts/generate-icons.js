const sharp = require("sharp");
const path = require("path");

const sizes = [192, 512];
const outDir = path.join(__dirname, "..", "public", "icons");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1e3a5f"/>
  <text x="256" y="210" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="170" fill="#ffffff">NWO</text>
  <rect x="80" y="260" width="352" height="4" rx="2" fill="#3b82f6" opacity="0.5"/>
  <text x="256" y="370" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="70" fill="#93c5fd" letter-spacing="8">INVENTORY</text>
</svg>`;

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // Also generate apple-touch-icon (180x180)
  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");

  // Favicon 32x32
  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, "favicon-32.png"));
  console.log("Generated favicon-32.png");
}

generate().catch(console.error);
