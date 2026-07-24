"use client";

import { useEffect } from "react";

function initialsFromName(value: string | null | undefined) {
  const words = (value || "")
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "AD";
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }

  const first = Array.from(words[0])[0] || "";
  const last = Array.from(words.at(-1) || "")[0] || "";
  return `${first}${last}`.toUpperCase() || "AD";
}

function syncTopbarAvatar() {
  const chip = document.querySelector<HTMLElement>(".user-chip");
  if (!chip) return;

  const name = chip.querySelector<HTMLElement>(":scope > div > strong")?.textContent;
  const avatar = chip.querySelector<HTMLElement>(":scope > .avatar");
  if (!avatar || !name) return;

  const initials = initialsFromName(name);
  if (avatar.textContent !== initials) avatar.textContent = initials;
  avatar.dataset.cgvAvatarInitials = initials;
  avatar.setAttribute("title", name.trim());
}

function syncAccountModalAvatar() {
  document.querySelectorAll<HTMLElement>(".cgv-function-modal").forEach((modal) => {
    const kicker = modal.querySelector<HTMLElement>(".card-kicker")?.textContent?.trim().toLowerCase();
    if (kicker !== "signed in") return;

    const heading = modal.querySelector<HTMLElement>("h2");
    if (!heading) return;

    modal.classList.add("cgv-admin-account-modal");
    let avatar = modal.querySelector<HTMLElement>(".cgv-admin-account-avatar");
    if (!avatar) {
      avatar = document.createElement("span");
      avatar.className = "cgv-admin-account-avatar";
      avatar.setAttribute("aria-hidden", "true");
      heading.before(avatar);
    }

    const name = heading.textContent?.trim() || "Administrator";
    const initials = initialsFromName(name);
    if (avatar.textContent !== initials) avatar.textContent = initials;
    avatar.dataset.cgvAvatarInitials = initials;
    avatar.setAttribute("title", name);
  });
}

export default function AdminAvatarEnhancer() {
  useEffect(() => {
    let frame = 0;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        syncTopbarAvatar();
        syncAccountModalAvatar();
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    sync();
    window.addEventListener("resize", sync, { passive: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return null;
}
