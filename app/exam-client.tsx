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
  Mail,
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
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

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
  time: string;
};

type ParticipantRow = {
  name: string;
  email: string;
  branch: string;
  attempts: number;
  average: number;
  status: string;
};

const evaluationsSeed: Evaluation[] = [
  {
    id: "ops-2026",
    title: "Operational Excellence 2026",
    description:
      "Core operating procedures, service standards, and daily readiness.",
    category: "Operations",
    questionCount: 8,
    duration: 20,
    due: "30 Jul 2026",
    status: "Live",
    participants: 84,
    average: 82,
    passingScore: 75,
    color: "green",
  },
  {
    id: "safety-2026",
    title: "Workplace Safety Essentials",
    description:
      "Emergency response, incident prevention, and safe working practices.",
    category: "Safety",
    questionCount: 10,
    duration: 15,
    due: "08 Aug 2026",
    status: "Live",
    participants: 67,
    average: 88,
    passingScore: 80,
    color: "orange",
  },
  {
    id: "service-2026",
    title: "Guest Service Fundamentals",
    description:
      "Create consistent, helpful, and memorable guest experiences.",
    category: "Service",
    questionCount: 12,
    duration: 25,
    due: "15 Aug 2026",
    status: "Upcoming",
    participants: 0,
    average: 0,
    passingScore: 75,
    color: "blue",
  },
  {
    id: "cyber-2026",
    title: "Cybersecurity Awareness",
    description:
      "Protect accounts, customer information, and company systems.",
    category: "Compliance",
    questionCount: 10,
    duration: 18,
    due: "21 Jun 2026",
    status: "Completed",
    participants: 94,
    average: 86,
    passingScore: 80,
    color: "violet",
  },
];

const historySeed: HistoryItem[] = [
  {
    id: "h-1",
    title: "Cybersecurity Awareness",
    category: "Compliance",
    date: "21 Jun 2026",
    score: 92,
    status: "Passed",
    duration: "11m 42s",
  },
  {
    id: "h-2",
    title: "Guest Recovery Basics",
    category: "Service",
    date: "04 May 2026",
    score: 78,
    status: "Passed",
    duration: "16m 08s",
  },
  {
    id: "h-3",
    title: "Food Safety Refresher",
    category: "Safety",
    date: "12 Mar 2026",
    score: 88,
    status: "Passed",
    duration: "13m 15s",
  },
  {
    id: "h-4",
    title: "POS Operations",
    category: "Operations",
    date: "18 Jan 2026",
    score: 68,
    status: "Needs review",
    duration: "19m 37s",
  },
];

const questions: Question[] = [
  {
    id: "q-1",
    prompt:
      "A guest reports that their auditorium seat is damaged. What should you do first?",
    options: [
      "Ask the guest to return after the movie",
      "Apologize, relocate the guest, and report the seat",
      "Offer a refund without checking alternatives",
      "Tell the guest to choose any available seat",
    ],
    correct: 1,
  },
  {
    id: "q-2",
    prompt:
      "Which action best supports a smooth opening shift before guests arrive?",
    options: [
      "Wait for the first guest before checking equipment",
      "Only inspect the lobby",
      "Complete the readiness checklist and escalate exceptions",
      "Skip the checklist if the previous shift was quiet",
    ],
    correct: 2,
  },
  {
    id: "q-3",
    prompt:
      "What is the most appropriate response when a queue begins to grow quickly?",
    options: [
      "Activate the queue support plan and communicate wait times",
      "Close one service point",
      "Ask guests to come back later",
      "Continue working without informing anyone",
    ],
    correct: 0,
  },
  {
    id: "q-4",
    prompt:
      "When handling a cash discrepancy, which sequence is correct?",
    options: [
      "Replace the amount personally and say nothing",
      "Recount, document, and notify the authorized supervisor",
      "Ask another team member to take responsibility",
      "Record it at the end of the month",
    ],
    correct: 1,
  },
  {
    id: "q-5",
    prompt:
      "Which detail is most important when handing over an unresolved operational issue?",
    options: [
      "Only the name of the previous shift",
      "A verbal note with no owner",
      "Issue status, action taken, evidence, and next owner",
      "The time the shift ended",
    ],
    correct: 2,
  },
  {
    id: "q-6",
    prompt:
      "What should happen immediately after identifying a safety hazard in a guest area?",
    options: [
      "Secure the area and follow the reporting procedure",
      "Wait until the next scheduled inspection",
      "Post about it in the team group only",
      "Move it out of sight",
    ],
    correct: 0,
  },
  {
    id: "q-7",
    prompt:
      "Why are standard operating procedures reviewed during evaluations?",
    options: [
      "To make every task take longer",
      "To replace supervisor guidance",
      "To support safe, consistent, and measurable service",
      "To reduce communication between shifts",
    ],
    correct: 2,
  },
  {
    id: "q-8",
    prompt:
      "A system is temporarily unavailable. What is the best operational response?",
    options: [
      "Stop serving all guests without explanation",
      "Use the approved contingency process and log the incident",
      "Use a personal account to continue",
      "Ignore the issue if the queue is short",
    ],
    correct: 1,
  },
];

