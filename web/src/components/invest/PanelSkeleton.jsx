/** Lightweight placeholder while lazy dashboard panels load. */
export default function PanelSkeleton({ rows = 3 }) {
  return (
    <div className="page-stack animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-32 rounded-xl bg-muted" />
      ))}
    </div>
  );
}
