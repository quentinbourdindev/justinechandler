import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth/guards";
import { getClienteById, boussoleFromCliente, computeAge } from "@/lib/db/clientes";
import { getPiliersForCliente } from "@/lib/db/piliers";
import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { getColorProfile, getMorphoProfile } from "@/lib/db/profiles";
import { listPiecesForTri, listPiecesForWardrobe } from "@/lib/db/pieces";
import { listLooks } from "@/lib/db/looks";
import { PiliersTimeline } from "@/components/PiliersTimeline";
import { Boussole } from "@/components/Boussole";
import { MoodboardGallery, type GalleryItem } from "@/components/MoodboardGallery";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { PILIERS_META } from "@/lib/piliers-meta";
import { buttonClasses } from "@/components/ui/Button";
import { ResetPasswordButton } from "@/components/coach/ResetPasswordButton";
import { WARDROBE_CATEGORIES } from "@/lib/db/types";

export const metadata: Metadata = { title: "Fiche cliente" };

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
        <li key={t} className="rounded-full bg-navy-100 px-2.5 py-0.5 text-sm text-navy-700">
          {t}
        </li>
      ))}
    </ul>
  );
}

export default async function FicheClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCoach();
  const { id } = await params;

  const cliente = await getClienteById(id);
  if (!cliente) notFound();

  const piliers = await getPiliersForCliente(cliente.id);
  const submitted = piliers.filter((p) => p.status === "submitted");
  const age = computeAge(cliente.birth_date);
  const p1 = piliers.find((p) => p.numero === 1);

  const [color, morpho, triPieces, wardrobePieces, looks, p1Boards] = await Promise.all([
    getColorProfile(cliente.id),
    getMorphoProfile(cliente.id),
    listPiecesForTri(cliente.id),
    listPiecesForWardrobe(cliente.id),
    listLooks(cliente.id),
    p1 ? getMoodboardsForPilier(cliente.id, p1.id) : Promise.resolve([]),
  ]);

  const moodboardItems: GalleryItem[] = p1Boards.flatMap((b) =>
    b.items.map((it) => ({ id: it.id, displayUrl: it.display_url, note: it.note }))
  );
  const kept = triPieces.filter((p) => p.tri_decision === "garder");
  const removed = triPieces.filter((p) => p.tri_decision === "sortir");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/coach/tableau-de-bord" className="text-sm text-navy-500 underline">
          ← Tableau de bord
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-navy-800">
              {cliente.first_name} {cliente.last_name}
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              {cliente.city ? `${cliente.city} · ` : ""}
              {age !== null ? `${age} ans · ` : ""}
              <span className="capitalize">{cliente.status.replace("_", " ")}</span>
            </p>
          </div>
          <ResetPasswordButton clienteId={cliente.id} />
        </div>
      </div>

      <Card>
        <CardTitle className="text-base">Sa boussole</CardTitle>
        <div className="mt-2">
          <Boussole words={boussoleFromCliente(cliente)} />
        </div>
      </Card>

      {submitted.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-2xl border border-jaune-300 bg-jaune-50 p-4"
        >
          <span className="text-sm text-navy-700">
            Pilier {p.numero} — {PILIERS_META[p.numero].nom} : en attente de validation
          </span>
          <Link href={`/coach/validations/${p.id}`} className={buttonClasses("primary", "sm")}>
            Valider →
          </Link>
        </div>
      ))}

      <section className="space-y-3">
        <h2 className="font-display text-lg text-navy-800">Avancement</h2>
        <PiliersTimeline piliers={piliers} />
      </section>

      {/* Pilier 1 — moodboard */}
      <Card>
        <CardTitle className="text-base">Identité — moodboard</CardTitle>
        <div className="mt-3">
          {moodboardItems.length > 0 ? (
            <MoodboardGallery items={moodboardItems} />
          ) : (
            <CardMuted>Pas encore d'inspiration.</CardMuted>
          )}
        </div>
      </Card>

      {/* Pilier 2 — colorimétrie & morphologie */}
      {(color || morpho) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {color && (
            <Card className="space-y-2">
              <CardTitle className="text-base">Colorimétrie</CardTitle>
              {color.season && <p className="text-sm text-navy-600">Saison : {color.season}</p>}
              <p className="text-xs text-navy-400">Couleurs phares</p>
              <Chips items={strArray(color.palette["dominantes"])} />
              <p className="text-xs text-navy-400">À éviter</p>
              <Chips items={strArray(color.palette["a_eviter"])} />
            </Card>
          )}
          {morpho && (
            <Card className="space-y-2">
              <CardTitle className="text-base">Morphologie</CardTitle>
              <p className="text-sm text-navy-600">Silhouette : {morpho.type}</p>
              <p className="text-xs text-navy-400">À valoriser</p>
              <Chips items={strArray(morpho.reco["valoriser"])} />
              <p className="text-xs text-navy-400">À éviter</p>
              <Chips items={strArray(morpho.reco["eviter"])} />
            </Card>
          )}
        </div>
      )}

      {/* Pilier 3 — tri */}
      {triPieces.length > 0 && (
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
                    {p.tri_criterion && (
                      <span className="text-navy-400"> — {CRITERION_LABEL[p.tri_criterion]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Pilier 4 — garde-robe & looks */}
      {(wardrobePieces.length > 0 || looks.length > 0) && (
        <Card className="space-y-4">
          <CardTitle className="text-base">Nouvelle garde-robe</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {WARDROBE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="text-sm font-medium text-navy-700">{CAT_LABEL[cat]}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-navy-600">
                  {wardrobePieces.filter((p) => p.wardrobe_category === cat).map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
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
      )}
    </div>
  );
}
