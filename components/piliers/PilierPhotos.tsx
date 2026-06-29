"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPhotoAction } from "@/lib/uploads/actions";
import { assetDisplaySrc } from "@/lib/storage/display";

export interface PhotoView {
  id: string;
  displayUrl: string;
}

/**
 * Galerie + upload de photos rattachées à un pilier (consentement vérifié côté
 * serveur). Lecture seule possible (pilier soumis/validé).
 */
export function PilierPhotos({
  pilierId,
  kind,
  photos,
  readOnly = false,
  label = "Ajouter une photo",
}: {
  pilierId: string;
  kind: string;
  photos: PhotoView[];
  readOnly?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    fd.set("pilierId", pilierId);
    const res = await uploadPhotoAction(fd);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return setError(res.error);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetDisplaySrc(p.displayUrl)}
                alt="Photo"
                className="aspect-square w-full rounded-xl object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2 text-sm text-navy-600 hover:border-navy-300">
          <span>{pending ? "Envoi…" : `+ ${label}`}</span>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
