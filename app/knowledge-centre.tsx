"use client";

import {
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";

export type LessonStatus = "draft" | "published";

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  duration: number;
  resourceTitle: string;
  resourceUrl: string;
  status: LessonStatus;
  createdAt: string;
  updatedAt: string;
};

export type LessonInput = Omit<Lesson, "createdAt" | "updatedAt">;

type KnowledgeCentreProps = {
  role: "participant" | "admin";
  lessons: Lesson[];
  onSave: (lesson: LessonInput) => Promise<string | null>;
  onDelete: (lesson: Lesson) => Promise<string | null>;
};

type ResourceInfo = {
  isPdf: boolean;
  isFileGarden: boolean;
  isFileGardenPage: boolean;
  viewerUrl: string;
};

const ALL_CATEGORIES = "All topics";
const MAX_IMPORT_BYTES = 256 * 1024;

function lessonDate(value: string) {
  if (!value) return "Recently updated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function lessonSearchText(lesson: Lesson) {
  return [lesson.title, lesson.summary, lesson.content, lesson.category]
    .join(" ")
    .toLowerCase();
}

function resourceInfo(value: string): ResourceInfo {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    let decodedPath = parsed.pathname;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      decodedPath = parsed.pathname;
    }
    const isPdf = decodedPath.toLowerCase().endsWith(".pdf");
    const isFileGarden = hostname === "file.garden" || hostname.endsWith(".file.garden");
    const isFileGardenPage = hostname === "filegarden.com" || hostname.endsWith(".filegarden.com");
    const viewerUrl = isPdf && !parsed.hash
      ? `${parsed.toString()}#toolbar=1&navpanes=0&view=FitH`
      : parsed.toString();
    return { isPdf, isFileGarden, isFileGardenPage, viewerUrl };
  } catch {
    return { isPdf: false, isFileGarden: false, isFileGardenPage: false, viewerUrl: "" };
  }
}

function PdfReader({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  const info = resourceInfo(url);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);

  return (
    <div
      className="knowledge-pdf-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="knowledge-pdf-reader"
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-pdf-title"
      >
        <header className="knowledge-pdf-toolbar">
          <div>
            <span className="knowledge-pdf-icon"><FileText size={18} /></span>
            <span>
              <small>{info.isFileGarden ? "FILE GARDEN PDF" : "PDF DOCUMENT"}</small>
              <strong id="knowledge-pdf-title">{title}</strong>
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close PDF reader">
            <X size={19} />
          </button>
        </header>
        <div className="knowledge-pdf-stage">
          <iframe
            className="knowledge-pdf-frame"
            src={info.viewerUrl}
            title={`${title} PDF`}
            referrerPolicy="no-referrer"
          />
        </div>
        <footer className="knowledge-pdf-footer">
          <span>PDF controls are provided inside the viewer. The document stays inside CGV Knowledge Academy.</span>
          <button className="secondary-button" type="button" onClick={onClose}>Close PDF</button>
        </footer>
      </section>
    </div>
  );
}

