# Mobile PDF viewer UI fix

## Summary

Refined the phone PDF reader so documents are easier to read and navigate without changing the underlying PDF.js renderer, desktop viewer path, or Google Apps Script.

## Mobile UI improvements

- Increased the document title hierarchy and added a compact current-page indicator to the top toolbar.
- Increased close, pagination, and zoom controls to 44px touch targets.
- Reorganized the bottom toolbar into separate Page and Zoom control groups instead of one dense seven-column strip.
- Added narrow-phone layout safeguards for 320–340px viewports.
- Increased document-stage breathing room and framed the rendered PDF page with a subtle border, radius, and shadow.
- Improved loading feedback with a centered spinner and clearer rendering status.
- Reworked the unavailable-preview state into a readable modal-style card with Retry and Open PDF actions.
- Preserved safe-area padding, full-screen behavior, hidden app navigation, keyboard navigation, and bounded zoom.
- Added a compact-height layout for landscape/short mobile screens.
- Preserved forced-colour and reduced-motion accessibility behavior.

## Regression coverage

- Extended static regression coverage for 44px touch targets, grouped controls, narrow-phone layouts, document framing, and loading feedback.
- Extended Playwright coverage at 390px and 320px widths to verify controls remain inside the viewport and retain 44px minimum touch targets.

## Backend / Apps Script

No Google Apps Script files, API behavior, request policy, or backend data model were changed. No Apps Script deployment is required.
