import type { Metadata } from "next";
import { getCsrfToken } from "@/lib/security/csrf";
import { getPublicAvailability } from "@/lib/db/booking";
import { formatDayFr, formatTimeFr } from "@/lib/format";
import { RdvBooking, type DayGroup } from "@/components/public/RdvBooking";

export const metadata: Metadata = {
  title: "Prendre rendez-vous",
  description: "Réserve ton appel découverte avec Justine.",
};

// Toujours frais : les disponibilités changent (cache désactivé).
export const dynamic = "force-dynamic";

export default async function RendezVousPage() {
  const [slots, csrfToken] = await Promise.all([getPublicAvailability(), getCsrfToken()]);

  // Regroupement par jour (côté serveur ; aucune PII transmise au client).
  const map = new Map<string, DayGroup>();
  for (const s of slots) {
    const day = formatDayFr(s.start_at);
    if (!map.has(day)) map.set(day, { day, slots: [] });
    map.get(day)!.slots.push({
      id: s.id,
      timeLabel: formatTimeFr(s.start_at),
      isAvailable: s.is_available,
    });
  }
  const groups = [...map.values()];
  const hasAvailable = slots.some((s) => s.is_available);

  return (
    <section className="mx-auto w-full max-w-xl px-5 py-12">
      <div className="mb-6 text-center">
        <p className="text-sm uppercase tracking-widest text-rose-500">Appel découverte</p>
        <h1 className="mt-2 font-display text-3xl text-navy-800">Prendre rendez-vous</h1>
        <p className="mt-2 text-navy-500">
          Un échange pour faire connaissance et voir si l'accompagnement te correspond.
          Choisis le créneau qui te convient.
        </p>
      </div>
      <RdvBooking groups={groups} hasAvailable={hasAvailable} csrfToken={csrfToken} />
    </section>
  );
}
