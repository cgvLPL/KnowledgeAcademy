export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "health",
  "login",
  "logout",
  "getParticipantHome",
  "getKnowledgeCentre",
  "startAttempt",
  "submitAttempt",
  "adminGetDashboard",
  "adminGetExecutiveReport",
  "adminGetCourse",
  "adminSaveCourse",
  "adminSaveLesson",
  "adminDeleteLesson",
  "adminDuplicateCourse",
  "adminDeleteCourse",
  "adminSetCourseStatus",
  "adminSaveParticipant",
  "adminSaveUser",
  "adminSetUserPosition",
  "adminSetUserStatus",
  "adminResetPassword",
]);

export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!endpoint) {
    return Response.json(
      {
        ok: false,
        error: "Google Sheets backend is not configured for this deployment.",
      },
      { status: 503 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return Response.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        { ok: false, error: "The Google Sheets backend returned an invalid response." },
        { status: 502 },
      );
    }
    return Response.json(data, {
      status: upstream.ok ? 200 : 502,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { ok: false, error: "Unable to reach the Google Sheets backend." },
      { status: 502 },
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    configured: Boolean(process.env.GOOGLE_APPS_SCRIPT_URL),
    service: "CGV Knowledge Academy Google Sheets bridge",
  });
}
