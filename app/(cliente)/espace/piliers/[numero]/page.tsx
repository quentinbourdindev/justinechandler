import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireClienteOnboarded } from "@/lib/auth/guards";
import { getPilierForCliente, getValidationsForPilier } from "@/lib/db/piliers";
import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { getColorProfile, getMorphoProfile } from "@/lib/db/profiles";
import { listPilierPhotos } from "@/lib/db/assets";
import { listPiecesForTri, listPiecesForWardrobe } from "@/lib/db/pieces";
import { listLooks } from "@/lib/db/looks";
import { PILIERS_META } from "@/lib/piliers-meta";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { PilierIdentite } from "@/components/piliers/PilierIdentite";
import { PilierMiseEnValeur } from "@/components/piliers/PilierMiseEnValeur";
import { PilierTri } from "@/components/piliers/PilierTri";
import { PilierConstruction } from "@/components/piliers/PilierConstruction";
import type { MoodboardItemView } from "@/components/piliers/MoodboardEditor";
import type { Cliente, PilierNumero } from "@/lib/db/types";

export const metadata: Metadata = { title: "Pilier" };

function parseNumero(raw: string): PilierNumero | null {
  const n = Number(raw);
  return n === 1 || n === 2 || n === 3 || n === 4 ? (n as PilierNumero) : null;
}

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);

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
  if (pilier.status === "locked") redirect("/espace/tableau-de-bord");

  const meta = PILIERS_META[numero];
  const readOnly = pilier.status === "submitted" || pilier.status === "validated";
  const words = {
    who_she_is: cliente.word_who_she_is,
    what_she_likes: cliente.word_what_she_likes,
    to_embody: cliente.word_to_embody,
  };

  const revisionComment =
    pilier.status === "needs_revision"
      ? (await getValidationsForPilier(pilier.id))[0]?.comment ?? null
      : null;

  // Contenu du pilier consulté (uniquement ses données sont chargées).
  let content: ReactNode = null;
  if (numero === 1) {
    const moodboardItems = await loadMoodboardItems(cliente.id, pilier.id);
    content = (
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
    );
  } else if (numero === 2) {
    content = await renderP2(cliente, pilier.id, readOnly, words);
  } else if (numero === 3) {
    const pieces = (await listPiecesForTri(cliente.id)).map((p) => ({
      id: p.id,
      name: p.name,
      display_url: p.display_url,
      tri_decision: p.tri_decision,
      tri_criterion: p.tri_criterion,
    }));
    content = <PilierTri pilierId={pilier.id} readOnly={readOnly} pieces={pieces} />;
  } else {
    const [pieces, looks] = await Promise.all([
      listPiecesForWardrobe(cliente.id),
      listLooks(cliente.id),
    ]);
    content = (
      <PilierConstruction
        pilierId={pilier.id}
        readOnly={readOnly}
        words={words}
        pieces={pieces.map((p) => ({
          id: p.id,
          name: p.name,
          display_url: p.display_url,
          wardrobe_category: p.wardrobe_category,
          linked_word: p.linked_word,
        }))}
        looks={looks.map((l) => ({ id: l.id, name: l.name, pieces: l.pieces }))}
      />
    );
  }

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
          <p className="text-sm text-navy-700">
            Soumis à Justine — en attente de validation. En lecture seule.
          </p>
        </Card>
      )}
      {pilier.status === "validated" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">Validé par Justine ✨</p>
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

      {content}
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

async function renderP2(
  cliente: Cliente,
  pilierId: string,
  readOnly: boolean,
  words: { who_she_is: string | null; what_she_likes: string | null; to_embody: string | null }
) {
  const [color, morpho, photos] = await Promise.all([
    getColorProfile(cliente.id),
    getMorphoProfile(cliente.id),
    listPilierPhotos(cliente.id, pilierId),
  ]);

  return (
    <PilierMiseEnValeur
      pilierId={pilierId}
      readOnly={readOnly}
      words={words}
      photos={photos.map((a) => ({ id: a.id, displayUrl: a.storage_url }))}
      initial={{
        color: color
          ? {
              season: color.season,
              dominantes: strArray(color.palette["dominantes"]),
              aEviter: strArray(color.palette["a_eviter"]),
              makeup: color.makeup_reco,
              hair: color.hair_reco,
            }
          : null,
        morpho: morpho
          ? {
              type: morpho.type,
              epaules: numOrNull(morpho.measurements["epaules_cm"]),
              taille: numOrNull(morpho.measurements["taille_cm"]),
              hanches: numOrNull(morpho.measurements["hanches_cm"]),
              valoriser: strArray(morpho.reco["valoriser"]),
              eviter: strArray(morpho.reco["eviter"]),
            }
          : null,
      }}
    />
  );
}
