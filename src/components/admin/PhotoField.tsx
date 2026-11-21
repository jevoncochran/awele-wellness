"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { LeafIcon } from "@/components/icons";
import { PhotoError, preparePhoto } from "@/lib/prepare-photo";

// Photo picker for the soap forms. Choosing a file shrinks it, uploads it, and
// puts the resulting address in a hidden input named `name`, so the surrounding
// form saves it like any other field.
export default function PhotoField({
  name,
  initialUrl = "",
  onUploadingChange,
}: {
  name: string;
  initialUrl?: string;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) return;

    setError("");
    setBusy(true);
    try {
      const prepared = await preparePhoto(file);
      const body = new FormData();
      body.set("file", prepared);
      const response = await fetch("/api/admin/upload-image", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        throw new PhotoError(result.error ?? "Couldn't upload the photo. Please try again.");
      }
      setUrl(result.url);
    } catch (err) {
      setError(
        err instanceof PhotoError ? err.message : "Couldn't upload the photo. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <input type="hidden" name={name} value={url} />
      <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-brand-100">
        {url ? (
          <Image src={url} alt="Soap photo preview" fill sizes="112px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <LeafIcon className="size-8 text-brand-700" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a soap photo"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-brand-700/30 px-5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : url ? "Replace photo" : "Choose photo"}
        </button>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : (
          <p className="text-xs text-ink-muted">JPEG, PNG or WebP. Large photos are shrunk automatically.</p>
        )}
      </div>
    </div>
  );
}
