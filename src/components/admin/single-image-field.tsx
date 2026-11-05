"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/form";
import { uploadImages } from "@/server/admin/products";

/** One image: upload via Storage or paste a URL / path. */
export function SingleImageField({ id, value, onChange, label }: { id: string; value: string; onChange: (url: string) => void; label: string }) {
  const t = useTranslations("admin.images");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const upload = (file: File) => {
    const fd = new FormData();
    fd.append("files", file);
    setError(null);
    start(async () => {
      const r = await uploadImages(fd);
      if (r.ok && r.data?.urls[0]) onChange(r.data.urls[0]);
      else setError(r.message ?? t("uploadFailed"));
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
          {value ? <img src={value} alt="" className="size-full object-contain" /> : <ImagePlus className="size-6 text-ink-faint" aria-hidden="true" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input id={id} value={value} placeholder="/uploads/…" onChange={(e) => onChange(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={pending} className="rounded-full border border-ink px-3 py-1 text-xs font-medium hover:bg-ink hover:text-white">
              {pending ? t("uploading") : t("choose")}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-danger hover:bg-danger-soft">
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
