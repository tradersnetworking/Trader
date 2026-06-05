import { useEffect, useState } from "react";
import { Modal, Field } from "../ui.jsx";

const MIN_LEN = 8;

export default function KycRejectReasonDialog({ open, title, subtitle, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_LEN;

  const submit = () => {
    if (!valid) return;
    onConfirm?.(trimmed);
  };

  return (
    <Modal open={open} onClose={onClose} title={title || "Rejection reason"} zIndex={210}>
      <div className="space-y-4">
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <Field label={`Reason (shown to investor, min ${MIN_LEN} characters)`}>
          <textarea
            className="input min-h-[120px] w-full resize-y"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. PAN image is blurry — upload a clear JPG/PNG or unlocked PDF. Details must match your PAN card."
            disabled={busy}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Be specific so the investor knows what to fix. This message appears on their dashboard and KYC screen.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-outline text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-outline text-sm text-rose-600 disabled:opacity-50"
            disabled={busy || !valid}
            onClick={submit}
          >
            {busy ? "Saving…" : "Confirm rejection"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
