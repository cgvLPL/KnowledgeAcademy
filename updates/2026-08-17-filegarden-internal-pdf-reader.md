# File Garden internal PDF reader

Date: 2026-08-17

## Added

- Added first-class PDF resource detection to the Knowledge Centre.
- Added direct File Garden PDF URL support using `https://file.garden/.../*.pdf` links.
- Added a CGV-styled in-app PDF reader so participants and administrators can read attached PDFs without leaving CGV.Exams.
- Kept browser PDF controls available inside the embedded viewer and added responsive desktop/mobile reader framing.
- Added File Garden guidance inside the lesson editor so administrators know to upload manually and paste the direct file URL.
- Added a PDF indicator to lesson cards that have PDF resources.

## Safety and compatibility

- File Garden garden-page URLs on `filegarden.com` are rejected in the lesson editor; administrators are prompted to use the direct `file.garden` file URL instead.
- CGV.Exams does not automate uploads to File Garden.
- Non-PDF resource links retain the existing external-link behavior.
- The PDF iframe uses a no-referrer policy and does not render lesson HTML with `dangerouslySetInnerHTML`.
- Forced-colour and mobile safe-area styling is included.

## Verification

- Expanded Knowledge Centre regression coverage for File Garden detection, PDF routing, admin guidance, responsive reader layout, and manual-upload policy.
- Expanded Playwright interaction coverage to open and close a File Garden PDF inside the real production build at mobile and desktop sizes.
- Run the complete GitHub Actions `Verify application` workflow before merge.

## Deployment

Frontend-only update. Existing `resourceTitle` and `resourceUrl` lesson fields are reused, so no Google Apps Script source or deployment changes are required.
