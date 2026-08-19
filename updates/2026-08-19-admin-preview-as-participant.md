# Admin Preview as Participant

## Summary

Knowledge Centre administrators can now open any saved lesson through an explicit **Preview as participant** action before deciding whether to edit or publish it.

## What changed

- Replaced the ambiguous admin-facing `Review lesson` label with `Preview as participant`.
- Added a dedicated preview icon and accessible preview label for every admin lesson card.
- Reused the same `LessonReader` component used by participants, so lesson copy, metadata, resource links, File Garden PDF behavior, and responsive presentation match the participant experience.
- Draft lessons remain available to administrators for preview while continuing to stay hidden from participant accounts.
- Previewing a lesson is read-only and does not save, publish, delete, or otherwise mutate lesson data.
- Added regression coverage for the admin preview affordance, participant-reader reuse, and draft visibility boundary.

## Backend impact

None. This is a frontend-only Knowledge Centre improvement and does not require a Google Apps Script deployment.
