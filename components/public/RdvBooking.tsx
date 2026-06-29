"use client";

import { useState } from "react";
import { useActionState } from "react";
import { bookSlotAction, type PublicFormState } from "@/lib/public/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

export interface SlotView {
  id: string;
  timeLabel: string;
  isAvailable: boolean;
}
export interface DayGroup {
  day: string;
  slots: SlotView[];
}

const initial: PublicFormState = { status: "idle" };
const inputCls =
  "h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100";

export function RdvBooking({
  groups,
  hasAvailable,
  csrfToken,
}: {
  groups: DayGroup[];
  hasAvailable: boolean;
  csrfToken: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [state, formAction] = useActionState(bookSlotAction, initial);

  if (state.status === "success") {
    return (
      <Card className="text-center">
        <h2 className="font-display text-2xl text-navy-800">C'est réservé ✨</h2>
        <p className="mt-2 text-navy-600">
          Ton appel découverte est confirmé. Tu as reçu un email avec les détails.
          À très vite !
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!hasAvailable ? (
        <Card>
          <p className="text-navy-500">
            Aucun créneau disponible pour le moment. Reviens bientôt, de nouvelles
            disponibilités sont ouvertes régulièrement.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.day}>
              <h3 className="font-display text-base capitalize text-navy-800">{g.day}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.slots.map((s) =>
                  s.isAvailable ? (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                        selected === s.id
                          ? "border-navy-500 bg-navy-500 text-white"
                          : "border-navy-200 bg-white text-navy-700 hover:border-navy-400"
                      )}
                    >
                      {s.timeLabel}
                    </button>
                  ) : (
                    <span
                      key={s.id}
                      aria-disabled
                      title="Indisponible"
                      className="cursor-not-allowed rounded-xl border border-navy-100 bg-navy-50 px-4 py-2 text-sm text-navy-300 line-through"
                    >
                      {s.timeLabel}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <h3 className="font-display text-lg text-navy-800">Tes coordonnées</h3>
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="slotId" value={selected} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="firstName" required placeholder="Prénom" className={inputCls} />
              <input name="lastName" required placeholder="Nom" className={inputCls} />
            </div>
            <input name="email" type="email" required placeholder="Email" className={inputCls} />
            <input name="phone" type="tel" placeholder="Téléphone (optionnel)" className={inputCls} />
            <textarea
              name="message"
              rows={2}
              placeholder="Un mot sur ton projet (optionnel)"
              className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
            />
            <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4">
              <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0 rounded border-navy-300 text-navy-500" />
              <span className="text-sm text-navy-600">
                J'accepte d'être recontactée pour cet appel (données hébergées en
                Europe, suppression possible à tout moment).
              </span>
            </label>
            {state.status === "error" && state.error && (
              <p role="alert" className="text-sm text-rose-600">{state.error}</p>
            )}
            <SubmitButton pendingLabel="Réservation…" className="w-full">
              Réserver ce créneau
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
