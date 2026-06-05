import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Alert, Badge } from "../ui.jsx";

export default function NotificationsPanel({ onRead }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = ({ refreshBadge = false } = {}) => {
    setLoading(true);
    setErr("");
    investApi("/notifications/list")
      .then((d) => {
        setItems(d.notifications || []);
        if (refreshBadge) onRead?.();
      })
      .catch((e) => {
        setErr(e.message || "Could not load notifications");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await investApi(`/notifications/${id}/read`, { method: "POST" });
    load({ refreshBadge: true });
  };

  const markAll = async () => {
    await investApi("/notifications/read-all", { method: "POST" });
    load({ refreshBadge: true });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Notifications</h2>
        <button type="button" className="text-xs font-semibold text-gold-600" onClick={markAll}>Mark all read</button>
      </div>
      {err && <Alert type="error">{err}</Alert>}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        items.map((n) => (
          <div key={n.id} className={`card p-4 ${!n.readAt ? "ring-1 ring-primary/20" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-foreground">{n.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{dateStr(n.createdAt, true)}</p>
              </div>
              {!n.readAt ? (
                <button type="button" className="shrink-0 text-xs text-primary" onClick={() => markRead(n.id)}>Mark read</button>
              ) : (
                <Badge status="ACTIVE">Read</Badge>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
