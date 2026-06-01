import { Suspense } from "react";
import { Alert } from "../ui.jsx";
import PanelSkeleton from "./PanelSkeleton.jsx";

export function DashboardTabFallback({ title, message, onGoOverview }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h2 className="text-lg font-bold text-foreground">{title || "Panel unavailable"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {message || "This section could not be loaded. You may not have permission, or the panel is still loading."}
      </p>
      {onGoOverview && (
        <button type="button" className="btn-gold mt-4 text-sm" onClick={onGoOverview}>
          Go to Overview
        </button>
      )}
    </div>
  );
}

export function TabPanel({ children }) {
  return <Suspense fallback={<PanelSkeleton />}>{children}</Suspense>;
}

export function PermissionGate({ allowed, title, children }) {
  if (allowed) return children;
  return (
    <DashboardTabFallback
      title={title}
      message="Your account does not have permission to view this section. Contact a Super Admin if you need access."
    />
  );
}

export function AdminLoadingPermissions() {
  return (
    <div className="space-y-4">
      <Alert type="info">Loading your admin permissions…</Alert>
      <PanelSkeleton rows={4} />
    </div>
  );
}
