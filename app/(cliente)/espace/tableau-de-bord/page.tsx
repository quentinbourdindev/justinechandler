import type { Metadata } from "next";
import { requireCliente } from "@/lib/auth/guards";
import { getClienteByUserId } from "@/lib/db/clientes";
import { getPiliersForCliente } from "@/lib/db/piliers";
import { listNotifications } from "@/lib/notifications";
import { PiliersTimeline } from "@/components/PiliersTimeline";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { notificationLabel } from "@/lib/notifications-format";
import { formatDateTimeFr } from "@/lib/format";

export const metadata: Metadata = { title: "Mon parcours" };

export default async function ClienteDashboard() {
  const user = await requireCliente();
  const cliente = await getClienteByUserId(user.id);
  if (!cliente) {
    return <p className="text-sm text-rose-600">Profil cliente introuvable.</p>;
  }

  const [piliers, notifications] = await Promise.all([
    getPiliersForCliente(cliente.id),
    listNotifications(user.id, 5),
  ]);

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

      <section aria-labelledby="piliers-title">
        <h2 id="piliers-title" className="sr-only">
          Mes piliers
        </h2>
        <PiliersTimeline piliers={piliers} />
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
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-label="Non lue" />
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
