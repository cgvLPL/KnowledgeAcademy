"use client";

import { useEffect } from "react";

const STORAGE_KEY = "cgv-exams-interface-settings-v1";
const TOKEN_KEY = "cgv-exams-session-token";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";
type Language = "en" | "id";

const TEXT_TRANSLATIONS: Record<string, string> = {
  "Admin workspace": "Ruang kerja admin",
  "Participant portal": "Portal peserta",
  "Overview": "Ringkasan",
  "Evaluations": "Evaluasi",
  "Knowledge centre": "Pusat pengetahuan",
  "Score history": "Riwayat nilai",
  "My profile": "Profil saya",
  "Quiz courses": "Kursus kuis",
  "Participants": "Peserta",
  "Scoreboard": "Papan peringkat",
  "Help centre": "Pusat bantuan",
  "Settings": "Pengaturan",
  "Sign out": "Keluar",
  "Home": "Beranda",
  "Courses": "Kursus",
  "Library": "Pustaka",
  "People": "Peserta",
  "Scores": "Nilai",
  "Learn": "Belajar",
  "History": "Riwayat",
  "Profile": "Profil",
  "Admin overview": "Ringkasan admin",
  "Evaluation performance at a glance": "Ringkasan performa evaluasi",
  "Create and manage evaluation content": "Buat dan kelola konten evaluasi",
  "Accounts, access, and performance": "Akun, akses, dan performa",
  "Live rankings for every evaluation": "Peringkat langsung untuk setiap evaluasi",
  "Your evaluation snapshot": "Ringkasan evaluasi Anda",
  "Live, scheduled, and completed courses": "Kursus aktif, terjadwal, dan selesai",
  "Lessons, guides, and learning resources": "Pelajaran, panduan, dan sumber belajar",
  "Every result, in one place": "Semua hasil dalam satu tempat",
  "Account and learning details": "Detail akun dan pembelajaran",
  "Search anything…": "Cari apa saja…",
  "Notifications": "Notifikasi",
  "Open menu": "Buka menu",
  "Close menu": "Tutup menu",
  "Add participant": "Tambah peserta",
  "Add administrator": "Tambah administrator",
  "New quiz course": "Kursus kuis baru",
  "LIVE RESULTS": "HASIL LANGSUNG",
  "Evaluation scoreboard": "Papan peringkat evaluasi",
  "All participants": "Semua peserta",
  "SELECT EVALUATION": "PILIH EVALUASI",
  "Export filtered CSV": "Ekspor CSV terfilter",
  "Download executive report": "Unduh laporan eksekutif",
  "Submissions": "Pengumpulan",
  "Average": "Rata-rata",
  "Pass rate": "Tingkat kelulusan",
  "Top score": "Nilai tertinggi",
  "Participant": "Peserta",
  "Branch": "Cabang",
  "Score": "Nilai",
  "Correct": "Benar",
  "Time": "Waktu",
  "Completed": "Selesai",
  "Passed": "Lulus",
  "Needs review": "Perlu ditinjau",
  "Active": "Aktif",
  "Inactive": "Tidak aktif",
  "Live": "Aktif",
  "Scheduled": "Terjadwal",
  "Draft": "Draf",
  "Archived": "Diarsipkan",
  "Create account": "Buat akun",
  "Cancel": "Batal",
  "Close": "Tutup",
  "Done": "Selesai",
  "Save": "Simpan",
  "Edit": "Edit",
  "Preview": "Pratinjau",
  "Duplicate": "Duplikat",
  "Restore": "Pulihkan",
  "Delete": "Hapus",
  "Questions": "Pertanyaan",
  "Course details": "Detail kursus",
  "Schedule & access": "Jadwal & akses",
  "Add another question": "Tambah pertanyaan",
  "Answer choices": "Pilihan jawaban",
  "Select the correct answer": "Pilih jawaban yang benar",
  "Ready to publish": "Siap diterbitkan",
  "Publish immediately": "Terbitkan langsung",
  "Email notification": "Notifikasi email",
  "All active participants": "Semua peserta aktif",
  "Settings saved.": "Pengaturan tersimpan.",
  "Changes save automatically.": "Perubahan tersimpan otomatis.",
  "PREFERENCES": "PREFERENSI",
  "Interface preferences are saved in this browser and apply immediately.": "Preferensi tampilan diterapkan langsung. Bahasa disimpan ke akun Anda.",
  "App version": "Versi aplikasi",
  "The portal checks automatically for a newer release.": "Portal otomatis memeriksa versi yang lebih baru.",
  "Language": "Bahasa",
  "Choose the interface language for your account.": "Pilih bahasa tampilan untuk akun Anda.",
  "Compact interface": "Tampilan ringkas",
  "Reduce padding and fit more course and result data on screen.": "Kurangi jarak agar lebih banyak data kursus dan hasil terlihat di layar.",
  "Reduce motion": "Kurangi animasi",
  "Disable decorative transitions, animated scrolling, and loading movement.": "Nonaktifkan transisi dekoratif, gulir animasi, dan gerakan saat memuat.",
  "Enhanced contrast": "Kontras ditingkatkan",
  "Increase text, border, helper-label, and focus visibility.": "Tingkatkan keterbacaan teks, garis, label bantuan, dan fokus.",
  "Automatic live refresh": "Penyegaran otomatis",
  "Refresh administrator results and scoreboards every ten seconds.": "Segarkan hasil admin dan papan peringkat setiap sepuluh detik.",
  "Reset defaults": "Kembalikan bawaan",
  "Refresh data now": "Segarkan data sekarang"
};

