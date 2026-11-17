"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { ProductQaPanel } from "@/components/products/ProductQaPanel";
import { fetchProduct } from "@/services/products-api";
import { getSellerUser } from "@/lib/session";
import { productTitle } from "@/lib/product-display";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct(String(id))
      .then((p) => {
        const vendorId = typeof p.vendorId === "object" ? String(p.vendorId?._id || "") : String(p.vendorId || "");
        const mine = getSellerUser()?.vendorId;
        if (mine && vendorId && vendorId !== mine) {
          setError("Forbidden");
          return;
        }
        setProduct(p);
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SellerShell title="Product">
      <PageHeader
        title={product ? productTitle(product) : "Product"}
        subtitle="Marketplace-style preview of how buyers will see this listing."
        actions={
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => router.push("/dashboard/products")}>
              Back
            </button>
            <Link href={`/dashboard/products/${id}/edit`} className="btn-primary">
              Edit
            </Link>
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}
      {product ? (
        <>
          <ProductDetailView product={product} />
          <ProductQaPanel productId={String(product._id || id)} />
        </>
      ) : null}
    </SellerShell>
  );
}
