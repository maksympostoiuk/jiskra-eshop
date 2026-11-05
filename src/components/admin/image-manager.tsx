"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input, Select } from "@/components/ui/form";
import { uploadImages } from "@/server/admin/products";
import { uid, type ImageForm } from "./product-form-model";

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Product images: upload (button or drag & drop files), reorder (drag & drop or arrow buttons), alt texts, colour link. */
export function ImageManager({
  images,
  onChange,
  colorOptions,
}: {
  images: ImageForm[];
  onChange: (images: ImageForm[]) => void;
  colorOptions: Array<{ value: string; label: string }>;
}) {
  const t = useTranslations("admin.images");
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  // One request per file keeps each server-action body well under the size limit.
  const upload = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setError(null);
    startUpload(async () => {
      const added: ImageForm[] = [];
      for (const file of list) {
        const formData = new FormData();
        formData.append("files", file);
        const result = await uploadImages(formData);
        if (!result.ok) {
          setError(result.message ?? t("uploadFailed"));
          break;
        }
        for (const url of result.data?.urls ?? []) added.push({ key: uid(), url, altCs: "", altEn: "", colorValue: "" });
      }
      if (added.length) onChange([...images, ...added]);
    });
  };

  const update = (index: number, patch: Partial<ImageForm>) => onChange(images.map((im, i) => (i === index ? { ...im, ...patch } : im)));

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            setDropActive(false);
            upload(e.dataTransfer.files);
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors",
          dropActive ? "border-brand bg-brand-soft" : "border-line-strong bg-canvas",
        )}
      >
        <ImagePlus className="size-6 text-ink-faint" aria-hidden="true" />
        <p className="text-ink-soft">{uploading ? t("uploading") : t("dropHint")}</p>
        <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full border border-ink px-4 py-1.5 text-sm font-medium hover:bg-ink hover:text-white" disabled={uploading}>
          {t("choose")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-ink-faint">{t("limits")}</p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t("listLabel")}>
          {images.map((im, index) => (
            <li
              key={im.key}
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragIndex !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                onChange(moveItem(images, dragIndex, index));
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn("flex gap-3 rounded-xl border border-line bg-surface p-3", dragIndex === index && "opacity-50")}
            >
              <div className="flex flex-col items-center gap-1">
                <GripVertical className="size-4 cursor-grab text-ink-faint" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary uploads */}
                <img src={im.url} alt="" className="size-20 rounded-lg border border-line bg-canvas object-contain" />
                <span className="text-xs text-ink-faint">{index === 0 ? t("main") : `#${index + 1}`}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Input aria-label={t("altCs")} placeholder={t("altCs")} value={im.altCs} onChange={(e) => update(index, { altCs: e.target.value })} className="h-8" />
                <Input aria-label={t("altEn")} placeholder={t("altEn")} value={im.altEn} onChange={(e) => update(index, { altEn: e.target.value })} className="h-8" />
                {colorOptions.length > 0 && (
                  <Select aria-label={t("color")} value={im.colorValue} onChange={(e) => update(index, { colorValue: e.target.value })} className="h-8">
                    <option value="">{t("allColors")}</option>
                    {colorOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                )}
                <div className="mt-auto flex items-center gap-1">
                  <IconBtn label={t("moveLeft")} disabled={index === 0} onClick={() => onChange(moveItem(images, index, index - 1))}>
                    <ArrowLeft className="size-4" />
                  </IconBtn>
                  <IconBtn label={t("moveRight")} disabled={index === images.length - 1} onClick={() => onChange(moveItem(images, index, index + 1))}>
                    <ArrowRight className="size-4" />
                  </IconBtn>
                  <span className="flex-1" />
                  <IconBtn label={t("remove")} onClick={() => onChange(images.filter((_, i) => i !== index))} danger>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("grid size-8 place-items-center rounded-full disabled:opacity-30", danger ? "text-danger hover:bg-danger-soft" : "text-ink-soft hover:bg-muted")}
    >
      {children}
    </button>
  );
}
