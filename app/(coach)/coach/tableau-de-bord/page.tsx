import type { Metadata } from "next";
import Link from "next/link";
import { requireCoach } from "@/lib/auth/guards";
import { getPendingValidations } from "@/lib/db/piliers";
import { listClientes } from "@/lib/db/clientes";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { PILIERS_META } from "@/lib/piliers-meta";
import { formatDateTimeFr } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord coach" };

export default async function CoachDashboard() {
  const coach = await requireCoach();
  const [pending, clientes] = await Promise.all([
    getPendingValidations(),
    listClientes(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-navy-800">Bonjour Justine.</h1>
        <p className="mt-1 text-sm text-navy-500">
          L'IA assiste, tu valides. Voici ce qui attend ton regard.
        </p>
      </div>

      {/* File d'attente de validation */}
      <section aria-labelledby="pending-title" className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 id="pending-title" className="font-display text-xl text-navy-800">
            À valider
          </h2>
          <span className="rounded-full bg-jaune-100 px-2.5 py-0.5 text-xs font-medium text-navy-700">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardMuted>Aucun pilier en attente. Tout est à jour ✨</CardMuted>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pending.map((p) => (
              <li key={p.pilier_id}>
                <Link href={`/coach/validations/${p.pilier_id}`} className="block">
                  <Card className="flex items-center justify-between gap-4 transition-colors hover:border-navy-300">
                    <div>
                      <CardTitle className="text-base">
                        {p.first_name} {p.last_name}
                      </CardTitle>
                      <CardMuted>
                        Pilier {p.numero} — {PILIERS_META[p.numero].nom}
                      </CardMuted>
                      <CardMuted className="mt-0.5 text-xs">
                        Soumis le {formatDateTimeFr(p.submitted_at)}
                      </CardMuted>
                    </div>
                    <span className="rounded-full bg-jaune-100 px-2.5 py-1 text-xs font-medium text-navy-700">
                      À valider →
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-navy-400">
          L'écran de validation (Valider / Retoucher / Commenter) arrive en Phase 1.
        </p>
      </section>

      {/* Portefeuille clientes */}
      <section aria-labelledby="clientes-title" className="space-y-3">
        <h2 id="clientes-title" className="font-display text-xl text-navy-800">
          Mes clientes
        </h2>
        {clientes.length === 0 ? (
          <Card>
            <CardMuted>Aucune cliente pour le moment.</CardMuted>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clientes.map((c) => (
              <li key={c.id}>
                <Link href={`/coach/clientes/${c.id}`} className="block">
                  <Card className="transition-colors hover:border-navy-300">
                  <CardTitle className="text-base">
                    {c.first_name} {c.last_name}
                  </CardTitle>
                  <CardMuted className="mt-0.5 capitalize">{c.status.replace("_", " ")}</CardMuted>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                    <div
                      className="h-full rounded-full bg-navy-500"
                      style={{
                        width: `${(c.validated_count / Math.max(1, c.total_piliers)) * 100}%`,
                      }}
                    />
                  </div>
                  <CardMuted className="mt-1.5 text-xs">
                    {c.validated_count}/{c.total_piliers} piliers validés
                  </CardMuted>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="sr-only">Connectée en tant que {coach.email}.</p>
    </div>
  );
}