const leaderboard = [
  { rank: 1, name: "Nadia Pratama", branch: "Grand Indonesia", score: 100, time: "08:41" },
  { rank: 2, name: "Dimas Arya", branch: "Central Park", score: 96, time: "09:18" },
  { rank: 3, name: "Salsa Nabila", branch: "Pacific Place", score: 96, time: "10:04" },
  { rank: 4, name: "Rayhan Ardhana", branch: "Grand Indonesia", score: 92, time: "11:42" },
  { rank: 5, name: "Kevin Wijaya", branch: "FX Sudirman", score: 88, time: "12:19" },
  { rank: 6, name: "Alya Putri", branch: "Central Park", score: 84, time: "13:05" },
];

const participants = [
  { name: "Nadia Pratama", email: "nadia.pratama@cgv.co.id", branch: "Grand Indonesia", attempts: 8, average: 94, status: "Active" },
  { name: "Dimas Arya", email: "dimas.arya@cgv.co.id", branch: "Central Park", attempts: 8, average: 91, status: "Active" },
  { name: "Salsa Nabila", email: "salsa.nabila@cgv.co.id", branch: "Pacific Place", attempts: 7, average: 89, status: "Active" },
  { name: "Rayhan Ardhana", email: "rayhan.ardhana@cgv.co.id", branch: "Grand Indonesia", attempts: 7, average: 86, status: "Active" },
  { name: "Kevin Wijaya", email: "kevin.wijaya@cgv.co.id", branch: "FX Sudirman", attempts: 6, average: 84, status: "Invited" },
];

