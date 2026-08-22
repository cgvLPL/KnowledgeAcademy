# Google Sheets backend

This folder turns a Google Spreadsheet into the CGV Exams database, live
scoreboard, and live quiz activity service.

## Set up

1. Create a blank Google Spreadsheet named **CGV Exams Data**.
2. Open **Extensions → Apps Script**.
3. Replace the default `Code.gs` with this folder's latest `Code.gs`.
4. Create a second server file named `ZZLiveQuiz.gs` and copy this folder's
   latest `ZZLiveQuiz.gs` into it. Keep the filename so the live-monitor router
   is evaluated after the legacy `Code.gs` router.
5. In **Project Settings**, enable the manifest file and replace it with
   `appsscript.json`.
6. In **Project Settings → Script properties**, add:
   - `INITIAL_ADMIN_USERNAME`
   - `INITIAL_ADMIN_PASSWORD` (at least eight characters)
   - `INITIAL_ADMIN_EMAIL` (optional)
   - `INITIAL_ADMIN_NAME` (optional)
   - `INITIAL_ADMIN_BRANCH` (optional)
   - `INITIAL_ADMIN_POSITION` (optional: `MoD` or `Cinema Manager`; defaults to `MoD`)
   - `SPREADSHEET_ID` (optional fallback for a standalone or rebound script;
     container-bound projects do not need it)
7. Run `setupEvaluationPlatform()` once and approve the requested spreadsheet
   permission.
8. Run `setupLiveQuizMonitoring()` once. It safely creates or repairs the
   `LiveActivity` worksheet and can be re-run without deleting quiz data.
9. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
10. Copy the `/exec` deployment URL and set it as the hosted site's
    `GOOGLE_APPS_SCRIPT_URL` environment variable.

`setupEvaluationPlatform()` creates the core tabs without deleting existing
courses or users. `setupLiveQuizMonitoring()` creates only the live-activity
schema and prunes expired activity rows. To intentionally return to one
administrator and no other data, run `resetEvaluationPlatformToAdminOnly()`.

Accounts sign in with usernames. Usernames are lowercase and may contain
letters, numbers, dots, underscores, and hyphens.

Administrator positions are limited to **MoD** and **Cinema Manager**.
Participant positions can be **Stars** or a custom title of up to 80 characters.

## Live quiz monitoring

`ZZLiveQuiz.gs` adds two authenticated API actions:

- `updateAttemptActivity` — participant-only heartbeat updates for the currently
  authenticated participant's own attempt.
- `adminGetLiveQuizActivity` — administrator-only activity reads for the Admin
  live monitor.

Participant browsers send a heartbeat every 15 seconds while a quiz is open.
The Admin monitor polls every 10 seconds. Server timestamps determine status:

- **Active** — last heartbeat is 30 seconds old or newer.
- **Idle** — last heartbeat is 31–120 seconds old.
- **Disconnected** — last heartbeat is older than 120 seconds or the client
  explicitly reports a disconnect/page exit.
- **Completed** — the canonical attempt has been submitted.

The backend validates that the heartbeat attempt belongs to the authenticated
participant and that any supplied course ID matches the attempt. Total question
count comes from the server-side question bank rather than the client payload.
Repeated identical heartbeat snapshots inside five seconds are acknowledged but
not rewritten to the sheet.

Reconnects update the same `attempt_id` row and return the participant to Active
status; they do not create duplicate live sessions. Completed activity is kept
for six hours, disconnected activity for 24 hours, and stale/missing-attempt rows
are pruned automatically when Admin reads the monitor or when the setup helper is
run.

`LiveActivity` stores only monitoring metadata: attempt/course/user IDs, current
question, total questions, answered count, client status, and activity timestamps.
It never stores answer selections, correct-answer keys, question text, or scores.

## Knowledge Centre and File Garden sync

Knowledge Centre lessons are stored in the `Lessons` sheet. The Apps Script
backend is the canonical source for the lesson title, summary, content, topic,
reading time, visibility, resource label, and resource URL. Both participant
and administrator workspace responses read from the same sheet, and opening the
Knowledge Centre refreshes the lesson list from Apps Script.

For PDF resources hosted by File Garden, store the direct
`https://file.garden/.../document.pdf` URL in `resource_url`. The backend now
validates that URL as well as the browser UI: File Garden garden-page URLs such
as `filegarden.com/...` are rejected, while direct `file.garden` PDFs are
identified in API responses as File Garden PDF resources for the in-app reader.
CGV.Exams still does **not** upload files to File Garden programmatically; the
admin uploads the PDF manually and saves the direct URL in the lesson editor.

After replacing an older Apps Script source, you may run
`syncKnowledgeCentreBackend()` once from the Apps Script editor. It ensures the
canonical `Lessons` schema exists, trims legacy resource URLs, counts File
Garden/PDF resources, and reports invalid legacy resource links without
deleting lesson content. Authenticated administrators can perform the same
maintenance through the `adminSyncKnowledgeCentre` API action.

## Apply backend updates

GitHub Pages deploys the frontend automatically, but it cannot replace an
existing Google Apps Script web-app version. After backend files change:

1. Copy the latest repository `google-apps-script/Code.gs` into the Apps Script
   editor.
2. Copy the latest `google-apps-script/ZZLiveQuiz.gs` into a project file with
   the same name.
