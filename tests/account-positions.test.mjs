import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const backend = await readFile(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const adminTools = await readFile(new URL("../app/admin-functionality-enhancer.tsx", import.meta.url), "utf8");
const performance = await readFile(new URL("../app/interaction-performance-enhancer.tsx", import.meta.url), "utf8");
const proxy = await readFile(new URL("../app/api/sheets/route.ts", import.meta.url), "utf8");

test("account positions are stored in the Users sheet and returned by the API", () => {
  assert.match(backend, /Users:\s*\[[\s\S]*?"username",\s*"position"/);
  assert.match(backend, /position:\s*normalizeUserPosition_\(input\.position/);
  assert.match(backend, /position:\s*user\.position \|\| ""/);
  assert.match(backend, /INITIAL_ADMIN_POSITION/);
});

test("the backend enforces role-specific position choices", () => {
  assert.match(backend, /function normalizeUserPosition_\(value, role\)/);
  assert.match(backend, /normalized === "mod"[\s\S]*?return "MoD"/);
  assert.match(backend, /normalized === "cinema manager"[\s\S]*?return "Cinema Manager"/);
  assert.match(backend, /normalized === "stars" \? "Stars" : position/);
  assert.match(backend, /Position must be 80 characters or fewer/);
});

test("new administrator and participant forms expose the requested selectors", () => {
  assert.match(adminTools, /<option value="MoD">MoD<\/option><option value="Cinema Manager">Cinema Manager<\/option>/);
  assert.match(client, /<option value="Stars">Stars<\/option><option value="Custom">Custom<\/option>/);
  assert.match(client, /positionChoice === "Custom"[\s\S]*?Custom position/);
  assert.match(client, /position:\s*input\.position/);
});

test("administrators can assign positions to existing accounts", () => {
  assert.match(backend, /adminSetUserPosition:\s*adminSetUserPosition_/);
  assert.match(backend, /function adminSetUserPosition_\(body\)/);
  assert.match(adminTools, /"adminSetUserPosition"/);
  assert.match(adminTools, /Account position updated/);
  assert.match(proxy, /"adminSetUserPosition"/);
  assert.match(performance, /"adminSetUserPosition"/);
});

test("position changes synchronize into account and participant views", () => {
  assert.match(client, /position:\s*String\(detail\.user\?\.position \?\? item\.position\)/);
  assert.match(client, /setCurrentUser\(\(user\) =>/);
  assert.match(client, /<label>Position<strong>\{user\?\.position \|\| "—"\}<\/strong><\/label>/);
  assert.match(client, /data-label="Position">\{person\.position \|\| "—"\}/);
  assert.match(client, /user\?\.position \|\| \(role === "admin"/);
});
