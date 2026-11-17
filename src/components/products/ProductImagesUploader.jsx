"use client";

import { useRef, useState } from "react";
import { Star, Upload, X } from "lucide-react";
import { firstUploadedFile, mediaAbsoluteUrl, uploadFile } from "@/services/uploads-api";

const MAX_IMAGES = 7;
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Multi-image product gallery — first image is primary. Max 7.
 */
export function ProductImagesUploader({
  images = [],
  onChange,
  productId = "",
  max = MAX_IMAGES,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const remaining = Math.max(0, max - list.length);

  function setImages(next) {
    onChange?.(next.slice(0, max));
  }

  function removeAt(index) {
    setImages(list.filter((_, i) => i !== index));
    setError("");
  }

  function makePrimary(index) {
    if (index <= 0 || index >= list.length) return;
    const next = [...list];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    setImages(next);
  }

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const room = Math.max(0, max - list.length);
    if (room <= 0) {
      setError(`Maximum ${max} images. Remove one to add another.`);
      return;
    }

    const batch = files.slice(0, room);
    setBusy(true);
    setError("");
    const uploaded = [];

    try {
      for (let i = 0; i < batch.length; i += 1) {
        const file = batch[i];
        setProgress(`Uploading ${i + 1} of ${batch.length}…`);
        if (!file.type?.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(file.name || "")) {
          throw new Error(`${file.name || "File"} is not an image (JPG/PNG/WebP)`);
        }
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name || "File"} is over 5MB`);
        }
        const data = await uploadFile({
          kind: "product",
          file,
          productId,
          alt: file.name,
        });
        const first = firstUploadedFile(data);
        const url = first?.url || "";
        if (!url) throw new Error("Upload succeeded but no file URL was returned");
        uploaded.push(url);
      }
      setImages([...list, ...uploaded]);
      if (files.length > room) {
        setError(`Only ${room} more image(s) allowed (max ${max}). Extra files were skipped.`);
      }
    } catch (err) {
      if (uploaded.length) setImages([...list, ...uploaded]);
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="m-0 text-sm font-medium text-text">Product images</p>
          <p className="m-0 mt-1 text-xs text-muted">
            Upload up to {max} photos. First image is the primary cover. JPG, PNG, or WebP · max 5MB each.
          </p>
        </div>
        <p className="m-0 text-xs text-gold">
          {list.length} / {max} uploaded
        </p>
      </div>

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={`relative overflow-hidden rounded-xl border bg-surface ${
                index === 0 ? "border-gold ring-1 ring-gold" : "border-border"
              }`}
            >
              <div className="relative aspect-[4/3] bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaAbsoluteUrl(url)}
                  alt=""
                  className="h-full w-full object-contain"
                />
                {index === 0 ? (
                  <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-md bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-bg">
                    <Star size={10} /> Primary
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn-icon absolute end-2 top-2"
                  aria-label="Remove image"
                  onClick={() => removeAt(index)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-[11px] text-muted">Image {index + 1}</span>
                {index > 0 ? (
                  <button
                    type="button"
                    className="text-[11px] text-gold hover:underline"
                    onClick={() => makePrimary(index)}
                  >
                    Make primary
                  </button>
                ) : (
                  <span className="text-[11px] text-muted">Cover photo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          No images yet. Add at least one photo to continue.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-outline inline-flex items-center gap-2"
          disabled={busy || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />
          {busy ? progress || "Uploading…" : remaining > 0 ? `Add images (${remaining} left)` : "Limit reached"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={onPick}
        />
      </div>
      {error ? <p className="m-0 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export const PRODUCT_IMAGE_MAX = MAX_IMAGES;
