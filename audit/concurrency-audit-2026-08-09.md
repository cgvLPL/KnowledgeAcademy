# CGV Exams 30-participant capacity audit — 9 August 2026

## Capacity target

The supported event size is 30 participants using the same live evaluation at
the same time. The capacity-sensitive phases are sign-in, starting or resuming
an attempt, and final submission.

[Google Apps Script currently documents](https://developers.google.com/apps-script/guides/services/quotas)
a limit of 30 simultaneous executions per user. Because the web app executes as
its deployer, a 30-person request burst sits at that platform boundary. The
application therefore spreads the first request slightly and retries transient
quota, network, and lock-pressure failures with bounded backoff.

## Safeguards implemented

- Participant write locks can queue for 90 seconds, leaving a 2.5-second
  critical-section budget for each person in a 30-person burst.
- Password verification and answer scoring run before the shared write lock so
  only the minimum spreadsheet mutation remains serialized.
- Session tokens, user IDs, course IDs, and attempt IDs use exact-row lookup
  instead of repeatedly reading complete tabs.
- Started attempts are reused, and repeated submissions return the stored
  result. A timed-out browser retry cannot create a duplicate attempt or score.
- Answer rows are still committed in one batch and flushed before releasing the
  write lock.
- Expired session cleanup is removed from the sign-in hot path and runs at most
  once every six hours during sign-out.

## Automated verification

`tests/concurrency-capacity.test.mjs` launches 30 virtual participants through
sign-in, start, and submit bursts. It injects transient capacity failures and
an ambiguous post-commit submission response, then verifies that all 30 finish
and only 30 distinct results are recorded.

The regular test command also validates Apps Script syntax, frontend types,
the production site build, and all existing functional contracts.

## Production verification boundary

The automated capacity test is deterministic and does not use real participant
credentials or write test results into the production spreadsheet. A fully
authenticated live rehearsal still requires 30 designated test accounts and a
disposable live evaluation.

GitHub Pages cannot update the Apps Script web-app deployment. After publishing
this repository change, copy the latest `google-apps-script/Code.gs` into the
Apps Script project and deploy a new version. The live `/exec` health response
must report:

```json
{"ok":true,"service":"CGV Exams","version":"2026.08.09-30-participant-capacity"}
```

Until that version is visible, the live site is still using the older backend
capacity rules.
