import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui.jsx";

/**
 * Live camera capture with front / back camera toggle.
 * @param {"user"|"environment"} defaultFacing — "user" = front, "environment" = rear
 */
export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  title = "Take photo",
  defaultFacing = "environment",
  hint,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState(defaultFacing);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (open) setFacing(defaultFacing);
  }, [open, defaultFacing]);

  const startCamera = useCallback(
    async (facingMode) => {
      stopStream();
      setError("");
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser. Use Upload photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        const msg =
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access or upload a photo from your gallery."
            : e?.message || "Could not open camera";
        setError(msg);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!open) {
      stopStream();
      setError("");
      setFlipping(false);
      return undefined;
    }

    let cancelled = false;
    setFlipping(true);
    startCamera(facing).finally(() => {
      if (!cancelled) setFlipping(false);
    });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facing, startCamera, stopStream]);

  const flipCamera = () => {
    setFacing((current) => (current === "user" ? "environment" : "user"));
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;
    setBusy(true);
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) throw new Error("Camera not ready — wait a moment and try again.");
      const max = 1920;
      let tw = w;
      let th = h;
      if (w > max || h > max) {
        const r = Math.min(max / w, max / h);
        tw = Math.round(w * r);
        th = Math.round(h * r);
      }
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, tw, th);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture failed"))), "image/jpeg", 0.88);
      });
      const file = new File([blob], `kyc-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture?.(file);
      stopStream();
      onClose?.();
    } catch (e) {
      setError(e.message || "Capture failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    stopStream();
    onClose?.();
  };

  const facingLabel = facing === "user" ? "Front camera" : "Back camera";
  const flipLabel = facing === "user" ? "Use back camera" : "Use front camera";

  return (
    <Modal open={open} onClose={handleClose} title={title} wide>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {hint ||
            "Use the flip control to switch cameras, then tap Capture. Ensure good lighting and a clear image."}
        </p>
        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        ) : (
          <div className="relative mx-auto aspect-[3/4] max-h-[min(60vh,480px)] w-full overflow-hidden rounded-xl border border-border bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              aria-label="Camera preview"
            />
            {(!ready || flipping) && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                {flipping ? "Switching camera…" : "Starting camera…"}
              </div>
            )}
            {ready && !flipping && (
              <>
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  {facingLabel}
                </span>
                <button
                  type="button"
                  className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/75"
                  onClick={flipCamera}
                  disabled={busy}
                  aria-label={flipLabel}
                >
                  {flipLabel}
                </button>
              </>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
          {ready && !error && (
            <button
              type="button"
              className="btn-outline w-full text-sm sm:w-auto"
              onClick={flipCamera}
              disabled={busy || flipping}
            >
              {flipLabel}
            </button>
          )}
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            <button type="button" className="btn-outline" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-gold"
              onClick={handleCapture}
              disabled={!ready || busy || flipping || Boolean(error)}
            >
              {busy ? "Saving…" : "Capture photo"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
