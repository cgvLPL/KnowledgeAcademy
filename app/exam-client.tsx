"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Gauge,
  GraduationCap,
  History,
  Home,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Medal,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

type Role = "participant" | "admin";
type ParticipantView = "home" | "evaluations" | "history" | "profile";
type AdminView = "overview" | "courses" | "participants" | "scoreboard";
type View = ParticipantView | AdminView;

type Evaluation = {
  id: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  duration: number;
  due: string;
  opens?: string;
  status: "Live" | "Upcoming" | "Completed" | "Draft";
  participants: number;
  average: number;
  passingScore: number;
  color: "green" | "orange" | "blue" | "violet";
};

type HistoryItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  score: number;
  status: "Passed" | "Needs review";
  duration: string;
};

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correct?: number;
};

type LeaderboardRow = {
  rank: number;
  name: string;
  branch: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  time: string;
  submittedAt?: string;
};

type ParticipantRow = {
  name: string;
  username: string;
  branch: string;
  attempts: number;
  average: number;
  status: string;
};

type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  branch: string;
  role: Role;
  status: string;
};

const publicSheetsEndpoint =
  process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || "";
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const BOOT_SCREEN_MINIMUM_MS = 800;
const BUILDER_STEPS = [
  ["Course details", 1],
  ["Questions", 2],
  ["Schedule & access", 3],
] as const;

