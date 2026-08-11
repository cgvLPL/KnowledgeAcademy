# Google Sheets backend

This folder turns a Google Spreadsheet into the CGV Exams database and live
scoreboard.

## Set up

1. Create a blank Google Spreadsheet named **CGV Exams Data**.
2. Open **Extensions → Apps Script**.
3. Replace the default `Code.gs` with this folder's latest `Code.gs`.
4. In **Project Settings**, enable the manifest file and replace it with
   `appsscript.json`.
5. In **Project Settings → Script properties**, add:
   - `INITIAL_ADMIN_USERNAME`
   - `INITIAL_ADMIN_PASSWORD` (at least eight characters)
   - `INITIAL_ADMIN_EMAIL` (optional)
   - `INITIAL_ADMIN_NAME` (optional)
   - `INITIAL_ADMIN_BRANCH` (optional)
   - `INITIAL_ADMIN_POSITION` (optional: `MoD` or `Cinema Manager`; defaults to `MoD`)
   - `SPREADSHEET_ID` (optional fallback for a standalone or rebound script;
     container-bound projects do not need it)
6. Run `setupEvaluationPlatform()` once and approve the requested spreadsheet
   permission.
7. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Copy the `/exec` deployment URL and set it as the hosted site's
   `GOOGLE_APPS_SCRIPT_URL` environment variable.

`setupEvaluationPlatform()` creates the required tabs without deleting existing
courses or users. To intentionally return to one administrator and no other
data, run `resetEvaluationPlatformToAdminOnly()`.

Accounts sign in with usernames. Usernames are lowercase and may contain
letters, numbers, dots, underscores, and hyphens.

Administrator positions are limited to **MoD** and **Cinema Manager**.
Participant positions can be **Stars** or a custom title of up to 80 characters.

## Apply backend updates

GitHub Pages deploys the frontend automatically, but it cannot replace an
existing Google Apps Script web-app version. After `Code.gs` changes:

1. Copy the latest repository `google-apps-script/Code.gs` into the Apps Script
   editor.
2. Run `setupEvaluationPlatform()` once so new workbook columns are added while
   existing account and course data is preserved.
3. Select **Deploy → Manage deployments**.
4. Edit the existing web-app deployment.
5. Choose **New version**, then press **Deploy**.
6. Keep the same `/exec` URL so the website configuration does not need to
   change.

Open the `/exec` URL directly after deployment. The health response must show:

```json
{"ok":true,"ready":true,"service":"CGV Exams","version":"2026.08.11-account-positions","release":"2026.08.11-backend-hardening","missingSheets":[]}
```

The response contains additional fields, but the version value must match.
The `release` value identifies the hardened backend revision without breaking
the compatible frontend API contract. Until both values match, the website is
still connected to an older deployment.

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

## Audited API functions

Participant functions:

- Sign in and sign out.
- Load currently available evaluations and score history.
- Review all published Knowledge Centre lessons and linked resources.
- Start or resume one unfinished attempt for the same course.
- Respect each course's administrator-defined attempt limit, including unlimited attempts.
- Submit answers with server-side scoring.
- Retry a submission safely without creating duplicate rows.

Administrator functions:

- Load courses, participants, administrators, scores, and aggregate statistics.
- Download an executive PDF for each quiz with score distribution, participant
  results, and answer patterns for every question.
- Create participant and administrator accounts with role-specific positions.
- Change positions for existing accounts.
- Reset passwords and activate or deactivate accounts.
- Create, inspect, edit, duplicate, publish, complete, archive, restore, or
  delete a course.
- Create, edit, publish, draft, and delete Knowledge Centre lessons.
- Preserve submitted results by archiving courses that already have attempts.

The backend confirms writes only after `SpreadsheetApp.flush()`. Script locks
protect attempt, answer, course, account, and session writes when multiple
participants submit at nearly the same time. Capacity-sensitive participant
writes use a 90-second queue sized for a 30-person burst. Session and ID lookups
target exact rows instead of scanning whole tabs, and start/submission retries
remain idempotent.

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
- `Lessons` — Knowledge Centre lesson notes, topic, visibility, reading time, and resource link.
- `Questions` — four-option question bank and correct-answer keys.
- `Attempts` — one row per started or submitted evaluation.
- `Answers` — participant answer audit trail.
- `Sessions` — expiring hashed login sessions.
- `Settings` — app-level configuration.

No cells are merged, so filtering, copying, and future automation remain safe.
