import { useState } from "react";
import SecureUploadPreviewDialog from "./SecureUploadPreviewDialog.jsx";

export default function SecureUploadLink({
  url,
  children,
  className = "btn-outline px-2 py-1 text-xs",
  previewTitle,
  scope = "invest",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || !url}
        onClick={() => (url ? setOpen(true) : null)}
      >
        {children}
      </button>
      <SecureUploadPreviewDialog
        open={open}
        onClose={() => setOpen(false)}
        url={open ? url : null}
        title={previewTitle}
        scope={scope}
      />
    </>
  );
}
