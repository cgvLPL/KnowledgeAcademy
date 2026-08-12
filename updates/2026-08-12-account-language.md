# Account language preference — 2026-08-12

## Added

- Added a **Language** selector to Settings with `English` and `Bahasa Indonesia`.
- Added Indonesian translations for the primary participant, administrator, navigation, scoreboard, course-builder, and Settings interface labels.
- Preserved internal action labels so translated visible text does not break mobile menus, sign out, or administrator controls.

## Account sync

- Language is tied to the authenticated account rather than only to one browser.
- Google Apps Script now exposes authenticated `getAccountLanguage` and `setAccountLanguage` actions.
- The preference is stored under a per-user key in the existing `Settings` sheet, so no destructive Users-sheet migration is required.
- On sign in, the frontend reloads the account language from Apps Script. On sign out, the local interface resets to English until the next account is authenticated.

## Validation

- Added regression coverage for the Settings selector, Indonesian runtime, account-level Apps Script persistence, action-label compatibility, and layout mounting.
- The Google Apps Script source in `google-apps-script/Code.gs` must be published as a new Web App version for cross-device account language sync to become active on the live deployment.
