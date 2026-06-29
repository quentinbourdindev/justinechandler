"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleSlotAction,
  deleteSlotAction,
  cancelBookingAction,
} from "@/lib/coach/booking-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";

export interface SlotView {
  id: string;
  dayLabel: string;
  timeLabel: string;
  status: "available" | "booked" | "blocked";
  adminNote: string | null;
  booking: { id: string; name: string; email: string; phone: string | null; message: string | null } | null;
}

const STATUS_META: Record<SlotView["status"], { label: string; cls: string }> = {
  available: { label: "Libre", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  booked: { label: "Réservé", cls: "bg-navy-50 text-navy-700 border-navy-200" },
  blocked: { label: "Fermé", cls: "bg-navy-50 text-navy-400 border-navy-100" },
};

export function SlotsManager({ slots }: { slots: SlotView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error ?? "Erreur.", "error");
      else router.refresh();
    });
  }

  if (slots.length === 0) {
    return <Card><p className="text-sm text-navy-400">Aucun créneau à venir. Ouvre-en un ci-dessus.</p></Card>;
  }

  return (
    <ul className="space-y-2">
      {slots.map((s) => {
        const meta = STATUS_META[s.status];
        return (
          <li key={s.id}>
            <Card className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium capitalize text-navy-800">{s.dayLabel}</p>
                  <p className="text-sm text-navy-500">{s.timeLabel}</p>
                  {s.adminNote && <p className="mt-0.5 text-xs text-navy-400">Note : {s.adminNote}</p>}
                </div>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", meta.cls)}>
                  {meta.label}
                </span>
              </div>

              {/* Réservation (PII visible côté admin uniquement) */}
              {s.booking && (
                <div className="rounded-xl bg-navy-50 p-3 text-sm">
                  <p className="font-medium text-navy-800">{s.booking.name}</p>
                  <p className="text-navy-600">{s.booking.email}{s.booking.phone ? ` · ${s.booking.phone}` : ""}</p>
                  {s.booking.message && <p className="mt-1 text-navy-500">« {s.booking.message} »</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {s.booking ? (
                  <Button
                    variant="subtle"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => cancelBookingAction(s.booking!.id))}
                  >
                    Annuler la réservation
                  </Button>
                ) : (
                  <>
                    {s.status === "available" ? (
                      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => toggleSlotAction(s.id, "blocked"))}>
                        Fermer
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => toggleSlotAction(s.id, "available"))}>
                        Rouvrir
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deleteSlotAction(s.id))}>
                      Supprimer
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
