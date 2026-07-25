"use client";

import { useEffect } from "react";

const EXPECTED_BACKEND_VERSION = "2026.07.25-upcoming-schedule";
const ENDPOINT = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || "";

function normalized(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function buttonLabel(button: HTMLButtonElement) {
  return normalized(button.getAttribute("aria-label") || button.textContent);
}

function findLabel(scope: ParentNode, text: string) {
  const wanted = normalized(text);
  return Array.from(scope.querySelectorAll<HTMLLabelElement>("label"))
    .find((label) => normalized(label.textContent).includes(wanted));
}

export default function RuntimeFunctionalityEnhancer() {

  useEffect(() => {
    let quizTimer = 0;
    let remainingSeconds = -1;
    let currentQuizTitle = "";
    let timedOutQuizTitle = "";

    const stopTimer = () => {
      window.clearInterval(quizTimer);
      quizTimer = 0;
      remainingSeconds = -1;
      currentQuizTitle = "";
    };

    const clickFinishAndSubmit = () => {
      const lastQuestion = document.querySelector<HTMLButtonElement>(
        ".question-progress-bars button:last-child",
      );
      lastQuestion?.click();

      window.setTimeout(() => {
        const finish = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
          .find((button) => normalized(button.textContent).includes("finish evaluation"));
        if (!finish) return;
        finish.disabled = false;
        finish.click();

        window.setTimeout(() => {
          const submit = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
            .find((button) => normalized(button.textContent).includes("submit evaluation"));
          if (submit && !submit.disabled) submit.click();
        }, 120);
      }, 80);
    };

    const updateTimer = () => {
      const timerText = document.querySelector<HTMLElement>(".quiz-header .timer strong");
      if (!timerText || remainingSeconds < 0) return;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerText.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
      timerText.closest(".timer")?.classList.toggle("timer-warning", remainingSeconds <= 60);
      if (remainingSeconds <= 0) {
        timedOutQuizTitle = currentQuizTitle;
        stopTimer();
        clickFinishAndSubmit();
      }
    };

    const startTimer = () => {
      const quiz = document.querySelector(".quiz-page");
      const timerText = document.querySelector<HTMLElement>(".quiz-header .timer strong");
      const title = document.querySelector<HTMLElement>(".quiz-course-title strong")?.textContent || "";
      if (!quiz || !timerText) {
        if (quizTimer) stopTimer();
        timedOutQuizTitle = "";
        return;
      }
      if (title === timedOutQuizTitle) return;
      if (quizTimer && title === currentQuizTitle) return;

      stopTimer();
      currentQuizTitle = title;
      const initialMinutes = Number.parseInt(timerText.textContent || "", 10);
      remainingSeconds = Math.max(
        1,
        Number.isFinite(initialMinutes) ? initialMinutes * 60 : 20 * 60,
      );
      updateTimer();
      quizTimer = window.setInterval(() => {
        remainingSeconds -= 1;
        updateTimer();
      }, 1000);
    };

    const normalizeBuilder = () => {
      const builder = document.querySelector(".builder-page");
      if (!builder) return;

      const attemptPolicy = findLabel(builder, "attempt policy");
      if (attemptPolicy) attemptPolicy.hidden = true;

      const emailNotification = findLabel(builder, "email notification");
      if (emailNotification) emailNotification.hidden = true;

      const assignment = findLabel(builder, "assign to");
      const assignmentSelect = assignment?.querySelector<HTMLSelectElement>("select");
      if (assignment && assignmentSelect) {
        assignmentSelect.value = assignmentSelect.options[0]?.value || "";
        assignmentSelect.disabled = true;
        assignment.title = "All active participants are assigned in this version.";
      }

      const publish = findLabel(builder, "publish immediately")
        ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (publish && publish.dataset.cgvDefaultReady !== "true") {
        publish.dataset.cgvDefaultReady = "true";
        publish.checked = true;
        publish.dispatchEvent(new Event("input", { bubbles: true }));
        publish.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    const sync = () => {
      startTimer();
      normalizeBuilder();
      const remember = document.querySelector<HTMLElement>(".login-options .check-label");
      if (remember) remember.hidden = true;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button || button.disabled) return;
      const label = buttonLabel(button);

      if (label === "exit evaluation" && button.dataset.cgvExitConfirmed !== "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (window.confirm("Exit this evaluation? Your current answers will not be submitted.")) {
          button.dataset.cgvExitConfirmed = "true";
          button.click();
          delete button.dataset.cgvExitConfirmed;
        }
        return;
      }

      if (label.includes("submit evaluation")) {
        if (button.dataset.cgvSubmitting === "true") {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        button.dataset.cgvSubmitting = "true";
        window.setTimeout(() => {
          if (!document.body.contains(button)) return;
          button.disabled = true;
          button.textContent = "Submitting…";
        }, 0);
        window.setTimeout(() => {
          if (document.body.contains(button)) {
            button.dataset.cgvSubmitting = "false";
            button.disabled = false;
            button.textContent = "Submit evaluation";
          }
        }, 12000);
      }
    };

    document.addEventListener("click", onClick, true);

    if (ENDPOINT) {
      void fetch(ENDPOINT)
        .then((response) => response.json())
        .then((data: { ok?: boolean; version?: string }) => {
          if (!data.ok || data.version !== EXPECTED_BACKEND_VERSION) {
            console.warn(
              `CGV Exams backend version mismatch. Expected ${EXPECTED_BACKEND_VERSION}, found ${data.version || "an older version"}.`,
            );
          }
        })
        .catch((error) => {
          console.warn("CGV Exams backend health check skipped.", error);
        });
    }

    return () => {
      stopTimer();
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
