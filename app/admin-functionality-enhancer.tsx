"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const endpointFromBuild = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL?.trim() || "";
const TOKEN_KEY = "cgv-exams-session-token";
const ROLE_KEY = "cgv-exams-session-role";
const ENDPOINT_KEY = "cgv-exams-api-endpoint";

type ApiUser = {
  id?: string;
  username?: string;
  fullName?: string;
  branch?: string;
  role?: string;
  status?: string;
};

type ApiCourse = {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  passingScore?: number;
  duration?: number;
  startAt?: string;
  endAt?: string;
  status?: string;
  questionCount?: number;
};

type ApiQuestion = {
  id?: string;
  prompt: string;
  options: string[];
  correct: string;
  points?: number;
  explanation?: string;
};

type DashboardData = {
  ok?: boolean;
  user?: ApiUser;
  admins?: ApiUser[];
  participants?: ApiUser[];
  courses?: ApiCourse[];
};

type ModalState =
  | { type: "admin" }
  | { type: "account"; user: ApiUser }
  | { type: "preview"; course: ApiCourse; questions: ApiQuestion[] }
  | { type: "edit"; course: ApiCourse; questions: ApiQuestion[] }
  | { type: "courseActions"; course: ApiCourse }
  | { type: "userActions"; user: ApiUser }
  | { type: "message"; title: string; message: string }
  | null;

