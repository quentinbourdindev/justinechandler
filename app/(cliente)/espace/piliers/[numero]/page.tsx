import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClienteOnboarded } from "@/lib/auth/guards";
import { getPilierForCliente, getValidationsForPilier } from "@/lib/db/piliers";
import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { PILIERS_META } from "@/lib/piliers-meta";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardMuted } from "@/components/ui/Card";
import { PilierIdentite } from "@/components/piliers/PilierIdentite";
import type { MoodboardItemView } from "@/components/piliers/MoodboardEditor";
import type { PilierNumero } from "@/lib/db/types";

export const metadata: Metadata = { title: "Pilier" };

function parseNumero(raw: string): PilierNumero | null {
  const n = Number(raw);
  return n === 1 || n === 2 || n === 3 || n === 4 ? (n as PilierNumero) : null;
}

export default async function PilierPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero: rawNumero } = await params;
  const numero = parseNumero(rawNumero);
  if (!numero) notFound();

  const { cliente } = await requireClienteOnboarded();
  const pilier = await getPilierForCliente(cliente.id, numero);
  if (!pilier) notFound();
  // Un pilier verrouillé ne s'ouvre pas (le précédent n'est pas validé).
  if (pilier.status === "locked") redirect("/espace/tableau-de-bord");

  const meta = PILIERS_META[numero];
  const readOnly = pilier.status === "submitted" || pilier.status === "validated";

  // Données async précalculées (pas d'await dans le JSX).
  const moodboardItems = numero === 1 ? await loadMoodboardItems(cliente.id, pilier.id) : [];
  const revisionComment =
    pilier.status === "needs_revision"
      ? (await getValidationsForPilier(pilier.id))[0]?.comment ?? null
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/espace/tableau-de-bord" className="text-sm text-navy-500 underline">
          ← Mon parcours
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl text-navy-800">
            Pilier {numero} — {meta.nom}
          </h1>
          <StatusBadge status={pilier.status} />
        </div>
        <p className="mt-1 text-sm text-navy-500">{meta.sous_titre}</p>
      </div>

      {pilier.status === "submitted" && (
        <Card className="border-jaune-300 bg-jaune-50">
          <CardMuted className="text-navy-700">
            Soumis à Justine — en attente de sa validation. En lecture seule pour
            le moment.
          </CardMuted>
        </Card>
      )}
      {pilier.status === "validated" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardMuted className="text-emerald-700">Validé par Justine ✨</CardMuted>
        </Card>
      )}
      {pilier.status === "needs_revision" && (
        <Card className="border-rose-300 bg-rose-50">
          <p className="font-medium text-rose-700">À retoucher</p>
          {revisionComment && (
            <p className="mt-1 text-sm text-navy-600">« {revisionComment} »</p>
          )}
        </Card>
      )}

      {numero === 1 ? (
        <PilierIdentite
          pilierId={pilier.id}
          readOnly={readOnly}
          initialWords={{
            who_she_is: cliente.word_who_she_is ?? "",
            what_she_likes: cliente.word_what_she_likes ?? "",
            to_embody: cliente.word_to_embody ?? "",
          }}
          moodboardItems={moodboardItems}
        />
      ) : (
        <Card>
          <CardMuted>
            Cet espace de travail arrive très bientôt. Ton pilier {numero} —{" "}
            {meta.nom} sera bientôt éditable ici.
          </CardMuted>
        </Card>
      )}
    </div>
  );
}

async function loadMoodboardItems(
  clienteId: string,
  pilierId: string
): Promise<MoodboardItemView[]> {
  const boards = await getMoodboardsForPilier(clienteId, pilierId);
  return boards.flatMap((b) =>
    b.items.map((it) => ({ id: it.id, displayUrl: it.display_url, note: it.note }))
  );
}
