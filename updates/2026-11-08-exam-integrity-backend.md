# Server-enforced time limits, stable question IDs, and backend routing

Date: 2026-11-08

## Summary

- Enforce each attempt's deadline in `submitAttempt`: the start time plus the
  time limit, capped at the course closing date, with a 120-second grace period
  for network delay and retries. Later submissions are closed unscored.
- Return `deadlineAt` and `serverNow` from `startAttempt`. The quiz timer
  counts down to the deadline using the server clock, so reloads and resumes
  keep the original deadline.
- Close abandoned attempts whose deadline has passed when the participant
  reopens the quiz, and count them toward the attempt limit.
- Keep existing question IDs when a quiz is edited. IDs are only reused for
  questions that already belong to the same course, and duplicates within one
  save get new IDs.
- Consolidate routing into one `doPost` in `Code.gs`. `ZZLiveQuiz.gs` exposes
  `liveQuizApiRoutes_()` instead of defining its own `doPost`.
- Store live-monitor heartbeats in `CacheService` without taking the script
  lock. The admin monitor derives its list from the `Attempts` sheet.
- Remove the unlocked, row-by-row `LiveActivity` pruning.

## Behaviour changes to note

- A submission that reaches the server more than 120 seconds after the
  deadline scores 0, and the participant sees a message explaining why.
- If an admin adds a question while someone is mid-attempt, that question
  counts as unanswered for them; removed questions are simply not scored.

## Backend deployment note

This update changes both `google-apps-script/Code.gs` and
`google-apps-script/ZZLiveQuiz.gs`. Replace both files in the Apps Script
editor and make sure no other `.gs` file defines `doPost`. Then publish a new
version of the existing web-app deployment, keeping the same `/exec` URL.
Optionally run `setupLiveQuizMonitoring()` once to clear the legacy
`LiveActivity` rows.
