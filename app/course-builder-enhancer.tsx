"use client";

import { useEffect } from "react";

type SaveCoursePayload = {
  action?: string;
  course?: Record<string, unknown> & {
    questions?: unknown[];
  };
};

type PublishingSettings = {
  startAt: string;
  endAt: string;
  status: "draft" | "live" | "completed";
};

type SaveContext = {
  publishing: PublishingSettings;
  questionCount: number;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function localDateToIso(value: string, endOfDay = false) {
  if (!value) return "";
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function findBuilderLabel(builder: Element, text: string) {
  const normalizedText = normalizeText(text);
  return Array.from(builder.querySelectorAll<HTMLLabelElement>("label"))
    .find((label) => normalizeText(label.textContent).includes(normalizedText));
}

function getPublishImmediatelyCheckbox(builder: Element) {
  return findBuilderLabel(builder, "publish immediately")
    ?.querySelector<HTMLInputElement>('input[type="checkbox"]') || null;
}

function ensurePublishImmediatelyDefault(builder: Element) {
  const checkbox = getPublishImmediatelyCheckbox(builder);
  if (!checkbox || checkbox.dataset.cgvPublishDefault === "set") return;

  checkbox.dataset.cgvPublishDefault = "set";
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
}

function readPublishingSettings(): PublishingSettings | null {
  const builder = document.querySelector(".builder-page");
  if (!builder) return null;

  const startValue = findBuilderLabel(builder, "opens on")
    ?.querySelector<HTMLInputElement>('input[type="date"]')?.value || "";
  const endValue = findBuilderLabel(builder, "closes on")
    ?.querySelector<HTMLInputElement>('input[type="date"]')?.value || "";
  const publishCheckbox = getPublishImmediatelyCheckbox(builder);
  // Courses publish live by default, even when Save is used before Step 3 is opened.
  // Once the toggle is visible, the user's explicit checked/unchecked choice wins.
  const publishImmediately = publishCheckbox ? publishCheckbox.checked : true;

  const startAt = localDateToIso(startValue);
  const endAt = localDateToIso(endValue, true);
  const now = Date.now();
  const endsAtMs = endAt ? new Date(endAt).getTime() : 0;

  const shouldPublish = publishImmediately || Boolean(startAt);
  const status: PublishingSettings["status"] = shouldPublish
    ? endsAtMs && endsAtMs < now ? "completed" : "live"
    : "draft";

  return { startAt, endAt, status };
}

function publicationLabel(settings: PublishingSettings | null) {
  if (!settings) return "Course draft";
  const startsAtMs = settings.startAt ? new Date(settings.startAt).getTime() : 0;
  if (settings.status === "live" && startsAtMs > Date.now()) return "Will publish as scheduled";
  if (settings.status === "live") return "Will publish as live";
  if (settings.status === "completed") return "Schedule has already ended";
  return "Will save as draft";
}

export default function CourseBuilderEnhancer() {
  useEffect(() => {
    const nativeFetch = window.fetch;
    const originalFetch = nativeFetch.bind(window);

    const enhancedFetch: typeof window.fetch = async (input, init) => {
      let nextInit = init;
      let saveContext: SaveContext | null = null;

      if (typeof init?.body === "string") {
        try {
          const payload = JSON.parse(init.body) as SaveCoursePayload;
          if (payload.action === "adminSaveCourse" && payload.course) {
            const publishing = readPublishingSettings();
            if (publishing) {
              const questions = Array.isArray(payload.course.questions)
                ? payload.course.questions
                : [];
              saveContext = {
                publishing,
                questionCount: questions.length,
              };
              nextInit = {
                ...init,
                body: JSON.stringify({
                  ...payload,
                  course: {
                    ...payload.course,
                    questions,
                    startAt: publishing.startAt,
                    endAt: publishing.endAt,
                    status: publishing.status,
                  },
                }),
              };
              document.querySelector(".builder-page")?.classList.add("cgv-saving-course");
            }
          }
        } catch {
          // Non-JSON requests are passed through unchanged.
        }
      }

      let response: Response;
      try {
        response = await originalFetch(input, nextInit);
      } finally {
        document.querySelector(".builder-page")?.classList.remove("cgv-saving-course");
      }

      if (!saveContext) return response;

      try {
        const responseData = await response.clone().json() as {
          ok?: boolean;
          course?: Record<string, unknown>;
        };
        if (responseData.ok !== false && responseData.course) {
          const headers = new Headers(response.headers);
          headers.delete("content-length");
          headers.set("content-type", "application/json;charset=utf-8");
          return new Response(JSON.stringify({
            ...responseData,
            course: {
              ...responseData.course,
              questionCount: saveContext.questionCount,
              startAt: saveContext.publishing.startAt,
              endAt: saveContext.publishing.endAt,
              status: saveContext.publishing.status,
            },
          }), {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }
      } catch {
        // Keep the original backend response when it cannot be safely enhanced.
      }

      return response;
    };

    window.fetch = enhancedFetch;

    let activeQuestionIndex = 0;
    let activateNewestQuestion = false;
    let syncTimer = 0;

    const syncBuilder = () => {
      const builder = document.querySelector(".builder-page");
      if (!builder) return;

      ensurePublishImmediatelyDefault(builder);

      const editors = Array.from(builder.querySelectorAll<HTMLElement>(".question-editor"));
      const outlineButtons = Array.from(
        builder.querySelectorAll<HTMLButtonElement>(".question-outline > button:not(.add-outline)"),
      );

      if (activateNewestQuestion && editors.length) {
        activeQuestionIndex = editors.length - 1;
        activateNewestQuestion = false;
      }
      activeQuestionIndex = Math.max(0, Math.min(activeQuestionIndex, Math.max(0, editors.length - 1)));

      editors.forEach((editor, index) => {
        const active = index === activeQuestionIndex;
        editor.classList.toggle("cgv-active-question", active);
        editor.setAttribute("aria-hidden", active ? "false" : "true");
      });

      outlineButtons.forEach((button, index) => {
        const active = index === activeQuestionIndex;
        button.classList.toggle("cgv-active-question-button", active);
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });

      const actions = builder.querySelector(".builder-actions");
      if (actions) {
        let status = actions.querySelector<HTMLElement>(".cgv-builder-save-state");
        if (!status) {
          status = document.createElement("span");
          status.className = "cgv-builder-save-state";
          actions.prepend(status);
        }
        status.textContent = publicationLabel(readPublishingSettings());
      }
    };

    const scheduleSync = (delay = 0) => {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(syncBuilder, delay);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const builder = target.closest(".builder-page");
      if (!builder) return;

      const outlineButton = target.closest<HTMLButtonElement>(
        ".question-outline > button:not(.add-outline)",
      );
      if (outlineButton) {
        const buttons = Array.from(
          builder.querySelectorAll<HTMLButtonElement>(".question-outline > button:not(.add-outline)"),
        );
        activeQuestionIndex = Math.max(0, buttons.indexOf(outlineButton));
        syncBuilder();
        builder.querySelector<HTMLElement>(".question-editor.cgv-active-question")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (target.closest(".add-outline, .add-question-card, [aria-label='Duplicate question']")) {
        activateNewestQuestion = true;
        scheduleSync(180);
        return;
      }

      if (target.closest("[aria-label='Delete question']")) {
        scheduleSync(80);
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".builder-page")) return;
      scheduleSync(0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      const builder = document.querySelector(".builder-page");
      if (!builder) return;

      const visibleCard = builder.querySelector<HTMLElement>(
        ".builder-card, .builder-question-layout",
      );
      const actions = Array.from(
        visibleCard?.querySelectorAll<HTMLButtonElement>(".builder-footer button") || [],
      );
      const action = actions[actions.length - 1];
      if (action && !action.disabled) {
        event.preventDefault();
        action.click();
      }
    };

    const observer = new MutationObserver(() => scheduleSync(0));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("keydown", onKeyDown);
    syncBuilder();

    return () => {
      if (window.fetch === enhancedFetch) window.fetch = nativeFetch;
      window.clearTimeout(syncTimer);
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
