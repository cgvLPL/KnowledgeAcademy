# Mobile PDF pagination fix

Date: 2026-08-19

## Fixed

- Added an app-controlled PDF.js reader on phone-sized viewports so iPhone/Safari participants are no longer dependent on the browser's embedded PDF pagination behavior.
- Added explicit Previous and Next page controls with a live `current / total` page counter.
- Added 75%–200% zoom controls for small-screen reading.
- Hid the app topbar and bottom navigation while the immersive mobile PDF reader is open so they cannot cover document controls.
- Kept the reader toolbar and page controls inside iPhone safe areas, above Safari/browser chrome where the web viewport permits it.
- Kept the existing embedded browser PDF viewer on desktop and tablet widths above 760px.
- Added retry handling plus an emergency browser-open fallback if the PDF host blocks in-app rendering.

## Verification

- Added static regression coverage for mobile PDF page navigation, zoom limits, full-screen stacking, safe-area handling, and desktop preservation.
- Added a Playwright 390×844 interaction test that opens a three-page File Garden PDF, moves from page 1 to page 3 and back, verifies zoom controls, and confirms the mobile navigation stays hidden until the reader closes.
- Simplified the GitHub Actions Playwright setup to install the pinned Chromium browser without repeatedly reinstalling Ubuntu OS dependencies already present on `ubuntu-latest`.
- Run the complete **Verify application** GitHub Actions workflow before merge.

## Backend

No Google Apps Script schema or API changes are required for this fix. Existing direct File Garden PDF URLs continue to be used.