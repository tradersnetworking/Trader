import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Renders a PDF inside the page (canvas per page) — works in modals on mobile
 * where iframe/embed often opens a new tab or external viewer.
 */
export default function InlinePdfViewer({ blob, className = "" }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!blob || !el) return undefined;

    let cancelled = false;
    setError("");
    el.innerHTML = "";

    const render = async () => {
      try {
        const data = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const containerWidth = el.clientWidth || 600;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(0.85, containerWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto mb-3 max-w-full rounded border border-border bg-white shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${pageNum} of ${pdf.numPages}`);

          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          el.appendChild(canvas);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not display PDF");
      }
    };

    render();

    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [blob]);

  if (error) {
    return <p className="p-6 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <div
      ref={containerRef}
      className={`max-h-[70vh] overflow-y-auto overflow-x-hidden px-2 py-3 ${className}`}
    />
  );
}
