"use client";

import { useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPost } from "@/lib/api-client";

export default function CatalogueSyncPage() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify({ items: [{ sku: "DEMO-SKU", price: 120, currency: "SAR", moq: 10 }] }, null, 2)
  );
  const [docs, setDocs] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDocs() {
    setError("");
    try {
      const { json } = await apiGet("/api/procurement/catalogue-sync");
      if (!json.success) throw new Error(json.message);
      setDocs(json.data);
    } catch (e) {
      setError(e.message || "Failed");
    }
  }

  async function sync(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = JSON.parse(jsonText);
      const { json } = await apiPost("/api/procurement/catalogue-sync", body);
      if (!json.success) throw new Error(json.message);
      setResult(json.data);
    } catch (err) {
      setError(err.message || "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Catalogue sync">
      <PageHeader
        title="Catalogue sync API & price-list updates"
        subtitle="Push SKU price / MOQ updates via authenticated API. Max 200 rows per call."
        actions={
          <button type="button" onClick={() => void loadDocs()} className="rounded-lg border border-border px-3 py-2 text-sm">
            Show API docs
          </button>
        }
      />

      {docs ? (
        <pre className="mb-4 overflow-auto rounded-xl border border-border bg-card p-4 text-xs">
          {JSON.stringify(docs, null, 2)}
        </pre>
      ) : null}

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {result ? (
        <p className="mb-3 text-sm text-gold">
          Updated {result.updated} / accepted {result.accepted}
          {result.errors?.length ? ` · ${result.errors.length} issues` : ""}
        </p>
      ) : null}

      <form onSubmit={sync} className="space-y-3">
        <textarea
          className="input-field min-h-[200px] w-full font-mono text-xs"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Syncing…" : "Push price-list update"}
        </button>
      </form>
    </SellerShell>
  );
}