function sheetsFetch(payload: Record<string, unknown>) {
  const directToAppsScript = Boolean(publicSheetsEndpoint);
  return fetch(publicSheetsEndpoint || "/api/sheets", {
    method: "POST",
    headers: {
      "content-type": directToAppsScript
        ? "text/plain;charset=utf-8"
        : "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function sheetsRequest<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await sheetsFetch({ action, ...payload });
  const data = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "The Google Sheets backend could not complete this request.");
  }
  return data;
}

function formatApiDate(value: unknown, fallback = "Not scheduled") {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function apiScoreboardToLeaderboard(items: Record<string, unknown>[]): LeaderboardRow[] {
  return items.map((item, index) => ({
    rank: Number(item.rank || index + 1),
    name: String(item.name || "Participant"),
    branch: String(item.branch || ""),
    score: Number(item.score || 0),
    correctCount: Number(item.correctCount || 0),
    totalQuestions: Number(item.totalQuestions || 0),
    time: formatDuration(Number(item.durationSeconds || 0))
      .replace("m ", ":")
      .replace("s", ""),
    submittedAt: formatApiDate(item.submittedAt, "—"),
  }));
}

function apiCourseToEvaluation(course: Record<string, unknown>, index = 0): Evaluation {
  const statuses: Record<string, Evaluation["status"]> = {
    live: "Live",
    upcoming: "Upcoming",
    completed: "Completed",
    draft: "Draft",
  };
  const colors: Evaluation["color"][] = ["green", "orange", "blue", "violet"];
  return {
    id: String(course.id || `course-${index}`),
    title: String(course.title || "Untitled evaluation"),
    description: String(course.description || ""),
    category: String(course.category || "General"),
    questionCount: Number(course.questionCount || 0),
    duration: Number(course.duration || 20),
    due: formatApiDate(course.endAt),
    opens: formatApiDate(course.startAt, "Scheduled"),
    status: statuses[String(course.status || "").toLowerCase()] || "Draft",
    participants: Number(course.participants || 0),
    average: Number(course.average || 0),
    passingScore: Number(course.passingScore || 75),
    color: colors[index % colors.length],
  };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand-lockup ${compact ? "brand-compact" : ""}`}
      aria-label={compact ? "CGV" : "CGV Exams"}
    >
      <Image
        className="brand-logo"
        src={`${publicBasePath}/cgv-logo.svg`}
        alt="CGV"
        width={compact ? 56 : 72}
        height={compact ? 25 : 32}
        unoptimized
      />
      {!compact && <span className="brand-product-name">Exams</span>}
    </div>
  );
}

function Initials({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials}
    </span>
  );
}

function Login({
  onLogin,
}: {
  onLogin: (role: Role, username: string, password: string) => Promise<string | null>;
}) {
  const [role, setRole] = useState<Role>("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    setUsername("");
    setPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    setError("");
    const nextError = await onLogin(role, username, password);
    if (nextError) setError(nextError);
    setSubmitting(false);
  }

  return (
    <main className="login-page">
      <section className="login-layout">
        <form className="login-card" onSubmit={submit}>
          <div className="login-brand-row">
            <div className="login-artwork-lockup">
              <Logo />
              <span className="login-academy-label" aria-label="Knowledge Academy">
                {Array.from("KNOWLEDGE ACADEMY").map((character, index) => (
                  <span aria-hidden="true" key={`${character}-${index}`}>
                    {character === " " ? "\u00a0" : character}
                  </span>
                ))}
              </span>
            </div>
            <span>Secure portal</span>
          </div>
          <div className="login-card-heading">
            <span className="card-kicker">WELCOME BACK</span>
            <h1>Ready to continue?</h1>
            <p>Choose your workspace and enter your account details.</p>
          </div>

          <div className="role-switch" role="tablist" aria-label="Account type">
            <button
              type="button"
              className={role === "admin" ? "active" : ""}
              onClick={() => switchRole("admin")}
              role="tab"
              aria-selected={role === "admin"}
            >
              <Gauge size={17} /> Admin
            </button>
            <button
              type="button"
              className={role === "participant" ? "active" : ""}
              onClick={() => switchRole("participant")}
              role="tab"
              aria-selected={role === "participant"}
            >
              <UserRound size={17} /> Participant
            </button>
          </div>

          <label className="field-label">
            Username
            <span className="input-shell">
              <UserRound size={18} />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                minLength={3}
                maxLength={40}
                pattern="[A-Za-z0-9._-]+"
                required
              />
            </span>
          </label>

          <label className="field-label">
            Password
            <span className="input-shell">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-action"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Eye size={18} />
              </button>
            </span>
          </label>

          <div className="login-options">
            <label className="check-label">
              <input type="checkbox" />
              <span><Check size={12} /></span>
              Keep me signed in
            </label>
            <button type="button" className="text-button">Forgot password?</button>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="primary-button login-button" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Continue"} {!submitting && <ArrowRight size={19} />}
          </button>
        </form>
      </section>
    </main>
  );
}

function BootScreen() {
  return (
    <main className="boot-screen" aria-label="CGV Exams is loading">
      <div className="boot-glow boot-glow-one" />
      <div className="boot-glow boot-glow-two" />
      <div className="boot-content">
        <Image
          src={`${publicBasePath}/cgv-logo.svg`}
          alt="CGV"
          width={230}
          height={102}
          priority
          unoptimized
        />
        <div className="boot-bar" role="progressbar" aria-label="Loading application">
          <span />
        </div>
        <p>Preparing your evaluation portal</p>
      </div>
    </main>
  );
}

function Sidebar({
  role,
  view,
  setView,
  onLogout,
  evaluationCount,
}: {
  role: Role;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
  evaluationCount: number;
}) {
  const participantItems: { id: ParticipantView; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Overview", icon: Home },
    { id: "evaluations", label: "Evaluations", icon: BookOpen },
    { id: "history", label: "Score history", icon: History },
    { id: "profile", label: "My profile", icon: UserRound },
  ];
  const adminItems: { id: AdminView; label: string; icon: typeof Home }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "courses", label: "Quiz courses", icon: Layers3 },
    { id: "participants", label: "Participants", icon: Users },
    { id: "scoreboard", label: "Scoreboard", icon: Trophy },
  ];
  const items = role === "admin" ? adminItems : participantItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <span className="workspace-label">
          {role === "admin" ? "Admin workspace" : "Participant portal"}
        </span>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {item.id === "evaluations" && evaluationCount > 0 && <small>{evaluationCount}</small>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <button type="button">
          <CircleHelp size={19} /> Help centre
        </button>
        <button type="button">
          <Settings size={19} /> Settings
        </button>
        <button type="button" onClick={onLogout}>
          <LogOut size={19} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function Topbar({
  role,
  title,
  subtitle,
  user,
}: {
  role: Role;
  title: string;
  subtitle: string;
  user: AuthUser | null;
}) {
  const displayName = user?.fullName || (role === "admin" ? "Administrator" : "Participant");
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <button className="icon-button" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Logo compact />
      </div>
      <div className="page-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <div className="top-search">
          <Search size={18} />
          <input aria-label="Search" placeholder="Search anything…" />
          <kbd>⌘ K</kbd>
        </div>
        <button className="icon-button notification" aria-label="Notifications">
          <Bell size={19} />
          <span />
        </button>
        <div className="user-chip">
          <Initials name={displayName} size="sm" />
          <div>
            <strong>{displayName}</strong>
            <span>{role === "admin" ? "Learning Admin" : "Participant"}</span>
          </div>
          <ChevronRight size={15} />
        </div>
      </div>
    </header>
  );
}

function EvaluationIcon({ color, icon = "book" }: { color: Evaluation["color"]; icon?: "book" | "shield" | "spark" }) {
  return (
    <span className={`evaluation-icon icon-${color}`}>
      {icon === "shield" ? <ShieldCheck size={22} /> : icon === "spark" ? <Sparkles size={22} /> : <BookOpen size={22} />}
    </span>
  );
}

function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={`score-ring score-ring-${size}`}
      style={{ "--score": `${score * 3.6}deg` } as CSSProperties}
      aria-label={`Score ${score} percent`}
    >
      <div>
        <strong>{score}</strong>
        <span>%</span>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span><Icon size={23} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function ParticipantHome({
  onStart,
  setView,
  history,
  evaluations,
  user,
}: {
  onStart: (evaluation: Evaluation) => void;
  setView: (view: ParticipantView) => void;
  history: HistoryItem[];
  evaluations: Evaluation[];
  user: AuthUser | null;
}) {
  const liveEvaluations = evaluations.filter((item) => item.status === "Live");
  const upcomingEvaluations = evaluations.filter((item) => item.status === "Upcoming");
  const visibleEvaluations = [...liveEvaluations, ...upcomingEvaluations];
  const featured = liveEvaluations[0] || null;
  const average = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
    : 0;
  const passed = history.filter((item) => item.status === "Passed").length;
  const best = history.length ? Math.max(...history.map((item) => item.score)) : 0;
  const firstName = user?.fullName?.split(" ")[0] || "there";
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
  return (
    <div className="content participant-home">
      <section className="welcome-row">
        <div>
          <span className="eyebrow dark-eyebrow">
            <Sparkles size={15} /> {today.toUpperCase()}
          </span>
          <h2>Welcome back, {firstName}.</h2>
          <p>{liveEvaluations.length
            ? `${liveEvaluations.length} evaluation${liveEvaluations.length === 1 ? "" : "s"} ready for you.${upcomingEvaluations.length ? ` ${upcomingEvaluations.length} scheduled.` : ""}`
            : upcomingEvaluations.length
              ? `${upcomingEvaluations.length} scheduled evaluation${upcomingEvaluations.length === 1 ? "" : "s"} coming up.`
              : "No evaluations are assigned right now."}</p>
        </div>
        <button className="secondary-button" onClick={() => setView("history")}>
          View score history <ArrowRight size={17} />
        </button>
      </section>

      {featured ? (
        <section className="hero-evaluation">
          <div className="hero-copy">
            <span className="live-pill"><span /> READY TO START</span>
            <p className="hero-overline">{featured.category.toUpperCase()}</p>
            <h3>{featured.title}</h3>
            <p className="hero-description">{featured.description}</p>
            <div className="hero-meta">
              <span><FileText size={16} /> {featured.questionCount} questions</span>
              <span><Clock3 size={16} /> {featured.duration} minutes</span>
              <span><CalendarDays size={16} /> Due {featured.due}</span>
            </div>
            <button className="hero-button" onClick={() => onStart(featured)}>
              Start evaluation <span><ArrowRight size={19} /></span>
            </button>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit-centre"><GraduationCap size={44} /></div>
          </div>
        </section>
      ) : (
        <section className="section-block">
          <EmptyState
            icon={BookOpen}
            title={upcomingEvaluations.length ? "No evaluation is open yet" : "No evaluations assigned"}
            description={upcomingEvaluations.length
              ? "Your scheduled evaluations are listed below and will unlock automatically."
              : "New evaluations will appear here when an administrator publishes them."}
          />
        </section>
      )}

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon green"><Gauge size={20} /></span>
          <div>
            <p>Average score</p>
            <strong>{average}<small>%</small></strong>
            <span>{history.length ? `Across ${history.length} completed evaluation${history.length === 1 ? "" : "s"}` : "No completed evaluations"}</span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon orange"><Medal size={20} /></span>
          <div>
            <p>Evaluations passed</p>
            <strong>{passed}<small>/{history.length}</small></strong>
            <span>{history.length ? `${history.length - passed} need${history.length - passed === 1 ? "s" : ""} review` : "No results yet"}</span>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue"><Trophy size={20} /></span>
          <div>
            <p>Best score</p>
            <strong>{best}<small>%</small></strong>
            <span>{history.length ? "Your personal best" : "Complete an evaluation to begin"}</span>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h3>{upcomingEvaluations.length ? "Ready and scheduled" : "Ready for you"}</h3>
            <p>{upcomingEvaluations.length
              ? "Live evaluations can be started now. Scheduled evaluations unlock automatically."
              : "Complete these evaluations before their due dates."}</p>
          </div>
          <button className="text-link" onClick={() => setView("evaluations")}>
            See all <ArrowRight size={16} />
          </button>
        </div>
        <div className="evaluation-list">
          {visibleEvaluations.slice(0, 4).map((evaluation, index) => (
            <article className={`evaluation-row${evaluation.status === "Upcoming" ? " is-upcoming" : ""}`} key={evaluation.id}>
              <EvaluationIcon color={evaluation.color} icon={index === 1 ? "shield" : "book"} />
              <div className="evaluation-main">
                <span>{evaluation.category}</span>
                <h4>{evaluation.title}</h4>
                <p>{evaluation.description}</p>
              </div>
              <div className="evaluation-details">
                <span><FileText size={15} /> {evaluation.questionCount} questions</span>
                <span><Clock3 size={15} /> {evaluation.duration} min</span>
              </div>
              <div className="due-block">
                <span>{evaluation.status === "Upcoming" ? "Opens" : "Due date"}</span>
                <strong>{evaluation.status === "Upcoming" ? evaluation.opens : evaluation.due}</strong>
              </div>
              <button
                className="row-button"
                disabled={evaluation.status === "Upcoming"}
                onClick={() => evaluation.status !== "Upcoming" && onStart(evaluation)}
              >
                {evaluation.status === "Upcoming" ? <><LockKeyhole size={15} /> Not open yet</> : <>Start <ArrowRight size={17} /></>}
              </button>
            </article>
          ))}
          {!visibleEvaluations.length && (
            <EmptyState
              icon={BookOpen}
              title="Nothing due"
              description="There are no live evaluations assigned to this account."
            />
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h3>Recent results</h3>
            <p>Your latest completed evaluations.</p>
          </div>
          <button className="text-link" onClick={() => setView("history")}>
            Full history <ArrowRight size={16} />
          </button>
        </div>
        <div className="history-preview-grid">
          {history.slice(0, 3).map((item) => (
            <article className="history-preview-card" key={item.id}>
              <ScoreRing score={item.score} size="sm" />
              <div>
                <span>{item.category} · {item.date}</span>
                <h4>{item.title}</h4>
                <p className={item.status === "Passed" ? "pass" : "review"}>
                  <Check size={14} /> {item.status}
                </p>
              </div>
              <button className="icon-button" aria-label={`Open ${item.title}`}>
                <ChevronRight size={18} />
              </button>
            </article>
          ))}
          {!history.length && (
            <EmptyState
              icon={History}
              title="No score history"
              description="Completed evaluations and scores will appear here."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function EvaluationsView({
  evaluations,
  onStart,
}: {
  evaluations: Evaluation[];
  onStart: (evaluation: Evaluation) => void;
}) {
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? evaluations : evaluations.filter((item) => item.status === filter);
  return (
    <div className="content">
      <section className="page-intro">
        <div>
          <span className="eyebrow dark-eyebrow"><BookOpen size={15} /> COURSE LIBRARY</span>
          <h2>Your evaluations</h2>
          <p>Take active courses and revisit completed learning.</p>
        </div>
      </section>
      <div className="toolbar">
        <div className="filter-tabs">
          {["All", "Live", "Upcoming", "Completed"].map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <button className="secondary-button"><Filter size={17} /> More filters</button>
      </div>
      <div className="course-grid">
        {shown.map((item) => (
          <article className={`course-card accent-${item.color}${item.status === "Upcoming" ? " is-upcoming" : ""}`} key={item.id}>
            <div className="course-card-top">
              <EvaluationIcon color={item.color} icon={item.category === "Safety" ? "shield" : item.category === "Service" ? "spark" : "book"} />
              <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
            </div>
            <span className="course-category">{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="course-meta">
              <span><FileText size={15} /> {item.questionCount} questions</span>
              <span><Clock3 size={15} /> {item.duration} min</span>
            </div>
            <div className="course-card-footer">
              <div>
                <span>{item.status === "Upcoming" ? "Opens" : "Due date"}</span>
                <strong>{item.status === "Upcoming" ? item.opens : item.due}</strong>
              </div>
              <button
                className={item.status === "Upcoming" ? "secondary-button" : "primary-button small"}
                disabled={item.status === "Upcoming"}
                onClick={() => item.status !== "Upcoming" && onStart(item)}
              >
                {item.status === "Completed" ? "Retake" : item.status === "Upcoming" ? <><LockKeyhole size={15} /> Not open yet</> : "Start"}
                {item.status !== "Upcoming" && <ArrowRight size={16} />}
              </button>
            </div>
          </article>
        ))}
        {!shown.length && (
          <EmptyState
            icon={BookOpen}
            title="No evaluations found"
            description={filter === "All" ? "Published evaluations will appear here." : `There are no ${filter.toLowerCase()} evaluations.`}
          />
        )}
      </div>
    </div>
  );
}

function HistoryView({ history }: { history: HistoryItem[] }) {
  const average = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
    : 0;
  const passed = history.filter((item) => item.status === "Passed").length;
  const best = history.length ? Math.max(...history.map((item) => item.score)) : 0;
  return (
    <div className="content">
      <section className="page-intro history-intro">
        <div>
          <span className="eyebrow dark-eyebrow"><History size={15} /> PERSONAL RECORD</span>
          <h2>Score history</h2>
          <p>Review every result and track how your performance changes over time.</p>
        </div>
        <button className="secondary-button"><Download size={17} /> Export report</button>
      </section>
      <section className="history-summary">
        <div className="history-score-card">
          <ScoreRing score={average} size="lg" />
          <div>
            <span>Overall average</span>
            <h3>{history.length ? "Your current average" : "No results yet"}</h3>
            <p>{history.length ? "Calculated from every completed evaluation." : "Complete an evaluation to start your score history."}</p>
          </div>
        </div>
        <div className="history-stat"><span>Completed</span><strong>{history.length}</strong><small>evaluations</small></div>
        <div className="history-stat"><span>Passed</span><strong>{passed}</strong><small>{history.length ? `${Math.round(passed / history.length * 100)}% pass rate` : "No attempts"}</small></div>
        <div className="history-stat"><span>Best score</span><strong>{best}%</strong><small>personal best</small></div>
      </section>
      <section className="table-card">
        <div className="table-card-header">
          <div><h3>Evaluation results</h3><p>Current and previous evaluation records.</p></div>
          <div className="table-actions"><button className="icon-button"><Search size={18} /></button><button className="icon-button"><Filter size={18} /></button></div>
        </div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Evaluation</th><th>Completed</th><th>Duration</th><th>Score</th><th>Outcome</th><th /></tr></thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td><div className="table-title-cell"><EvaluationIcon color={item.score >= 80 ? "green" : "orange"} /><div><strong>{item.title}</strong><span>{item.category}</span></div></div></td>
                  <td>{item.date}</td>
                  <td>{item.duration}</td>
                  <td><strong className="table-score">{item.score}%</strong></td>
                  <td><span className={`outcome-pill ${item.status === "Passed" ? "pass" : "review"}`}>{item.status}</span></td>
                  <td><button className="icon-button"><ChevronRight size={17} /></button></td>
                </tr>
              ))}
              {!history.length && (
                <tr className="empty-table-row">
                  <td colSpan={6}>
                    <EmptyState
                      icon={History}
                      title="No results recorded"
                      description="Your completed evaluations will be listed here."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProfileView({ user, history }: { user: AuthUser | null; history: HistoryItem[] }) {
  const displayName = user?.fullName || "Participant";
  const average = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
    : 0;
  const passed = history.filter((item) => item.status === "Passed").length;
  return (
    <div className="content">
      <section className="profile-hero">
        <div className="profile-aurora" />
        <Initials name={displayName} size="lg" />
        <div className="profile-copy">
          <span>PARTICIPANT PROFILE</span>
          <h2>{displayName}</h2>
          <p>@{user?.username || "participant"}{user?.branch ? ` · ${user.branch}` : ""}</p>
        </div>
        <div className="profile-stats">
          <div><strong>{average}%</strong><span>Average</span></div>
          <div><strong>{passed}</strong><span>Passed</span></div>
          <div><strong>{history.length}</strong><span>Completed</span></div>
        </div>
      </section>
      <div className="profile-grid">
        <section className="settings-card">
          <div className="section-heading"><div><h3>Personal information</h3><p>Your account details and assignment information.</p></div></div>
          <div className="detail-grid">
            <label>Full name<strong>{displayName}</strong></label>
            <label>Username<strong>{user?.username ? `@${user.username}` : "—"}</strong></label>
            <label>Location / branch<strong>{user?.branch || "—"}</strong></label>
            <label>Account ID<strong>{user?.id || "—"}</strong></label>
            <label>Role<strong>Participant</strong></label>
            <label>Account status<strong className="active-text"><span /> {user?.status || "Active"}</strong></label>
          </div>
        </section>
        <section className="settings-card">
          <div className="section-heading"><div><h3>Account security</h3><p>Manage your password and active access.</p></div></div>
          <button className="settings-row"><span className="metric-icon violet"><LockKeyhole size={19} /></span><div><strong>Change password</strong><small>Update your account password.</small></div><ChevronRight size={18} /></button>
          <button className="settings-row"><span className="metric-icon blue"><ShieldCheck size={19} /></span><div><strong>Account access</strong><small>Contact an administrator for access changes.</small></div><ChevronRight size={18} /></button>
        </section>
      </div>
    </div>
  );
}

function Quiz({
  evaluation,
  questionsData,
  onExit,
  onComplete,
}: {
  evaluation: Evaluation;
  questionsData: Question[];
  onExit: () => void;
  onComplete: (score: number, answers: Record<number, number>) => void | Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const current = questionsData[index];
  const answered = Object.keys(answers).length;
  const progress = questionsData.length
    ? Math.round(((index + 1) / questionsData.length) * 100)
    : 0;

  if (!current) {
    return (
      <main className="quiz-page">
        <EmptyState
          icon={BookOpen}
          title="No questions available"
          description="This evaluation does not contain any published questions."
          action={<button className="primary-button" onClick={onExit}>Return to evaluations</button>}
        />
      </main>
    );
  }

  async function submitQuiz() {
    const scorable = questionsData.every((question) => question.correct !== undefined);
    const correct = scorable
      ? questionsData.reduce((sum, question, questionIndex) => sum + (answers[questionIndex] === question.correct ? 1 : 0), 0)
      : 0;
    const localScore = scorable ? Math.round((correct / questionsData.length) * 100) : 0;
    await onComplete(localScore, answers);
  }

  return (
    <main className="quiz-page">
      <div className="quiz-aurora quiz-aurora-left" />
      <div className="quiz-aurora quiz-aurora-right" />
      <header className="quiz-header">
        <Logo />
        <div className="quiz-course-title">
          <span>{evaluation.category}</span>
          <strong>{evaluation.title}</strong>
        </div>
        <div className="quiz-header-actions">
          <span className="timer"><Clock3 size={18} /><strong>{evaluation.duration} min limit</strong></span>
          <button className="icon-button" onClick={onExit} aria-label="Exit evaluation"><X size={20} /></button>
        </div>
      </header>

      <div className="quiz-layout">
        <aside className="quiz-progress-panel">
          <span className="card-kicker">YOUR PROGRESS</span>
          <h1>Stay focused.<br />You&apos;re doing well.</h1>
          <div className="progress-number"><strong>{progress}</strong><span>%</span></div>
          <div className="vertical-progress"><span style={{ height: `${progress}%` }} /></div>
          <div className="quiz-key">
            <span><i className="done" /> Answered <strong>{answered}</strong></span>
            <span><i className="current" /> Current <strong>1</strong></span>
            <span><i /> Remaining <strong>{questionsData.length - answered}</strong></span>
          </div>
        </aside>

        <section className="question-stage">
          <div className="question-stack question-stack-three" />
          <div className="question-stack question-stack-two" />
          <article className="question-card">
            <div className="question-progress-bars">
              {questionsData.map((question, questionIndex) => (
                <button
                  type="button"
                  aria-label={`Go to question ${questionIndex + 1}`}
                  onClick={() => setIndex(questionIndex)}
                  key={question.id}
                  className={questionIndex === index ? "current" : answers[questionIndex] !== undefined ? "answered" : ""}
                />
              ))}
            </div>
            <div className="quiz-coach">
              <Logo compact />
              <p>Take a moment to read the question, then choose one answer.</p>
            </div>
            <div className="question-number-row">
              <span>QUESTION {String(index + 1).padStart(2, "0")}</span>
              <small>SELECT ONE ANSWER</small>
            </div>
            <h2>{current.prompt}</h2>
            <div className="answer-list">
              {current.options.map((option, optionIndex) => (
                <button
                  type="button"
                  key={option}
                  className={answers[index] === optionIndex ? "selected" : ""}
                  onClick={() => setAnswers((currentAnswers) => ({ ...currentAnswers, [index]: optionIndex }))}
                >
                  <span className="answer-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  <strong>{option}</strong>
                  <span className="answer-radio">
                    {answers[index] === optionIndex ? <Check size={15} /> : <ArrowRight size={15} />}
                  </span>
                </button>
              ))}
            </div>
            <footer className="question-footer">
              <button
                className="back-button"
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft size={18} /> Back
              </button>
              <span>{index + 1} of {questionsData.length}</span>
              {index < questionsData.length - 1 ? (
                <button
                  className="primary-button"
                  type="button"
                  disabled={answers[index] === undefined}
                  onClick={() => setIndex((value) => Math.min(questionsData.length - 1, value + 1))}
                >
                  Continue <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  disabled={answered !== questionsData.length}
                  onClick={() => setShowSubmit(true)}
                >
                  Finish evaluation <Check size={18} />
                </button>
              )}
            </footer>
          </article>
        </section>
      </div>

      {showSubmit && (
        <div className="modal-backdrop">
          <section className="confirm-modal">
            <span className="modal-icon"><Send size={25} /></span>
            <span className="card-kicker">READY TO SUBMIT?</span>
            <h2>Finish this evaluation</h2>
            <p>All {questionsData.length} questions have been answered. Your score will be recorded in your history.</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowSubmit(false)}>Review answers</button>
              <button className="primary-button" onClick={submitQuiz}>Submit evaluation <ArrowRight size={18} /></button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Result({
  evaluation,
  score,
  onHome,
  onHistory,
}: {
  evaluation: Evaluation;
  score: number;
  onHome: () => void;
  onHistory: () => void;
}) {
  const passed = score >= evaluation.passingScore;
  return (
    <main className="result-page">
      <div className="result-aurora" />
      <header className="result-header"><Logo /><span>Evaluation complete</span></header>
      <section className="result-card">
        <div className="result-progress"><span /></div>
        <div className="result-coach">
          <Logo compact />
          <p>Your evaluation has been submitted and the result is ready.</p>
        </div>
        <span className="result-spark"><Sparkles size={34} /></span>
        <span className="card-kicker">{passed ? "WELL DONE" : "KEEP LEARNING"}</span>
        <h1>{passed ? "You passed." : "Almost there."}</h1>
        <p>{evaluation.title}</p>
        <ScoreRing score={score} size="lg" />
        <div className="result-message">
          <strong>{passed ? "A strong result" : "A review is recommended"}</strong>
          <span>{passed ? "Your score has been added to your evaluation history." : `The passing score is ${evaluation.passingScore}%. Review the course and try again.`}</span>
        </div>
        <div className="result-stats">
          <div><span>Your score</span><strong>{score}%</strong></div>
          <div><span>Passing score</span><strong>{evaluation.passingScore}%</strong></div>
          <div><span>Outcome</span><strong>{passed ? "Passed" : "Review"}</strong></div>
        </div>
        <div className="result-actions">
          <button className="secondary-button" onClick={onHistory}>View score history</button>
          <button className="primary-button" onClick={onHome}>Back to overview <ArrowRight size={18} /></button>
        </div>
      </section>
    </main>
  );
}

function AdminOverview({
  setView,
  onCreate,
  leaderboardData,
  evaluations,
  participantsData,
}: {
  setView: (view: AdminView) => void;
  onCreate: () => void;
  leaderboardData: LeaderboardRow[];
  evaluations: Evaluation[];
  participantsData: ParticipantRow[];
}) {
  const liveCourses = evaluations.filter((item) => item.status === "Live").length;
  const averageScore = leaderboardData.length
    ? Math.round(leaderboardData.reduce((sum, item) => sum + item.score, 0) / leaderboardData.length)
    : 0;
  const topScore = leaderboardData.length
    ? Math.max(...leaderboardData.map((item) => item.score))
    : 0;
  return (
    <div className="content admin-overview">
      <section className="welcome-row admin-section-header">
        <div>
          <span className="eyebrow dark-eyebrow"><Sparkles size={15} /> ADMIN WORKSPACE</span>
          <h2>Here&apos;s today&apos;s learning pulse.</h2>
          <p>Monitor participation, publish evaluations, and keep every score organized.</p>
        </div>
        <div className="admin-header-actions">
          <button className="primary-button" onClick={onCreate}><Plus size={18} /> New quiz course</button>
        </div>
      </section>
      <section className="admin-metrics">
        <article><span className="metric-icon green"><Users size={20} /></span><div><p>Active participants</p><strong>{participantsData.filter((item) => item.status === "Active").length}</strong><small>{participantsData.length} total accounts</small></div></article>
        <article><span className="metric-icon orange"><BookOpen size={20} /></span><div><p>Live evaluations</p><strong>{liveCourses}</strong><small>{evaluations.length} courses total</small></div></article>
        <article><span className="metric-icon blue"><BarChart3 size={20} /></span><div><p>Average score</p><strong>{averageScore}<em>%</em></strong><small>{leaderboardData.length} submitted attempts</small></div></article>
        <article><span className="metric-icon violet"><Trophy size={20} /></span><div><p>Top score</p><strong>{topScore}<em>%</em></strong><small>Current scoreboard</small></div></article>
      </section>
      <div className="admin-dashboard-grid">
        <section className="analytics-card">
          <div className="section-heading">
            <div><h3>Set up your workspace</h3><p>Create content first, then invite participants when you are ready.</p></div>
          </div>
          <div className="setup-actions">
            <button onClick={onCreate}><span>01</span><div><strong>Create a quiz course</strong><small>Add questions, scoring, and access rules.</small></div><ArrowRight size={18} /></button>
            <button onClick={() => setView("participants")}><span>02</span><div><strong>Add participants</strong><small>Create accounts only when the workspace is ready.</small></div><ArrowRight size={18} /></button>
            <button onClick={() => setView("scoreboard")}><span>03</span><div><strong>Review submitted scores</strong><small>Results appear automatically after submissions.</small></div><ArrowRight size={18} /></button>
          </div>
        </section>
        <section className="completion-card">
          <div className="section-heading"><div><h3>Workspace status</h3><p>Live data from Google Sheets.</p></div></div>
          <div className="workspace-summary">
            <div><span>Courses</span><strong>{evaluations.length}</strong></div>
            <div><span>Participants</span><strong>{participantsData.length}</strong></div>
            <div><span>Submissions</span><strong>{leaderboardData.length}</strong></div>
          </div>
          <button className="secondary-button full" onClick={() => setView("scoreboard")}>View live scoreboard <ArrowRight size={17} /></button>
        </section>
      </div>
      <section className="table-card leaderboard-card">
        <div className="table-card-header">
          <div><h3>Top performers</h3><p>Live ranking from submitted evaluations.</p></div>
          <button className="text-link" onClick={() => setView("scoreboard")}>Full scoreboard <ArrowRight size={16} /></button>
        </div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Rank</th><th>Participant</th><th>Branch</th><th>Score</th><th>Time</th><th /></tr></thead>
            <tbody>
              {leaderboardData.slice(0, 5).map((item) => (
              <tr key={`${item.rank}-${item.name}`}>
                <td><span className={`rank-badge rank-${item.rank}`}>{item.rank <= 3 ? <Medal size={16} /> : `#${item.rank}`}</span></td>
                <td><div className="participant-cell"><Initials name={item.name} size="sm" /><strong>{item.name}</strong></div></td>
                <td>{item.branch}</td>
                <td><strong className="table-score">{item.score}%</strong></td>
                <td>{item.time}</td>
                <td><button className="icon-button"><ChevronRight size={17} /></button></td>
              </tr>
              ))}
              {!leaderboardData.length && (
                <tr className="empty-table-row">
                  <td colSpan={6}>
                    <EmptyState icon={Trophy} title="No scores yet" description="Submitted evaluations will populate this scoreboard." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CoursesView({
  evaluations,
  onCreate,
}: {
  evaluations: Evaluation[];
  onCreate: () => void;
}) {
  return (
    <div className="content">
      <section className="page-intro admin-section-header">
        <div><span className="eyebrow dark-eyebrow"><Layers3 size={15} /> CONTENT MANAGEMENT</span><h2>Quiz courses</h2><p>Create, schedule, and manage every evaluation in one place.</p></div>
        <div className="admin-header-actions">
          <button className="primary-button" onClick={onCreate}><Plus size={18} /> New quiz course</button>
        </div>
      </section>
      <div className="toolbar">
        <div className="admin-search"><Search size={17} /><input placeholder="Search courses…" /></div>
        <div className="toolbar-buttons"><button className="secondary-button"><Filter size={16} /> Status</button><button className="secondary-button"><CalendarDays size={16} /> Schedule</button></div>
      </div>
      <section className="table-card">
        <div className="responsive-table">
          <table className="course-management-table">
            <thead><tr><th>Course</th><th>Status</th><th>Schedule</th><th>Participants</th><th>Average</th><th>Actions</th></tr></thead>
            <tbody>
              {evaluations.map((course, index) => (
              <tr key={course.id}>
                <td><div className="table-title-cell"><EvaluationIcon color={course.color} icon={index === 1 ? "shield" : "book"} /><div><strong>{course.title}</strong><span>{course.category} · {course.questionCount} questions</span></div></div></td>
                <td><span className={`status-pill status-${course.status.toLowerCase()}`}>{course.status}</span></td>
                <td><div className="date-cell"><strong>{course.opens && course.opens !== "Scheduled" ? course.opens : course.due}</strong><span>{course.opens && course.opens !== "Scheduled" ? "Opening date" : "Closing date"} · {course.duration} min</span></div></td>
                <td><strong>{course.participants || "—"}</strong></td>
                <td><strong>{course.average ? `${course.average}%` : "—"}</strong></td>
                <td><div className="inline-actions"><button aria-label="Preview"><Eye size={17} /></button><button aria-label="Duplicate"><Copy size={17} /></button><button aria-label="Edit"><Pencil size={17} /></button><button aria-label="More"><MoreHorizontal size={17} /></button></div></td>
              </tr>
              ))}
              {!evaluations.length && (
                <tr className="empty-table-row">
                  <td colSpan={6}>
                    <EmptyState
                      icon={Layers3}
                      title="No quiz courses"
                      description="Create your first course to start building the evaluation workspace."
                      action={<button className="primary-button" onClick={onCreate}><Plus size={17} /> Create course</button>}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ParticipantsView({
  participantsData,
  onAdd,
}: {
  participantsData: ParticipantRow[];
  onAdd: (participant: { name: string; username: string; branch: string; password: string }) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submitParticipant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const nextError = await onAdd({ name, username, branch, password });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setAdding(false);
    setName("");
    setUsername("");
    setBranch("");
    setPassword("");
  }

  const active = participantsData.filter((item) => item.status === "Active").length;
  const inactive = participantsData.length - active;

  return (
    <div className="content">
      <section className="page-intro admin-section-header">
        <div><span className="eyebrow dark-eyebrow"><Users size={15} /> PEOPLE</span><h2>Participants</h2><p>Manage accounts, locations, and evaluation access.</p></div>
        <div className="admin-header-actions">
          <button className="primary-button" onClick={() => setAdding(true)}><UserPlus size={18} /> Add participant</button>
        </div>
      </section>
      <section className="admin-metrics compact">
        <article><span className="metric-icon green"><Users size={20} /></span><div><p>Total accounts</p><strong>{participantsData.length}</strong><small>Participant accounts only</small></div></article>
        <article><span className="metric-icon blue"><Check size={20} /></span><div><p>Active accounts</p><strong>{active}</strong><small>{participantsData.length ? `${Math.round(active / participantsData.length * 100)}% active rate` : "No participants added"}</small></div></article>
        <article><span className="metric-icon orange"><ShieldCheck size={20} /></span><div><p>Inactive accounts</p><strong>{inactive}</strong><small>Access currently disabled</small></div></article>
      </section>
      <div className="toolbar"><div className="admin-search"><Search size={17} /><input placeholder="Search name, username, or branch…" /></div><div className="toolbar-buttons"><button className="secondary-button"><Filter size={16} /> Branch</button><button className="secondary-button"><Download size={16} /> Export</button></div></div>
      <section className="table-card">
        <div className="responsive-table">
          <table>
            <thead><tr><th>Participant</th><th>Branch</th><th>Attempts</th><th>Average</th><th>Status</th><th /></tr></thead>
            <tbody>
              {participantsData.map((person) => (
              <tr key={person.username}>
                <td><div className="participant-cell"><Initials name={person.name} size="sm" /><div><strong>{person.name}</strong><span>@{person.username}</span></div></div></td>
                <td>{person.branch}</td><td>{person.attempts}</td><td><strong className="table-score">{person.average}%</strong></td>
                <td><span className={`outcome-pill ${person.status === "Active" ? "pass" : "neutral"}`}>{person.status}</span></td>
                <td><button className="icon-button"><MoreHorizontal size={18} /></button></td>
              </tr>
              ))}
              {!participantsData.length && (
                <tr className="empty-table-row">
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="Admin is the only account"
                      description="No participant accounts have been created."
                      action={<button className="primary-button" onClick={() => setAdding(true)}><UserPlus size={17} /> Add participant</button>}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {adding && (
        <div className="modal-backdrop">
          <form className="confirm-modal add-participant-modal" onSubmit={submitParticipant}>
            <button className="modal-close" type="button" onClick={() => setAdding(false)} aria-label="Close add participant"><X size={18} /></button>
            <span className="modal-icon"><UserPlus size={24} /></span>
            <span className="card-kicker">NEW ACCOUNT</span>
            <h2>Add participant</h2>
            <p>Create an account that can sign in and keep its own evaluation history.</p>
            <label className="field-label">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Participant name" required /></label>
            <label className="field-label">Username<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Lowercase letters, numbers, dots, _ or -" minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" autoComplete="username" required /></label>
            <label className="field-label">Branch / location<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Branch or department" required /></label>
            <label className="field-label">Temporary password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" required /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setAdding(false)}>Cancel</button>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"} {!saving && <ArrowRight size={17} />}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ScoreboardView({
  leaderboardData,
  evaluations,
  onEvaluationChange,
}: {
  leaderboardData: LeaderboardRow[];
  evaluations: Evaluation[];
  onEvaluationChange: (evaluationId: string) => Promise<string | null>;
}) {
  const [evaluation, setEvaluation] = useState(evaluations[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const selectedEvaluation = evaluations.find((item) => item.id === evaluation) || evaluations[0] || null;
  const average = leaderboardData.length
    ? Math.round(leaderboardData.reduce((sum, item) => sum + item.score, 0) / leaderboardData.length)
    : 0;
  const topScore = leaderboardData.length
    ? Math.max(...leaderboardData.map((item) => item.score))
    : 0;
  const passRate = leaderboardData.length && selectedEvaluation
    ? Math.round(leaderboardData.filter((item) => item.score >= selectedEvaluation.passingScore).length / leaderboardData.length * 100)
    : 0;

  async function selectEvaluation(evaluationId: string) {
    setEvaluation(evaluationId);
    setLoading(true);
    setLoadError("");
    const error = await onEvaluationChange(evaluationId);
    if (error) setLoadError(error);
    setLoading(false);
  }

  return (
    <div className="content">
      <section className="page-intro admin-section-header">
        <div><span className="eyebrow dark-eyebrow"><Trophy size={15} /> LIVE RESULTS</span><h2>Evaluation scoreboard</h2><p>Compare results for every participant in the selected evaluation.</p></div>
        <div className="admin-header-actions">
          <button className="secondary-button"><Download size={17} /> Export scoreboard</button>
        </div>
      </section>
      <section className="scoreboard-hero">
        <div>
          <span className="card-kicker">SELECT EVALUATION</span>
          <select
            value={evaluation}
            onChange={(event) => void selectEvaluation(event.target.value)}
            disabled={!evaluations.length || loading}
          >
            {!evaluations.length && <option value="">No evaluations available</option>}
            {evaluations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <p>{loading ? "Loading this scoreboard…" : "Live results synced from Google Sheets."}</p>
          {loadError && <p className="scoreboard-error" role="alert">{loadError}</p>}
        </div>
        <div className="scoreboard-kpis">
          <div><span>Submissions</span><strong>{leaderboardData.length}</strong></div>
          <div><span>Average</span><strong>{average}<small>%</small></strong></div>
          <div><span>Pass rate</span><strong>{passRate}<small>%</small></strong></div>
          <div><span>Top score</span><strong>{topScore}<small>%</small></strong></div>
        </div>
      </section>
      <div className="podium-grid">
        {[leaderboardData[1], leaderboardData[0], leaderboardData[2]]
          .filter((item): item is LeaderboardRow => Boolean(item))
          .map((item) => (
          <article className={`podium-card podium-${item.rank}`} key={item.rank}>
            <span className="podium-rank">{item.rank === 1 ? <Trophy size={24} /> : `#${item.rank}`}</span>
            <Initials name={item.name} size="lg" />
            <h3>{item.name}</h3><p>{item.branch}</p><strong>{item.score}%</strong><small>{item.time}</small>
            <div className="podium-base" />
          </article>
        ))}
      </div>
      <section className="table-card">
        <div className="table-card-header"><div><h3>All participants</h3><p>Sorted by score, then completion time.</p></div><div className="table-actions"><div className="admin-search"><Search size={16} /><input placeholder="Find participant…" /></div><button className="icon-button"><Filter size={18} /></button></div></div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Rank</th><th>Participant</th><th>Branch</th><th>Score</th><th>Correct</th><th>Time</th><th>Completed</th></tr></thead>
            <tbody>
              {leaderboardData.map((item) => (
                <tr key={`${item.rank}-${item.name}`}><td><span className={`rank-badge rank-${item.rank}`}>{item.rank <= 3 ? <Medal size={16} /> : `#${item.rank}`}</span></td><td><div className="participant-cell"><Initials name={item.name} size="sm" /><strong>{item.name}</strong></div></td><td>{item.branch || "—"}</td><td><strong className="table-score">{item.score}%</strong></td><td>{item.totalQuestions ? `${item.correctCount}/${item.totalQuestions}` : "—"}</td><td>{item.time}</td><td>{item.submittedAt || "—"}</td></tr>
              ))}
              {!leaderboardData.length && (
                <tr className="empty-table-row">
                  <td colSpan={7}>
                    <EmptyState icon={Trophy} title="No submitted scores" description="The scoreboard will populate after participants complete an evaluation." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type DraftQuestion = { prompt: string; options: string[]; correct: number };

function CourseBuilder({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (evaluation: Evaluation, questions: DraftQuestion[]) => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Operations");
  const [duration, setDuration] = useState(20);
  const [passingScore, setPassingScore] = useState(75);
  const [builderError, setBuilderError] = useState("");
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    { prompt: "", options: ["", "", "", ""], correct: 0 },
  ]);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setDraftQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setDraftQuestions((items) => items.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: item.options.map((option, index) => index === optionIndex ? value : option) } : item));
  }
  function saveCourse() {
    if (!title.trim()) {
      setBuilderError("Enter a course title.");
      setStep(1);
      return;
    }
    if (draftQuestions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()))) {
      setBuilderError("Complete every question and answer choice before saving.");
      setStep(2);
      return;
    }
    setBuilderError("");
    onSave({
      id: `course-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      questionCount: draftQuestions.length,
      duration,
      due: "Not scheduled",
      status: "Draft",
      participants: 0,
      average: 0,
      passingScore,
      color: "green",
    }, draftQuestions);
  }

  return (
    <div className="builder-page">
      <header className="builder-header">
        <div className="builder-brand"><Logo /><span>New quiz course</span></div>
        <div className="builder-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={saveCourse}><Save size={17} /> Save course</button></div>
      </header>
      <div className="builder-progress">
        {BUILDER_STEPS.map(([label, number]) => (
          <button className={step === number ? "active" : step > number ? "done" : ""} key={number} onClick={() => setStep(number)}>
            <span>{step > number ? <Check size={14} /> : number}</span>{label}
          </button>
        ))}
      </div>
      <main className="builder-content">
        {builderError && <p className="builder-error" role="alert">{builderError}</p>}
        {step === 1 && (
          <section className="builder-card">
            <div className="builder-card-heading"><span className="card-kicker">STEP 01</span><h1>Course details</h1><p>Give the evaluation a clear title and set its scoring rules.</p></div>
            <div className="builder-form-grid">
              <label className="field-label full">Course title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Evaluation title" /></label>
              <label className="field-label full">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should participants learn or demonstrate?" rows={4} /></label>
              <label className="field-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Operations</option><option>Safety</option><option>Service</option><option>Compliance</option></select></label>
              <label className="field-label">Time limit (minutes)<input type="number" min={1} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
              <label className="field-label">Passing score (%)<input type="number" min={1} max={100} value={passingScore} onChange={(event) => setPassingScore(Number(event.target.value))} /></label>
              <label className="field-label">Attempt policy<select><option>One attempt</option><option>Unlimited attempts</option><option>Two attempts</option></select></label>
            </div>
            <div className="builder-footer"><span /><button className="primary-button" onClick={() => setStep(2)}>Continue to questions <ArrowRight size={18} /></button></div>
          </section>
        )}
        {step === 2 && (
          <section className="builder-question-layout">
            <aside className="question-outline">
              <div><span className="card-kicker">COURSE OUTLINE</span><h3>{draftQuestions.length} question{draftQuestions.length !== 1 ? "s" : ""}</h3></div>
              {draftQuestions.map((question, index) => <button key={index} className={index === 0 ? "active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{question.prompt || "Untitled question"}</strong></button>)}
              <button className="add-outline" onClick={() => setDraftQuestions((items) => [...items, { prompt: "", options: ["", "", "", ""], correct: 0 }])}><Plus size={17} /> Add question</button>
            </aside>
            <div className="question-edit-column">
              {draftQuestions.map((question, questionIndex) => (
                <article className="question-editor" key={questionIndex}>
                  <div className="question-editor-head"><span>QUESTION {String(questionIndex + 1).padStart(2, "0")}</span><div><button aria-label="Duplicate question"><Copy size={17} /></button>{draftQuestions.length > 1 && <button aria-label="Delete question" onClick={() => setDraftQuestions((items) => items.filter((_, index) => index !== questionIndex))}><Trash2 size={17} /></button>}</div></div>
                  <label className="field-label">Question prompt<textarea rows={3} value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Type the question here…" /></label>
                  <div className="option-editor">
                    <span className="field-label">Answer choices <small>Select the correct answer</small></span>
                    {question.options.map((option, optionIndex) => (
                      <label className={question.correct === optionIndex ? "correct" : ""} key={optionIndex}>
                        <input type="radio" name={`correct-${questionIndex}`} checked={question.correct === optionIndex} onChange={() => updateQuestion(questionIndex, { correct: optionIndex })} />
                        <span className="answer-letter">{String.fromCharCode(65 + optionIndex)}</span>
                        <input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Answer option ${optionIndex + 1}`} />
                        {question.correct === optionIndex && <small><Check size={13} /> Correct</small>}
                      </label>
                    ))}
                  </div>
                </article>
              ))}
              <button className="add-question-card" onClick={() => setDraftQuestions((items) => [...items, { prompt: "", options: ["", "", "", ""], correct: 0 }])}><Plus size={20} /><span><strong>Add another question</strong><small>Build the next item in this evaluation</small></span></button>
              <div className="builder-footer"><button className="back-button" onClick={() => setStep(1)}><ChevronLeft size={18} /> Course details</button><button className="primary-button" onClick={() => setStep(3)}>Schedule & access <ArrowRight size={18} /></button></div>
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="builder-card">
            <div className="builder-card-heading"><span className="card-kicker">STEP 03</span><h1>Schedule & access</h1><p>Choose when the evaluation opens and who should receive it.</p></div>
            <div className="builder-form-grid">
              <label className="field-label">Opens on<input type="date" /></label>
              <label className="field-label">Closes on<input type="date" /></label>
              <label className="field-label full">Assign to<select><option>All active participants</option><option>Selected branches</option><option>Selected participants</option></select></label>
              <label className="toggle-row full"><div><strong>Publish immediately</strong><span>Make the course visible when saved.</span></div><input type="checkbox" /></label>
              <label className="toggle-row full"><div><strong>Email notification</strong><span>Notify assigned participants after publishing.</span></div><input type="checkbox" defaultChecked /></label>
            </div>
            <div className="publish-summary"><span className="metric-icon green"><Send size={20} /></span><div><strong>Ready to publish</strong><p>{draftQuestions.length} questions · {duration} minutes · {passingScore}% passing score</p></div></div>
            <div className="builder-footer"><button className="back-button" onClick={() => setStep(2)}><ChevronLeft size={18} /> Questions</button><button className="primary-button" onClick={saveCourse}><Save size={18} /> Save quiz course</button></div>
          </section>
        )}
      </main>
    </div>
  );
}

function MobileNav({ role, view, setView }: { role: Role; view: View; setView: (view: View) => void }) {
  const items = role === "admin"
    ? [{ id: "overview", icon: LayoutDashboard, label: "Home" }, { id: "courses", icon: Layers3, label: "Courses" }, { id: "participants", icon: Users, label: "People" }, { id: "scoreboard", icon: Trophy, label: "Scores" }]
    : [{ id: "home", icon: Home, label: "Home" }, { id: "evaluations", icon: BookOpen, label: "Courses" }, { id: "history", icon: History, label: "History" }, { id: "profile", icon: UserRound, label: "Profile" }];
  return (
    <nav className="mobile-nav">
      {items.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id as View)}><Icon size={19} /><span>{item.label}</span></button>;
      })}
    </nav>
  );
}

export default function ExamClient() {
  const [booting, setBooting] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [view, setView] = useState<View>("home");
  const [activeQuiz, setActiveQuiz] = useState<Evaluation | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<{ evaluation: Evaluation; score: number } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>([]);
  const [participantsData, setParticipantsData] = useState<ParticipantRow[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [backendMode, setBackendMode] = useState<"unavailable" | "sheets">("unavailable");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const titleMap = useMemo<Record<View, [string, string]>>(() => ({
    home: ["Overview", "Your evaluation snapshot"],
    evaluations: ["Evaluations", "Current and upcoming courses"],
    history: ["Score history", "Every result, in one place"],
    profile: ["My profile", "Account and learning details"],
    overview: ["Admin overview", "Evaluation performance at a glance"],
    courses: ["Quiz courses", "Create and manage evaluation content"],
    participants: ["Participants", "Accounts, access, and performance"],
    scoreboard: ["Scoreboard", "Live rankings for every evaluation"],
  }), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), BOOT_SCREEN_MINIMUM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  async function login(nextRole: Role, username: string, password: string): Promise<string | null> {
    try {
      const response = await sheetsFetch({ action: "login", username, password });
      const loginData = (await response.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
        user?: {
          id?: string;
          username?: string;
          fullName?: string;
          branch?: string;
          role?: string;
          status?: string;
        };
      };

      if (!response.ok || loginData.ok === false || !loginData.token) {
        return loginData.error || "Unable to sign in.";
      }

      const authenticatedRole: Role = loginData.user?.role === "admin" ? "admin" : "participant";
      if (authenticatedRole !== nextRole) {
        return `This account belongs to the ${authenticatedRole} workspace.`;
      }

      if (authenticatedRole === "participant") {
        const homeData = await sheetsRequest<{
          ok: boolean;
          courses: Record<string, unknown>[];
          history: Record<string, unknown>[];
        }>("getParticipantHome", { token: loginData.token });
        setEvaluations(homeData.courses.map(apiCourseToEvaluation));
        setHistory(homeData.history.map((item, index) => ({
          id: String(item.id || `history-${index}`),
          title: String(item.title || "Evaluation"),
          category: String(item.category || "General"),
          date: formatApiDate(item.submittedAt),
          score: Number(item.score || 0),
          status: item.passed ? "Passed" : "Needs review",
          duration: formatDuration(Number(item.durationSeconds || 0)),
        })));
      } else {
        const dashboardData = await sheetsRequest<{
          ok: boolean;
          courses: Record<string, unknown>[];
          participants: Record<string, unknown>[];
          scoreboard: Record<string, unknown>[];
        }>("adminGetDashboard", { token: loginData.token });
        setEvaluations(dashboardData.courses.map(apiCourseToEvaluation));
        const liveLeaderboard = apiScoreboardToLeaderboard(dashboardData.scoreboard);
        setLeaderboardData(liveLeaderboard);
        setParticipantsData(dashboardData.participants.map((item) => {
          return {
            name: String(item.fullName || "Participant"),
            username: String(item.username || item.email || ""),
            branch: String(item.branch || ""),
            attempts: Number(item.attempts || 0),
            average: Number(item.average || 0),
            status: String(item.status || "active") === "active" ? "Active" : "Inactive",
          };
        }));
      }

      setSessionToken(loginData.token);
      setBackendMode("sheets");
      setCurrentUser({
        id: String(loginData.user?.id || ""),
        username: String(loginData.user?.username || username),
        fullName: String(loginData.user?.fullName || (authenticatedRole === "admin" ? "Administrator" : "Participant")),
        branch: String(loginData.user?.branch || ""),
        role: authenticatedRole,
        status: String(loginData.user?.status || "active"),
      });
      setRole(authenticatedRole);
      setView(authenticatedRole === "admin" ? "overview" : "home");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to sign in.";
    }
  }

  function logout() {
    if (backendMode === "sheets" && sessionToken) {
      void sheetsRequest("logout", { token: sessionToken }).catch(() => undefined);
    }
    setRole(null);
    setSessionToken(null);
    setBackendMode("unavailable");
    setCurrentUser(null);
    setHistory([]);
    setEvaluations([]);
    setLeaderboardData([]);
    setParticipantsData([]);
    setActiveQuiz(null);
    setActiveAttemptId(null);
    setResult(null);
  }

  async function startQuiz(evaluation: Evaluation) {
    if (backendMode === "sheets" && sessionToken) {
      try {
        const data = await sheetsRequest<{
          ok: boolean;
          attemptId: string;
          questions: {
            id: string;
            prompt: string;
            options: { key: string; text: string }[];
          }[];
        }>("startAttempt", { token: sessionToken, courseId: evaluation.id });
        const liveQuestions = data.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: question.options.map((option) => option.text),
        }));
        setQuizQuestions(liveQuestions);
        setActiveAttemptId(data.attemptId);
        setActiveQuiz({ ...evaluation, questionCount: liveQuestions.length });
        return;
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to start this evaluation.");
        return;
      }
    }
    window.alert("The Google Sheets backend is required to start an evaluation.");
  }

  async function completeQuiz(score: number, answers: Record<number, number>) {
    if (!activeQuiz) return;
    let finalScore = score;
    if (backendMode === "sheets" && sessionToken && activeAttemptId) {
      try {
        const answerPayload = quizQuestions.reduce<Record<string, string>>((resultMap, question, index) => {
          resultMap[question.id] = String.fromCharCode(65 + answers[index]);
          return resultMap;
        }, {});
        const submission = await sheetsRequest<{
          ok: boolean;
          result: { score: number; durationSeconds: number };
        }>("submitAttempt", {
          token: sessionToken,
          attemptId: activeAttemptId,
          answers: answerPayload,
        });
        finalScore = submission.result.score;
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to submit this evaluation.");
        return;
      }
    } else {
      window.alert("The Google Sheets backend is required to submit this evaluation.");
      return;
    }
    const completedEvaluation = activeQuiz;
    const newResult = { evaluation: completedEvaluation, score: finalScore };
    setResult(newResult);
    setHistory((items) => [{
      id: `history-${Date.now()}`,
      title: completedEvaluation.title,
      category: completedEvaluation.category,
      date: formatApiDate(new Date()),
      score: finalScore,
      status: finalScore >= completedEvaluation.passingScore ? "Passed" : "Needs review",
      duration: "Recorded online",
    }, ...items]);
    setActiveQuiz(null);
    setActiveAttemptId(null);
  }

  async function saveCourse(evaluation: Evaluation, draftQuestions: DraftQuestion[]) {
    if (backendMode !== "sheets" || !sessionToken) {
      window.alert("The Google Sheets backend is required to save a course.");
      return;
    }
    let savedEvaluation = evaluation;
    try {
      const data = await sheetsRequest<{
        ok: boolean;
        course: Record<string, unknown>;
      }>("adminSaveCourse", {
        token: sessionToken,
        course: {
          id: evaluation.id,
          title: evaluation.title,
          description: evaluation.description,
          category: evaluation.category,
          passingScore: evaluation.passingScore,
          duration: evaluation.duration,
          status: evaluation.status.toLowerCase(),
          questions: draftQuestions.map((question) => ({
            prompt: question.prompt,
            options: question.options,
            correct: String.fromCharCode(65 + question.correct),
            points: 1,
          })),
        },
      });
      savedEvaluation = apiCourseToEvaluation(data.course);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to save this course.");
      return;
    }
    setEvaluations((items) => [savedEvaluation, ...items]);
    setBuilderOpen(false);
    setView("courses");
  }

  async function addParticipant(input: { name: string; username: string; branch: string; password: string }): Promise<string | null> {
    try {
      if (backendMode !== "sheets" || !sessionToken) {
        return "The Google Sheets backend is required to create an account.";
      }
      const data = await sheetsRequest<{
        ok: boolean;
        user: Record<string, unknown>;
      }>("adminSaveParticipant", {
        token: sessionToken,
        participant: {
          fullName: input.name,
          username: input.username,
          branch: input.branch,
          password: input.password,
          status: "active",
        },
      });
      setParticipantsData((items) => [{
        name: String(data.user.fullName || input.name),
        username: String(data.user.username || input.username),
        branch: String(data.user.branch || input.branch),
        attempts: 0,
        average: 0,
        status: "Active",
      }, ...items]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to create this participant.";
    }
  }

  async function loadScoreboard(evaluationId: string): Promise<string | null> {
    if (backendMode !== "sheets" || !sessionToken) {
      return "The Google Sheets backend is required to load a scoreboard.";
    }
    try {
      const data = await sheetsRequest<{
        ok: boolean;
        scoreboard: Record<string, unknown>[];
      }>("adminGetDashboard", {
        token: sessionToken,
        courseId: evaluationId,
      });
      setLeaderboardData(apiScoreboardToLeaderboard(data.scoreboard));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to load this scoreboard.";
    }
  }

  if (booting) return <BootScreen />;
  if (!role) return <Login onLogin={login} />;
  if (builderOpen && role === "admin") return <CourseBuilder onClose={() => setBuilderOpen(false)} onSave={saveCourse} />;
  if (activeQuiz) return <Quiz evaluation={activeQuiz} questionsData={quizQuestions} onExit={() => setActiveQuiz(null)} onComplete={completeQuiz} />;
  if (result) return <Result evaluation={result.evaluation} score={result.score} onHome={() => { setResult(null); setView("home"); }} onHistory={() => { setResult(null); setView("history"); }} />;

  const [title, subtitle] = titleMap[view];
  return (
    <div className="app-shell">
      <Sidebar role={role} view={view} setView={setView} onLogout={logout} evaluationCount={evaluations.filter((item) => item.status === "Live").length} />
      <div className="main-shell">
        <Topbar role={role} title={title} subtitle={subtitle} user={currentUser} />
        {role === "participant" && view === "home" && <ParticipantHome onStart={startQuiz} setView={setView} history={history} evaluations={evaluations} user={currentUser} />}
        {role === "participant" && view === "evaluations" && <EvaluationsView evaluations={evaluations} onStart={startQuiz} />}
        {role === "participant" && view === "history" && <HistoryView history={history} />}
        {role === "participant" && view === "profile" && <ProfileView user={currentUser} history={history} />}
        {role === "admin" && view === "overview" && <AdminOverview setView={setView} onCreate={() => setBuilderOpen(true)} leaderboardData={leaderboardData} evaluations={evaluations} participantsData={participantsData} />}
        {role === "admin" && view === "courses" && <CoursesView evaluations={evaluations} onCreate={() => setBuilderOpen(true)} />}
        {role === "admin" && view === "participants" && <ParticipantsView participantsData={participantsData} onAdd={addParticipant} />}
        {role === "admin" && view === "scoreboard" && <ScoreboardView leaderboardData={leaderboardData} evaluations={evaluations} onEvaluationChange={loadScoreboard} />}
      </div>
      <MobileNav role={role} view={view} setView={setView} />
    </div>
  );
}
