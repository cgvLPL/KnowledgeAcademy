import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/exam-client.tsx"), "utf8");
const login = client.slice(client.indexOf("function Login("), client.indexOf("function BootScreen("));
const auth = client.slice(client.indexOf("async function login("), client.indexOf("function logout()"));

test("one login form authenticates without a user-selected role", () => {
  assert.match(login, /onLogin:\s*\(username: string, password: string\)/);
  assert.match(login, /await onLogin\(username, password\)/);
  assert.doesNotMatch(login, /setRole|switchRole|role-switch|aria-label="Account type"/);
});

test("the authenticated account role selects the correct workspace", () => {
  assert.match(auth, /roleValue !== "admin" && roleValue !== "participant"/);
  assert.match(auth, /const authenticatedRole = roleValue as Role/);
  assert.match(auth, /authenticatedRole === "participant"/);
  assert.match(auth, /adminGetDashboard/);
  assert.match(auth, /setRole\(authenticatedRole\)/);
  assert.match(auth, /setView\(authenticatedRole === "admin" \? "overview" : "home"\)/);
});
