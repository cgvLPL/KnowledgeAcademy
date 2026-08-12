# Responsive visual regression checks

The visual suite renders a deterministic fixture with the same production CSS bundle used by the GitHub Pages build. It verifies the shared UI foundation at the viewport widths that have historically exposed layout regressions:

- 320×720
- 360×800
- 390×844
- 430×932
- 768×1024
- 1024×768
- 1440×1000

For every viewport the Playwright suite checks:

- no document-level horizontal overflow;
- usable primary-control height;
- the canonical card radius and visible surface border;
- desktop table-header visibility;
- mobile `data-label` visibility;
- desktop sidebar / mobile navigation breakpoint behavior.

It also saves a full-page PNG and a JSON layout snapshot for every viewport. GitHub Actions uploads these files as a `visual-regression-<PR>` artifact for review.

## Local run

Build the same static artifact used by CI, install the pinned Playwright runner without changing `package.json` or `package-lock.json`, install Chromium, then run the suite:

```bash
npm run build:github-pages
npm install --no-save --package-lock=false @playwright/test@1.55.0
npx playwright install chromium
npx playwright test --config tests/visual/playwright.config.mjs
```

The Playwright dependency is intentionally CI/test-only so the production dependency graph remains unchanged.
