import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ButtonSafetyNet from "./button-safety-net";
import CourseBuilderEnhancer from "./course-builder-enhancer";
import ResultSyncEnhancer from "./result-sync-enhancer";
import InteractionPerformanceEnhancer from "./interaction-performance-enhancer";
import AdminFunctionalityEnhancer from "./admin-functionality-enhancer";
import AdminAvatarEnhancer from "./admin-avatar-enhancer";
import RuntimeFunctionalityEnhancer from "./runtime-functionality-enhancer";
import SettingsEnhancer from "./settings-enhancer";
import "./globals.css";
import "./reference-theme.css";
import "./logo-lockup.css";
import "./button-safety-net.css";
import "./scoreboard-visibility.css";
import "./layout-guard.css";
import "./course-builder-performance.css";
import "./admin-functionality-enhancer.css";
import "./runtime-functionality-enhancer.css";
import "./visibility-audit.css";
import "./topbar-polish.css";
import "./settings-enhancer.css";
import "./builder-header-polish.css";
import "./course-table-containment.css";
import "./upcoming-evaluations.css";
import "./admin-avatar-fix.css";
import "./visual-polish.css";
import "./login-reference-layout.css";
import "./login-reference-copy.css";
import "./login-account-switch.css";
import "./participant-dashboard-refresh.css";
import "./mockup-uix-system.css";
import "./mockup-uix-release.css";
import "./no-green-release.css";
import "./final-colour-sidebar-lock.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CGV Exams — Evaluation Portal",
  description:
    "A focused evaluation platform for quiz courses, participant score history, and live learning dashboards.",
  other: {
    "codex-preview": "development",
    "cgv-ui-release": "2026.07.25-no-green-sidebar-v4",
  },
  icons: {
    icon: "/cgv-logo.svg",
    shortcut: "/cgv-logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080909",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <SettingsEnhancer />
        <ButtonSafetyNet />
        <CourseBuilderEnhancer />
        <ResultSyncEnhancer />
        <InteractionPerformanceEnhancer />
        <AdminFunctionalityEnhancer />
        <AdminAvatarEnhancer />
        <RuntimeFunctionalityEnhancer />
      </body>
    </html>
  );
}
