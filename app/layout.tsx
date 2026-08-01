import type { Metadata, Viewport } from "next";
import ButtonSafetyNet from "./button-safety-net";
import CourseBuilderEnhancer from "./course-builder-enhancer";
import ResultSyncEnhancer from "./result-sync-enhancer";
import InteractionPerformanceEnhancer from "./interaction-performance-enhancer";
import AdminFunctionalityEnhancer from "./admin-functionality-enhancer";
import AdminAvatarEnhancer from "./admin-avatar-enhancer";
import RuntimeFunctionalityEnhancer from "./runtime-functionality-enhancer";
import SettingsEnhancer from "./settings-enhancer";
import AppUpdateEnhancer from "./app-update-enhancer";
import SessionScrollEnhancer from "./session-scroll-enhancer";
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
import "./mobile-no-green-v5.css";
import "./account-scroll-final.css";
import "./knowledge-academy-loading.css";
import "./final-loading-viewport-fix.css";
import "./admin-header-consistency.css";
import "./brand-visibility-polish.css";
import "./certificate.css";
import "./login-text-placement.css";
import "./brand-system.css";
import "./logo-intro-animation.css";
import "./performance-release.css";
import "./login-spacing-polish.css";
import "./app-update-enhancer.css";
import "./glassmorphism-release.css";

const publicSiteUrl = "https://evalora-quiz.rayhanmawuntu.chatgpt.site/";
const socialImageUrl = `${publicSiteUrl}og.png`;
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const publicAssetOrigin = process.env.GITHUB_PAGES === "true"
  ? "https://rayhanmawuntu-stack.github.io"
  : publicSiteUrl.replace(/\/$/, "");
const iconRevision = "2026-07-31";
const publicAssetUrl = (path: string) => `${publicAssetOrigin}${publicBasePath}${path}`;

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  applicationName: "CGV Knowledge Academy",
  title: "CGV Knowledge Academy — Evaluation Portal",
  description:
    "CGV Knowledge Academy's evaluation platform for learning courses, participant progress, certificates, and live results.",
  alternates: {
    canonical: publicSiteUrl,
  },
  openGraph: {
    type: "website",
    url: publicSiteUrl,
    siteName: "CGV Knowledge Academy",
    title: "CGV Knowledge Academy — Evaluation Portal",
    description:
      "Learning evaluations, participant progress, certificates, and live results from CGV Knowledge Academy.",
    images: [{ url: socialImageUrl, width: 1200, height: 630, alt: "CGV Knowledge Academy Evaluation Portal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CGV Knowledge Academy — Evaluation Portal",
    description:
      "Learning evaluations, participant progress, certificates, and live results from CGV Knowledge Academy.",
    images: [socialImageUrl],
  },
  other: {
    "cgv-ui-release": "2026.07.31-knowledge-academy-brand-v1",
    "mobile-web-app-capable": "yes",
  },
  manifest: `${publicAssetUrl("/site.webmanifest")}?v=${iconRevision}`,
  icons: {
    icon: [
      { url: `${publicAssetUrl("/brand/favicon-16.png")}?v=${iconRevision}`, sizes: "16x16", type: "image/png" },
      { url: `${publicAssetUrl("/brand/favicon-32.png")}?v=${iconRevision}`, sizes: "32x32", type: "image/png" },
      { url: `${publicAssetUrl("/brand/app-icon-192.png")}?v=${iconRevision}`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${publicAssetUrl("/brand/favicon-32.png")}?v=${iconRevision}`,
    apple: [
      { url: `${publicAssetUrl("/brand/apple-touch-icon.png")}?v=${iconRevision}`, sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CGV Academy",
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
      <body className="antialiased">
        {children}
        <AppUpdateEnhancer />
        <SettingsEnhancer />
        <ButtonSafetyNet />
        <CourseBuilderEnhancer />
        <ResultSyncEnhancer />
        <InteractionPerformanceEnhancer />
        <AdminFunctionalityEnhancer />
        <AdminAvatarEnhancer />
        <RuntimeFunctionalityEnhancer />
        <SessionScrollEnhancer />
      </body>
    </html>
  );
}
