# Faster login flow

## Summary

Removed the production cohort-admission delay from the first login request so normal authentication starts immediately instead of waiting for the exam burst spread window.

## What changed

- Login now sends its first backend request immediately.
- Transient Apps Script capacity failures during login still use the existing bounded retry/backoff policy.
- `startAttempt` and `submitAttempt` continue to use the 30-second production admission spread that protects synchronized 50-participant exam bursts.
- Admin dashboard reads remain immediate.
- Added regression coverage for immediate healthy login, transient login retry, and preserved exam-write admission control.

## Expected impact

For a healthy backend, the client-side login delay drops from a random **0–30 seconds** to **0 seconds** before the request is sent. Actual authentication time is then determined by network and Apps Script response time rather than an artificial client wait.

## Backend / Apps Script

No Google Apps Script files, backend data model, authentication contract, or spreadsheet logic were changed. No Apps Script redeployment is required.
