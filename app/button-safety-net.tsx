"use client";

import { useEffect, useState } from "react";

type DialogState = {
  title: string;
  message: string;
} | null;

function normalize(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function getButtonLabel(button: HTMLButtonElement) {
  return normalize(button.getAttribute("aria-label") || button.textContent);
}

function getSummary(element: Element | null) {
  const text = (element?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 900 ? `${text.slice(0, 897)}…` : text;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "cgv-exams-export";
}

function downloadTable(table: HTMLTableElement, filename: string) {
  const rows = Array.from(table.querySelectorAll("tr"));
  const csv = rows
    .filter((row) => row.style.display !== "none")
    .map((row) => Array.from(row.querySelectorAll("th, td"))
      .map((cell) => csvCell((cell.textContent || "").replace(/\s+/g, " ").trim()))
      .join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(filename)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getFilterItems(scope: Element) {
  return Array.from(scope.querySelectorAll<HTMLElement>(
    ".course-card, .evaluation-row, .history-preview-card, .podium-card, tbody tr",
  ));
}

function applyTextFilter(scope: Element, term: string) {
  const normalizedTerm = normalize(term);
  const items = getFilterItems(scope);
  let visible = 0;

  items.forEach((item) => {
    const matches = !normalizedTerm || normalize(item.textContent).includes(normalizedTerm);
    item.style.display = matches ? "" : "none";
    if (matches) visible += 1;
  });

  return { visible, total: items.length };
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function findButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => getButtonLabel(button) === normalize(label));
}

function openCourseDraftFromRow(button: HTMLButtonElement, duplicate: boolean) {
  const row = button.closest("tr");
  const title = row?.querySelector(".table-title-cell strong")?.textContent?.trim() || "Untitled course";
  const categoryText = row?.querySelector(".table-title-cell span")?.textContent || "Operations";
  const category = categoryText.split("·")[0]?.trim() || "Operations";
  const openBuilder = findButton("New quiz course");
  if (!openBuilder) return false;

  openBuilder.click();
  window.setTimeout(() => {
    const titleInput = document.querySelector<HTMLInputElement>('input[placeholder="Evaluation title"]');
    const descriptionInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="What should participants"]');
    const categorySelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select"))
      .find((select) => Array.from(select.options).some((option) => option.text === "Operations"));

    if (titleInput) setNativeValue(titleInput, duplicate ? `Copy of ${title}` : title);
    if (descriptionInput) {
      setNativeValue(
        descriptionInput,
        duplicate
          ? `Draft duplicated from ${title}. Review the questions and schedule before publishing.`
          : `Updated draft for ${title}. Review the questions and schedule before saving.`,
      );
    }
    if (categorySelect && Array.from(categorySelect.options).some((option) => option.value === category || option.text === category)) {
      setNativeValue(categorySelect, category);
    }
    titleInput?.focus();
  }, 120);
  return true;
}

function duplicateQuestion(button: HTMLButtonElement) {
  const editor = button.closest<HTMLElement>(".question-editor");
  const addButton = document.querySelector<HTMLButtonElement>(".add-question-card");
  if (!editor || !addButton) return false;

  const prompt = editor.querySelector<HTMLTextAreaElement>("textarea")?.value || "";
  const options = Array.from(editor.querySelectorAll<HTMLInputElement>('.option-editor input:not([type="radio"])'))
    .map((input) => input.value);
  const correctIndex = Array.from(editor.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    .findIndex((input) => input.checked);

  addButton.click();
  window.setTimeout(() => {
    const editors = Array.from(document.querySelectorAll<HTMLElement>(".question-editor"));
    const target = editors.at(-1);
    if (!target) return;

    const promptInput = target.querySelector<HTMLTextAreaElement>("textarea");
    if (promptInput) setNativeValue(promptInput, prompt);
    const optionInputs = Array.from(target.querySelectorAll<HTMLInputElement>('.option-editor input:not([type="radio"])'));
    optionInputs.forEach((input, index) => setNativeValue(input, options[index] || ""));
    const radios = Array.from(target.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    radios[Math.max(0, correctIndex)]?.click();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 120);
  return true;
}

export default function ButtonSafetyNet() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("cgv-mobile-menu-open", mobileMenuOpen);
    return () => document.body.classList.remove("cgv-mobile-menu-open");
  }, [mobileMenuOpen]);

  useEffect(() => {
    let toastTimer = 0;
    const notify = (message: string) => {
      setToast(message);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setToast(null), 2600);
    };

    const openDetails = (button: HTMLButtonElement, title: string) => {
      const source = button.closest("tr, article, .settings-row");
      setDialog({
        title,
        message: getSummary(source) || "No additional information is available.",
      });
    };

    const runPromptFilter = (button: HTMLButtonElement, promptLabel: string) => {
      const scope = button.closest(".content") || document.querySelector(".content") || document.body;
      const items = getFilterItems(scope);
      if (!items.length) {
        notify("There are no visible records to filter.");
        return;
      }
      const term = window.prompt(`${promptLabel}\nLeave blank to reset the view.`, "");
      if (term === null) return;
      const result = applyTextFilter(scope, term);
      notify(term.trim() ? `${result.visible} of ${result.total} records shown.` : "All records are visible again.");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button || button.disabled || button.closest("[data-button-safety-net]")) return;
      if (button.dataset.participantActions === "true") return;

      if (button.closest(".sidebar-nav")) {
        setMobileMenuOpen(false);
        return;
      }

      const label = getButtonLabel(button);
      const hasFilterIcon = Boolean(button.querySelector(".lucide-filter"));
      const hasSearchIcon = Boolean(button.querySelector(".lucide-search"));
      const hasChevronRight = Boolean(button.querySelector(".lucide-chevron-right"));
      const hasMoreIcon = Boolean(button.querySelector(".lucide-more-horizontal"));

      if (label === "open menu") {
        event.preventDefault();
        setMobileMenuOpen((value) => !value);
        return;
      }

      if (label === "notifications") {
        event.preventDefault();
        setDialog({ title: "Notifications", message: "There are no new notifications for this account." });
        return;
      }

      if (label === "forgot password?") {
        event.preventDefault();
        setDialog({
          title: "Password recovery",
          message: "For security, passwords are managed by the CGV Knowledge Academy administrator. Ask an administrator to reset the account password in the connected Google Sheets workspace.",
        });
        return;
      }

      if (label === "help centre") {
        event.preventDefault();
        window.open(
          "https://github.com/rayhanmawuntu-stack/CGV.Exams#google-sheets-connection",
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }

      if (label === "settings") {
        event.preventDefault();
        const profileButton = findButton("My profile") || findButton("Profile");
        if (profileButton) profileButton.click();
        else setDialog({ title: "Admin settings", message: "Administrator configuration is managed through the connected Google Sheets and Apps Script workspace." });
        return;
      }

      if (label.includes("change password") || label.includes("account access")) {
        event.preventDefault();
        setDialog({
          title: label.includes("change password") ? "Change password" : "Account access",
          message: "Contact an administrator to update credentials or account access. Changes are applied through the secure Google Sheets backend.",
        });
        return;
      }

      if (label.includes("export report") || label === "export" || label.includes("export scoreboard")) {
        event.preventDefault();
        const scope = button.closest(".content") || document.querySelector(".content");
        const table = scope?.querySelector<HTMLTableElement>("table");
        if (!table) {
          notify("There is no table data available to export yet.");
          return;
        }
        downloadTable(table, label || "CGV Knowledge Academy export");
        notify("CSV export created.");
        return;
      }

      if (label === "more filters" || label === "status" || label === "schedule" || label === "branch" || hasFilterIcon) {
        event.preventDefault();
        runPromptFilter(button, `Filter by ${label || "text"}`);
        return;
      }

      if (hasSearchIcon && button.classList.contains("icon-button")) {
        event.preventDefault();
        runPromptFilter(button, "Search visible records");
        return;
      }

      if (label === "preview") {
        event.preventDefault();
        openDetails(button, "Course preview");
        return;
      }

      if (label === "duplicate") {
        event.preventDefault();
        if (openCourseDraftFromRow(button, true)) notify("A duplicated course draft has been opened.");
        else notify("The course builder could not be opened.");
        return;
      }

      if (label === "edit") {
        event.preventDefault();
        if (openCourseDraftFromRow(button, false)) notify("The course has been opened as an editable draft.");
        else notify("The course builder could not be opened.");
        return;
      }

      if (label === "duplicate question") {
        if (button.hasAttribute("data-native-question-action")) return;
        event.preventDefault();
        if (duplicateQuestion(button)) notify("Question duplicated.");
        else notify("The question could not be duplicated.");
        return;
      }

      if (button.closest(".question-outline") && !button.classList.contains("add-outline")) {
        event.preventDefault();
        const outlineButtons = Array.from(button.parentElement?.querySelectorAll<HTMLButtonElement>(":scope > button:not(.add-outline)") || []);
        const index = outlineButtons.indexOf(button);
        const editor = document.querySelectorAll<HTMLElement>(".question-editor")[index];
        editor?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (label === "more" || hasMoreIcon) {
        event.preventDefault();
        openDetails(button, button.closest(".participant-cell, tr") ? "Record details" : "More options");
        return;
      }

      if (hasChevronRight && button.classList.contains("icon-button")) {
        event.preventDefault();
        openDetails(button, "Details");
      }
    };

    const onInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (!input.matches(".admin-search input, .top-search input")) return;
      const scope = input.closest(".content")
        || input.closest(".main-shell")?.querySelector(".content")
        || document.querySelector(".content");
      if (scope) applyTextFilter(scope, input.value);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".top-search input")?.focus();
      }
      if (event.key === "Escape") {
        setDialog(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(toastTimer);
      document.removeEventListener("click", onClick);
      document.removeEventListener("input", onInput);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div data-button-safety-net>
      {mobileMenuOpen && (
        <button
          type="button"
          className="button-safety-menu-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {dialog && (
        <div className="button-safety-dialog-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section
            className="button-safety-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="button-safety-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="button-safety-dialog-close" aria-label="Close dialog" onClick={() => setDialog(null)}>×</button>
            <span>CGV EXAMS</span>
            <h2 id="button-safety-dialog-title">{dialog.title}</h2>
            <p>{dialog.message}</p>
            <button type="button" className="primary-button" onClick={() => setDialog(null)}>Done</button>
          </section>
        </div>
      )}

      {toast && <div className="button-safety-toast" role="status">{toast}</div>}
    </div>
  );
}
