import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ButtonSafetyNet from "./button-safety-net";
import "./globals.css";
import "./reference-theme.css";
import "./logo-lockup.css";
import "./button-safety-net.css";
import "./scoreboard-visibility.css";
import "./layout-guard.css";

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
  themeColor: "#050706",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ButtonSafetyNet />
      </body>
    </html>
  );
}
