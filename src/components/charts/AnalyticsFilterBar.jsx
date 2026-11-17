"use client";

import { RANGE_OPTIONS, GRANULARITY_OPTIONS } from "@/lib/analytics";

export function AnalyticsFilterBar({
  range,
  granularity,
  compare,
  onRange,
  onGranularity,
  onCompare,
  onClear,
  onExport,
  busy,
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
      <label className="text-xs text-muted">
        Date range
        <select className="input-field mt-1 min-w-[160px]" value={range} onChange={(e) => onRange(e.target.value)} disabled={busy}>
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Granularity
        <select
          className="input-field mt-1 min-w-[120px]"
          value={granularity}
          onChange={(e) => onGranularity(e.target.value)}
          disabled={busy}
        >
          {GRANULARITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-muted">
        <input type="checkbox" checked={compare} onChange={(e) => onCompare(e.target.checked)} disabled={busy} />
        Compare prior period
      </label>
      <div className="ms-auto flex flex-wrap gap-2">
        <button type="button" className="btn-outline" onClick={onClear} disabled={busy}>
          Clear
        </button>
        <button type="button" className="btn-primary" onClick={onExport} disabled={busy}>
          Export CSV
        </button>
      </div>
    </div>
  );
}
