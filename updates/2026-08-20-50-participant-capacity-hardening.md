# 50-participant capacity hardening

## Summary

Improved the frontend request policy for events with up to 50 participants and one monitoring administrator without changing Google Apps Script.

## Changes

- Raised the frontend event-capacity target from 30 to 50 participants while preserving the backend's existing 30-execution contract.
- Spread capacity-sensitive participant requests across a 30-second admission window instead of the previous 300 ms burst.
- Extended bounded retry backoff for transient Apps Script quota, network, timeout, and lock-pressure failures.
- Added retry support for read-only administrator dashboard requests so the monitoring admin can recover from temporary execution pressure without being intentionally delayed.
- Added regression coverage for 50 participants plus one admin, including simulated 30-execution pressure and ambiguous post-commit submission responses.
- Kept start and submission retry behavior idempotent; no backend schema or scoring contract changes were introduced.
- Added a build-only `NEXT_PUBLIC_CAPACITY_SPREAD_MS=0` override to the pull-request verification workflow so mocked Playwright sign-ins remain deterministic. The production Pages workflow does not set this override, so deployed clients retain the full 30-second admission window.

## Google Apps Script

No Google Apps Script changes are required. `google-apps-script/Code.gs` remains unchanged and does not need a new deployment for this update.

## Operational effect

During a synchronized event, participant login, start, and submit requests are intentionally staggered client-side. Individual users may see a short loading period before their request is sent, but the wider admission window reduces the chance that a 50-person cohort overwhelms the Apps Script deployer's simultaneous-execution boundary.

## Verification

The GitHub Actions **Verify application** workflow must pass before merge, including TypeScript/lint, production build, complete Node regressions, responsive visual checks, and Pages artifact validation. The Node capacity regressions run against the production-default 30-second spread; only the static browser fixture build disables that delay.