const publicSheetsEndpoint =
  process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || "";
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

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
    status: statuses[String(course.status || "").toLowerCase()] || "Draft",
    participants: Number(course.participants || 0),
    average: Number(course.average || 0),
    passingScore: Number(course.passingScore || 75),
    color: colors[index % colors.length],
  };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <strong>CGV</strong>
          <small>Exams</small>
        </div>
      )}
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
  onLogin: (role: Role, email: string, password: string) => Promise<string | null>;
}) {
  const [role, setRole] = useState<Role>("participant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    setEmail("");
    setPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    setError("");
    const nextError = await onLogin(role, email, password);
    if (nextError) setError(nextError);
    setSubmitting(false);
  }

  return (
    <main className="login-page">
      <div className="login-aurora aurora-one" />
      <div className="login-aurora aurora-two" />

      <section className="login-layout">
        <div className="login-card-wrap">
          <div className="stack-card stack-card-two" />
          <div className="stack-card stack-card-one" />
          <form className="login-card" onSubmit={submit}>
            <div className="login-card-heading">
              <span className="card-kicker">WELCOME BACK</span>
              <h2>Sign in to continue</h2>
              <p>Choose your workspace and enter your account details.</p>
            </div>

            <div className="role-switch" role="tablist" aria-label="Account type">
              <button
                type="button"
                className={role === "participant" ? "active" : ""}
                onClick={() => switchRole("participant")}
                role="tab"
                aria-selected={role === "participant"}
              >
                <UserRound size={17} /> Participant
              </button>
              <button
                type="button"
                className={role === "admin" ? "active" : ""}
                onClick={() => switchRole("admin")}
                role="tab"
                aria-selected={role === "admin"}
              >
                <Gauge size={17} /> Admin
              </button>
            </div>

            <label className="field-label">
              Email address
              <span className="input-shell">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
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
                <input type="checkbox" defaultChecked />
                <span><Check size={12} /></span>
                Keep me signed in
              </label>
              <button type="button" className="text-button">Forgot password?</button>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="primary-button login-button" type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Enter workspace"} {!submitting && <ArrowRight size={19} />}
            </button>

          </form>
        </div>
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
}: {
  role: Role;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
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
              {item.id === "evaluations" && <small>2</small>}
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
}: {
  role: Role;
  title: string;
  subtitle: string;
}) {
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
          <Initials name={role === "admin" ? "Alicia Tan" : "Rayhan Ardhana"} size="sm" />
          <div>
            <strong>{role === "admin" ? "Alicia Tan" : "Rayhan Ardhana"}</strong>
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

function ParticipantHome({
  onStart,
  setView,
  history,
}: {
  onStart: (evaluation: Evaluation) => void;
  setView: (view: ParticipantView) => void;
  history: HistoryItem[];
}) {
  const average = Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
  return (
    <div className="content participant-home">
      <section className="welcome-row">
        <div>
          <span className="eyebrow dark-eyebrow">
            <Sparkles size={15} /> FRIDAY, 24 JULY
          </span>
          <h2>Good morning, Rayhan.</h2>
          <p>You have two evaluations ready. Keep the momentum going.</p>
        </div>
        <button className="secondary-button" onClick={() => setView("history")}>
          View score history <ArrowRight size={17} />
        </button>
      </section>

      <section className="hero-evaluation">
        <div className="hero-noise" />
        <div className="hero-copy">
          <span className="live-pill"><span /> LIVE EVALUATION</span>
          <p className="hero-overline">FEATURED COURSE</p>
          <h3>Operational<br />Excellence 2026</h3>
          <p className="hero-description">
            Review daily readiness, service standards, and essential operating
            procedures.
          </p>
          <div className="hero-meta">
            <span><FileText size={16} /> 8 questions</span>
            <span><Clock3 size={16} /> 20 minutes</span>
            <span><CalendarDays size={16} /> Due 30 Jul</span>
          </div>
          <button className="hero-button" onClick={() => onStart(evaluationsSeed[0])}>
            Start evaluation <span><ArrowRight size={19} /></span>
          </button>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <div className="orbit-centre"><GraduationCap size={44} /></div>
          <span className="orbit-dot dot-one" />
          <span className="orbit-dot dot-two" />
          <span className="orbit-dot dot-three" />
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon green"><Gauge size={20} /></span>
          <div>
            <p>Average score</p>
            <strong>{average}<small>%</small></strong>
            <span className="positive">↑ 4% from last quarter</span>
          </div>
          <div className="sparkline green-line">
            {[25, 42, 35, 56, 49, 68, 64, 84].map((height, index) => <i key={index} style={{ height }} />)}
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon orange"><Medal size={20} /></span>
          <div>
            <p>Evaluations passed</p>
            <strong>7<small>/8</small></strong>
            <span>One course needs review</span>
          </div>
          <div className="mini-donut"><span>88%</span></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue"><Trophy size={20} /></span>
          <div>
            <p>Best score</p>
            <strong>96<small>%</small></strong>
            <span>Top 12% of participants</span>
          </div>
          <span className="rank-chip">#14</span>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h3>Ready for you</h3>
            <p>Complete these evaluations before their due dates.</p>
          </div>
          <button className="text-link" onClick={() => setView("evaluations")}>
            See all <ArrowRight size={16} />
          </button>
        </div>
        <div className="evaluation-list">
          {evaluationsSeed.slice(0, 2).map((evaluation, index) => (
            <article className="evaluation-row" key={evaluation.id}>
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
                <span>Due date</span>
                <strong>{evaluation.due}</strong>
              </div>
              <button className="row-button" onClick={() => onStart(evaluation)}>
                Start <ArrowRight size={17} />
              </button>
            </article>
          ))}
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
          <article className={`course-card accent-${item.color}`} key={item.id}>
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
                <span>Due date</span>
                <strong>{item.due}</strong>
              </div>
              <button
                className={item.status === "Upcoming" ? "secondary-button" : "primary-button small"}
                disabled={item.status === "Upcoming"}
                onClick={() => item.status !== "Upcoming" && onStart(item)}
              >
                {item.status === "Completed" ? "Retake" : item.status === "Upcoming" ? "Not open yet" : "Start"}
                {item.status !== "Upcoming" && <ArrowRight size={16} />}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function HistoryView({ history }: { history: HistoryItem[] }) {
  const average = Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
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
            <h3>Strong performance</h3>
            <p>You are 6 points above the company average.</p>
          </div>
        </div>
        <div className="history-stat"><span>Completed</span><strong>{history.length}</strong><small>evaluations</small></div>
        <div className="history-stat"><span>Passed</span><strong>{history.filter((item) => item.status === "Passed").length}</strong><small>{Math.round(history.filter((item) => item.status === "Passed").length / history.length * 100)}% pass rate</small></div>
        <div className="history-stat"><span>Best score</span><strong>{Math.max(...history.map((item) => item.score))}%</strong><small>personal best</small></div>
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
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProfileView() {
  return (
    <div className="content">
      <section className="profile-hero">
        <div className="profile-aurora" />
        <Initials name="Rayhan Ardhana" size="lg" />
        <div className="profile-copy">
          <span>PARTICIPANT PROFILE</span>
          <h2>Rayhan Ardhana</h2>
          <p>rayhan.ardhana@cgv.co.id · Grand Indonesia</p>
        </div>
        <button className="profile-edit"><Pencil size={17} /> Edit profile</button>
        <div className="profile-stats">
          <div><strong>86%</strong><span>Average</span></div>
          <div><strong>7</strong><span>Passed</span></div>
          <div><strong>#14</strong><span>Current rank</span></div>
        </div>
      </section>
      <div className="profile-grid">
        <section className="settings-card">
          <div className="section-heading"><div><h3>Personal information</h3><p>Your account details and assignment information.</p></div></div>
          <div className="detail-grid">
            <label>Full name<strong>Rayhan Ardhana</strong></label>
            <label>Email address<strong>rayhan.ardhana@cgv.co.id</strong></label>
            <label>Location / branch<strong>Grand Indonesia</strong></label>
            <label>Participant ID<strong>CGV-P-0042</strong></label>
            <label>Role<strong>Business Support</strong></label>
            <label>Account status<strong className="active-text"><span /> Active</strong></label>
          </div>
        </section>
        <section className="settings-card">
          <div className="section-heading"><div><h3>Account security</h3><p>Manage your password and active access.</p></div></div>
          <button className="settings-row"><span className="metric-icon violet"><LockKeyhole size={19} /></span><div><strong>Change password</strong><small>Last changed 52 days ago</small></div><ChevronRight size={18} /></button>
          <button className="settings-row"><span className="metric-icon blue"><ShieldCheck size={19} /></span><div><strong>Active sessions</strong><small>1 signed-in device</small></div><ChevronRight size={18} /></button>
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
  const progress = Math.round(((index + 1) / questionsData.length) * 100);

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
          <span className="timer"><Clock3 size={18} /><strong>18:42</strong></span>
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
                  <span className="answer-radio">{answers[index] === optionIndex && <Check size={15} />}</span>
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
                  Next <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  disabled={answered !== questionsData.length}
                  onClick={() => setShowSubmit(true)}
                >
                  Finish <Check size={18} />
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
          <div><span>Correct</span><strong>{Math.round(score / 100 * evaluation.questionCount)}/{evaluation.questionCount}</strong></div>
          <div><span>Time used</span><strong>11:18</strong></div>
          <div><span>Standing</span><strong>Top 18%</strong></div>
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
}: {
  setView: (view: AdminView) => void;
  onCreate: () => void;
  leaderboardData: LeaderboardRow[];
}) {
  return (
    <div className="content admin-overview">
      <section className="welcome-row">
        <div>
          <span className="eyebrow dark-eyebrow"><Sparkles size={15} /> ADMIN WORKSPACE</span>
          <h2>Here&apos;s today&apos;s learning pulse.</h2>
          <p>Monitor participation, publish evaluations, and keep every score organized.</p>
        </div>
        <button className="primary-button" onClick={onCreate}><Plus size={18} /> New quiz course</button>
      </section>
      <section className="admin-metrics">
        <article><span className="metric-icon green"><Users size={20} /></span><div><p>Active participants</p><strong>128</strong><small className="positive">↑ 12 this month</small></div></article>
        <article><span className="metric-icon orange"><BookOpen size={20} /></span><div><p>Live evaluations</p><strong>4</strong><small>2 close this week</small></div></article>
        <article><span className="metric-icon blue"><BarChart3 size={20} /></span><div><p>Average score</p><strong>84<em>%</em></strong><small className="positive">↑ 3.2% this quarter</small></div></article>
        <article><span className="metric-icon violet"><Check size={20} /></span><div><p>Completion rate</p><strong>92<em>%</em></strong><small>Across active courses</small></div></article>
      </section>
      <div className="admin-dashboard-grid">
        <section className="analytics-card">
          <div className="section-heading">
            <div><h3>Evaluation performance</h3><p>Average score and completion over the last six months.</p></div>
            <button className="select-button">Last 6 months <ChevronRight size={15} /></button>
          </div>
          <div className="chart-legend"><span><i className="green-dot" /> Average score</span><span><i className="gray-dot" /> Completion</span></div>
          <div className="line-chart">
            <div className="chart-grid"><i /><i /><i /><i /><i /></div>
            <svg viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="Performance trend chart">
              <path className="chart-area" d="M0 188 C78 176 94 139 164 151 S256 112 330 126 S424 72 495 91 S594 66 700 42 L700 230 L0 230 Z" />
              <path className="chart-line primary" d="M0 188 C78 176 94 139 164 151 S256 112 330 126 S424 72 495 91 S594 66 700 42" />
              <path className="chart-line secondary" d="M0 209 C78 198 102 180 164 186 S262 169 330 175 S424 135 495 150 S604 118 700 126" />
              {[0, 164, 330, 495, 700].map((x, index) => <circle key={x} cx={x} cy={[188,151,126,91,42][index]} r="5" />)}
            </svg>
            <div className="chart-labels"><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
          </div>
        </section>
        <section className="completion-card">
          <div className="section-heading"><div><h3>Completion today</h3><p>Operational Excellence 2026</p></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>
          <div className="big-donut"><div><strong>84</strong><span>of 128</span></div></div>
          <div className="completion-legend">
            <div><span><i className="green-dot" /> Completed</span><strong>84</strong></div>
            <div><span><i className="orange-dot" /> In progress</span><strong>18</strong></div>
            <div><span><i className="gray-dot" /> Not started</span><strong>26</strong></div>
          </div>
          <button className="secondary-button full" onClick={() => setView("scoreboard")}>View live scoreboard <ArrowRight size={17} /></button>
        </section>
      </div>
      <section className="table-card leaderboard-card">
        <div className="table-card-header">
          <div><h3>Top performers</h3><p>Operational Excellence 2026 · live ranking</p></div>
          <button className="text-link" onClick={() => setView("scoreboard")}>Full scoreboard <ArrowRight size={16} /></button>
        </div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Rank</th><th>Participant</th><th>Branch</th><th>Score</th><th>Time</th><th /></tr></thead>
            <tbody>{leaderboardData.slice(0, 5).map((item) => (
              <tr key={item.rank}>
                <td><span className={`rank-badge rank-${item.rank}`}>{item.rank <= 3 ? <Medal size={16} /> : `#${item.rank}`}</span></td>
                <td><div className="participant-cell"><Initials name={item.name} size="sm" /><strong>{item.name}</strong></div></td>
                <td>{item.branch}</td>
                <td><strong className="table-score">{item.score}%</strong></td>
                <td>{item.time}</td>
                <td><button className="icon-button"><ChevronRight size={17} /></button></td>
              </tr>
            ))}</tbody>
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
      <section className="page-intro">
        <div><span className="eyebrow dark-eyebrow"><Layers3 size={15} /> CONTENT MANAGEMENT</span><h2>Quiz courses</h2><p>Create, schedule, and manage every evaluation in one place.</p></div>
        <button className="primary-button" onClick={onCreate}><Plus size={18} /> New quiz course</button>
      </section>
      <div className="toolbar">
        <div className="admin-search"><Search size={17} /><input placeholder="Search courses…" /></div>
        <div className="toolbar-buttons"><button className="secondary-button"><Filter size={16} /> Status</button><button className="secondary-button"><CalendarDays size={16} /> Schedule</button></div>
      </div>
      <section className="table-card">
        <div className="responsive-table">
          <table>
            <thead><tr><th>Course</th><th>Status</th><th>Schedule</th><th>Participants</th><th>Average</th><th>Actions</th></tr></thead>
            <tbody>{evaluations.map((course, index) => (
              <tr key={course.id}>
                <td><div className="table-title-cell"><EvaluationIcon color={course.color} icon={index === 1 ? "shield" : "book"} /><div><strong>{course.title}</strong><span>{course.category} · {course.questionCount} questions</span></div></div></td>
                <td><span className={`status-pill status-${course.status.toLowerCase()}`}>{course.status}</span></td>
                <td><div className="date-cell"><strong>{course.due}</strong><span>{course.duration} minute limit</span></div></td>
                <td><strong>{course.participants || "—"}</strong></td>
                <td><strong>{course.average ? `${course.average}%` : "—"}</strong></td>
                <td><div className="inline-actions"><button aria-label="Preview"><Eye size={17} /></button><button aria-label="Duplicate"><Copy size={17} /></button><button aria-label="Edit"><Pencil size={17} /></button><button aria-label="More"><MoreHorizontal size={17} /></button></div></td>
              </tr>
            ))}</tbody>
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
  onAdd: (participant: { name: string; email: string; branch: string }) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submitParticipant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const nextError = await onAdd({ name, email, branch });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setAdding(false);
    setName("");
    setEmail("");
    setBranch("");
  }

  return (
    <div className="content">
      <section className="page-intro">
        <div><span className="eyebrow dark-eyebrow"><Users size={15} /> PEOPLE</span><h2>Participants</h2><p>Manage accounts, locations, and evaluation access.</p></div>
        <button className="primary-button" onClick={() => setAdding(true)}><UserPlus size={18} /> Add participant</button>
      </section>
      <section className="admin-metrics compact">
        <article><span className="metric-icon green"><Users size={20} /></span><div><p>Total accounts</p><strong>128</strong><small>Across 8 locations</small></div></article>
        <article><span className="metric-icon blue"><Check size={20} /></span><div><p>Active this month</p><strong>116</strong><small className="positive">90.6% active rate</small></div></article>
        <article><span className="metric-icon orange"><Mail size={20} /></span><div><p>Pending invites</p><strong>12</strong><small>Resend from the table</small></div></article>
      </section>
      <div className="toolbar"><div className="admin-search"><Search size={17} /><input placeholder="Search name, email, or branch…" /></div><div className="toolbar-buttons"><button className="secondary-button"><Filter size={16} /> Branch</button><button className="secondary-button"><Download size={16} /> Export</button></div></div>
      <section className="table-card">
        <div className="responsive-table">
          <table>
            <thead><tr><th>Participant</th><th>Branch</th><th>Attempts</th><th>Average</th><th>Status</th><th /></tr></thead>
            <tbody>{participantsData.map((person) => (
              <tr key={person.email}>
                <td><div className="participant-cell"><Initials name={person.name} size="sm" /><div><strong>{person.name}</strong><span>{person.email}</span></div></div></td>
                <td>{person.branch}</td><td>{person.attempts}</td><td><strong className="table-score">{person.average}%</strong></td>
                <td><span className={`outcome-pill ${person.status === "Active" ? "pass" : "neutral"}`}>{person.status}</span></td>
                <td><button className="icon-button"><MoreHorizontal size={18} /></button></td>
              </tr>
            ))}</tbody>
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
            <label className="field-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@cgv.co.id" required /></label>
            <label className="field-label">Branch / location<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="e.g. Grand Indonesia" required /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setAdding(false)}>Cancel</button>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"} {!saving && <ArrowRight size={17} />}</button>
            </div>
            <small className="temporary-password-note">New accounts receive the temporary password <strong>Welcome123!</strong></small>
          </form>
        </div>
      )}
    </div>
  );
}

function ScoreboardView({
  leaderboardData,
  connected,
}: {
  leaderboardData: LeaderboardRow[];
  connected: boolean;
}) {
  const [evaluation, setEvaluation] = useState("Operational Excellence 2026");
  return (
    <div className="content">
      <section className="page-intro">
        <div><span className="eyebrow dark-eyebrow"><Trophy size={15} /> LIVE RESULTS</span><h2>Evaluation scoreboard</h2><p>Compare results for every participant in the selected evaluation.</p></div>
        <button className="secondary-button"><Download size={17} /> Export scoreboard</button>
      </section>
      <section className="scoreboard-hero">
        <div>
          <span className="card-kicker">SELECT EVALUATION</span>
          <select value={evaluation} onChange={(event) => setEvaluation(event.target.value)}>
            {evaluationsSeed.map((item) => <option key={item.id}>{item.title}</option>)}
          </select>
          <p>{connected ? "Last synced with Google Sheets · just now" : "Interactive demo data · connect Google Sheets to sync live results"}</p>
        </div>
        <div className="scoreboard-kpis">
          <div><span>Participants</span><strong>84<small>/128</small></strong></div>
          <div><span>Average</span><strong>82<small>%</small></strong></div>
          <div><span>Pass rate</span><strong>89<small>%</small></strong></div>
          <div><span>Top score</span><strong>100<small>%</small></strong></div>
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
            <tbody>{leaderboardData.map((item) => (
              <tr key={item.rank}><td><span className={`rank-badge rank-${item.rank}`}>{item.rank <= 3 ? <Medal size={16} /> : `#${item.rank}`}</span></td><td><div className="participant-cell"><Initials name={item.name} size="sm" /><strong>{item.name}</strong></div></td><td>{item.branch}</td><td><strong className="table-score">{item.score}%</strong></td><td>{Math.round(item.score / 10)}/10</td><td>{item.time}</td><td>24 Jul 2026</td></tr>
            ))}</tbody>
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
    onSave({
      id: `course-${Date.now()}`,
      title: title || "Untitled evaluation",
      description: description || "New evaluation course.",
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
        <div className="builder-actions"><span>Draft saved</span><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={saveCourse}><Save size={17} /> Save course</button></div>
      </header>
      <div className="builder-progress">
        {[["Course details", 1], ["Questions", 2], ["Schedule & access", 3]].map(([label, number]) => (
          <button className={step === number ? "active" : step > number ? "done" : ""} key={number} onClick={() => setStep(number as number)}>
            <span>{step > number ? <Check size={14} /> : number}</span>{label}
          </button>
        ))}
      </div>
      <main className="builder-content">
        {step === 1 && (
          <section className="builder-card">
            <div className="builder-card-heading"><span className="card-kicker">STEP 01</span><h1>Course details</h1><p>Give the evaluation a clear title and set its scoring rules.</p></div>
            <div className="builder-form-grid">
              <label className="field-label full">Course title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Operational Excellence 2026" /></label>
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
              <label className="field-label">Opens on<input type="date" defaultValue="2026-07-25" /></label>
              <label className="field-label">Closes on<input type="date" defaultValue="2026-08-08" /></label>
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
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(questions);
  const [result, setResult] = useState<{ evaluation: Evaluation; score: number } | null>(null);
  const [history, setHistory] = useState(historySeed);
  const [evaluations, setEvaluations] = useState(evaluationsSeed);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>(leaderboard);
  const [participantsData, setParticipantsData] = useState<ParticipantRow[]>(participants);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [backendMode, setBackendMode] = useState<"demo" | "sheets">("demo");

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
    const timer = window.setTimeout(() => setBooting(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  async function login(nextRole: Role, email: string, password: string): Promise<string | null> {
    try {
      const response = await sheetsFetch({ action: "login", email, password });
      const loginData = (await response.json()) as {
        ok?: boolean;
        demo?: boolean;
        error?: string;
        token?: string;
        user?: { role?: string };
      };

      if (response.status === 503 && loginData.demo) {
        setBackendMode("demo");
        setRole(nextRole);
        setView(nextRole === "admin" ? "overview" : "home");
        return null;
      }
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
        const liveLeaderboard = dashboardData.scoreboard.map((item, index) => ({
          rank: Number(item.rank || index + 1),
          name: String(item.name || "Participant"),
          branch: String(item.branch || ""),
          score: Number(item.score || 0),
          time: formatDuration(Number(item.durationSeconds || 0)).replace("m ", ":").replace("s", ""),
        }));
        setLeaderboardData(liveLeaderboard);
        setParticipantsData(dashboardData.participants.map((item) => {
          const scores = liveLeaderboard.filter((row) => row.name === String(item.fullName || ""));
          return {
            name: String(item.fullName || "Participant"),
            email: String(item.email || ""),
            branch: String(item.branch || ""),
            attempts: scores.length,
            average: scores.length
              ? Math.round(scores.reduce((sum, row) => sum + row.score, 0) / scores.length)
              : 0,
            status: String(item.status || "active") === "active" ? "Active" : "Inactive",
          };
        }));
      }

      setSessionToken(loginData.token);
      setBackendMode("sheets");
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
    setBackendMode("demo");
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
    setQuizQuestions(questions);
    setActiveAttemptId(null);
    setActiveQuiz({ ...evaluation, questionCount: questions.length });
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
    }
    const completedEvaluation = activeQuiz;
    const newResult = { evaluation: completedEvaluation, score: finalScore };
    setResult(newResult);
    setHistory((items) => [{
      id: `history-${Date.now()}`,
      title: completedEvaluation.title,
      category: completedEvaluation.category,
      date: "24 Jul 2026",
      score: finalScore,
      status: finalScore >= completedEvaluation.passingScore ? "Passed" : "Needs review",
      duration: "11m 18s",
    }, ...items]);
    setActiveQuiz(null);
    setActiveAttemptId(null);
  }

  async function saveCourse(evaluation: Evaluation, draftQuestions: DraftQuestion[]) {
    let savedEvaluation = evaluation;
    if (backendMode === "sheets" && sessionToken) {
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
    }
    setEvaluations((items) => [savedEvaluation, ...items]);
    setBuilderOpen(false);
    setView("courses");
  }

  async function addParticipant(input: { name: string; email: string; branch: string }): Promise<string | null> {
    try {
      if (backendMode === "sheets" && sessionToken) {
        const data = await sheetsRequest<{
          ok: boolean;
          user: Record<string, unknown>;
        }>("adminSaveParticipant", {
          token: sessionToken,
          participant: {
            fullName: input.name,
            email: input.email,
            branch: input.branch,
            password: "Welcome123!",
            status: "active",
          },
        });
        setParticipantsData((items) => [{
          name: String(data.user.fullName || input.name),
          email: String(data.user.email || input.email),
          branch: String(data.user.branch || input.branch),
          attempts: 0,
          average: 0,
          status: "Active",
        }, ...items]);
      } else {
        setParticipantsData((items) => [{
          name: input.name,
          email: input.email,
          branch: input.branch,
          attempts: 0,
          average: 0,
          status: "Active",
        }, ...items]);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to create this participant.";
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
      <Sidebar role={role} view={view} setView={setView} onLogout={logout} />
      <div className="main-shell">
        <Topbar role={role} title={title} subtitle={subtitle} />
        {role === "participant" && view === "home" && <ParticipantHome onStart={startQuiz} setView={setView} history={history} />}
        {role === "participant" && view === "evaluations" && <EvaluationsView evaluations={evaluations} onStart={startQuiz} />}
        {role === "participant" && view === "history" && <HistoryView history={history} />}
        {role === "participant" && view === "profile" && <ProfileView />}
        {role === "admin" && view === "overview" && <AdminOverview setView={setView} onCreate={() => setBuilderOpen(true)} leaderboardData={leaderboardData} />}
        {role === "admin" && view === "courses" && <CoursesView evaluations={evaluations} onCreate={() => setBuilderOpen(true)} />}
        {role === "admin" && view === "participants" && <ParticipantsView participantsData={participantsData} onAdd={addParticipant} />}
        {role === "admin" && view === "scoreboard" && <ScoreboardView leaderboardData={leaderboardData} connected={backendMode === "sheets"} />}
      </div>
      <MobileNav role={role} view={view} setView={setView} />
    </div>
  );
}
