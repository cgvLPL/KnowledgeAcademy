"use client";

import { useMemo, useState } from "react";

export type ParticipantStatus = "active" | "idle" | "disconnected" | "completed";

export type ParticipantActivity = {
  id: string;
  attemptId: string;
  courseId: string;
  courseTitle: string;
  name: string;
  branch: string;
  position: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  status: ParticipantStatus;
  startedAt: string;
  lastActivityAt: string;
};

type Props = {
  participants: ParticipantActivity[];
  loading?: boolean;
  error?: string;
  lastUpdatedAt?: string;
  onRefresh?: () => void;
};

type SortMode = "activity" | "progress" | "participant" | "status" | "duration";
type StatusFilter = "all" | ParticipantStatus;

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  active: "Active",
  idle: "Idle",
  disconnected: "Disconnected",
  completed: "Completed",
};

const STATUS_PRIORITY: Record<ParticipantStatus, number> = {
  active: 0,
  idle: 1,
  disconnected: 2,
  completed: 3,
};

function relativeActivity(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function exactTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Unknown time";
  return timestamp.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sessionDuration(startedAt: string) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function progressRatio(item: ParticipantActivity) {
  const total = Math.max(0, Number(item.totalQuestions || 0));
  const current = Math.min(total || Number(item.currentQuestion || 0), Math.max(0, Number(item.currentQuestion || 0)));
  return total ? current / total : 0;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function LiveQuizMonitor({ participants, loading, error, lastUpdatedAt, onRefresh }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("activity");

  const counts = useMemo(() => ({
    active: participants.filter((item) => item.status === "active").length,
    idle: participants.filter((item) => item.status === "idle").length,
    disconnected: participants.filter((item) => item.status === "disconnected").length,
    completed: participants.filter((item) => item.status === "completed").length,
  }), [participants]);

  const courseOptions = useMemo(() => {
    const byId = new Map<string, string>();
    participants.forEach((item) => {
      if (item.courseId) byId.set(item.courseId, item.courseTitle || "Evaluation");
    });
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [participants]);
  const branchOptions = useMemo(() => uniqueValues(participants.map((item) => item.branch)), [participants]);
  const positionOptions = useMemo(() => uniqueValues(participants.map((item) => item.position)), [participants]);

  const visibleParticipants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return participants
      .filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (courseFilter !== "all" && item.courseId !== courseFilter) return false;
        if (branchFilter !== "all" && item.branch !== branchFilter) return false;
        if (positionFilter !== "all" && item.position !== positionFilter) return false;
        if (!normalizedQuery) return true;
        return [item.name, item.branch, item.position, item.courseTitle]
          .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      })
      .sort((first, second) => {
        if (sortMode === "participant") return first.name.localeCompare(second.name);
        if (sortMode === "progress") return progressRatio(second) - progressRatio(first);
        if (sortMode === "status") return STATUS_PRIORITY[first.status] - STATUS_PRIORITY[second.status];
        if (sortMode === "duration") {
          return new Date(first.startedAt || 0).getTime() - new Date(second.startedAt || 0).getTime();
        }
        return new Date(second.lastActivityAt || 0).getTime() - new Date(first.lastActivityAt || 0).getTime();
      });
  }, [branchFilter, courseFilter, participants, positionFilter, query, sortMode, statusFilter]);

  const hasFilters = Boolean(query) || statusFilter !== "all" || courseFilter !== "all" || branchFilter !== "all" || positionFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setCourseFilter("all");
    setBranchFilter("all");
    setPositionFilter("all");
    setSortMode("activity");
  };

  return (
    <section className="live-quiz-monitor" aria-live="polite">
      <header className="live-quiz-monitor__header">
        <div>
          <span className="card-kicker">LIVE ACTIVITY</span>
          <h3>Quiz monitor</h3>
          <p>Track active quiz sessions without exposing answers or correct-answer data.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="live-quiz-monitor__summary" aria-label="Live quiz status summary">
        {(Object.keys(STATUS_LABELS) as ParticipantStatus[]).map((status) => (
          <button
            type="button"
            key={status}
            className={statusFilter === status ? "is-selected" : ""}
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter((current) => current === status ? "all" : status)}
          >
            <strong>{counts[status]}</strong><span>{STATUS_LABELS[status]}</span>
          </button>
        ))}
      </div>

      <div className="live-quiz-monitor__filters" aria-label="Live quiz filters">
        <label className="live-filter-search">
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Participant, branch, position…" />
        </label>
        <label>
          <span>Evaluation</span>
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
            <option value="all">All evaluations</option>
            {courseOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        </label>
        <label>
          <span>Branch</span>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="all">All branches</option>
            {branchOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Position</span>
          <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)}>
            <option value="all">All positions</option>
            {positionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="activity">Latest activity</option>
            <option value="progress">Most progress</option>
            <option value="duration">Longest session</option>
            <option value="participant">Participant name</option>
            <option value="status">Status</option>
          </select>
        </label>
        <button type="button" className="live-filter-reset" onClick={clearFilters} disabled={!hasFilters && sortMode === "activity"}>Reset</button>
      </div>

      {error ? <p className="live-quiz-monitor__error">{error}</p> : null}

      <div className="responsive-table live-quiz-monitor__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Evaluation</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Session</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {visibleParticipants.map((participant) => {
              const total = Math.max(0, participant.totalQuestions);
              const current = Math.min(total || participant.currentQuestion, Math.max(0, participant.currentQuestion));
              const answered = Math.min(total || participant.answeredCount, Math.max(0, participant.answeredCount));
              const percent = total ? Math.round((current / total) * 100) : 0;
              return (
                <tr key={participant.attemptId || participant.id}>
                  <td>
                    <strong>{participant.name}</strong>
                    <small>{[participant.position, participant.branch].filter(Boolean).join(" · ") || "—"}</small>
                  </td>
                  <td>{participant.courseTitle || "Evaluation"}</td>
                  <td><span className={`live-status live-status--${participant.status}`}>{STATUS_LABELS[participant.status]}</span></td>
                  <td>
                    <div className="live-progress">
                      <span><b>Q{current}</b>/{total || "—"} · {answered} answered</span>
                      <div className="live-progress__track" aria-label={`${percent}% through quiz`}><span style={{ width: `${percent}%` }} /></div>
                    </div>
                  </td>
                  <td title={participant.startedAt ? `Started ${exactTimestamp(participant.startedAt)}` : undefined}>{sessionDuration(participant.startedAt)}</td>
                  <td title={exactTimestamp(participant.lastActivityAt)}>{relativeActivity(participant.lastActivityAt)}</td>
                </tr>
              );
            })}
            {!visibleParticipants.length && !loading ? (
              <tr><td colSpan={6} className="live-quiz-monitor__empty">
                {participants.length ? "No activity matches the current filters." : "No quiz activity yet. Active attempts will appear here automatically."}
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <footer>
        <span>{visibleParticipants.length} of {participants.length} sessions shown</span>
        <span>{lastUpdatedAt ? `Live · refreshed ${relativeActivity(lastUpdatedAt)}` : "Waiting for live activity"}</span>
      </footer>
    </section>
  );
}
