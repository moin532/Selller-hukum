"use client";

import { localized } from "@/services/categories-api";

/**
 * Renders category-driven attribute definitions from /api/categories?resource=product-form
 */
export function DynamicAttributeFields({ attributes = [], values = {}, onChange, errors = {} }) {
  if (!attributes.length) {
    return <p className="text-sm text-muted">No category-specific attributes for this selection.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {attributes.map((attr) => {
        const key = attr.key;
        const label = localized(attr.label, key);
        const required = attr.requirement === "mandatory";
        const value = values[key] ?? "";
        const err = errors[key];
        const common = {
          id: `attr-${key}`,
          className: "input-field mt-1",
          value: Array.isArray(value) ? value : value ?? "",
          onChange: (e) => {
            const next = e.target.type === "checkbox" ? e.target.checked : e.target.value;
            onChange(key, next);
          },
          "aria-required": required,
        };

        let control = null;
        switch (attr.type) {
          case "textarea":
          case "long_text":
          case "rich_text":
            control = <textarea {...common} className="input-field mt-1 min-h-24" />;
            break;
          case "boolean":
          case "checkbox":
            control = (
              <label className="mt-2 flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(key, e.target.checked)}
                />
                {label}
              </label>
            );
            break;
          case "dropdown":
          case "radio":
          case "select":
            control = (
              <select
                id={common.id}
                className={common.className}
                value={value || ""}
                onChange={(e) => onChange(key, e.target.value)}
              >
                <option value="">Select…</option>
                {(attr.options || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {localized(o.label, o.value)}
                  </option>
                ))}
              </select>
            );
            break;
          case "multi_select":
            control = (
              <select
                id={common.id}
                className={common.className}
                multiple
                value={Array.isArray(value) ? value : value ? [value] : []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  onChange(key, selected);
                }}
              >
                {(attr.options || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {localized(o.label, o.value)}
                  </option>
                ))}
              </select>
            );
            break;
          case "number":
          case "integer":
          case "decimal":
          case "measurement":
          case "weight":
          case "currency":
          case "percentage":
            control = (
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  value={value ?? ""}
                  onChange={(e) => onChange(key, e.target.value === "" ? "" : Number(e.target.value))}
                  step={attr.type === "integer" ? 1 : "any"}
                />
                {attr.unit || attr.allowedUnits?.[0] ? (
                  <span className="flex items-center text-xs text-muted">{attr.unit || attr.allowedUnits[0]}</span>
                ) : null}
              </div>
            );
            break;
          case "date":
            control = <input type="date" {...common} />;
            break;
          default:
            control = <input type="text" {...common} placeholder={attr.unit ? `e.g. value in ${attr.unit}` : ""} />;
        }

        if (attr.type === "boolean" || attr.type === "checkbox") {
          return (
            <div key={key} className="sm:col-span-2">
              {control}
              {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
            </div>
          );
        }

        return (
          <label key={key} className="block text-sm text-muted" htmlFor={common.id}>
            {label}
            {required ? <span className="text-danger"> *</span> : null}
            {attr.requirement === "recommended" ? (
              <span className="ms-1 text-[0.65rem] uppercase tracking-wide text-gold">Recommended</span>
            ) : null}
            {control}
            {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
          </label>
        );
      })}
    </div>
  );
}

export function validateMandatoryAttributes(attributes, values) {
  const errors = {};
  for (const attr of attributes || []) {
    if (attr.requirement !== "mandatory") continue;
    const v = values[attr.key];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) errors[attr.key] = `${localized(attr.label, attr.key)} is required`;
  }
  return errors;
}
