import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCliente } from "@/lib/auth/guards";
import { getClienteByUserId } from "@/lib/db/clientes";
import { hasConsent } from "@/lib/db/consents";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const user = await requireCliente();
  const cliente = await getClienteByUserId(user.id);
  if (!cliente) redirect("/login");

  // Déjà onboardée → on n'affiche pas à nouveau l'écran.
  if (await hasConsent(cliente.id, "traitement_donnees")) {
    redirect("/espace/tableau-de-bord");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-rose-500">Bienvenue</p>
        <h1 className="mt-1 font-display text-2xl text-navy-800">
          Ravie de t'accompagner, {cliente.first_name}.
        </h1>
        <p className="mt-2 text-navy-500">
          Avant de commencer, quelques autorisations. Tu gardes la main : tu peux
          revenir dessus à tout moment dans ton profil. Tes données restent en
          Europe, et <span className="font-medium text-navy-700">l'IA assiste,
          Justine valide</span> toujours.
        </p>
      </div>

      <Card>
        <OnboardingForm />
      </Card>
    </div>
  );
}
