import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'client', 'public');

const sizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="290" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="200" fill="white" letter-spacing="-8">AM</text>
  <text x="256" y="400" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="600" font-size="60" fill="rgba(255,255,255,0.7)">RECRUIT</text>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="275" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="180" fill="white" letter-spacing="-8">AM</text>
  <text x="256" y="370" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="600" font-size="50" fill="rgba(255,255,255,0.7)">RECRUIT</text>
</svg>`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="320" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="260" fill="white" letter-spacing="-10">AM</text>
</svg>`;

async function generate() {
  const buf = Buffer.from(svg);
  const maskBuf = Buffer.from(maskableSvg);

  for (const s of sizes) {
    await sharp(buf).resize(s, s).png().toFile(join(OUT, `icon-${s}x${s}.png`));
    console.log(`  icon-${s}x${s}.png`);
  }

  await sharp(maskBuf).resize(512, 512).png().toFile(join(OUT, 'maskable-icon-512x512.png'));
  console.log('  maskable-icon-512x512.png');

  await sharp(Buffer.from(faviconSvg)).resize(180, 180).png().toFile(join(OUT, 'apple-touch-icon.png'));
  console.log('  apple-touch-icon.png');

  writeFileSync(join(OUT, 'favicon.svg'), faviconSvg);
  console.log('  favicon.svg (replaced)');

  await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toFile(join(OUT, 'favicon-32x32.png'));
  console.log('  favicon-32x32.png');

  await sharp(Buffer.from(faviconSvg)).resize(16, 16).png().toFile(join(OUT, 'favicon-16x16.png'));
  console.log('  favicon-16x16.png');

  console.log('\nDone! All icons generated.');
}

generate().catch(e => { console.error(e); process.exit(1); });
