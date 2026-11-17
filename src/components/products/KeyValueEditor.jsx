"use client";

import { Plus, Trash2 } from "lucide-react";

/** Dynamic specification / meta key–value rows */
export function KeyValueEditor({
  rows = [],
  onChange,
  keyPlaceholder = "Specification (e.g. Color)",
  valuePlaceholder = "Value (e.g. Red)",
  addLabel = "Add specification",
}) {
  function update(i, field, val) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r));
    onChange(next);
  }

  function add() {
    onChange([...rows, { key: "", value: "" }]);
  }

  function remove(i) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            className="input-field min-w-[140px] flex-1"
            placeholder={keyPlaceholder}
            value={row.key || ""}
            onChange={(e) => update(i, "key", e.target.value)}
          />
          <input
            className="input-field min-w-[140px] flex-1"
            placeholder={valuePlaceholder}
            value={row.value || ""}
            onChange={(e) => update(i, "value", e.target.value)}
          />
          <button type="button" className="btn-icon" aria-label="Remove" onClick={() => remove(i)}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={add}>
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}
