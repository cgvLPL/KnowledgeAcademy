import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function pngSize(file) {
  const buffer = readFileSync(new URL(`../${file}`, import.meta.url));
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", `${file} is not a PNG`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("installable icons exist at their declared sizes", () => {
  const sizes = {
    "public/brand/apple-touch-icon.png": 180,
    "public/brand/app-icon-192.png": 192,
    "public/brand/app-icon-512.png": 512,
    "public/brand/app-icon-maskable-512.png": 512,
    "public/brand/app-icon-monochrome-512.png": 512,
    "public/brand/favicon-32.png": 32,
    "public/brand/favicon-16.png": 16,
  };
  for (const [file, size] of Object.entries(sizes)) assert.deepEqual(pngSize(file), [size, size], file);
});

test("the manifest offers any, maskable, and monochrome icons", () => {
  const manifest = JSON.parse(read("public/site.webmanifest"));
  const purposes = new Set(manifest.icons.map((icon) => icon.purpose));
  for (const purpose of ["any", "maskable", "monochrome"]) assert.ok(purposes.has(purpose), purpose);
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(`../public/${icon.src}`, import.meta.url)), icon.src);
});

test("icon masters are layered glass art built from the original CGV mark", () => {
  for (const file of ["public/brand/app-icon.svg", "public/brand/app-icon-dark.svg"]) {
    const svg = read(file);
    assert.match(svg, /<filter id="glass"/);
    assert.match(svg, /id="bg"/);
    assert.match(svg, /id="letters"/);
    assert.match(svg, /id="spark"/);
  }
  const favicon = read("public/favicon.svg");
  assert.match(favicon, /prefers-color-scheme: dark/);
  const script = read("scripts/render-app-icons.mjs");
  assert.match(script, /cgv-mark\.svg/);
  assert.doesNotMatch(script, /from "sharp"/, "the renderer must not depend on an undeclared package");
});

test("selected navigation uses filled symbol variants", () => {
  const client = read("app/exam-client.tsx");
  assert.match(client, /import \{ FILLED_NAV_SYMBOLS \} from "\.\/symbols"/);
  assert.equal((client.match(/\(active && FILLED_NAV_SYMBOLS\[item\.id\]\) \|\| item\.icon/g) || []).length, 2);
  const symbols = read("app/symbols.tsx");
  for (const id of ["home", "overview", "evaluations", "courses", "knowledge", "history", "profile", "participants", "scoreboard"]) {
    assert.match(symbols, new RegExp(`\\b${id}: \\w+Fill`), id);
  }
  assert.match(symbols, /fill="currentColor"/);
});
