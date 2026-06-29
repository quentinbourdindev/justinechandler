import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth/guards";
import { getPilierById, getValidationsForPilier } from "@/lib/db/piliers";
import { getClienteById } from "@/lib/db/clientes";
import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { PILIERS_META } from "@/lib/piliers-meta";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { MoodboardGallery, type GalleryItem } from "@/components/MoodboardGallery";
import { ValidationForm } from "@/components/coach/ValidationForm";
import { formatDateTimeFr } from "@/lib/format";

export const metadata: Metadata = { title: "Validation" };

export default async function ValidationPage({
  params,
}: {
  params: Promise<{ pilierId: string }>;
}) {
  await requireCoach();
  const { pilierId } = await params;

  const pilier = await getPilierById(pilierId);
  if (!pilier) notFound();
  const cliente = await getClienteById(pilier.cliente_id);
  if (!cliente) notFound();

  // Seul un pilier soumis se valide ; sinon → fiche cliente.
  if (pilier.status !== "submitted") {
    redirect(`/coach/clientes/${cliente.id}`);
  }

  const meta = PILIERS_META[pilier.numero];
  const history = await getValidationsForPilier(pilier.id);

  // Contenu à relire (Pilier 1 : 3 mots + moodboard).
  let moodboardItems: GalleryItem[] = [];
  if (pilier.numero === 1) {
    const boards = await getMoodboardsForPilier(cliente.id, pilier.id);
    moodboardItems = boards.flatMap((b) =>
      b.items.map((it) => ({ id: it.id, displayUrl: it.display_url, note: it.note }))
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/coach/tableau-de-bord" className="text-sm text-navy-500 underline">
          ← File d'attente
        </Link>
        <h1 className="mt-2 font-display text-2xl text-navy-800">
          {cliente.first_name} {cliente.last_name}
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Pilier {pilier.numero} — {meta.nom} ·{" "}
          {pilier.submitted_at && `soumis le ${formatDateTimeFr(pilier.submitted_at)}`}
        </p>
      </div>

      {/* Contenu soumis */}
      {pilier.numero === 1 ? (
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
              <MoodboardGallery items={moodboardItems} />
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <CardMuted>
            Aperçu détaillé du contenu de ce pilier à la tranche suivante. La
            décision ci-dessous reste fonctionnelle.
          </CardMuted>
        </Card>
      )}

      {/* Historique des décisions */}
      {history.length > 0 && (
        <Card>
          <CardTitle className="text-base">Historique</CardTitle>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3">
                <span className="text-navy-600">
                  {h.decision === "validated" ? "Validé" : "Retouche demandée"}
                  {h.comment && <span className="text-navy-400"> — « {h.comment} »</span>}
                </span>
                <span className="shrink-0 text-xs text-navy-400">
                  {formatDateTimeFr(h.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Décision */}
      <Card>
        <CardTitle className="text-base">Ta décision</CardTitle>
        <p className="mt-1 text-sm text-navy-500">
          L'IA assiste, tu valides. Valider débloque le pilier suivant.
        </p>
        <div className="mt-4">
          <ValidationForm pilierId={pilier.id} />
        </div>
      </Card>
    </div>
  );
}
