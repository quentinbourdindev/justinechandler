import type { Metadata } from "next";
import Link from "next/link";
import { requireClienteOnboarded } from "@/lib/auth/guards";
import { getPiliersForCliente, getValidationsForPilier } from "@/lib/db/piliers";
import { listNotifications } from "@/lib/notifications";
import { PiliersTimeline } from "@/components/PiliersTimeline";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { PILIERS_META } from "@/lib/piliers-meta";
import { notificationLabel } from "@/lib/notifications-format";
import { formatDateTimeFr } from "@/lib/format";

export const metadata: Metadata = { title: "Mon parcours" };

export default async function ClienteDashboard() {
  const { user, cliente } = await requireClienteOnboarded();

  const [piliers, notifications] = await Promise.all([
    getPiliersForCliente(cliente.id),
    listNotifications(user.id, 5),
  ]);

  // Commentaires de retouche éventuels (dernière décision de la coach).
  const revisions = await Promise.all(
    piliers
      .filter((p) => p.status === "needs_revision")
      .map(async (p) => {
        const history = await getValidationsForPilier(p.id);
        return { numero: p.numero, comment: history[0]?.comment ?? null };
      })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-navy-800">
          Bonjour {cliente.first_name}.
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Voici où tu en es dans ton parcours en 4 piliers.
        </p>
      </div>

      {revisions.map((r) => (
        <Card key={r.numero} className="border-rose-300 bg-rose-50">
          <CardTitle className="text-base text-rose-700">
            Pilier {r.numero} — {PILIERS_META[r.numero].nom} : à retoucher
          </CardTitle>
          {r.comment && <p className="mt-1 text-sm text-navy-600">« {r.comment} »</p>}
          <Link
            href={`/espace/piliers/${r.numero}`}
            className="mt-2 inline-block text-sm font-medium text-rose-600 underline"
          >
            Reprendre ce pilier
          </Link>
        </Card>
      ))}

      <section aria-labelledby="piliers-title">
        <h2 id="piliers-title" className="sr-only">
          Mes piliers
        </h2>
        <PiliersTimeline
          piliers={piliers}
          getHref={(numero, status) =>
            status === "locked" ? null : `/espace/piliers/${numero}`
          }
        />
      </section>

      <section aria-labelledby="notifs-title" className="space-y-3">
        <h2 id="notifs-title" className="font-display text-lg text-navy-800">
          Notifications
        </h2>
        {notifications.length === 0 ? (
          <Card>
            <CardMuted>Aucune notification pour le moment.</CardMuted>
          </Card>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <CardTitle className="text-base">{notificationLabel(n)}</CardTitle>
                    <CardMuted>{formatDateTimeFr(n.created_at)}</CardMuted>
                  </div>
                  {!n.read_at && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-rose-400"
                      aria-label="Non lue"
                    />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
