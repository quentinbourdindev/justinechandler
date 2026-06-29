"use client";

import { useActionState } from "react";
import { createClienteAction, type CreateClienteState } from "@/lib/coach/clientes-actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: CreateClienteState = { error: null };
const inputCls =
  "h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400";

export function CreateClienteForm() {
  const [state, formAction] = useActionState(createClienteAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-sm font-medium text-navy-700">Prénom</label>
          <input id="firstName" name="firstName" required className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-sm font-medium text-navy-700">Nom</label>
          <input id="lastName" name="lastName" required className={inputCls} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-navy-700">Email</label>
        <input id="email" name="email" type="email" required className={inputCls} placeholder="cliente@email.fr" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="birthDate" className="text-sm font-medium text-navy-700">
            Date de naissance <span className="text-navy-400">(optionnel)</span>
          </label>
          <input id="birthDate" name="birthDate" type="date" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-sm font-medium text-navy-700">
            Ville <span className="text-navy-400">(optionnel)</span>
          </label>
          <input id="city" name="city" className={inputCls} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="situation" className="text-sm font-medium text-navy-700">
          Situation <span className="text-navy-400">(optionnel)</span>
        </label>
        <textarea
          id="situation"
          name="situation"
          rows={2}
          className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-navy-800 outline-none focus:border-navy-400"
        />
      </div>

      <p className="text-xs text-navy-400">
        Un mot de passe temporaire sera généré et envoyé par email à la cliente
        (changement forcé à la première connexion).
      </p>

      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton pendingLabel="Création…" className="w-full">
        Créer la cliente & envoyer l'invitation
      </SubmitButton>
    </form>
  );
}
