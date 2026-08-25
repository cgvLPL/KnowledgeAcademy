import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [layout, enhancer, css] = await Promise.all([
  fs.readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  fs.readFile(new URL("../app/mobile-table-card-enhancer.tsx", import.meta.url), "utf8"),
  fs.readFile(new URL("../app/mobile-table-cards.css", import.meta.url), "utf8"),
]);

test("mobile table card enhancer is loaded globally", () => {
  assert.match(layout, /import MobileTableCardEnhancer from "\.\/mobile-table-card-enhancer";/);
  assert.match(layout, /import "\.\/mobile-table-cards\.css";/);
  assert.match(layout, /<MobileTableCardEnhancer \/>/);
});

test("enhancer derives mobile labels from actual table headers", () => {
  assert.match(enhancer, /thead th/);
  assert.match(enhancer, /cell\.dataset\.mobileLabel = headers\[index\]/);
  assert.match(enhancer, /MutationObserver/);
});

test("mobile CSS converts rows into cards only on small screens", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /table\[data-mobile-card-table="true"\]/);
  assert.match(css, /tbody tr\[data-mobile-card-row="true"\]/);
  assert.match(css, /content: attr\(data-mobile-label\)/);
});

test("desktop table layout is not globally overridden", () => {
  const beforeMobileQuery = css.split("@media (max-width: 760px)")[0];
  assert.doesNotMatch(beforeMobileQuery, /table\[data-mobile-card-table/);
});

test("mobile cards preserve touch targets and forced colors", () => {
  assert.match(css, /min-block-size: 44px/);
  assert.match(css, /forced-colors: active/);
});
