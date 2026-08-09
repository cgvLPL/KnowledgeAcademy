"use client";

import { useEffect } from "react";

const EXPECTED_BACKEND_VERSION = "2026.08.09-30-participant-capacity";
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

    };

    document.addEventListener("click", onClick, true);

    if (ENDPOINT) {
      void fetch(ENDPOINT)
        .then((response) => response.json())
        .then((data: { ok?: boolean; version?: string }) => {
          if (!data.ok || data.version !== EXPECTED_BACKEND_VERSION) {
            console.warn(
              `CGV Knowledge Academy backend version mismatch. Expected ${EXPECTED_BACKEND_VERSION}, found ${data.version || "an older version"}.`,
            );
          }
        })
        .catch((error) => {
          console.warn("CGV Knowledge Academy backend health check skipped.", error);
        });
    }

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
