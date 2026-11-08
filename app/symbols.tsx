import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * Filled navigation symbols.
 *
 * iOS 26 tab bars and sidebars draw the selected item with the filled variant
 * of its symbol and the rest as outlines. Lucide (used for every other symbol
 * in the app) only ships outlines, so these filled glyphs are drawn on the
 * same 24-unit grid with matching proportions and optical weight. They use
 * SF Symbols-style hierarchical rendering: the primary layer is fully opaque
 * and secondary details sit at reduced opacity, all in `currentColor` so the
 * selection tint and accessibility color settings apply automatically.
 *
 * Apple's SF Symbols themselves are licensed only for apps on Apple
 * platforms, so they cannot be used in this web app.
 */

export type SymbolProps = Omit<SVGProps<SVGSVGElement>, "ref" | "children"> & {
  size?: number | string;
};

/** Opacity of the secondary layer in hierarchical rendering. */
const SECONDARY = 0.5;

function SymbolSvg({
  name,
  size = 24,
  className,
  children,
  ...rest
}: SymbolProps & { name: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={["cgv-symbol", "cgv-symbol-fill", `cgv-symbol-${name}`, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function HomeFill(props: SymbolProps) {
  return (
    <SymbolSvg name="home" {...props}>
      <path d="M3.2 10.4 11 3.6a1.5 1.5 0 0 1 2 0l7.8 6.8c.32.28.5.68.5 1.1V19a2 2 0 0 1-2 2H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1V21H4.7a2 2 0 0 1-2-2v-7.5c0-.42.18-.82.5-1.1Z" />
    </SymbolSvg>
  );
}

export function BookOpenFill(props: SymbolProps) {
  return (
    <SymbolSvg name="book-open" {...props}>
      <path d="M2 5.25c0-.6.46-1.1 1.06-1.15 2.62-.24 5.43.28 7.94 1.83v14.4c-2.5-1.45-5.27-1.9-7.94-1.67A1 1 0 0 1 2 17.66Z" />
      <path opacity={SECONDARY} d="M22 5.25c0-.6-.46-1.1-1.06-1.15-2.62-.24-5.43.28-7.94 1.83v14.4c2.5-1.45 5.27-1.9 7.94-1.67A1 1 0 0 0 22 17.66Z" />
    </SymbolSvg>
  );
}

export function GraduationCapFill(props: SymbolProps) {
  return (
    <SymbolSvg name="graduation-cap" {...props}>
      <path d="M12.9 3.2a2 2 0 0 0-1.8 0L2.25 7.6a.8.8 0 0 0 0 1.43l8.85 4.42a2 2 0 0 0 1.8 0l8.85-4.42a.8.8 0 0 0 0-1.43Z" />
      <path opacity={SECONDARY} d="M5.5 11.65v4.1c0 1.95 2.9 3.65 6.5 3.65s6.5-1.7 6.5-3.65v-4.1l-4.7 2.35a4 4 0 0 1-3.6 0Z" />
      <path d="M20.5 9.1h1.6v5.4a.8.8 0 0 1-1.6 0Z" />
    </SymbolSvg>
  );
}

export function UsersFill(props: SymbolProps) {
  return (
    <SymbolSvg name="users" {...props}>
      <circle opacity={SECONDARY} cx="16.6" cy="7.6" r="3.1" />
      <path opacity={SECONDARY} d="M16.4 13.2c3.2 0 5.6 2.15 5.6 5.1 0 .66-.54 1.2-1.2 1.2h-3.5a7.3 7.3 0 0 0-2.62-6.15c.54-.1 1.11-.15 1.72-.15Z" />
      <circle cx="9" cy="7.4" r="3.6" />
      <path d="M2.5 19.15c0-3.3 2.9-5.75 6.5-5.75s6.5 2.45 6.5 5.75c0 .72-.56 1.35-1.27 1.35H3.77c-.71 0-1.27-.63-1.27-1.35Z" />
    </SymbolSvg>
  );
}

export function TrophyFill(props: SymbolProps) {
  return (
    <SymbolSvg name="trophy" {...props}>
      <path d="M7 3h10v7a5 5 0 0 1-4 4.9V18h-2v-3.1A5 5 0 0 1 7 10Z" />
      <path d="M7 5H4.2C3.54 5 3 5.54 3 6.2v1.3a4.3 4.3 0 0 0 4.4 4.3l-.2-1.9A2.4 2.4 0 0 1 5 7.5V7h2Z" />
      <path d="M17 5h2.8c.66 0 1.2.54 1.2 1.2v1.3a4.3 4.3 0 0 1-4.4 4.3l.2-1.9A2.4 2.4 0 0 0 19 7.5V7h-2Z" />
      <path opacity={SECONDARY} d="M8.5 18h7c.83 0 1.5.67 1.5 1.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1c0-.83.67-1.5 1.5-1.5Z" />
    </SymbolSvg>
  );
}

export function LayoutDashboardFill(props: SymbolProps) {
  return (
    <SymbolSvg name="layout-dashboard" {...props}>
      <rect x="3" y="3" width="8" height="10" rx="2" />
      <rect opacity={SECONDARY} x="13" y="3" width="8" height="6" rx="2" />
      <rect x="13" y="11" width="8" height="10" rx="2" />
      <rect opacity={SECONDARY} x="3" y="15" width="8" height="6" rx="2" />
    </SymbolSvg>
  );
}

export function HistoryFill(props: SymbolProps) {
  return (
    <SymbolSvg name="history" {...props}>
      <path
      fillRule="evenodd"
      d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-.8 4.5v5.05l3.65 2.2.85-1.38-2.9-1.75V7.5Z"
    />
    </SymbolSvg>
  );
}

export function UserRoundFill(props: SymbolProps) {
  return (
    <SymbolSvg name="user-round" {...props}>
      <circle cx="12" cy="8" r="4.2" />
      <path opacity={SECONDARY} d="M4 19.9c0-3.6 3.6-6.1 8-6.1s8 2.5 8 6.1c0 .6-.5 1.1-1.1 1.1H5.1c-.6 0-1.1-.5-1.1-1.1Z" />
    </SymbolSvg>
  );
}

/** Filled variants keyed by navigation view ID. */
export const FILLED_NAV_SYMBOLS: Record<string, ComponentType<SymbolProps>> = {
  home: HomeFill,
  overview: LayoutDashboardFill,
  evaluations: BookOpenFill,
  courses: BookOpenFill,
  knowledge: GraduationCapFill,
  history: HistoryFill,
  profile: UserRoundFill,
  participants: UsersFill,
  scoreboard: TrophyFill,
};
