import type { Metadata } from "next";
import { requireCoach } from "@/lib/auth/guards";
import { listSlots } from "@/lib/db/booking-admin";
import { formatDayFr, formatTimeFr } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { CreateSlotForm } from "@/components/coach/CreateSlotForm";
import { SlotsManager, type SlotView } from "@/components/coach/SlotsManager";

export const metadata: Metadata = { title: "Disponibilités" };
export const dynamic = "force-dynamic";

export default async function DisponibilitesPage() {
  await requireCoach();
  const slots = await listSlots();

  const views: SlotView[] = slots.map((s) => ({
    id: s.id,
    dayLabel: formatDayFr(s.start_at),
    timeLabel: `${formatTimeFr(s.start_at)} – ${formatTimeFr(s.end_at)}`,
    status: s.status,
    adminNote: s.admin_note,
    booking: s.booking
      ? {
          id: s.booking.id,
          name: `${s.booking.first_name} ${s.booking.last_name}`,
          email: s.booking.email,
          phone: s.booking.phone,
          message: s.booking.message,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-navy-800">Disponibilités</h1>

      <Card>
        <CardTitle className="text-base">Ouvrir un créneau</CardTitle>
        <p className="mt-1 text-sm text-navy-500">
          Le créneau apparaîtra sur la page publique de prise de rendez-vous.
        </p>
        <div className="mt-4">
          <CreateSlotForm />
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-navy-800">Créneaux à venir</h2>
        <SlotsManager slots={views} />
      </section>
    </div>
  );
}
