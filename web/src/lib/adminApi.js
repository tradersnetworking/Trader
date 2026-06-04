/** Surface admin API load failures instead of silent .catch(() => {}). */
export function onAdminApiError(path, err) {
  const msg = err?.message || String(err || "Request failed");
  if (import.meta.env?.DEV) {
    console.warn(`[admin API] ${path}:`, msg);
  }
  return msg;
}

export function catchAdminApi(path, onMessage) {
  return (err) => {
    const msg = onAdminApiError(path, err);
    onMessage?.(msg);
  };
}
