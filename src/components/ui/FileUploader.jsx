"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { firstUploadedFile, mediaAbsoluteUrl, uploadFile } from "@/services/uploads-api";

export function FileUploader({
  kind,
  label = "Upload",
  accept = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp",
  productId = "",
  docType = "other",
  onUploaded,
  previewUrl = "",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(previewUrl);

  useEffect(() => {
    setPreview(previewUrl || "");
    setError("");
  }, [previewUrl]);

  async function onChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    // Instant local preview so the box is never blank while upload finishes.
    let localUrl = "";
    if (file.type?.startsWith("image/")) {
      localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
    } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
      setPreview("");
    }
    try {
      const data = await uploadFile({ kind, file, productId, docType, alt: file.name });
      const first = firstUploadedFile(data);
      const rawUrl = first?.url || "";
      if (!rawUrl) {
        throw new Error("Upload succeeded but no file URL was returned");
      }
      const url = mediaAbsoluteUrl(rawUrl);
      setPreview(url);
      if (localUrl) URL.revokeObjectURL(localUrl);
      onUploaded?.(first, data);
    } catch (err) {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
        setPreview("");
      }
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {label ? <p className="m-0 text-sm text-muted">{label}</p> : null}
      {preview ? (
        <div className="relative h-36 w-full overflow-hidden rounded-lg border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-full w-full object-contain"
            onError={() => {
              // Missing/old media files → clear broken icon; user can re-upload.
              setPreview("");
            }}
          />
          <button
            type="button"
            className="btn-icon absolute end-2 top-2"
            aria-label="Clear preview"
            onClick={() => {
              setPreview("");
              setError("");
              onUploaded?.(null, null);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="btn-outline inline-flex items-center gap-2"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} />
        {busy ? "Uploading…" : preview ? "Replace file" : "Choose file"}
      </button>
      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={onChange} />
      <p className="m-0 text-[11px] text-muted">JPG, PNG, or WebP · max 5MB</p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
