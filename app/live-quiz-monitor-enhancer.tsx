"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LiveQuizMonitor, { type ParticipantActivity } from "./live-quiz-monitor";

const TOKEN_KEY = "cgv-exams-session-token";
const ROLE_KEY = "cgv-exams-session-role";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";
const ACTIVE_ATTEMPT_KEY = "cgv-exams-live-attempt";
const HEARTBEAT_MS = 15000;
const ADMIN_REFRESH_MS = 10000;

type AttemptState = {
  attemptId: string;
  courseId: string;
  totalQuestions: number;
};

type RequestPayload = {
  action?: string;
  token?: string;
  courseId?: string;
  attemptId?: string;
  [key: string]: unknown;
};

function parsePayload(init?: RequestInit): RequestPayload | null {
  if (typeof init?.body !== "string") return null;
  try {
    return JSON.parse(init.body) as RequestPayload;
  } catch {
    return null;
  }
}

function loadAttempt(): AttemptState | null {
  try {
    const value = sessionStorage.getItem(ACTIVE_ATTEMPT_KEY);
    return value ? JSON.parse(value) as AttemptState : null;
  } catch {
    return null;
  }
}

function saveAttempt(value: AttemptState | null) {
  if (value) sessionStorage.setItem(ACTIVE_ATTEMPT_KEY, JSON.stringify(value));
  else sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
}

function quizProgress(attempt: AttemptState) {
  const raw = document.querySelector<HTMLElement>(".progress-number strong")?.textContent || "0";
  const percent = Math.min(100, Math.max(0, Number.parseInt(raw, 10) || 0));
  const currentQuestion = attempt.totalQuestions
    ? Math.min(attempt.totalQuestions, Math.max(1, Math.round((percent / 100) * attempt.totalQuestions)))
    : 0;
  const selected = document.querySelectorAll(".quiz-layout input:checked, .quiz-layout [aria-pressed='true']").length;
  return { currentQuestion, answeredCount: Math.max(0, selected) };
}

async function postAction(endpoint: string, payload: Record<string, unknown>, fetcher: typeof fetch = window.fetch.bind(window)) {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "content-type": endpoint.includes("script.google.com") ? "text/plain;charset=utf-8" : "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json() as { ok?: boolean; error?: string; activity?: ParticipantActivity[]; now?: string };
  if (!response.ok || data.ok === false) throw new Error(data.error || "Live quiz request failed.");
  return data;
}

export default function LiveQuizMonitorEnhancer() {
  const [mountNode, setMountNode] = useState<Element | null>(null);
  const [participants, setParticipants] = useState<ParticipantActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const refreshingRef = useRef(false);

  const refreshAdmin = useCallback(async () => {
    if (refreshingRef.current || sessionStorage.getItem(ROLE_KEY) !== "admin") return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    const endpoint = sessionStorage.getItem(ENDPOINT_KEY);
    if (!token || !endpoint) return;
    refreshingRef.current = true;
    setLoading(true);
    try {
      const data = await postAction(endpoint, { action: "adminGetLiveQuizActivity", token });
      setParticipants(Array.isArray(data.activity) ? data.activity : []);
      setLastUpdatedAt(data.now || new Date().toISOString());
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load live quiz activity.");
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const nativeFetch = window.fetch;
    const originalFetch = nativeFetch.bind(window);

    async function sendHeartbeat(status: "active" | "idle" | "disconnected" | "completed" = "active") {
      if (sessionStorage.getItem(ROLE_KEY) !== "participant") return;
      const attempt = loadAttempt();
      const token = sessionStorage.getItem(TOKEN_KEY);
      const endpoint = sessionStorage.getItem(ENDPOINT_KEY);
      if (!attempt || !token || !endpoint) return;
      if (status === "active" && !document.querySelector(".quiz-layout")) return;
      const progress = quizProgress(attempt);
      try {
        await postAction(endpoint, {
          action: "updateAttemptActivity",
          token,
          attemptId: attempt.attemptId,
          courseId: attempt.courseId,
          currentQuestion: progress.currentQuestion,
          totalQuestions: attempt.totalQuestions,
          answeredCount: progress.answeredCount,
          clientStatus: status,
        }, originalFetch);
      } catch {
        // Heartbeats are best-effort and must never interrupt the quiz.
      }
    }

    const enhancedFetch: typeof window.fetch = async (input, init) => {
      const payload = parsePayload(init);
      const response = await originalFetch(input, init);
      if (!payload?.action) return response;

      if (payload.action === "startAttempt" && response.ok) {
        try {
          const data = await response.clone().json() as { ok?: boolean; attemptId?: string; questions?: unknown[] };
          if (data.ok !== false && data.attemptId) {
            saveAttempt({
              attemptId: String(data.attemptId),
              courseId: String(payload.courseId || ""),
              totalQuestions: Array.isArray(data.questions) ? data.questions.length : 0,
            });
            window.setTimeout(() => void sendHeartbeat("active"), 0);
          }
        } catch {
          // The main app owns start-attempt error handling.
        }
      }

      if (payload.action === "submitAttempt" && response.ok) {
        try {
          const data = await response.clone().json() as { ok?: boolean };
          if (data.ok !== false) {
            await sendHeartbeat("completed");
            saveAttempt(null);
          }
        } catch {
          // The main app owns submission error handling.
        }
      }

      if (payload.action === "logout") saveAttempt(null);
      return response;
    };

    window.fetch = enhancedFetch;

    const heartbeatTimer = window.setInterval(() => void sendHeartbeat("active"), HEARTBEAT_MS);
    const adminTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshAdmin();
    }, ADMIN_REFRESH_MS);

    const syncMount = () => {
      const node = document.querySelector(".admin-overview");
      setMountNode(node);
      if (node && sessionStorage.getItem(ROLE_KEY) === "admin") void refreshAdmin();
    };
    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    const onVisibility = () => {
      if (sessionStorage.getItem(ROLE_KEY) === "participant") {
        void sendHeartbeat(document.visibilityState === "visible" ? "active" : "idle");
      } else if (document.visibilityState === "visible") {
        void refreshAdmin();
      }
    };
    const onFocus = () => void refreshAdmin();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (window.fetch === enhancedFetch) window.fetch = nativeFetch;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(adminTimer);
      observer.disconnect();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshAdmin]);

  if (!mountNode || sessionStorage.getItem(ROLE_KEY) !== "admin") return null;
  return createPortal(
    <LiveQuizMonitor
      participants={participants}
      loading={loading}
      error={error}
      lastUpdatedAt={lastUpdatedAt}
      onRefresh={() => void refreshAdmin()}
    />,
    mountNode,
  );
}
