import { assetDisplaySrc } from "@/lib/storage/display";

export interface GalleryItem {
  id: string;
  displayUrl: string;
  note: string | null;
}

/** Affichage en lecture seule d'un moodboard (grille d'images). */
export function MoodboardGallery({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-navy-400">Aucune inspiration.</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <li key={it.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetDisplaySrc(it.displayUrl)}
            alt={it.note ?? "Inspiration"}
            className="aspect-square w-full rounded-xl object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
