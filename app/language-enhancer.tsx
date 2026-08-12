"use client";

import { useEffect } from "react";

const STORAGE_KEY = "cgv-exams-interface-settings-v1";
const TOKEN_KEY = "cgv-exams-session-token";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";
type Language = "en" | "id";

const TEXT_TRANSLATIONS: Record<string, string> = {
  "Admin workspace": "Ruang kerja admin", "Participant portal": "Portal peserta", "Overview": "Ringkasan",
  "Evaluations": "Evaluasi", "Knowledge centre": "Pusat pengetahuan", "Knowledge Centre": "Pusat Pengetahuan",
  "Score history": "Riwayat nilai", "My profile": "Profil saya", "Quiz courses": "Kursus kuis",
  "Participants": "Peserta", "Scoreboard": "Papan peringkat", "Help centre": "Pusat bantuan", "Settings": "Pengaturan",
  "Sign out": "Keluar", "Home": "Beranda", "Courses": "Kursus", "Library": "Pustaka", "People": "Peserta",
  "Scores": "Nilai", "Learn": "Belajar", "History": "Riwayat", "Profile": "Profil",
  "Admin overview": "Ringkasan admin", "Evaluation performance at a glance": "Ringkasan performa evaluasi",
  "Create and manage evaluation content": "Buat dan kelola konten evaluasi", "Accounts, access, and performance": "Akun, akses, dan performa",
  "Live rankings for every evaluation": "Peringkat langsung untuk setiap evaluasi", "Your evaluation snapshot": "Ringkasan evaluasi Anda",
  "Live, scheduled, and completed courses": "Kursus aktif, terjadwal, dan selesai", "Lessons, guides, and learning resources": "Pelajaran, panduan, dan sumber belajar",
  "Every result, in one place": "Semua hasil dalam satu tempat", "Account and learning details": "Detail akun dan pembelajaran",
  "Search anything…": "Cari apa saja…", "Notifications": "Notifikasi", "Open menu": "Buka menu", "Close menu": "Tutup menu",
  "Add participant": "Tambah peserta", "Add administrator": "Tambah administrator", "New quiz course": "Kursus kuis baru",
  "LIVE RESULTS": "HASIL LANGSUNG", "Evaluation scoreboard": "Papan peringkat evaluasi", "All participants": "Semua peserta",
  "SELECT EVALUATION": "PILIH EVALUASI", "Export filtered CSV": "Ekspor CSV terfilter", "Download executive report": "Unduh laporan eksekutif",
  "Submissions": "Pengumpulan", "Average": "Rata-rata", "Pass rate": "Tingkat kelulusan", "Top score": "Nilai tertinggi",
  "Participant": "Peserta", "Branch": "Cabang", "Position": "Posisi", "Role": "Peran", "Score": "Nilai", "Correct": "Benar", "Time": "Waktu",
  "Completed": "Selesai", "Passed": "Lulus", "Failed": "Tidak lulus", "Needs review": "Perlu ditinjau", "Active": "Aktif", "Inactive": "Tidak aktif",
  "Live": "Aktif", "Scheduled": "Terjadwal", "Draft": "Draf", "Archived": "Diarsipkan", "Upcoming": "Akan datang", "Available": "Tersedia",
  "Create account": "Buat akun", "Cancel": "Batal", "Close": "Tutup", "Done": "Selesai", "Save": "Simpan", "Save changes": "Simpan perubahan",
  "Edit": "Edit", "Preview": "Pratinjau", "Duplicate": "Duplikat", "Restore": "Pulihkan", "Delete": "Hapus", "Remove": "Hapus",
  "Questions": "Pertanyaan", "Question": "Pertanyaan", "Course details": "Detail kursus", "Schedule & access": "Jadwal & akses",
  "Add another question": "Tambah pertanyaan", "Answer choices": "Pilihan jawaban", "Select the correct answer": "Pilih jawaban yang benar",
  "Ready to publish": "Siap diterbitkan", "Publish immediately": "Terbitkan langsung", "Email notification": "Notifikasi email",
  "All active participants": "Semua peserta aktif", "Settings saved.": "Pengaturan tersimpan.", "Changes save automatically.": "Perubahan tersimpan otomatis.",
  "PREFERENCES": "PREFERENSI", "Interface preferences apply immediately. Language is saved to your account.": "Preferensi tampilan diterapkan langsung. Bahasa disimpan ke akun Anda.",
  "App version": "Versi aplikasi", "The portal checks automatically for a newer release.": "Portal otomatis memeriksa versi yang lebih baru.",
  "Language": "Bahasa", "Choose the interface language for your account.": "Pilih bahasa tampilan untuk akun Anda.", "Compact interface": "Tampilan ringkas",
  "Reduce padding and fit more course and result data on screen.": "Kurangi jarak agar lebih banyak data kursus dan hasil terlihat di layar.",
  "Reduce motion": "Kurangi animasi", "Disable decorative transitions, animated scrolling, and loading movement.": "Nonaktifkan transisi dekoratif, gulir animasi, dan gerakan saat memuat.",
  "Enhanced contrast": "Kontras ditingkatkan", "Increase text, border, helper-label, and focus visibility.": "Tingkatkan keterbacaan teks, garis, label bantuan, dan fokus.",
  "Automatic live refresh": "Penyegaran otomatis", "Refresh administrator results and scoreboards every ten seconds.": "Segarkan hasil admin dan papan peringkat setiap sepuluh detik.",
  "Reset defaults": "Kembalikan bawaan", "Refresh data now": "Segarkan data sekarang",

  "Welcome back": "Selamat datang kembali", "Sign in": "Masuk", "Email": "Email", "Password": "Kata sandi", "Remember me": "Ingat saya",
  "Forgot password?": "Lupa kata sandi?", "Continue": "Lanjutkan", "Back": "Kembali", "Next": "Berikutnya", "Submit": "Kirim", "Loading…": "Memuat…",
  "No data available": "Belum ada data", "No results found": "Hasil tidak ditemukan", "Try again": "Coba lagi", "Retry": "Coba lagi",
  "Add to calendar": "Tambahkan ke kalender", "Not open yet": "Belum dibuka", "Open now": "Buka sekarang", "Start quiz": "Mulai kuis", "Continue quiz": "Lanjutkan kuis",
  "View results": "Lihat hasil", "View result": "Lihat hasil", "View details": "Lihat detail", "View course": "Lihat kursus", "View lesson": "Lihat pelajaran",
  "Due date": "Batas waktu", "Start date": "Tanggal mulai", "End date": "Tanggal selesai", "Available from": "Tersedia mulai", "Closes": "Ditutup",
  "Attempts": "Percobaan", "Attempt": "Percobaan", "Duration": "Durasi", "Minutes": "Menit", "Passing score": "Nilai kelulusan",
  "Your score": "Nilai Anda", "Best score": "Nilai terbaik", "Latest score": "Nilai terbaru", "Progress": "Progres", "Status": "Status",
  "Course": "Kursus", "Quiz": "Kuis", "Lesson": "Pelajaran", "Lessons": "Pelajaran", "Resources": "Sumber belajar", "Resource": "Sumber belajar",
  "Download": "Unduh", "Open": "Buka", "Read": "Baca", "Watch": "Tonton", "Upload": "Unggah", "Upload file": "Unggah berkas", "Choose file": "Pilih berkas",
  "Title": "Judul", "Description": "Deskripsi", "Category": "Kategori", "Published": "Diterbitkan", "Unpublished": "Belum diterbitkan", "Publish": "Terbitkan",
  "Archive": "Arsipkan", "Unarchive": "Keluarkan dari arsip", "Archived quizzes": "Kuis yang diarsipkan", "Show archived": "Tampilkan arsip", "Hide archived": "Sembunyikan arsip",
  "Name": "Nama", "Username": "Nama pengguna", "Account": "Akun", "Account details": "Detail akun", "Personal information": "Informasi pribadi",
  "Change password": "Ubah kata sandi", "Current password": "Kata sandi saat ini", "New password": "Kata sandi baru", "Confirm password": "Konfirmasi kata sandi",
  "Last active": "Terakhir aktif", "Last login": "Login terakhir", "Created": "Dibuat", "Created at": "Dibuat pada", "Updated": "Diperbarui",
  "Actions": "Tindakan", "More actions": "Tindakan lainnya", "Filter": "Filter", "Filters": "Filter", "Clear filters": "Hapus filter", "Sort by": "Urutkan berdasarkan",
  "All": "Semua", "Today": "Hari ini", "This week": "Minggu ini", "This month": "Bulan ini", "Recent": "Terbaru",
  "Performance": "Performa", "Top performers": "Peserta terbaik", "Recent activity": "Aktivitas terbaru", "Completion rate": "Tingkat penyelesaian",
  "Total participants": "Total peserta", "Active participants": "Peserta aktif", "Total courses": "Total kursus", "Total quizzes": "Total kuis",
  "Correct answers": "Jawaban benar", "Incorrect answers": "Jawaban salah", "Answered": "Terjawab", "Unanswered": "Belum dijawab",
  "Previous": "Sebelumnya", "Finish": "Selesai", "Finish quiz": "Selesaikan kuis", "Submit quiz": "Kirim kuis", "Review answers": "Tinjau jawaban",
  "Congratulations!": "Selamat!", "Certificate": "Sertifikat", "Download certificate": "Unduh sertifikat", "Print": "Cetak",
  "Are you sure?": "Apakah Anda yakin?", "This action cannot be undone.": "Tindakan ini tidak dapat dibatalkan.", "Yes": "Ya", "No": "Tidak",
  "Success": "Berhasil", "Error": "Kesalahan", "Something went wrong.": "Terjadi kesalahan.", "Please try again.": "Silakan coba lagi."
};

