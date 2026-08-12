# 2026-08-12 — CSS consolidation and visual regression foundation

## UI foundation consolidation

- Consolidated the final `shape-system.css`, `table-label-visibility.css`, and `overall-visual-polish.css` layers into one canonical `app/ui-foundation.css` file.
- Preserved the existing cascade order inside the consolidated file so the current CGV dark/orange appearance, shape hierarchy, table-label contrast, mobile behavior, and accessibility safeguards remain unchanged.
- Removed the three superseded final-layer stylesheets from the active codebase.
- Updated regression tests to protect the canonical foundation and ensure the retired imports do not return accidentally.

## Responsive visual regression foundation

- Added a deterministic visual fixture that loads the same compiled production CSS bundle as the GitHub Pages artifact.
- Added Playwright checks at 320, 360, 390, 430, 768, 1024, and 1440 pixel widths.
- Added assertions for document overflow, control sizing, card shape consistency, mobile navigation, sidebar breakpoints, desktop table headers, and mobile table labels.
- Added full-page PNG screenshots and JSON layout snapshots for every tested viewport.
- GitHub Actions now uploads the screenshots and layout snapshots as a pull-request artifact for review.
- The Playwright package is installed only during verification, so production dependencies and Google Apps Script are unchanged.

## Backend impact

None. No Google Apps Script source or deployment change is required.
