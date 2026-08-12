<table align="center">
  <tr>
    <td bgcolor="#070809" align="center">
      <img src="public/brand/cgv-knowledge-academy.svg" alt="CGV Knowledge Academy" width="620">
    </td>
  </tr>
</table>

<p align="center">
  <a href="https://github.com/rayhanmawuntu-stack/CGV.Exams/actions/workflows/verify-pr.yml"><img src="https://github.com/rayhanmawuntu-stack/CGV.Exams/actions/workflows/verify-pr.yml/badge.svg" alt="Verify application"></a>
  <a href="https://github.com/rayhanmawuntu-stack/CGV.Exams/actions/workflows/deploy-pages.yml"><img src="https://github.com/rayhanmawuntu-stack/CGV.Exams/actions/workflows/deploy-pages.yml/badge.svg" alt="Publish site"></a>
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" alt="Node.js 22 or newer">
</p>

# CGV Knowledge Academy

CGV Knowledge Academy is CGV's responsive learning and evaluation platform.
It combines published learning material, scheduled quizzes, participant
performance, certificates, and administrator tools in one cinematic workspace.

> Focused learning. Cinematic energy.

## Live application

[Open CGV Knowledge Academy](https://rayhanmawuntu-stack.github.io/CGV.Exams/)

## Product highlights

### Participants

- Sign in once and enter the participant workspace automatically.
- Choose English or Bahasa Indonesia in Settings; the language preference follows
  the authenticated account rather than a single browser.
- Review published Knowledge Centre lessons and open attached resources safely.
- Take scheduled or live quizzes in a responsive, one-question-at-a-time flow.
- Resume an unfinished attempt, follow course attempt limits, and use a stable
  randomized answer order when enabled.
- Review score history, pass or not-pass outcomes, and printable A4 certificates.

### Administrators

- Monitor workspace activity, KPIs, recent results, and top performers.
- Create, edit, duplicate, schedule, publish, complete, archive, and restore quizzes.
- Configure passing scores, timers, attempt limits, and answer randomization.
- Build four-choice questions with a responsive question outline.
- Upload `.txt` or `.md` lesson notes, edit lesson content, attach resource links,
  and control draft or published visibility in the Knowledge Centre.
- Manage participant and administrator accounts, positions, passwords, and status.
- Use the same account-level English/Bahasa Indonesia setting as participant users.
- Review a quiz-specific live scoreboard and download executive PDF reports with
  score distributions and question-level answer analysis.
- Keep archived quizzes in a distinct section that is collapsed by default.

## Version 1.1.2 — Productivity & Insights

This frontend-only release adds practical tools without requiring a new Google
Apps Script deployment:

- Search and filter the participant directory by branch, position, and account
  status, then export the current filtered view as a formula-safe CSV file.
- Search quiz titles and categories, filter by lifecycle status, and sort by
  newest, title, or status while preserving the collapsible archive.
- Export the currently filtered scoreboard and personal score history to CSV.
- Download scheduled quizzes as `.ics` calendar events, including a reminder,
  for Apple Calendar, Google Calendar, Outlook, and other calendar apps.
- Review an accessible performance trend chart across the eight latest scores.

All exports run locally in the browser. No participant or quiz data is sent to
an additional service.

## Account language

Settings includes `English` and `Bahasa Indonesia`. The selected language is
stored server-side against the authenticated account through Google Apps Script.
Signing into the same account on another browser reloads that account preference.
English remains the default for accounts that have not selected a language yet.

## Roles and positions

| Role | Available positions | Access |
| --- | --- | --- |
| Administrator | `MoD` or `Cinema Manager` | Content, accounts, reports, settings, and scoreboards |
| Participant | `Stars` or a custom title up to 80 characters | Published lessons, available quizzes, history, and certificates |

The authenticated account determines the workspace; users do not select a role
on the sign-in screen.

## Technology

| Layer | Implementation |
| --- | --- |
| Interface | React 19, TypeScript, Vite, vinext, and responsive CSS |
| Data and API | Google Sheets with Google Apps Script |
| Reports | jsPDF executive reports, safe CSV exports, calendar events, and browser-printable certificates |
| Delivery | GitHub Pages and GitHub Actions |
| Quality | ESLint, TypeScript checks, production builds, and Node regression tests |

## Repository structure

- `app/` — application interface, responsive styles, and the server-side Sheets proxy.
- `public/` — CGV brand assets, icons, and web manifest.
- `google-apps-script/` — spreadsheet schema, authentication, scoring API,
  account-language preferences, workbook setup, and dashboard generator.
- `tests/` — functional, visual, security, performance, and capacity regressions.
- `audit/` — functional and 30-participant concurrency audits.
- `scripts/` — verified build and artifact-validation utilities.
- `.github/workflows/` — pull-request verification and GitHub Pages deployment.

## Local development

Requirements: Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/rayhanmawuntu-stack/CGV.Exams.git
cd CGV.Exams
cp .env.example .env.local
npm ci
npm run dev
```

Replace the placeholder in `.env.local` with the deployed Apps Script `/exec`
URL. Local and full-stack deployments use `GOOGLE_APPS_SCRIPT_URL` through the
server-side proxy. A static build uses `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL` to
connect directly from the browser.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm test` | Run lint, type-checking, the Pages build, and every regression test |
| `npm run build` | Create and validate a production build |
| `npm run build:github-pages` | Create the static GitHub Pages artifact |

## Google Sheets and Apps Script setup

Follow [the backend setup guide](google-apps-script/README.md) to:

1. Create the spreadsheet and Apps Script project.
2. Configure the initial administrator through Script Properties.
3. Run `setupEvaluationPlatform()`.
4. Deploy the project as a Web App.
5. Connect its `/exec` URL to the frontend.

The application has no offline or demo accounts. Authentication, lessons,
evaluations, attempts, results, and account-language preferences come from the
connected spreadsheet. `setupEvaluationPlatform()` preserves existing data and
adds required columns. Use `resetEvaluationPlatformToAdminOnly()` only when an
intentional clean reset is required.

## Deployment

Every pull request targeting `main` runs the **Verify application** workflow:
Apps Script syntax validation, TypeScript, lint, a static production build, the
complete regression suite, and Pages artifact checks.

After a verified pull request is merged, **Publish CGV Knowledge Academy site**
builds and deploys the frontend to GitHub Pages automatically.

Google Apps Script versions are deployed separately. When
`google-apps-script/Code.gs` changes, copy the latest file into the Apps Script
editor and publish a new version of the existing Web App deployment. Keep the
same `/exec` URL. The detailed update and health-check procedure is in
[google-apps-script/README.md](google-apps-script/README.md).

## Data model

The workbook uses separate tabs for settings, users, courses, lessons, questions,
attempts, answers, sessions, and the dashboard. Account language is stored as a
per-user key in the existing Settings tab, avoiding a destructive Users-sheet
migration. Passwords are salted and hashed, session tokens are stored as hashes,
correct answers are never sent to participants, and scores are calculated
server-side.

## Participant capacity

The exam write path is designed and regression-tested for 30 participants
signing in, starting, and submitting in the same burst. Capacity-sensitive
requests are spread slightly and retried with bounded backoff, while the Apps
Script backend serializes spreadsheet writes with a 90-second lock queue and
keeps start and submission retries idempotent.

See [the 30-participant capacity audit](audit/concurrency-audit-2026-08-09.md)
for the verification boundary and the required Apps Script deployment step.

## Response performance

The branded opening screen is capped below one second, sign-in returns the
authenticated workspace in one backend response, and Apps Script reuses sheet
reads during each execution. Course changes update only the affected data rows;
the generated spreadsheet dashboard remains formula-driven and no longer needs
to be rebuilt after routine saves or deletes.

No worksheet cells are merged.
