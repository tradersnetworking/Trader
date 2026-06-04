import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/** Kuber-style signature pad — mouse + touch, navy background, gold stroke */
const SignaturePad = forwardRef(function SignaturePad(
  {
    width = 400,
    height = 140,
    onChange,
    showClear = true,
    initialDataUrl = null,
    className = "",
  },
  ref
) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const applyStrokeStyle = (ctx) => {
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const paintBlank = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, c.width, c.height);
    applyStrokeStyle(ctx);
  };

  const clearPad = (notify = true) => {
    paintBlank();
    if (notify) onChange?.(null);
  };

  const loadImage = (url) => {
    const c = canvasRef.current;
    if (!c || !url) {
      clearPad(true);
      return;
    }
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      paintBlank();
      ctx.drawImage(img, 0, 0, c.width, c.height);
      applyStrokeStyle(ctx);
      onChange?.(c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => clearPad(true);
    img.src = url;
  };

  const exportDataUrl = () => canvasRef.current?.toDataURL("image/jpeg", 0.88) || null;

  useEffect(() => {
    if (initialDataUrl) loadImage(initialDataUrl);
    else clearPad(false);
  }, [width, height, initialDataUrl]);

  useImperativeHandle(ref, () => ({
    clear: () => clearPad(true),
    getDataUrl: () => canvasRef.current?.toDataURL("image/png") || null,
  }));

  const pos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    const pt = e.touches?.[0] || e;
    return { x: (pt.clientX - r.left) * scaleX, y: (pt.clientY - r.top) * scaleY };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e) => {
    if (!drawing.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    onChange?.(exportDataUrl());
  };

  const end = () => {
    drawing.current = false;
    if (canvasRef.current) onChange?.(exportDataUrl());
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full touch-none rounded-lg border border-slate-300 dark:border-white/10"
        style={{ touchAction: "none", minHeight: height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {showClear && (
        <button type="button" className="text-xs font-semibold text-slate-500 hover:text-amber-600" onClick={() => clearPad(true)}>
          Clear signature
        </button>
      )}
    </div>
  );
});

export default SignaturePad;
