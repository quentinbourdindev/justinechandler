"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMoodboardUrlAction,
  addMoodboardPhotoAction,
  removeMoodboardItemAction,
} from "@/lib/piliers/actions";
import { assetDisplaySrc } from "@/lib/storage/display";
import { Button } from "@/components/ui/Button";

export interface MoodboardItemView {
  id: string;
  displayUrl: string;
  note: string | null;
}

/**
 * Éditeur de moodboard : ajout par upload (conditionné au consentement photos,
 * vérifié côté serveur) ou par URL externe, suppression. Lecture seule possible.
 */
export function MoodboardEditor({
  pilierId,
  items,
  readOnly = false,
}: {
  pilierId: string;
  items: MoodboardItemView[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onAddUrl() {
    setError(null);
    const res = await addMoodboardUrlAction(pilierId, url, null);
    if (!res.ok) return setError(res.error);
    setUrl("");
    refresh();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("pilierId", pilierId);
    const res = await addMoodboardPhotoAction(fd);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return setError(res.error);
    refresh();
  }

  async function onRemove(itemId: string) {
    setError(null);
    const res = await removeMoodboardItemAction(pilierId, itemId);
    if (!res.ok) return setError(res.error);
    refresh();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <li key={it.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetDisplaySrc(it.displayUrl)}
                alt={it.note ?? "Inspiration"}
                className="aspect-square w-full rounded-xl object-cover"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  aria-label="Retirer"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-navy-900/70 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-navy-400">
          {readOnly ? "Aucune inspiration." : "Ajoute des images qui te ressemblent."}
        </p>
      )}

      {!readOnly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Coller une URL d'inspiration…"
              className="h-10 flex-1 rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-navy-400"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddUrl}
              disabled={pending || url.trim().length === 0}
            >
              Ajouter
            </Button>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2 text-sm text-navy-600 hover:border-navy-300">
            <span>+ Importer une photo</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFile}
            />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
