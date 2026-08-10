#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_route="$project_dir/app/api/sheets/route.ts"
temporary_dir="$(mktemp -d)"
temporary_route="$temporary_dir/route.ts"

restore_api_route() {
  if [[ -f "$temporary_route" ]]; then
    mkdir -p "$(dirname "$api_route")"
    mv "$temporary_route" "$api_route"
  fi
  rmdir "$temporary_dir" 2>/dev/null || true
}

trap restore_api_route EXIT

if [[ -f "$api_route" ]]; then
  mv "$api_route" "$temporary_route"
fi

cd "$project_dir"
app_version="$(node scripts/prepare-app-version.mjs)"
export NEXT_PUBLIC_APP_VERSION="$app_version"
node --input-type=module - "$project_dir/dist" <<'NODE'
import { rm } from "node:fs/promises";

await rm(process.argv[2], { recursive: true, force: true });
NODE

GITHUB_PAGES=true \
NEXT_PUBLIC_BASE_PATH="/CGV.Exams" \
NEXT_PUBLIC_APP_VERSION="$NEXT_PUBLIC_APP_VERSION" \
bash scripts/sites-env.sh -- vinext build

if [[ ! -f "$project_dir/dist/client/index.html" ]]; then
  echo "GitHub Pages build did not produce dist/client/index.html." >&2
  exit 1
fi

exported_files=(
  "$project_dir/dist/client/index.html"
  "$project_dir/dist/client/index.rsc"
  "$project_dir/dist/client/404.html"
)

# Vite emits imported images as root-relative URLs inside generated CSS. Include
# every stylesheet in the base-path rewrite so those assets resolve on Pages.
while IFS= read -r stylesheet; do
  exported_files+=("$stylesheet")
done < <(find "$project_dir/dist/client/assets" -type f -name '*.css' -print)

node --input-type=module - "${exported_files[@]}" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";

for (const file of process.argv.slice(2)) {
  const source = await readFile(file, "utf8");
  const rewritten = source
    .replaceAll("/assets/", "/CGV.Exams/assets/")
    .replaceAll("/favicon.svg", "/CGV.Exams/favicon.svg")
    .replaceAll('"/brand/', '"/CGV.Exams/brand/')
    .replaceAll('"/site.webmanifest', '"/CGV.Exams/site.webmanifest')
    .replaceAll('href="/cgv-logo.svg"', 'href="/CGV.Exams/cgv-logo.svg"');
  await writeFile(file, rewritten);
}
NODE

for exported_file in "${exported_files[@]}"; do
  if grep -qF '"/assets/' "$exported_file" ||
    grep -qF 'import("/assets/' "$exported_file" ||
    grep -qF 'url(/assets/' "$exported_file" ||
    grep -qF '"/brand/' "$exported_file" ||
    grep -qF '"/site.webmanifest' "$exported_file"; then
    echo "GitHub Pages build still contains root-relative asset paths in $exported_file." >&2
    exit 1
  fi
done

touch "$project_dir/dist/client/.nojekyll"
