"use client";

import { useActionState } from "react";
import { createSlotAction, type CreateSlotState } from "@/lib/coach/booking-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: CreateSlotState = { error: null };
const inputCls =
  "h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400";

export function CreateSlotForm() {
  const [state, formAction] = useActionState(createSlotAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="start" className="text-sm font-medium text-navy-700">Début</label>
          <input id="start" name="start" type="datetime-local" required className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="end" className="text-sm font-medium text-navy-700">Fin</label>
          <input id="end" name="end" type="datetime-local" required className={inputCls} />
        </div>
      </div>
      <input name="note" placeholder="Note interne (optionnelle, jamais publique)" className={inputCls} />
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton pendingLabel="Création…">Ouvrir le créneau</SubmitButton>
    </form>
  );
}
