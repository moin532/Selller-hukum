"use client";

import { useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiDownload, apiPost } from "@/lib/api-client";
import { parseCatalogCsv } from "@/lib/csv-catalog";

export default function ProductImportPage() {
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setReport(null);
    setParseErrors([]);
    const name = String(file.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setError("Excel (.xlsx) is not supported yet. Save as CSV (UTF-8) and upload that file.");
      setRows([]);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const { rows: parsed, errors } = parseCatalogCsv(text);
        setParseErrors(errors || []);
        if (!parsed.length) {
          setError(
            errors?.[0]?.message ||
              "No data rows found. Use headers: sku,name_en,name_ar,brand,price,currency,moq,description_en,category,status"
          );
          setRows([]);
          return;
        }
        setRows(parsed);
      } catch (err) {
        setError(err.message || "Could not parse CSV");
        setRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function upload() {
    if (!rows.length) return;
    setBusy(true);
    setError("");
    try {
      const payloadRows = rows.map(({ _row, ...rest }) => ({ ...rest, _row }));
      const { json } = await apiPost("/api/import-export", { rows: payloadRows });
      if (!json.success) throw new Error(json.message || "Import failed");
      setReport(json.data?.report || json.data);
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    setError("");
    setBusy(true);
    try {
      await apiDownload("/api/import-export?template=1", "catalog-template.csv");
    } catch (e) {
      setError(e.message || "Could not download template");
    } finally {
      setBusy(false);
    }
  }

  const previewKeys = [
    "sku",
    "name_en",
    "name_ar",
    "brand",
    "price",
    "currency",
    "moq",
    "description_en",
    "category",
    "status",
  ];

  return (
    <SellerShell title="Bulk product import">
      <PageHeader
        title="Bulk CSV import"
        subtitle="Upload a CSV price list (UTF-8). Required: name_en or sku. Optional: name_ar, brand, price, currency, moq, description_en, category (key/slug/name), status. Excel (.xlsx) — save as CSV first."
        actions={
          <Link href="/dashboard/products" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to products
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void downloadTemplate()}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Download CSV template
        </button>
        <label className="cursor-pointer rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white">
          Choose CSV
          <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={onFile} />
        </label>
        <button
          type="button"
          disabled={!rows.length || busy}
          onClick={() => void upload()}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Importing…" : `Import ${rows.length || ""} rows`}
        </button>
      </div>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {parseErrors.length ? (
        <div className="mb-4 rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm">
          <p className="m-0 font-semibold text-danger">Parse / validation issues</p>
          <ul className="mt-2 mb-0 list-disc pl-5 text-muted">
            {parseErrors.slice(0, 30).map((e, i) => (
              <li key={i}>
                {e.row != null ? `Row ${e.row}` : "File"}
                {e.field ? ` · ${e.field}` : ""}: {e.message}
              </li>
            ))}
          </ul>
          {parseErrors.length > 30 ? (
            <p className="mt-2 mb-0 text-xs text-muted">Showing first 30 of {parseErrors.length}</p>
          ) : null}
        </div>
      ) : null}

      {report ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="m-0 font-semibold">Import report</p>
          <p className="mt-2 mb-0 text-muted">
            uploaded {report.uploaded} · created {report.created} · missing {report.missingFields} ·
            duplicates {report.duplicates}
            {report.invalid != null ? ` · invalid ${report.invalid}` : ""}
          </p>
          {Array.isArray(report.errors) && report.errors.length ? (
            <ul className="mt-3 mb-0 list-disc pl-5 text-danger">
              {report.errors.slice(0, 40).map((e, i) => (
                <li key={i}>
                  Row {e.row}
                  {e.field ? ` · ${e.field}` : ""}: {e.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-2 font-semibold">#</th>
                {previewKeys.map((h) => (
                  <th key={h} className="p-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2 text-muted">{r._row || i + 2}</td>
                  {previewKeys.map((h) => (
                    <td key={h} className="p-2">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 40 ? <p className="p-2 text-xs text-muted">Showing first 40 of {rows.length}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-muted">No rows loaded yet.</p>
      )}
    </SellerShell>
  );
}
