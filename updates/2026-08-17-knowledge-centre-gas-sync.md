# Knowledge Centre Google Apps Script sync

Date: 2026-08-17

## Added

- Made Google Apps Script the explicit canonical backend for the complete Knowledge Centre lesson payload, including lesson content, visibility, resource labels, and resource URLs.
- Added server-side File Garden resource detection so direct `file.garden` PDF URLs are identified consistently with the in-app PDF reader.
- Added server-side rejection of `filegarden.com` garden-page URLs so administrators store the direct file URL instead.
- Added resource metadata to lesson API responses: resource type, provider, PDF status, File Garden status, and validity.
- Added Knowledge Centre sync metadata to participant, administrator, and dedicated Knowledge Centre responses.
- Added authenticated `adminSyncKnowledgeCentre` maintenance support plus the editor-run `syncKnowledgeCentreBackend()` helper for existing workbook data.

## Improved

- The `Lessons` sheet schema is now re-checked whenever Knowledge Centre data is accessed.
- Existing lesson resource URLs can be trimmed and audited without deleting lesson content.
- The sync audit reports total lessons, normalized resources, File Garden resources, PDF resources, and invalid legacy lesson IDs.
- The local Google Sheets API bridge now allows the authenticated Knowledge Centre sync action.
- Desktop PDF viewing now stays inside the main workspace so the persistent sidebar and top header remain visible.
- Mobile PDF viewing now uses an immersive full-screen document mode instead of squeezing the document between the app header and bottom navigation.
- The mobile PDF footer is removed in favor of the compact close toolbar, giving the document substantially more vertical reading space.
- The PDF reader is rendered through a body-level React portal so app headers/navigation cannot intercept its mobile controls.
- PDF stage/frame touch behavior now explicitly allows panning and pinch zoom while containing overscroll inside the reader.

## File Garden policy

- PDF uploads remain manual in File Garden.
- CGV.Exams stores only the direct resource URL and does not programmatically upload files to File Garden.
- Direct File Garden PDFs continue to render inside CGV.Exams after the URL is returned by Google Apps Script.

## Verification

- Added `tests/knowledge-centre-gas-sync.test.mjs` to cover Apps Script persistence, File Garden validation, response metadata, workspace synchronization, maintenance sync behavior, and schema enforcement.
- Extended Knowledge Centre regression coverage for desktop app-chrome preservation and immersive mobile PDF layout.
- Added a Playwright mobile PDF usability check that requires the reader to occupy the full 390×844 viewport, keep a compact toolbar, hide the desktop footer, preserve touch gestures, and provide more than 770px of document stage height.
- Verify the complete application with GitHub Actions before merge.

## Deployment

This update **does change Google Apps Script source**. After merge, replace the deployed project's `Code.gs` with the new repository version and publish a new Web App version. Running `syncKnowledgeCentreBackend()` once is recommended for an existing workbook so legacy resource URLs are audited and normalized.
