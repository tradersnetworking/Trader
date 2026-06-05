import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui.jsx";

/**
 * Live camera capture with front / back camera toggle.
 * Falls back to native file capture or gallery when getUserMedia is blocked.
 * @param {"user"|"environment"} defaultFacing — "user" = front, "environment" = rear
 */
export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  onGalleryFallback,
  title = "Take photo",
  defaultFacing = "environment",
  hint,
  zIndex = 210,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const nativeInputRef = useRef(null);
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

  const attachStream = useCallback(async (stream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
    setReady(true);
  }, []);

  const startCamera = useCallback(
    async (facingMode) => {
      stopStream();
      setError("");
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser. Upload a photo from your gallery instead.");
        return;
      }
      const attempts = [
        { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: facingMode }, audio: false },
        { video: true, audio: false },
      ];
      let lastErr = null;
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          await attachStream(stream);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      const msg =
        lastErr?.name === "NotAllowedError" || lastErr?.name === "SecurityError"
          ? "Camera permission denied. Allow camera access in your browser settings, or upload a photo from your gallery."
          : lastErr?.name === "NotFoundError"
            ? "No camera found on this device. Upload a photo from your gallery instead."
            : lastErr?.message || "Could not open camera";
      setError(msg);
    },
    [attachStream, stopStream]
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

  const handleGalleryFallback = () => {
    stopStream();
    onClose?.();
    onGalleryFallback?.();
  };

  const handleNativeCapture = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onCapture?.(file);
    stopStream();
    onClose?.();
  };

  const facingLabel = facing === "user" ? "Front camera" : "Back camera";
  const flipLabel = facing === "user" ? "Use back camera" : "Use front camera";
  const flipShort = "Flip camera";

  return (
    <Modal open={open} onClose={handleClose} title={title} wide zIndex={zIndex}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {hint ||
            "Use the flip control to switch cameras, then tap Capture. Ensure good lighting and a clear image."}
        </p>
        {error ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {onGalleryFallback && (
                <button type="button" className="btn-gold btn-block w-full text-sm sm:w-auto" onClick={handleGalleryFallback}>
                  Upload from gallery
                </button>
              )}
              <button
                type="button"
                className="btn-outline btn-block w-full text-sm sm:w-auto"
                onClick={() => nativeInputRef.current?.click()}
              >
                Use device camera app
              </button>
              <button
                type="button"
                className="btn-outline btn-block w-full text-sm sm:w-auto"
                onClick={() => startCamera(facing)}
              >
                Try again
              </button>
            </div>
          </div>
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
                  className="absolute bottom-3 left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-lg bg-black/65 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/80 sm:left-auto sm:right-3 sm:translate-x-0"
                  onClick={flipCamera}
                  disabled={busy}
                  aria-label={flipLabel}
                  title={flipLabel}
                >
                  {flipShort}
                </button>
              </>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/*"
          capture={facing}
          className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
          tabIndex={-1}
          aria-hidden
          onChange={handleNativeCapture}
        />
        <div className="flex min-w-0 flex-col gap-2">
          {ready && !error && (
            <button
              type="button"
              className="btn-outline btn-block w-full text-sm"
              onClick={flipCamera}
              disabled={busy || flipping}
              title={flipLabel}
            >
              {flipLabel}
            </button>
          )}
          {onGalleryFallback && !error && (
            <button
              type="button"
              className="btn-outline btn-block w-full text-sm"
              onClick={handleGalleryFallback}
              disabled={busy}
            >
              Upload from gallery instead
            </button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-outline btn-block w-full sm:w-auto" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-gold btn-block w-full sm:w-auto"
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