function LessonReader({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const resource = resourceInfo(lesson.resourceUrl);

  return (
    <div className="knowledge-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="knowledge-reader" role="dialog" aria-modal="true" aria-labelledby="knowledge-reader-title">
        <button className="knowledge-modal-close" type="button" onClick={onClose} aria-label="Close lesson">
          <X size={19} />
        </button>
        <header className="knowledge-reader-header">
          <span className="knowledge-reader-icon"><BookOpen size={28} /></span>
          <div>
            <span className="knowledge-category">{lesson.category}</span>
            <h2 id="knowledge-reader-title">{lesson.title}</h2>
            <p>{lesson.summary}</p>
            <div className="knowledge-reader-meta">
              <span><Clock3 size={15} /> {lesson.duration} min read</span>
              <span><CheckCircle2 size={15} /> Updated {lessonDate(lesson.updatedAt)}</span>
            </div>
          </div>
        </header>
        <article className="knowledge-reader-body">{lesson.content}</article>
        {lesson.resourceUrl && (
          <footer className="knowledge-reader-resource" data-resource-kind={resource.isPdf ? "pdf" : "link"}>
            <div>
              {resource.isPdf ? <FileText size={19} /> : <Link2 size={19} />}
              <span>
                <strong>{resource.isPdf ? "PDF resource" : "Related resource"}</strong>
                <small>{lesson.resourceTitle || (resource.isPdf ? "Lesson PDF" : "Open lesson resource")}</small>
              </span>
            </div>
            {resource.isPdf ? (
              <button className="knowledge-resource-button" type="button" onClick={() => setPdfOpen(true)}>
                Read PDF <BookOpen size={16} />
              </button>
            ) : (
              <a href={lesson.resourceUrl} target="_blank" rel="noreferrer noopener">
                Open resource <ExternalLink size={16} />
              </a>
            )}
          </footer>
        )}
      </section>
      {pdfOpen && typeof document !== "undefined" && createPortal(
        <PdfReader
          title={lesson.resourceTitle || lesson.title}
          url={lesson.resourceUrl}
          onClose={() => setPdfOpen(false)}
        />,
        document.body,
      )}
    </div>
  );
}

function LessonEditor({
  lesson,
  onClose,
  onSave,
}: {
  lesson: Lesson | null;
  onClose: () => void;
  onSave: (input: LessonInput) => Promise<string | null>;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [summary, setSummary] = useState(lesson?.summary || "");
  const [content, setContent] = useState(lesson?.content || "");
  const [category, setCategory] = useState(lesson?.category || "General");
  const [duration, setDuration] = useState(lesson?.duration || 5);
  const [resourceTitle, setResourceTitle] = useState(lesson?.resourceTitle || "");
  const [resourceUrl, setResourceUrl] = useState(lesson?.resourceUrl || "");
  const [status, setStatus] = useState<LessonStatus>(lesson?.status || "published");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importedFile, setImportedFile] = useState("");
  const resource = resourceInfo(resourceUrl.trim());

  async function importNotes(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError("Lesson notes must be 256 KB or smaller.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        setError("The selected notes file is empty.");
        return;
      }
      setContent(text.trim());
      if (!title.trim()) setTitle(file.name.replace(/\.(md|txt)$/iu, ""));
      setImportedFile(file.name);
      setError("");
    } catch {
      setError("Unable to read the selected notes file.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = resourceUrl.trim();
    if (!title.trim() || !summary.trim() || !content.trim()) {
      setError("Add a title, summary, and lesson content.");
      return;
    }
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        if (!/^https?:$/u.test(parsed.protocol)) throw new Error("Unsupported protocol");
        if (resourceInfo(trimmedUrl).isFileGardenPage) {
          setError("For File Garden, paste the direct https://file.garden/... file link instead of the garden page.");
          return;
        }
      } catch {
        setError("Resource links must be valid http or https URLs.");
        return;
      }
    }
    setSaving(true);
    setError("");
    const saveError = await onSave({
      id: lesson?.id || "",
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category: category.trim() || "General",
      duration: Math.max(1, Math.min(240, Math.round(Number(duration) || 5))),
      resourceTitle: resourceTitle.trim(),
      resourceUrl: trimmedUrl,
      status,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onClose();
  }

  return (
    <div className="knowledge-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <form className="knowledge-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="knowledge-editor-title">
        <button className="knowledge-modal-close" type="button" onClick={onClose} disabled={saving} aria-label="Close lesson editor">
          <X size={19} />
        </button>
        <header>
          <span className="knowledge-reader-icon"><Upload size={25} /></span>
          <div>
            <span className="knowledge-category">CONTENT MANAGEMENT</span>
            <h2 id="knowledge-editor-title">{lesson ? "Edit lesson" : "Upload a new lesson"}</h2>
            <p>Publish clear learning notes and link participants to supporting material.</p>
          </div>
        </header>

        <div className="knowledge-editor-grid">
          <label className="knowledge-field knowledge-field-wide">
            <span>Lesson title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="e.g. Cinema guest recovery essentials" required />
          </label>
          <label className="knowledge-field">
            <span>Topic</span>
            <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} placeholder="Customer experience" required />
          </label>
          <label className="knowledge-field">
            <span>Estimated reading time</span>
            <div className="knowledge-duration-input"><input type="number" min={1} max={240} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /><small>minutes</small></div>
          </label>
          <label className="knowledge-field knowledge-field-wide">
            <span>Short summary</span>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} rows={3} placeholder="What will participants learn?" required />
          </label>
          <label className="knowledge-field knowledge-field-wide">
            <span>Lesson content</span>
            <textarea className="knowledge-content-input" value={content} onChange={(event) => setContent(event.target.value)} maxLength={45000} rows={12} placeholder="Write or paste the lesson material here…" required />
          </label>
          <div className="knowledge-import knowledge-field-wide">
            <div>
              <FileText size={19} />
              <span><strong>Import lesson notes</strong><small>{importedFile || "Upload a .txt or .md file (maximum 256 KB)"}</small></span>
            </div>
            <label className="secondary-button">
              <Upload size={16} /> Choose file
              <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={importNotes} />
            </label>
          </div>
          <label className="knowledge-field">
            <span>Resource label <small>optional</small></span>
            <input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} maxLength={160} placeholder="Guest service playbook.pdf" />
          </label>
          <label className="knowledge-field">
            <span>PDF / resource link <small>optional</small></span>
            <input type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} maxLength={2048} placeholder="https://file.garden/.../document.pdf" />
            {resourceUrl.trim() && (
              <small className={`knowledge-resource-hint ${resource.isPdf ? "pdf" : resource.isFileGardenPage ? "warning" : ""}`}>
                {resource.isFileGardenPage
                  ? "Use File Garden’s direct file.garden file URL, not the garden page URL."
                  : resource.isFileGarden && resource.isPdf
                    ? "File Garden PDF detected — it will open inside CGV Knowledge Academy."
                    : resource.isPdf
                      ? "PDF detected — it will open inside CGV Knowledge Academy."
                      : "Non-PDF resources continue to open as external links."}
              </small>
            )}
          </label>
          <div className="knowledge-filegarden-guide knowledge-field-wide">
            <FileText size={19} />
            <span>
              <strong>Using File Garden for PDFs</strong>
              <small>Upload the PDF manually in File Garden, copy its direct https://file.garden/.../file.pdf URL, then paste it above. CGV.Exams does not upload files to File Garden automatically.</small>
            </span>
          </div>
          <label className="knowledge-field knowledge-field-wide">
            <span>Visibility</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as LessonStatus)}>
              <option value="published">Published — visible to participants</option>
              <option value="draft">Draft — admin only</option>
            </select>
          </label>
        </div>

        {error && <p className="knowledge-form-error" role="alert">{error}</p>}
        <footer>
          <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary-button" type="submit" disabled={saving}>
            <Upload size={17} /> {saving ? "Saving…" : lesson ? "Save changes" : "Upload lesson"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function KnowledgeCentre({ role, lessons, onSave, onDelete }: KnowledgeCentreProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState("");
  const [actionError, setActionError] = useState("");

  const visibleLessons = useMemo(
    () => role === "participant" ? lessons.filter((lesson) => lesson.status === "published") : lessons,
    [lessons, role],
  );
  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set(visibleLessons.map((lesson) => lesson.category))).sort()],
    [visibleLessons],
  );
  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleLessons.filter((lesson) => (
      (category === ALL_CATEGORIES || lesson.category === category) &&
      (!query || lessonSearchText(lesson).includes(query))
    ));
  }, [category, search, visibleLessons]);

  async function removeLesson(lesson: Lesson) {
    if (!window.confirm(`Delete “${lesson.title}”? This cannot be undone.`)) return;
    setDeletingId(lesson.id);
    setActionError("");
    const error = await onDelete(lesson);
    setDeletingId("");
    if (error) setActionError(error);
  }

  const publishedCount = lessons.filter((lesson) => lesson.status === "published").length;
  const draftCount = lessons.length - publishedCount;

  return (
    <div className="content knowledge-centre" data-knowledge-centre-role={role}>
      <section className="knowledge-hero">
        <div>
          <span className="eyebrow dark-eyebrow"><GraduationCap size={15} /> KNOWLEDGE CENTRE</span>
          <h2>{role === "admin" ? "Learning library" : "Learn at your own pace"}</h2>
          <p>{role === "admin"
            ? "Create, preview, publish, and maintain lesson material for every participant."
            : "Review practical lessons and supporting resources whenever you need them."}</p>
        </div>
        {role === "admin" && (
          <button className="primary-button" type="button" onClick={() => setEditingLesson(null)}>
            <Plus size={18} /> Upload lesson
          </button>
        )}
      </section>

      {role === "admin" && (
        <section className="knowledge-metrics" aria-label="Lesson summary">
          <article><span><BookOpen size={19} /></span><div><small>Total lessons</small><strong>{lessons.length}</strong></div></article>
          <article><span><CheckCircle2 size={19} /></span><div><small>Published</small><strong>{publishedCount}</strong></div></article>
          <article><span><FileText size={19} /></span><div><small>Drafts</small><strong>{draftCount}</strong></div></article>
        </section>
      )}

      <section className="knowledge-toolbar">
        <label className="knowledge-search">
          <Search size={18} />
          <input aria-label="Search lessons" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons and topics…" />
        </label>
        <div className="knowledge-category-tabs" aria-label="Lesson topics">
          {categories.map((item) => (
            <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </section>

      {actionError && <p className="knowledge-action-error" role="alert">{actionError}</p>}

      {filteredLessons.length ? (
        <section className="knowledge-grid" aria-label="Lessons">
          {filteredLessons.map((lesson) => (
            <article className="knowledge-card" key={lesson.id} data-lesson-status={lesson.status}>
              <div className="knowledge-card-art" aria-hidden="true">
                <span><BookOpen size={28} /></span>
                <i />
              </div>
              <div className="knowledge-card-content">
                <div className="knowledge-card-badges">
                  <span className="knowledge-category">{lesson.category}</span>
                  {role === "admin" && <span className={`knowledge-status ${lesson.status}`}>{lesson.status}</span>}
                </div>
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <div className="knowledge-card-meta">
                  <span><Clock3 size={14} /> {lesson.duration} min</span>
                  <span>Updated {lessonDate(lesson.updatedAt)}</span>
                  {resourceInfo(lesson.resourceUrl).isPdf && <span className="knowledge-card-pdf"><FileText size={13} /> PDF</span>}
                </div>
              </div>
              <footer>
                <button
                  className="knowledge-review-button"
                  type="button"
                  onClick={() => setSelectedLesson(lesson)}
                  data-preview-as-participant={role === "admin" ? "true" : undefined}
                  aria-label={role === "admin" ? `Preview ${lesson.title} as participant` : `Review ${lesson.title}`}
                >
                  {role === "admin" ? (
                    <>Preview as participant <Eye size={16} /></>
                  ) : (
                    <>Review lesson <BookOpen size={16} /></>
                  )}
                </button>
                {role === "admin" && (
                  <div className="knowledge-admin-actions">
                    <button type="button" onClick={() => setEditingLesson(lesson)} aria-label={`Edit ${lesson.title}`}><Pencil size={16} /></button>
                    <button type="button" onClick={() => void removeLesson(lesson)} disabled={deletingId === lesson.id} aria-label={`Delete ${lesson.title}`}><Trash2 size={16} /></button>
                  </div>
                )}
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <section className="knowledge-empty">
          <span><FolderOpen size={30} /></span>
          <h3>{visibleLessons.length ? "No lessons match your search" : "No lessons yet"}</h3>
          <p>{visibleLessons.length
            ? "Try another keyword or topic."
            : role === "admin" ? "Upload the first lesson to start the learning library." : "Published learning material will appear here."}</p>
          {role === "admin" && !visibleLessons.length && <button className="primary-button" type="button" onClick={() => setEditingLesson(null)}><Plus size={17} /> Upload lesson</button>}
        </section>
      )}

      {selectedLesson && <LessonReader lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />}
      {editingLesson !== undefined && <LessonEditor lesson={editingLesson} onClose={() => setEditingLesson(undefined)} onSave={onSave} />}
    </div>
  );
}