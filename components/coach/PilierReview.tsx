import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { getColorProfile, getMorphoProfile } from "@/lib/db/profiles";
import { listPiecesForTri, listPiecesForWardrobe } from "@/lib/db/pieces";
import { listLooks } from "@/lib/db/looks";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { MoodboardGallery, type GalleryItem } from "@/components/MoodboardGallery";
import { WARDROBE_CATEGORIES, type Cliente, type PilierNumero } from "@/lib/db/types";

/** Contenu soumis d'un pilier, vue coach (lecture seule). */

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const CRITERION_LABEL: Record<string, string> = {
  plus_physique: "ne va plus physiquement",
  plus_correspond: "ne correspond plus",
  plus_aligne: "plus alignée",
};
const CAT_LABEL: Record<string, string> = {
  basique: "Basiques",
  personnalite: "Personnalité",
  dopamine: "Dopamine",
};

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <CardMuted>—</CardMuted>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className="rounded-full bg-navy-100 px-2.5 py-0.5 text-sm text-navy-700">{t}</li>
      ))}
    </ul>
  );
}

export async function PilierReview({
  cliente,
  pilierId,
  numero,
}: {
  cliente: Cliente;
  pilierId: string;
  numero: PilierNumero;
}) {
  if (numero === 1) {
    const boards = await getMoodboardsForPilier(cliente.id, pilierId);
    const items: GalleryItem[] = boards.flatMap((b) =>
      b.items.map((it) => ({ id: it.id, displayUrl: it.display_url, note: it.note }))
    );
    return (
      <div className="space-y-4">
        <Card>
          <CardTitle className="text-base">Les 3 mots</CardTitle>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Qui elle est", v: cliente.word_who_she_is },
              { l: "Ce qu'elle aime", v: cliente.word_what_she_likes },
              { l: "À incarner", v: cliente.word_to_embody },
            ].map((w) => (
              <li key={w.l} className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-navy-500">{w.l}</p>
                <p className="mt-1 font-display text-lg text-navy-800">{w.v ?? "—"}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle className="text-base">Moodboard</CardTitle>
          <div className="mt-3">
            <MoodboardGallery items={items} />
          </div>
        </Card>
      </div>
    );
  }

  if (numero === 2) {
    const [color, morpho] = await Promise.all([
      getColorProfile(cliente.id),
      getMorphoProfile(cliente.id),
    ]);
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2">
          <CardTitle className="text-base">Colorimétrie</CardTitle>
          {color?.season && <p className="text-sm text-navy-600">Saison : {color.season}</p>}
          <p className="text-xs text-navy-400">Couleurs phares</p>
          <Chips items={strArray(color?.palette["dominantes"])} />
          <p className="text-xs text-navy-400">À éviter</p>
          <Chips items={strArray(color?.palette["a_eviter"])} />
        </Card>
        <Card className="space-y-2">
          <CardTitle className="text-base">Morphologie</CardTitle>
          <p className="text-sm text-navy-600">Silhouette : {morpho?.type ?? "—"}</p>
          <p className="text-xs text-navy-400">À valoriser</p>
          <Chips items={strArray(morpho?.reco["valoriser"])} />
          <p className="text-xs text-navy-400">À éviter</p>
          <Chips items={strArray(morpho?.reco["eviter"])} />
        </Card>
      </div>
    );
  }

  if (numero === 3) {
    const pieces = await listPiecesForTri(cliente.id);
    const kept = pieces.filter((p) => p.tri_decision === "garder");
    const removed = pieces.filter((p) => p.tri_decision === "sortir");
    return (
      <Card>
        <CardTitle className="text-base">Tri du dressing</CardTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-emerald-700">Gardé ({kept.length})</p>
            <ul className="mt-1 space-y-0.5 text-sm text-navy-600">
              {kept.map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-rose-700">Sorti ({removed.length})</p>
            <ul className="mt-1 space-y-0.5 text-sm text-navy-600">
              {removed.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.tri_criterion && <span className="text-navy-400"> — {CRITERION_LABEL[p.tri_criterion]}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  // numero === 4
  const [pieces, looks] = await Promise.all([
    listPiecesForWardrobe(cliente.id),
    listLooks(cliente.id),
  ]);
  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">Nouvelle garde-robe</CardTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        {WARDROBE_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="text-sm font-medium text-navy-700">{CAT_LABEL[cat]}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-navy-600">
              {pieces.filter((p) => p.wardrobe_category === cat).map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {looks.length > 0 && (
        <div>
          <p className="text-sm font-medium text-navy-700">Looks</p>
          <ul className="mt-1 space-y-1 text-sm text-navy-600">
            {looks.map((l) => (
              <li key={l.id}>
                <span className="font-medium">{l.name}</span>
                {l.pieces.length > 0 && (
                  <span className="text-navy-400"> — {l.pieces.map((p) => p.name).join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
