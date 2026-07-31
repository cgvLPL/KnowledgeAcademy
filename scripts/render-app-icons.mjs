import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const brandRoot = path.join(projectRoot, "public", "brand");
const sourceIcon = path.join(brandRoot, "favicon.png");

const standardIcons = [
  ["favicon-16.png", 16, false],
  ["favicon-32.png", 32, false],
  ["apple-touch-icon.png", 180, true],
  ["app-icon-192.png", 192, true],
  ["app-icon-512.png", 512, true],
];

await Promise.all(standardIcons.map(async ([fileName, size, flatten]) => {
  let image = sharp(sourceIcon).resize(Number(size), Number(size), { fit: "cover" });
  if (flatten) image = image.flatten({ background: "#070809" });
  await image.png().toFile(path.join(brandRoot, String(fileName)));
}));

const maskableBackground = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#FFB11F"/>
        <stop offset="0.52" stop-color="#FF6A22"/>
        <stop offset="1" stop-color="#E6322F"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#brand)"/>
  </svg>
`);
const safeMark = await sharp(sourceIcon)
  .resize(384, 384, { fit: "contain" })
  .png()
  .toBuffer();

await sharp(maskableBackground)
  .composite([{ input: safeMark, left: 64, top: 64 }])
  .png()
  .toFile(path.join(brandRoot, "app-icon-maskable-512.png"));

console.log("Rendered favicon and installable app icon sizes.");
