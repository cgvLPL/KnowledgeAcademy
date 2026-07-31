import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const projectRoot = process.cwd();
const packRoot = path.resolve(projectRoot, "../../outputs/CGV-Knowledge-Academy-Brand-Pack");
const logoRoot = path.join(packRoot, "logos");
const previewRoot = path.join(packRoot, "previews");
const masterSvg = path.join(logoRoot, "cgv-knowledge-academy-master.svg");

await Promise.all([
  mkdir(logoRoot, { recursive: true }),
  mkdir(previewRoot, { recursive: true }),
  mkdir(path.join(projectRoot, "public/brand"), { recursive: true }),
]);

const whiteLogo = await sharp(masterSvg, { density: 200 }).png().toBuffer();
await sharp(whiteLogo).toFile(path.join(logoRoot, "cgv-knowledge-academy-white.png"));
await sharp(whiteLogo)
  .tint({ r: 7, g: 8, b: 9 })
  .png()
  .toFile(path.join(logoRoot, "cgv-knowledge-academy-ink.png"));

const { width = 4028, height = 1000 } = await sharp(whiteLogo).metadata();
const gradient = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFB11F"/>
        <stop offset="0.52" stop-color="#FF6A22"/>
        <stop offset="1" stop-color="#E6322F"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>
`);
await sharp(gradient)
  .composite([{ input: whiteLogo, blend: "dest-in" }])
  .png()
  .toFile(path.join(logoRoot, "cgv-knowledge-academy-gradient.png"));

await sharp(whiteLogo)
  .resize(1450, 360)
  .flatten({ background: "#070809" })
  .png()
  .toFile(path.join(previewRoot, "logo-on-cinema-ink.png"));

const board = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
    <defs>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFB11F"/>
        <stop offset="0.52" stop-color="#FF6A22"/>
        <stop offset="1" stop-color="#E6322F"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="1000" fill="#070809"/>
    <circle cx="1460" cy="60" r="330" fill="#E6322F" opacity="0.12"/>
    <circle cx="120" cy="920" r="360" fill="#FFB11F" opacity="0.08"/>
    <text x="100" y="350" fill="#A4AAA6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" letter-spacing="5">CORE PALETTE</text>
    <rect x="100" y="400" width="250" height="180" rx="22" fill="#070809" stroke="#ffffff" stroke-opacity="0.14"/>
    <rect x="375" y="400" width="250" height="180" rx="22" fill="#131516" stroke="#ffffff" stroke-opacity="0.14"/>
    <rect x="650" y="400" width="250" height="180" rx="22" fill="#F8F8F6"/>
    <rect x="925" y="400" width="250" height="180" rx="22" fill="#FF6A22"/>
    <rect x="1200" y="400" width="250" height="180" rx="22" fill="#E6322F"/>
    <g fill="#F8F8F6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="22" font-weight="600">
      <text x="100" y="620">Cinema Ink</text><text x="100" y="650" fill="#A4AAA6">#070809</text>
      <text x="375" y="620">Surface</text><text x="375" y="650" fill="#A4AAA6">#131516</text>
      <text x="650" y="620">Academy White</text><text x="650" y="650" fill="#A4AAA6">#F8F8F6</text>
      <text x="925" y="620">CGV Orange</text><text x="925" y="650" fill="#A4AAA6">#FF6A22</text>
      <text x="1200" y="620">Cinema Red</text><text x="1200" y="650" fill="#A4AAA6">#E6322F</text>
    </g>
    <text x="100" y="770" fill="#A4AAA6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" letter-spacing="5">SIGNATURE GRADIENT</text>
    <rect x="100" y="810" width="1350" height="90" rx="22" fill="url(#brand)"/>
    <text x="100" y="955" fill="#F8F8F6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="28" font-weight="600">Focused learning. Cinematic energy.</text>
  </svg>
`);
const boardLogo = await sharp(whiteLogo).resize({ width: 820 }).png().toBuffer();
await sharp(board)
  .composite([{ input: boardLogo, left: 90, top: 70 }])
  .png()
  .toFile(path.join(previewRoot, "brand-board.png"));

const originalLogo = await sharp(path.join(projectRoot, "public/cgv-logo.svg"), { density: 200 }).png().toBuffer();
const originalMeta = await sharp(originalLogo).metadata();
const cropWidth = Math.round((600 / 1450) * (originalMeta.width || 4028));
const croppedMark = await sharp(originalLogo)
  .extract({ left: 0, top: 0, width: cropWidth, height: originalMeta.height || 1000 })
  .png()
  .toBuffer();
const mark = await sharp(croppedMark)
  .trim()
  .resize({ width: 390, height: 390, fit: "inside" })
  .png()
  .toBuffer();
const faviconBackground = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFB11F"/><stop offset="0.52" stop-color="#FF6A22"/><stop offset="1" stop-color="#E6322F"/></linearGradient></defs>
    <rect width="512" height="512" rx="116" fill="#070809"/>
    <rect x="18" y="18" width="476" height="476" rx="102" fill="url(#g)"/>
  </svg>
`);
const markMeta = await sharp(mark).metadata();
await sharp(faviconBackground)
  .composite([{
    input: mark,
    left: Math.round((512 - (markMeta.width || 390)) / 2),
    top: Math.round((512 - (markMeta.height || 180)) / 2),
  }])
  .png()
  .toFile(path.join(projectRoot, "public/brand/favicon.png"));
await sharp(path.join(projectRoot, "public/brand/favicon.png"))
  .toFile(path.join(logoRoot, "cgv-knowledge-academy-app-icon.png"));

console.log(`Brand assets rendered in ${packRoot}`);