function labelOf(button: HTMLButtonElement) {
  return (button.getAttribute("aria-label") || button.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dateInput(value: string | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function courseTitleFromRow(button: Element) {
  return button.closest("tr")?.querySelector(".table-title-cell strong")?.textContent?.trim() || "";
}

function usernameFromRow(button: Element) {
  return (button.closest("tr")?.querySelector(".participant-cell span")?.textContent || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
}

async function api<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = window.sessionStorage.getItem(TOKEN_KEY);
  const endpoint = window.sessionStorage.getItem(ENDPOINT_KEY) || endpointFromBuild;
  if (!token) throw new Error("Your administrator session has expired. Please sign in again.");
  if (!endpoint) throw new Error("The Google Apps Script endpoint is not configured.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token, ...payload }),
  });
  const data = await response.json() as T & { ok?: boolean; error?: string };
  if (!response.ok || data.ok === false) throw new Error(data.error || "The action could not be completed.");
  return data;
}

export default function AdminFunctionalityEnhancer() {
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminBranch, setAdminBranch] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [editCourse, setEditCourse] = useState<ApiCourse | null>(null);
  const [editQuestions, setEditQuestions] = useState<ApiQuestion[]>([]);
  const [resetPassword, setResetPassword] = useState("");

  const isAdmin = useMemo(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(ROLE_KEY) === "admin",
    [modal],
  );

  function closeModal() {
    if (busy) return;
    setModal(null);
    setEditCourse(null);
    setEditQuestions([]);
    setError("");
    setResetPassword("");
  }

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function dashboard() {
    return api<DashboardData>("adminGetDashboard");
  }

  async function findCourse(button: Element) {
    const title = courseTitleFromRow(button);
    const data = await dashboard();
    const course = (data.courses || []).find((item) => String(item.title || "") === title);
    if (!course?.id) throw new Error("The selected course could not be found.");
    return course;
  }

  async function findUser(button: Element) {
    const username = usernameFromRow(button);
    const data = await dashboard();
    const user = (data.participants || []).find(
      (item) => String(item.username || "").toLowerCase() === username,
    );
    if (!user?.id) throw new Error("The selected account could not be found.");
    return user;
  }

  useEffect(() => {
    const sync = () => {
      const addParticipant = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => labelOf(button) === "add participant");
      if (addParticipant && !document.querySelector("[data-cgv-add-admin]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-button cgv-add-admin-button";
        button.dataset.cgvAddAdmin = "true";
        button.textContent = "Add administrator";
        addParticipant.parentElement?.appendChild(button);
      }

      const remember = document.querySelector<HTMLElement>(".login-options .check-label");
      if (remember) remember.hidden = true;

      const userChip = document.querySelector<HTMLElement>(".user-chip");
      if (userChip) {
        userChip.tabIndex = 0;
        userChip.setAttribute("role", "button");
        userChip.setAttribute("aria-label", "Open account");
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    const onClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const chip = target.closest<HTMLElement>(".user-chip");
      if (chip) {
        event.preventDefault();
        if (window.sessionStorage.getItem(ROLE_KEY) === "participant") {
          Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
            .find((button) => /my profile|profile/.test(labelOf(button)))?.click();
        } else {
          try {
            const data = await dashboard();
            setModal({ type: "account", user: data.user || {} });
          } catch (nextError) {
            setModal({ type: "message", title: "Account", message: nextError instanceof Error ? nextError.message : "Unable to load account details." });
          }
        }
        return;
      }

      const button = target.closest<HTMLButtonElement>("button");
      if (!button || button.disabled) return;

      if (button.dataset.cgvAddAdmin === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setModal({ type: "admin" });
        return;
      }

      const action = labelOf(button);
      const isCourseAction = Boolean(button.closest(".inline-actions") && button.closest("tr")?.querySelector(".table-title-cell"));
      const isParticipantMore = Boolean(button.querySelector(".lucide-more-horizontal") && button.closest("tr")?.querySelector(".participant-cell"));
      if (!isCourseAction && !isParticipantMore) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setBusy(true);
      setError("");
      try {
        if (isParticipantMore) {
          setModal({ type: "userActions", user: await findUser(button) });
          return;
        }

        const course = await findCourse(button);
        if (action === "duplicate") {
          await api("adminDuplicateCourse", { courseId: course.id });
          toast("Course duplicated as a draft.");
          window.setTimeout(() => window.location.reload(), 700);
          return;
        }
        if (action === "preview" || action === "edit") {
          const data = await api<{ course: ApiCourse; questions: ApiQuestion[] }>("adminGetCourse", { courseId: course.id });
          if (action === "preview") setModal({ type: "preview", course: data.course, questions: data.questions || [] });
          else {
            setEditCourse(data.course);
            setEditQuestions(data.questions || []);
            setModal({ type: "edit", course: data.course, questions: data.questions || [] });
          }
          return;
        }
        setModal({ type: "courseActions", course });
      } catch (nextError) {
        setModal({ type: "message", title: "Action failed", message: nextError instanceof Error ? nextError.message : "The action could not be completed." });
      } finally {
        setBusy(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if ((event.key === "Enter" || event.key === " ") && document.activeElement?.classList.contains("user-chip")) {
        event.preventDefault();
        (document.activeElement as HTMLElement).click();
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function createAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("adminSaveUser", {
        user: {
          fullName: adminName,
          username: adminUsername,
          branch: adminBranch,
          password: adminPassword,
          role: "admin",
          status: "active",
        },
      });
      setAdminName("");
      setAdminUsername("");
      setAdminBranch("");
      setAdminPassword("");
      setModal(null);
      toast("Administrator account created.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the administrator.");
    } finally {
      setBusy(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<ApiQuestion>) {
    setEditQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setEditQuestions((items) => items.map((item, itemIndex) => itemIndex === questionIndex
      ? { ...item, options: item.options.map((option, index) => index === optionIndex ? value : option) }
      : item));
  }

  async function saveEditedCourse(event: FormEvent) {
    event.preventDefault();
    if (!editCourse?.id) return;
    setBusy(true);
    setError("");
    try {
      await api("adminSaveCourse", {
        course: {
          id: editCourse.id,
          title: editCourse.title,
          description: editCourse.description,
          category: editCourse.category,
          passingScore: Number(editCourse.passingScore || 75),
          duration: Number(editCourse.duration || 20),
          startAt: editCourse.startAt || "",
          endAt: editCourse.endAt || "",
          status: String(editCourse.status || "draft").toLowerCase(),
          questions: editQuestions.map((question) => ({
            prompt: question.prompt,
            options: question.options,
            correct: question.correct,
            points: Number(question.points || 1),
            explanation: question.explanation || "",
          })),
        },
      });
      toast("Course changes saved.");
      setModal(null);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this course.");
    } finally {
      setBusy(false);
    }
  }

  async function setCourseStatus(course: ApiCourse, status: string) {
    if (!course.id) return;
    setBusy(true);
    setError("");
    try {
      await api("adminSetCourseStatus", { courseId: course.id, status });
      toast(`Course status changed to ${status}.`);
      setModal(null);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to change course status.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCourse(course: ApiCourse) {
    if (!course.id || !window.confirm(`Delete ${course.title || "this course"}? Courses with results will be archived instead.`)) return;
    setBusy(true);
    try {
      const result = await api<{ message?: string }>("adminDeleteCourse", { courseId: course.id });
      toast(result.message || "Course removed.");
      setModal(null);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to remove this course.");
    } finally {
      setBusy(false);
    }
  }

  async function setUserStatus(user: ApiUser, status: string) {
    if (!user.id) return;
    setBusy(true);
    setError("");
    try {
      await api("adminSetUserStatus", { userId: user.id, status });
      toast(`Account ${status === "active" ? "activated" : "deactivated"}.`);
      setModal(null);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to change account status.");
    } finally {
      setBusy(false);
    }
  }

  async function resetUserPassword(user: ApiUser) {
    if (!user.id || resetPassword.length < 8) {
      setError("Enter a new password containing at least eight characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("adminResetPassword", { userId: user.id, newPassword: resetPassword });
      toast("Password reset. Existing sessions were signed out.");
      setModal(null);
      setResetPassword("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-admin-functionality-enhancer>
      {notice && <div className="cgv-function-toast" role="status">{notice}</div>}
      {modal && (
        <div className="modal-backdrop cgv-function-backdrop" onMouseDown={closeModal}>
          <section className={`confirm-modal cgv-function-modal ${modal.type === "edit" ? "cgv-course-editor-modal" : ""}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close dialog">×</button>

            {modal.type === "admin" && (
              <form onSubmit={createAdmin}>
                <span className="card-kicker">ADMINISTRATION</span>
                <h2>Add administrator</h2>
                <p>Create another account with full access to courses, users, and scoreboards.</p>
                <label className="field-label">Full name<input required value={adminName} onChange={(event) => setAdminName(event.target.value)} /></label>
                <label className="field-label">Username<input required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></label>
                <label className="field-label">Branch / department<input value={adminBranch} onChange={(event) => setAdminBranch(event.target.value)} /></label>
                <label className="field-label">Temporary password<input required type="password" minLength={8} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
                {error && <p className="login-error">{error}</p>}
                <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create administrator"}</button></div>
              </form>
            )}

            {modal.type === "account" && (
              <><span className="card-kicker">SIGNED IN</span><h2>{modal.user.fullName || "Administrator"}</h2><p>@{modal.user.username || "admin"}{modal.user.branch ? ` · ${modal.user.branch}` : ""}</p><div className="cgv-account-summary"><div><span>Role</span><strong>{modal.user.role || "admin"}</strong></div><div><span>Status</span><strong>{modal.user.status || "active"}</strong></div><div><span>Account ID</span><strong>{modal.user.id || "—"}</strong></div></div><div className="modal-actions"><button className="primary-button" onClick={closeModal}>Done</button></div></>
            )}

            {modal.type === "preview" && (
              <><span className="card-kicker">COURSE PREVIEW</span><h2>{modal.course.title}</h2><p>{modal.course.description || "No description."}</p><div className="cgv-account-summary"><div><span>Status</span><strong>{modal.course.status}</strong></div><div><span>Duration</span><strong>{modal.course.duration} min</strong></div><div><span>Passing score</span><strong>{modal.course.passingScore}%</strong></div></div><div className="cgv-preview-questions">{modal.questions.map((question, index) => <article key={question.id || index}><strong>{index + 1}. {question.prompt}</strong><ol type="A">{question.options.map((option, optionIndex) => <li className={question.correct === String.fromCharCode(65 + optionIndex) ? "correct" : ""} key={optionIndex}>{option}</li>)}</ol></article>)}</div><div className="modal-actions"><button className="primary-button" onClick={closeModal}>Close preview</button></div></>
            )}

            {modal.type === "edit" && editCourse && (
              <form onSubmit={saveEditedCourse}>
                <span className="card-kicker">EDIT COURSE</span><h2>{editCourse.title}</h2>
                <div className="cgv-edit-grid">
                  <label className="field-label full">Title<input required value={editCourse.title || ""} onChange={(event) => setEditCourse({ ...editCourse, title: event.target.value })} /></label>
                  <label className="field-label full">Description<textarea rows={3} value={editCourse.description || ""} onChange={(event) => setEditCourse({ ...editCourse, description: event.target.value })} /></label>
                  <label className="field-label">Category<input value={editCourse.category || ""} onChange={(event) => setEditCourse({ ...editCourse, category: event.target.value })} /></label>
                  <label className="field-label">Duration<input type="number" min={1} value={editCourse.duration || 20} onChange={(event) => setEditCourse({ ...editCourse, duration: Number(event.target.value) })} /></label>
                  <label className="field-label">Passing score<input type="number" min={1} max={100} value={editCourse.passingScore || 75} onChange={(event) => setEditCourse({ ...editCourse, passingScore: Number(event.target.value) })} /></label>
                  <label className="field-label">Status<select value={String(editCourse.status || "draft").toLowerCase()} onChange={(event) => setEditCourse({ ...editCourse, status: event.target.value })}><option value="draft">Draft</option><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="completed">Completed</option></select></label>
                  <label className="field-label">Opens on<input type="date" value={dateInput(editCourse.startAt)} onChange={(event) => setEditCourse({ ...editCourse, startAt: event.target.value ? new Date(`${event.target.value}T00:00:00`).toISOString() : "" })} /></label>
                  <label className="field-label">Closes on<input type="date" value={dateInput(editCourse.endAt)} onChange={(event) => setEditCourse({ ...editCourse, endAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : "" })} /></label>
                </div>
                <div className="cgv-edit-questions">{editQuestions.map((question, questionIndex) => <article key={question.id || questionIndex}><div><strong>Question {questionIndex + 1}</strong>{editQuestions.length > 1 && <button type="button" onClick={() => setEditQuestions((items) => items.filter((_, index) => index !== questionIndex))}>Remove</button>}</div><textarea required rows={2} value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} />{question.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`edit-correct-${questionIndex}`} checked={question.correct === String.fromCharCode(65 + optionIndex)} onChange={() => updateQuestion(questionIndex, { correct: String.fromCharCode(65 + optionIndex) })} /><span>{String.fromCharCode(65 + optionIndex)}</span><input required value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} /></label>)}</article>)}</div>
                <button type="button" className="secondary-button full" onClick={() => setEditQuestions((items) => [...items, { prompt: "", options: ["", "", "", ""], correct: "A", points: 1 }])}>Add question</button>
                {error && <p className="login-error">{error}</p>}
                <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
              </form>
            )}

            {modal.type === "courseActions" && (
              <><span className="card-kicker">COURSE ACTIONS</span><h2>{modal.course.title}</h2><p>Change availability or remove the course. Courses with submitted results are archived instead of permanently deleted.</p>{error && <p className="login-error">{error}</p>}<div className="cgv-action-grid"><button disabled={busy} onClick={() => void setCourseStatus(modal.course, "live")}>Publish live</button><button disabled={busy} onClick={() => void setCourseStatus(modal.course, "draft")}>Move to draft</button><button disabled={busy} onClick={() => void setCourseStatus(modal.course, "completed")}>Mark completed</button><button disabled={busy} className="danger" onClick={() => void removeCourse(modal.course)}>Delete / archive</button></div></>
            )}

            {modal.type === "userActions" && (
              <><span className="card-kicker">ACCOUNT ACTIONS</span><h2>{modal.user.fullName}</h2><p>@{modal.user.username} · {modal.user.branch || "No branch"}</p><div className="cgv-action-grid"><button disabled={busy} onClick={() => void setUserStatus(modal.user, "active")}>Activate account</button><button disabled={busy} onClick={() => void setUserStatus(modal.user, "inactive")}>Deactivate account</button></div><label className="field-label">New password<input type="password" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Minimum 8 characters" /></label>{error && <p className="login-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={closeModal}>Cancel</button><button className="primary-button" disabled={busy || resetPassword.length < 8} onClick={() => void resetUserPassword(modal.user)}>{busy ? "Saving…" : "Reset password"}</button></div></>
            )}

            {modal.type === "message" && (
              <><span className="card-kicker">CGV EXAMS</span><h2>{modal.title}</h2><p>{modal.message}</p><div className="modal-actions"><button className="primary-button" onClick={closeModal}>Done</button></div></>
            )}
          </section>
        </div>
      )}
      {!isAdmin && null}
    </div>
  );
}
