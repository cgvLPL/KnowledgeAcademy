"use client";

import { useEffect, useMemo, useState } from "react";

type ParticipantStatus = "active" | "idle" | "disconnected" | "completed";

type ParticipantActivity = {
  id: string;
  name: string;
  position: string;
  currentQuestion: number;
  totalQuestions: number;
  status: ParticipantStatus;
  lastActivityAt: string;
};

const demoParticipants: ParticipantActivity[] = [
  {
    id: "1",
    name: "Participant One",
    position: "Star",
    currentQuestion: 12,
    totalQuestions: 30,
    status: "active",
    lastActivityAt: new Date().toISOString(),
  },
];

export default function LiveQuizMonitor() {
  const [participants, setParticipants] = useState(demoParticipants);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/live-quiz/status", { cache: "no-store" });
        if (response.ok) setParticipants(await response.json());
      } catch {
        // Keep current state when monitoring endpoint is unavailable.
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activeCount = useMemo(
    () => participants.filter((participant) => participant.status === "active").length,
    [participants]
  );

  return (
    <section aria-live="polite">
      <header>
        <h2>Live Quiz Monitor</h2>
        <p>{activeCount} participant(s) currently active</p>
      </header>

      <table>
        <thead>
          <tr>
            <th>Participant</th>
            <th>Position</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td>{participant.name}</td>
              <td>{participant.position}</td>
              <td>{participant.status}</td>
              <td>
                {participant.currentQuestion}/{participant.totalQuestions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
