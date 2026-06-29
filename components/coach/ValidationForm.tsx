"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { validatePilierAction, type ValidationState } from "@/lib/coach/actions";
import { buttonClasses } from "@/components/ui/Button";

const initial: ValidationState = { error: null };

function DecisionButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="submit"
        name="decision"
        value="needs_revision"
        disabled={pending}
        className={buttonClasses("secondary", "md", "flex-1")}
      >
        {pending ? "…" : "Demander une retouche"}
      </button>
      <button
        type="submit"
        name="decision"
        value="validated"
        disabled={pending}
        className={buttonClasses("primary", "md", "flex-1")}
      >
        {pending ? "…" : "Valider"}
      </button>
    </div>
  );
}

/**
 * Décision de la coach sur un pilier soumis. Deux boutons (name="decision")
 * → la base (validate_pilier) journalise, met à jour, et débloque le suivant
 * si validated. Un commentaire est exigé pour une retouche.
 */
export function ValidationForm({ pilierId }: { pilierId: string }) {
  const [state, formAction] = useActionState(validatePilierAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pilierId" value={pilierId} />

      <div className="space-y-1.5">
        <label htmlFor="comment" className="text-sm font-medium text-navy-700">
          Commentaire pour la cliente
          <span className="ml-1 text-xs text-navy-400">(obligatoire si retouche)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          placeholder="Un mot d'encouragement, ou ce qui peut être affiné…"
          className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <DecisionButtons />
    </form>
  );
}