const ATTRIBUTE_TRANSLATIONS: Record<string, string> = {
  "Search": "Cari", "Search anything": "Cari apa saja", "Search courses": "Cari kursus", "Search participants": "Cari peserta",
  "Find participant": "Cari peserta", "Select evaluation scoreboard": "Pilih papan peringkat evaluasi", "Select course": "Pilih kursus",
  "Enter email": "Masukkan email", "Enter password": "Masukkan kata sandi", "Enter title": "Masukkan judul", "Enter description": "Masukkan deskripsi"
};

const reverseText = Object.fromEntries(Object.entries(TEXT_TRANSLATIONS).map(([en, id]) => [id, en]));
const reverseAttributes = Object.fromEntries(Object.entries(ATTRIBUTE_TRANSLATIONS).map(([en, id]) => [id, en]));
function normalizeLanguage(value: unknown): Language { return String(value || "").trim().toLowerCase() === "id" ? "id" : "en"; }
function readLanguage(): Language { try { const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as { language?: string }; return normalizeLanguage(parsed.language); } catch { return "en"; } }
function storeLanguage(language: Language) { let current: Record<string, unknown> = {}; try { current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, unknown>; } catch { current = {}; } window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, language })); document.documentElement.dataset.cgvLanguage = language; document.documentElement.lang = language; }
function requestUrl(input: RequestInfo | URL) { if (typeof input === "string") return input; if (input instanceof URL) return input.toString(); return input.url; }
function parseAction(init?: RequestInit) { if (typeof init?.body !== "string") return ""; try { return String((JSON.parse(init.body) as { action?: string }).action || ""); } catch { return ""; } }
function translateTextNode(node: Text, language: Language) { const raw = node.nodeValue || ""; const leading = raw.match(/^\s*/u)?.[0] || ""; const trailing = raw.match(/\s*$/u)?.[0] || ""; const value = raw.trim(); if (!value) return; const translated = language === "id" ? TEXT_TRANSLATIONS[value] : reverseText[value]; if (translated) node.nodeValue = `${leading}${translated}${trailing}`; }
function translateElement(element: Element, language: Language) { if (element.matches("script, style, code, pre, textarea, [data-cgv-no-translate]")) return; if (element instanceof HTMLButtonElement && !element.hasAttribute("aria-label")) { const sourceLabel = (element.textContent || "").replace(/\s+/g, " ").trim(); if (TEXT_TRANSLATIONS[sourceLabel] || reverseText[sourceLabel]) { element.setAttribute("aria-label", reverseText[sourceLabel] || sourceLabel); element.dataset.cgvActionLabel = reverseText[sourceLabel] || sourceLabel; } } Array.from(element.childNodes).forEach((node) => { if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, language); }); ["title", "placeholder"].forEach((attribute) => { const value = element.getAttribute(attribute); if (!value) return; const table = language === "id" ? ATTRIBUTE_TRANSLATIONS : reverseAttributes; const translated = table[value]; if (translated) element.setAttribute(attribute, translated); }); }
function translateDocument(language: Language, root: ParentNode = document.body) { document.documentElement.lang = language; if (root instanceof Element) translateElement(root, language); root.querySelectorAll?.("*").forEach((element) => translateElement(element, language)); }

