"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { apiGet } from "@/lib/api-client";
import { catalogueDraftToProduct } from "@/lib/catalogue-draft-map";
import { productTitle } from "@/lib/product-display";

function PreviewInner() {
  const router = useRouter();
  const search = useSearchParams();
  const id = String(search.get("id") || "");
  const index = Math.max(0, Number(search.get("index") || 0));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("Missing extraction id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    apiGet(`/api/ai?resource=extraction&id=${encodeURIComponent(id)}&index=${index}`)
      .then(({ json }) => {
        if (!json.success) throw new Error(json.message || "Failed to load preview");
        setExtraction(json.data?.extraction || null);
        setDraft(json.data?.draft || null);
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, [id, index]);

  const product = useMemo(
    () => catalogueDraftToProduct(draft, { extractionId: id, index }),
    [draft, id, index]
  );

  return (
    <SellerShell title="AI draft details">
      <PageHeader
        title={product ? productTitle(product) : "AI draft details"}
        subtitle="Full preview of the AI-generated listing (not published yet)."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => router.push("/dashboard/products/ai-catalogue")}
            >
              Back to catalogue
            </button>
            {extraction?.status === "needs_review" ? (
              <Link href="/dashboard/products/ai-catalogue" className="btn-primary">
                Edit / approve
              </Link>
            ) : null}
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}
      {!loading && product ? (
        <div className="space-y-3">
          <p className="m-0 text-xs text-muted">
            Status: {extraction?.status || "preview"} · SKU {product.sku || "—"} · source{" "}
            {draft?.source || "ai"}
          </p>
          <ProductDetailView product={product} showPublicLink={false} />
        </div>
      ) : null}
      {!loading && !product && !error ? (
        <p className="text-muted">No draft found at this index.</p>
      ) : null}
    </SellerShell>
  );
}

export default function AiCataloguePreviewPage() {
  return (
    <Suspense
      fallback={
        <SellerShell title="AI draft details">
          <p className="text-muted">Loading…</p>
        </SellerShell>
      }
    >
      <PreviewInner />
    </Suspense>
  );
}