const ATTRIBUTE_TRANSLATIONS: Record<string, string> = {
  "Search": "Cari",
  "Find participant": "Cari peserta",
  "Select evaluation scoreboard": "Pilih papan peringkat evaluasi",
  "Close settings": "Tutup pengaturan",
  "Open account": "Buka akun",
  "Language": "Bahasa"
};

const reverseText = Object.fromEntries(Object.entries(TEXT_TRANSLATIONS).map(([en, id]) => [id, en]));
const reverseAttributes = Object.fromEntries(Object.entries(ATTRIBUTE_TRANSLATIONS).map(([en, id]) => [id, en]));

function normalizeLanguage(value: unknown): Language {
  return String(value || "").trim().toLowerCase() === "id" ? "id" : "en";
}

function readLanguage(): Language {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as { language?: string };
    return normalizeLanguage(parsed.language);
  } catch {
    return "en";
  }
}

function storeLanguage(language: Language) {
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, unknown>;
  } catch {
    current = {};
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, language }));
  document.documentElement.dataset.cgvLanguage = language;
  document.documentElement.lang = language;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function parseAction(init?: RequestInit) {
  if (typeof init?.body !== "string") return "";
  try {
    return String((JSON.parse(init.body) as { action?: string }).action || "");
  } catch {
    return "";
  }
}

function translateTextNode(node: Text, language: Language) {
  const raw = node.nodeValue || "";
  const leading = raw.match(/^\s*/u)?.[0] || "";
  const trailing = raw.match(/\s*$/u)?.[0] || "";
  const value = raw.trim();
  if (!value) return;
  const translated = language === "id" ? TEXT_TRANSLATIONS[value] : reverseText[value];
  if (translated) node.nodeValue = `${leading}${translated}${trailing}`;
}

function translateElement(element: Element, language: Language) {
  if (element.matches("script, style, code, pre, textarea, [data-cgv-no-translate]")) return;
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, language);
  });

  ["aria-label", "title", "placeholder"].forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (!value) return;
    const table = language === "id" ? ATTRIBUTE_TRANSLATIONS : reverseAttributes;
    const translated = table[value];
    if (translated) element.setAttribute(attribute, translated);
  });
}

function translateDocument(language: Language, root: ParentNode = document.body) {
  document.documentElement.lang = language;
  if (root instanceof Element) translateElement(root, language);
  root.querySelectorAll?.("*").forEach((element) => translateElement(element, language));
}

export default function LanguageEnhancer() {
  useEffect(() => {
    let language = readLanguage();
    let scheduled = false;
    const nativeFetch = window.fetch;
    const previousFetch = nativeFetch.bind(window);

    const setLanguage = (next: Language, root?: ParentNode) => {
      language = next;
      storeLanguage(next);
      translateDocument(next, root || document.body);
    };

    const enhancedFetch: typeof window.fetch = async (input, init) => {
      const action = parseAction(init);
      const response = await previousFetch(input, init);

      if (action === "login") {
        try {
          const data = await response.clone().json() as {
            ok?: boolean;
            token?: string;
            user?: { language?: string };
          };
          if (response.ok && data.ok !== false && data.token) {
            const accountLanguage = normalizeLanguage(data.user?.language);
            storeLanguage(accountLanguage);
            language = accountLanguage;
            window.requestAnimationFrame(() => translateDocument(accountLanguage));
          }
        } catch {
          // Login remains owned by the application.
        }
      } else if (action === "logout" && response.ok) {
        storeLanguage("en");
        language = "en";
      }

      return response;
    };

    window.fetch = enhancedFetch;

    const apply = (root: ParentNode = document.body) => {
      scheduled = false;
      translateDocument(language, root);
    };

    apply();

    const observer = new MutationObserver((mutations) => {
      if (scheduled) return;
      const added = mutations.flatMap((mutation) => Array.from(mutation.addedNodes));
      const root = added.find((node): node is Element => node instanceof Element) || document.body;
      scheduled = true;
      window.requestAnimationFrame(() => apply(root));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: Language }>).detail;
      const next = normalizeLanguage(detail?.language);
      if (next === language) return;
      setLanguage(next);

      const token = window.sessionStorage.getItem(TOKEN_KEY);
      const endpoint = window.sessionStorage.getItem(ENDPOINT_KEY)
        || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim()
        || "";
      if (!token || !endpoint) return;

      void previousFetch(endpoint, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "setAccountLanguage", token, language: next }),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Unable to save account language.");
        const data = await response.json() as { ok?: boolean; user?: { language?: string } };
        if (data.ok === false) throw new Error("Unable to save account language.");
        const savedLanguage = normalizeLanguage(data.user?.language || next);
        if (savedLanguage !== language) setLanguage(savedLanguage);
      }).catch(() => {
        // Keep the selected language locally for this session; the next login
        // re-applies the server-side account preference as the source of truth.
      });
    };

    window.addEventListener("cgv:settings-changed", onSettingsChanged);
    return () => {
      observer.disconnect();
      if (window.fetch === enhancedFetch) window.fetch = nativeFetch;
      window.removeEventListener("cgv:settings-changed", onSettingsChanged);
    };
  }, []);

  return null;
}
