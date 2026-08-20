# Faster Finish Evaluation response

Date: 2026-08-20

## Summary

- Send `submitAttempt` immediately when a participant confirms **Finish evaluation**, removing the artificial 0–30 second first-request wait.
- Keep `submitAttempt` retryable with bounded backoff so temporary Apps Script concurrency pressure recovers automatically.
- Keep the 30-second admission spread on `startAttempt`, where synchronized cohort starts can still create a preventable burst.
- Add a dedicated 8-second Apps Script submission lock timeout so busy submit executions release capacity quickly instead of waiting behind the general 90-second write lock.
- Preserve idempotent submission handling so retries return an existing submitted result instead of creating duplicates.
- Batch contiguous row deletion in the backend cleanup helper to reduce Spreadsheet service calls when recovering from partial writes.
- Add regression coverage for immediate finish submission, transient-capacity retry behavior, and the new backend lock contract.

## Backend deployment note

This update changes `google-apps-script/Code.gs`. Deploy the updated Apps Script web app version before expecting the production site to receive the backend-side submission improvements.
