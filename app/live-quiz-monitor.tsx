"use client";

import { useMemo } from "react";

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
  lastActivityAt: string;
};

type Props = {
  participants: ParticipantActivity[];
  loading?: boolean;
  error?: string;
  lastUpdatedAt?: string;
  onRefresh?: () => void;
};

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  active: "Active",
  idle: "Idle",
  disconnected: "Disconnected",
  completed: "Completed",
};

function relativeActivity(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function LiveQuizMonitor({ participants, loading, error, lastUpdatedAt, onRefresh }: Props) {
  const counts = useMemo(() => ({
    active: participants.filter((item) => item.status === "active").length,
    idle: participants.filter((item) => item.status === "idle").length,
    disconnected: participants.filter((item) => item.status === "disconnected").length,
    completed: participants.filter((item) => item.status === "completed").length,
  }), [participants]);

  return (
    <section className="live-quiz-monitor" aria-live="polite">
      <header className="live-quiz-monitor__header">
        <div>
          <span className="card-kicker">LIVE ACTIVITY</span>
          <h3>Quiz monitor</h3>
          <p>See who is currently taking an evaluation and how far they have progressed.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="live-quiz-monitor__summary" aria-label="Live quiz status summary">
        <div><strong>{counts.active}</strong><span>Active</span></div>
        <div><strong>{counts.idle}</strong><span>Idle</span></div>
        <div><strong>{counts.disconnected}</strong><span>Disconnected</span></div>
        <div><strong>{counts.completed}</strong><span>Completed</span></div>
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
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => {
              const total = Math.max(0, participant.totalQuestions);
              const current = Math.min(total || participant.currentQuestion, Math.max(0, participant.currentQuestion));
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
                      <span><b>{current}</b>/{total || "—"}</span>
                      <div className="live-progress__track" aria-label={`${percent}% complete`}><span style={{ width: `${percent}%` }} /></div>
                    </div>
                  </td>
                  <td>{relativeActivity(participant.lastActivityAt)}</td>
                </tr>
              );
            })}
            {!participants.length && !loading ? (
              <tr><td colSpan={5} className="live-quiz-monitor__empty">No quiz activity yet. Active attempts will appear here automatically.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <footer>
        {lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for live activity"}
      </footer>
    </section>
  );
}
