import type { Metadata } from "next";
import Link from "next/link";
import { requireCoach } from "@/lib/auth/guards";
import { Card } from "@/components/ui/Card";
import { CreateClienteForm } from "@/components/coach/CreateClienteForm";

export const metadata: Metadata = { title: "Nouvelle cliente" };

export default async function NouvelleClientePage() {
  await requireCoach();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/coach/tableau-de-bord" className="text-sm text-navy-500 underline">
          ← Tableau de bord
        </Link>
        <h1 className="mt-2 font-display text-3xl text-navy-800">Créer une cliente</h1>
        <p className="mt-1 text-sm text-navy-500">
          Crée directement un compte (sans passer par une candidature). Les 4 piliers
          sont initialisés automatiquement.
        </p>
      </div>
      <Card>
        <CreateClienteForm />
      </Card>
    </div>
  );
}
