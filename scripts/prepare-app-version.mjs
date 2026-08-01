import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const packageJson = JSON.parse(await readFile(path.join(projectDirectory, "package.json"), "utf8"));

function sourceRevision() {
  const supplied = String(process.env.GITHUB_SHA || "").trim();
  if (supplied) return supplied.slice(0, 8);
  try {
    return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], {
      cwd: projectDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

const version = `${packageJson.version}+${sourceRevision()}`;
const manifest = {
  version,
  generatedAt: new Date().toISOString(),
};

await writeFile(
  path.join(projectDirectory, "public", "version.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

process.stdout.write(version);
