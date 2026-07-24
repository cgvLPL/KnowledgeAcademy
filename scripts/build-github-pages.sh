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
GITHUB_PAGES=true \
NEXT_PUBLIC_BASE_PATH="/CGV.Exams" \
bash scripts/sites-env.sh -- vinext build

if [[ ! -f "$project_dir/dist/client/index.html" ]]; then
  echo "GitHub Pages build did not produce dist/client/index.html." >&2
  exit 1
fi

for exported_file in \
  "$project_dir/dist/client/index.html" \
  "$project_dir/dist/client/index.rsc"; do
  sed -i \
    -e 's#/assets/#/CGV.Exams/assets/#g' \
    -e 's#/favicon\.svg#/CGV.Exams/favicon.svg#g' \
    -e 's#/cgv-logo\.svg#/CGV.Exams/cgv-logo.svg#g' \
    "$exported_file"
done

if grep -qF '"/assets/' "$project_dir/dist/client/index.html" ||
  grep -qF 'import("/assets/' "$project_dir/dist/client/index.html" ||
  grep -qF 'url(/assets/' "$project_dir/dist/client/index.html"; then
  echo "GitHub Pages build still contains root-relative asset paths." >&2
  exit 1
fi

touch "$project_dir/dist/client/.nojekyll"
