# Changelog

## 1.2.0 — Live Quiz Monitoring

- Added the Admin Live Quiz Monitor to the existing overview.
- Added authenticated participant heartbeats every 15 seconds and Admin polling every 10 seconds.
- Added Active, Idle, Disconnected, and Completed status derivation from server timestamps.
- Added reconnect handling that reuses the same attempt activity row.
- Added search, status/evaluation/branch/position filters, clickable status counters, and sorting.
- Added current-question progress, answered count, session duration, relative activity time, and exact activity timestamps.
- Added server-side attempt ownership and course validation.
- Made total question counts server-owned instead of trusting heartbeat payloads.
- Added duplicate-heartbeat throttling and automatic stale activity pruning.
- Added migration-safe `LiveActivity` setup through `setupLiveQuizMonitoring()`.
- Added privacy regression coverage to prevent live monitoring from returning answers, question text, correct-answer keys, or pre-submission scores.
- Expanded responsive, Apps Script, lifecycle, status-boundary, and integration regression coverage.

## 1.1.2 — Productivity & Insights

- Added participant, course, scoreboard, and history filtering/export improvements.
- Added calendar exports for scheduled evaluations.
- Added performance trend visualization.
- Added the application update/version experience used by deployments.
