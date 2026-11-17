export function ChartCard({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-semibold text-text">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

export function ChartLoadingSkeleton({ height = 260 }) {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-surface" style={{ height }} aria-busy="true" />
  );
}

export function ChartEmptyState({ title = "No data in this period", body = "Try a wider date range." }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center">
      <p className="m-0 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}

export function ChartErrorState({ message }) {
  return (
    <div className="mb-4 rounded-lg border border-border px-4 py-6 text-center text-sm text-danger">
      {message || "Failed to load"}
    </div>
  );
}
