"use client";

import { useId, useState } from "react";
import { cn } from "@/components/ui/cn";

/**
 * Uploader photo — composant VISUEL du design system (Phase 0). Affiche un
 * aperçu local côté navigateur ; l'upload réel (URLs signées IONOS S3,
 * consentement RGPD) est branché en Phase 3 derrière lib/storage. Aucune image
 * n'est envoyée ici.
 */
export function PhotoUploader({
  label = "Ajouter une photo",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/50 p-6 text-center transition-colors hover:border-navy-300"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aperçu"
            className="h-32 w-32 rounded-xl object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy-400 shadow-soft">
            +
          </span>
        )}
        <span className="text-sm font-medium text-navy-700">{label}</span>
        <span className="text-xs text-navy-400">JPG ou PNG — aperçu local uniquement</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
      />
    </div>
  );
}