export default function LanguageEnhancer() {
  useEffect(() => {
    let language = readLanguage(); let scheduled = false; const nativeFetch = window.fetch; const previousFetch = nativeFetch.bind(window);
    const setLanguage = (next: Language, root?: ParentNode) => { language = next; storeLanguage(next); translateDocument(next, root || document.body); };
    const enhancedFetch: typeof window.fetch = async (input, init) => {
      const action = parseAction(init); const response = await previousFetch(input, init);
      if (action === "login") { try { const data = await response.clone().json() as { ok?: boolean; token?: string }; if (response.ok && data.ok !== false && data.token) { const endpoint = requestUrl(input); const preferenceResponse = await previousFetch(endpoint, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getAccountLanguage", token: data.token }) }); const preference = await preferenceResponse.json() as { ok?: boolean; language?: string }; const accountLanguage = preferenceResponse.ok && preference.ok !== false ? normalizeLanguage(preference.language) : "en"; storeLanguage(accountLanguage); language = accountLanguage; window.requestAnimationFrame(() => translateDocument(accountLanguage)); } } catch { storeLanguage("en"); language = "en"; } }
      else if (action === "logout" && response.ok) { storeLanguage("en"); language = "en"; }
      return response;
    };
    window.fetch = enhancedFetch;
    const apply = (root: ParentNode = document.body) => { scheduled = false; translateDocument(language, root); }; apply();
    const observer = new MutationObserver((mutations) => { if (scheduled) return; const added = mutations.flatMap((mutation) => Array.from(mutation.addedNodes)); const root = added.find((node): node is Element => node instanceof Element) || document.body; scheduled = true; window.requestAnimationFrame(() => apply(root)); });
    observer.observe(document.body, { childList: true, subtree: true });
    const onSettingsChanged = (event: Event) => { const detail = (event as CustomEvent<{ language?: Language }>).detail; const next = normalizeLanguage(detail?.language); if (next === language) return; setLanguage(next); const token = window.sessionStorage.getItem(TOKEN_KEY); const endpoint = window.sessionStorage.getItem(ENDPOINT_KEY) || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || ""; if (!token || !endpoint) return; void previousFetch(endpoint, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "setAccountLanguage", token, language: next }) }).then(async (response) => { if (!response.ok) throw new Error("Unable to save account language."); const data = await response.json() as { ok?: boolean; language?: string }; if (data.ok === false) throw new Error("Unable to save account language."); const savedLanguage = normalizeLanguage(data.language || next); if (savedLanguage !== language) setLanguage(savedLanguage); }).catch(() => {}); };
    window.addEventListener("cgv:settings-changed", onSettingsChanged);
    return () => { observer.disconnect(); if (window.fetch === enhancedFetch) window.fetch = nativeFetch; window.removeEventListener("cgv:settings-changed", onSettingsChanged); };
  }, []);
  return null;
}
