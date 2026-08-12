# Participant mobile quiz actions — 2026-08-12

## Fixed

- Fixed the participant-side **Add to calendar** control collapsing into the narrow icon column on phones.
- Fixed the scheduled quiz status control such as **Not open yet** wrapping vertically and becoming unreadable.
- The complete scheduled-quiz action group now occupies the dedicated action column on tablets and spans the full quiz card width on phones.
- Both controls use a minimum 44px touch target on mobile.

## Validation

- Added regression coverage for tablet grid placement and full-width phone placement.
- No Google Apps Script change is required for this visual fix.
