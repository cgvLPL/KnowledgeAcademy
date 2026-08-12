# Table label visibility — 2026-08-12

## Fixed

- Increased contrast for table column labels across desktop and tablet tables.
- Strengthened mobile card-style table labels generated from `data-label` in participant and score-history tables.
- Ensured labels use full opacity and explicit text fill so later dark/glass theme layers cannot wash them out.
- Added a subtle header surface/divider treatment to make column labels easier to scan without changing the table layout.
- Preserved enhanced-contrast mode and forced-colour accessibility behavior.

## Validation

- Added regression coverage for stylesheet load order, desktop header labels, mobile generated labels, and forced-colour support.
- Frontend-only change; no Google Apps Script update is required.
