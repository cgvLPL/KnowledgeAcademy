"use client";

import { ChevronLeft, ChevronRight, FileText, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PDFJS_VERSION = "5.4.296";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

type PdfViewport = { width: number; height: number };
type PdfRenderTask = { promise: Promise<void>; cancel?: () => void };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    transform?: number[] | null;
  }) => PdfRenderTask;
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void> | void;
};
type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
  destroy?: () => Promise<void> | void;
};
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string }) => PdfLoadingTask;
};

type ActivePdf = {
  url: string;
  title: string;
  reader: HTMLElement;
  closeButton: HTMLButtonElement;
};

function sourceUrl(value: string) {
  try {
    const parsed = new URL(value, window.location.href);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return value.split("#", 1)[0] || value;
  }
}

function MobilePdfSurface({ active, onClose }: { active: ActivePdf; onClose: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const loadingTaskRef = useRef<PdfLoadingTask | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [renderRevision, setRenderRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PdfDocument | null = null;

    async function loadDocument() {
      try {
        const moduleUrl = PDFJS_MODULE_URL;
        const pdfjs = await import(/* @vite-ignore */ moduleUrl) as unknown as PdfJsModule;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const loadingTask = pdfjs.getDocument({ url: active.url });
        loadingTaskRef.current = loadingTask;
        loadedDocument = await loadingTask.promise;
        if (cancelled) {
          await loadedDocument.destroy?.();
          return;
        }
        setDocumentProxy(loadedDocument);
        setPageCount(loadedDocument.numPages);
      } catch (reason) {
        if (!cancelled) {
          const detail = reason instanceof Error ? reason.message : "Unable to load this PDF.";
          setError(`The in-app PDF renderer could not load this document. ${detail}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const resetFrame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
      setPageNumber(1);
      setPageCount(0);
      setDocumentProxy(null);
      void loadDocument();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(resetFrame);
      renderTaskRef.current?.cancel?.();
      void loadingTaskRef.current?.destroy?.();
      if (loadedDocument) void loadedDocument.destroy?.();
      loadingTaskRef.current = null;
    };
  }, [active.url, retryKey]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setRenderRevision((value) => value + 1));
    });
    observer.observe(stage);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current || !stageRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const stage = stageRef.current;

    async function renderPage() {
      const pdf = documentProxy;
      if (!pdf) return;
      try {
        setRendering(true);
        renderTaskRef.current?.cancel?.();
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(260, stage.clientWidth - 20);
        const fitScale = availableWidth / Math.max(1, baseViewport.width);
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas rendering is unavailable on this device.");

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const transform = outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0];
        const task = page.render({ canvasContext: context, viewport, transform });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) stage.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch (reason) {
        if (!cancelled && !(reason instanceof Error && reason.name === "RenderingCancelledException")) {
          setError(reason instanceof Error ? reason.message : "Unable to render this PDF page.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [documentProxy, pageNumber, renderRevision, zoom]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && pageNumber > 1) setPageNumber((page) => page - 1);
      if (event.key === "ArrowRight" && pageNumber < pageCount) setPageNumber((page) => page + 1);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose, pageCount, pageNumber]);

  const previousPage = () => setPageNumber((page) => Math.max(1, page - 1));
  const nextPage = () => setPageNumber((page) => Math.min(pageCount || page, page + 1));
  const zoomOut = () => setZoom((value) => Math.max(0.75, Math.round((value - 0.25) * 100) / 100));
  const zoomIn = () => setZoom((value) => Math.min(2, Math.round((value + 0.25) * 100) / 100));

  return (
    <div className="cgv-mobile-pdf-overlay" role="presentation">
      <section
        className="cgv-mobile-pdf-reader"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cgv-mobile-pdf-title"
      >
        <header className="cgv-mobile-pdf-toolbar">
          <span className="cgv-mobile-pdf-icon"><FileText size={18} /></span>
          <span className="cgv-mobile-pdf-heading">
            <small>PDF DOCUMENT</small>
            <strong id="cgv-mobile-pdf-title">{active.title}</strong>
          </span>
          <button type="button" onClick={onClose} aria-label="Close PDF reader">
            <X size={20} />
          </button>
        </header>

        <div ref={stageRef} className="cgv-mobile-pdf-stage" aria-busy={loading || rendering}>
          {error ? (
            <div className="cgv-mobile-pdf-error" role="alert">
              <FileText size={32} />
              <strong>PDF preview unavailable</strong>
              <span>{error}</span>
              <div>
                <button type="button" className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>Retry</button>
                <a className="secondary-button" href={active.url} target="_blank" rel="noreferrer noopener">Open PDF</a>
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="cgv-mobile-pdf-canvas"
                aria-label={pageCount ? `PDF page ${pageNumber} of ${pageCount}` : "PDF page"}
              />
              {(loading || rendering) && (
                <div className="cgv-mobile-pdf-loading" role="status" aria-live="polite">
                  {loading ? "Loading PDF…" : `Rendering page ${pageNumber}…`}
                </div>
              )}
            </>
          )}
        </div>

        <nav className="cgv-mobile-pdf-controls" aria-label="PDF page controls">
          <button type="button" aria-label="Previous PDF page" onClick={previousPage} disabled={pageNumber <= 1 || !pageCount}>
            <ChevronLeft size={20} />
          </button>
          <span className="cgv-mobile-pdf-page" aria-live="polite">
            <strong>{pageNumber}</strong><span aria-hidden="true"> / </span>{pageCount || "…"}
          </span>
          <button type="button" aria-label="Next PDF page" onClick={nextPage} disabled={!pageCount || pageNumber >= pageCount}>
            <ChevronRight size={20} />
          </button>
          <i aria-hidden="true" />
          <button type="button" aria-label="Zoom out PDF" onClick={zoomOut} disabled={zoom <= 0.75}>
            <Minus size={18} />
          </button>
          <span className="cgv-mobile-pdf-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in PDF" onClick={zoomIn} disabled={zoom >= 2}>
            <Plus size={18} />
          </button>
        </nav>
      </section>
    </div>
  );
}

export default function MobilePdfPagination() {
  const [active, setActive] = useState<ActivePdf | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    let currentReader: HTMLElement | null = null;

    const sync = () => {
      if (!media.matches) {
        setActive(null);
        return;
      }

      const frame = document.querySelector<HTMLIFrameElement>("iframe.knowledge-pdf-frame");
      const reader = frame?.closest<HTMLElement>(".knowledge-pdf-reader") || null;
      const closeButton = reader?.querySelector<HTMLButtonElement>('button[aria-label="Close PDF reader"]') || null;
      if (!frame || !reader || !closeButton) {
        if (currentReader) currentReader.removeAttribute("aria-hidden");
        currentReader = null;
        setActive(null);
        return;
      }

      if (currentReader && currentReader !== reader) currentReader.removeAttribute("aria-hidden");
      currentReader = reader;
      reader.setAttribute("aria-hidden", "true");
      const title = reader.querySelector<HTMLElement>("#knowledge-pdf-title")?.textContent?.trim()
        || frame.title.replace(/\s+PDF$/u, "").trim()
        || "PDF document";
      const url = sourceUrl(frame.getAttribute("src") || frame.src);
      setActive((previous) => previous?.reader === reader && previous.url === url
        ? previous
        : { url, title, reader, closeButton });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    media.addEventListener("change", sync);
    sync();

    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
      if (currentReader) currentReader.removeAttribute("aria-hidden");
    };
  }, []);

  useEffect(() => {
    if (!active) {
      document.body.classList.remove("cgv-mobile-pdf-open");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("cgv-mobile-pdf-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("cgv-mobile-pdf-open");
      document.body.style.overflow = previousOverflow;
      active.reader.removeAttribute("aria-hidden");
    };
  }, [active]);

  if (!active || typeof document === "undefined") return null;

  const close = () => {
    const closeButton = active.closeButton;
    active.reader.removeAttribute("aria-hidden");
    setActive(null);
    window.requestAnimationFrame(() => closeButton.click());
  };

  return createPortal(<MobilePdfSurface active={active} onClose={close} />, document.body);
}
