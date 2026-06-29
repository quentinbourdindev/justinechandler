"use client";

import { useActionState } from "react";
import {
  completeOnboardingAction,
  type OnboardingState,
} from "@/lib/onboarding/actions";
import { ConsentToggle } from "@/components/ConsentToggle";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: OnboardingState = { error: null };

export function OnboardingForm() {
  const [state, formAction] = useActionState(completeOnboardingAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <ConsentToggle
        name="consent_traitement"
        title="Traitement de mes données"
        description="J'autorise Alia à traiter mes données pour mon accompagnement (base légale d'utilisation)."
        required
      />
      <ConsentToggle
        name="consent_photos"
        title="Mes photos"
        description="J'autorise l'envoi et le stockage sécurisé de mes photos (colorimétrie, morphologie, dressing). Stockage privé, hébergé en Europe."
      />
      <ConsentToggle
        name="consent_ai"
        title="Analyse par l'IA"
        description="J'autorise l'analyse de mes photos par l'IA pour assister Justine. Justine valide toujours — l'IA ne décide jamais à sa place."
      />

      {state.error && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Un instant…" className="w-full">
        Commencer mon parcours
      </SubmitButton>
    </form>
  );
}
