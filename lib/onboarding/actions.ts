"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getClienteByUserId, setClienteStatus } from "@/lib/db/clientes";
import { setConsent } from "@/lib/db/consents";

export interface OnboardingState {
  error: string | null;
}

/**
 * Finalise l'onboarding : enregistre les consentements RGPD et passe la cliente
 * en in_progress. Le consentement « traitement des données » est la base légale
 * d'utilisation → obligatoire. Photos et IA sont optionnels (conditionnent
 * respectivement l'upload et l'envoi à l'IA, plus tard).
 */
export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "cliente") redirect("/login");

  const cliente = await getClienteByUserId(current.user.id);
  if (!cliente) return { error: "Profil introuvable." };

  const data = formData.get("consent_traitement") === "on";
  const photos = formData.get("consent_photos") === "on";
  const ai = formData.get("consent_ai") === "on";

  if (!data) {
    return {
      error:
        "Le consentement au traitement de tes données est nécessaire pour utiliser Alia.",
    };
  }

  await setConsent(cliente.id, "traitement_donnees", true);
  await setConsent(cliente.id, "photos", photos);
  await setConsent(cliente.id, "ai_photo_processing", ai);

  if (cliente.status === "onboarding") {
    await setClienteStatus(cliente.id, "in_progress");
  }

  redirect("/espace/tableau-de-bord");
}
