"use client";

import { useState, useTransition } from "react";
import { submitPilierAction } from "@/lib/piliers/actions";
import { Button } from "@/components/ui/Button";

/**
 * Barre de soumission d'un pilier à la coach. Appelle submit_pilier via l'action
 * (qui redirige vers le tableau de bord en cas de succès).
 */
export function PilierSubmit({
  pilierId,
  canSubmit,
  hint,
}: {
  pilierId: string;
  canSubmit: boolean;
  hint?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitPilierAction(pilierId);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-2 border-t border-navy-100 pt-5">
      {hint && <p className="text-sm text-navy-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={!canSubmit || pending} className="w-full">
        {pending ? "Envoi…" : "Soumettre à Justine"}
      </Button>
    </div>
  );
}
