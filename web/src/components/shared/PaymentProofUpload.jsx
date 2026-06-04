import { useId, useRef } from "react";

/**
 * Accessible payment proof picker — avoids native file button (often low-contrast / faded).
 */
export default function PaymentProofUpload({
  file,
  onChange,
  required = false,
  accept = "image/*,.pdf",
  label = "Upload payment proof",
}) {
  const id = useId();
  const inputRef = useRef(null);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        className="btn-gold btn-block w-full max-w-full text-sm shadow-md"
        onClick={() => inputRef.current?.click()}
      >
        {file ? "Change payment proof" : label}
      </button>
      <p className="text-center text-xs text-muted-foreground">Screenshot or PDF, max 10 MB</p>
      {file ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          Selected: {file.name}
        </p>
      ) : (
        <p className="text-center text-xs text-amber-800/90 dark:text-amber-300/90">Required for UPI and bank transfer verification</p>
      )}
    </div>
  );
}
