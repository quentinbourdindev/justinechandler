import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth/guards";
import {
  getClienteById,
  boussoleFromCliente,
  computeAge,
} from "@/lib/db/clientes";
import { getPiliersForCliente } from "@/lib/db/piliers";
import { getMoodboardsForPilier } from "@/lib/db/moodboards";
import { PiliersTimeline } from "@/components/PiliersTimeline";
import { Boussole } from "@/components/Boussole";
import { MoodboardGallery, type GalleryItem } from "@/components/MoodboardGallery";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { PILIERS_META } from "@/lib/piliers-meta";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Fiche cliente" };

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
  let moodboardItems: GalleryItem[] = [];
  if (p1) {
    const boards = await getMoodboardsForPilier(cliente.id, p1.id);
    moodboardItems = boards.flatMap((b) =>
      b.items.map((it) => ({ id: it.id, displayUrl: it.display_url, note: it.note }))
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/coach/tableau-de-bord" className="text-sm text-navy-500 underline">
          ← Tableau de bord
        </Link>
        <h1 className="mt-2 font-display text-3xl text-navy-800">
          {cliente.first_name} {cliente.last_name}
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          {cliente.city ? `${cliente.city} · ` : ""}
          {age !== null ? `${age} ans · ` : ""}
          <span className="capitalize">{cliente.status.replace("_", " ")}</span>
        </p>
      </div>

      <Card>
        <CardTitle className="text-base">Sa boussole</CardTitle>
        <div className="mt-2">
          <Boussole words={boussoleFromCliente(cliente)} />
        </div>
      </Card>

      {submitted.length > 0 && (
        <div className="space-y-2">
          {submitted.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-jaune-300 bg-jaune-50 p-4"
            >
              <span className="text-sm text-navy-700">
                Pilier {p.numero} — {PILIERS_META[p.numero].nom} : en attente de validation
              </span>
              <Link
                href={`/coach/validations/${p.id}`}
                className={buttonClasses("primary", "sm")}
              >
                Valider →
              </Link>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg text-navy-800">Avancement</h2>
        <PiliersTimeline piliers={piliers} />
      </section>

      <Card>
        <CardTitle className="text-base">Moodboard (Identité)</CardTitle>
        <div className="mt-3">
          {moodboardItems.length > 0 ? (
            <MoodboardGallery items={moodboardItems} />
          ) : (
            <CardMuted>Pas encore d'inspiration.</CardMuted>
          )}
        </div>
      </Card>
    </div>
  );
}
