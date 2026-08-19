# Certificate text visibility fix

Date: 2026-08-19

## Fixed

- Restored dark certificate typography on the light A4 certificate surface instead of allowing app-wide white heading styles to bleed into the document.
- Added explicit text-fill colours for certificate titles, participant names, course titles, metadata, completion details, signatures, and location information.
- Preserved the white verified-seal typography and existing CGV orange/red accents.
- Kept the certificate print/PDF layout and all existing certificate data unchanged.

## Verification

- Added regression coverage that protects the certificate-specific palette from the final app-wide visual foundation.
- Run the complete **Verify application** GitHub Actions workflow before merge.

## Backend

No Google Apps Script changes are required. This is a frontend-only certificate visibility fix.