3. Run `setupEvaluationPlatform()` once so new core workbook columns are added
   while existing account, course, and lesson data is preserved.
4. Run `setupLiveQuizMonitoring()` once so the `LiveActivity` schema is ready.
5. If required by a Knowledge Centre update, optionally run
   `syncKnowledgeCentreBackend()` once to audit and normalize resource URLs.
6. Select **Deploy → Manage deployments**.
7. Edit the existing web-app deployment.
8. Choose **New version**, then press **Deploy**.
9. Keep the same `/exec` URL so the website configuration does not need to
   change.

Open the `/exec` URL directly after deployment. The health response must show:

```json
{"ok":true,"ready":true,"service":"CGV Exams","version":"2026.08.11-account-positions","release":"2026.08.11-backend-hardening","missingSheets":[]}
```

The response contains additional fields, but the version value must match.
The `release` value identifies the hardened backend revision without breaking
the compatible frontend API contract. Until both values match, the website is
still connected to an older deployment.

After deployment, sign in as one participant and one administrator in separate
browsers or devices. Start a quiz as the participant and confirm the Admin
monitor shows the same participant, course, question progress, and Active state.
Then hide the participant tab long enough to observe Idle, close it or go
offline to observe Disconnected, and reconnect to confirm the same row returns
to Active.

## Operational hardening

The web API rejects malformed, non-object, and oversized request bodies before
they reach spreadsheet operations. Every response includes a request ID,
backend release, and execution duration so a failed browser request can be
matched to its Apps Script execution log.

The health response reports missing workbook sheets and can recover through the
optional `SPREADSHEET_ID` Script Property when the project is no longer
container-bound. Resumed attempts retain their original server start time, and
submission retries remove partial answer rows before writing the canonical
answer set. This keeps timers and result records stable after refreshes,
timeouts, or ambiguous network retries.

Live monitoring adds a separate five-second duplicate-write throttle while the
normal participant heartbeat cadence remains 15 seconds. The live endpoint
never trusts the client for attempt ownership, course ownership, or total
question count.

## Audited API functions

Participant functions:

- Sign in and sign out.
- Load currently available evaluations and score history.
- Review all published Knowledge Centre lessons and linked resources.
- Receive File Garden PDF metadata together with the stored resource URL for
  the internal PDF reader.
- Start or resume one unfinished attempt for the same course.
- Respect each course's administrator-defined attempt limit, including unlimited attempts.
- Submit answers with server-side scoring.
- Retry a submission safely without creating duplicate rows.
- Publish authenticated live-attempt heartbeat metadata without exposing answers.

Administrator functions:

- Load courses, participants, administrators, scores, and aggregate statistics.
- Read authenticated near-real-time quiz activity without receiving participant
  answer selections or correct-answer data.
- Download an executive PDF for each quiz with score distribution, participant
  results, and answer patterns for every question.
- Create participant and administrator accounts with role-specific positions.
- Change positions for existing accounts.
- Reset passwords and activate or deactivate accounts.
- Create, inspect, edit, duplicate, publish, complete, archive, restore, or
  delete a course.
- Create, edit, publish, draft, and delete Knowledge Centre lessons, including
  direct File Garden PDF URLs.
- Audit and normalize Knowledge Centre resource URLs through the authenticated
  `adminSyncKnowledgeCentre` action.
- Preserve submitted results by archiving courses that already have attempts.

The backend confirms writes only after `SpreadsheetApp.flush()`. Script locks
protect attempt, answer, course, account, lesson, live-activity, and session
writes when multiple participants or administrators act nearly at the same
time. Capacity-sensitive participant writes use a 90-second queue sized for a
30-person burst. Session and ID lookups target exact rows instead of scanning
whole tabs, and start/submission retries remain idempotent.

Each request also reuses spreadsheet, sheet, row, and exact-lookup reads within
the current execution. Sign-in returns the participant or administrator
workspace in the same response, and routine course changes no longer rebuild
the spreadsheet dashboard.

## Reset administrator credentials

To change a forgotten administrator username or password without deleting
courses or participant history:

1. Update `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` under
   **Project Settings → Script properties**.
2. Replace the Apps Script project's `Code.gs` with the latest repository
   version.
3. Run `resetAdminCredentials()` from the Apps Script editor.
4. Create a new web-app deployment version.

The reset creates a fresh password salt and hash and signs out existing
sessions. The plaintext password is never stored in the spreadsheet or GitHub.

The web app does not expose correct answers to participants. Passwords are
salted and hashed, session tokens are stored as hashes, results are calculated
server-side, and administrator actions require an administrator session.

## Workbook tabs

- `Dashboard` — evaluation selector, KPIs, participant leaderboard, and score
  distribution.
- `Users` — participant and administrator accounts, including branch and position.
- `Courses` — course metadata, schedule, status, time limit, passing score, and attempt limit.
- `Lessons` — Knowledge Centre title, summary, lesson content, topic, visibility,
  reading time, resource label, and the canonical resource/File Garden URL.
- `Questions` — four-option question bank and correct-answer keys.
- `Attempts` — one row per started or submitted evaluation.
- `Answers` — participant answer audit trail.
- `Sessions` — expiring hashed login sessions.
- `Settings` — app-level configuration.
- `LiveActivity` — transient authenticated quiz-monitoring metadata; created and
  maintained by `ZZLiveQuiz.gs`.

No cells are merged, so filtering, copying, and future automation remain safe.
