import type { Metadata } from "next";
import { getCsrfToken } from "@/lib/security/csrf";
import { CandidatureForm } from "@/components/public/CandidatureForm";

export const metadata: Metadata = {
  title: "Candidater",
  description: "Candidate à l'accompagnement Alia.",
};

export default async function CandidaturePage() {
  const csrfToken = await getCsrfToken();
  return (
    <section className="mx-auto w-full max-w-xl px-5 py-12">
      <div className="mb-6 text-center">
        <p className="text-sm uppercase tracking-widest text-rose-500">Rejoins la liste</p>
        <h1 className="mt-2 font-display text-3xl text-navy-800">Candidater</h1>
        <p className="mt-2 text-navy-500">
          Quelques questions pour faire connaissance. Prends le temps d'être sincère —
          il n'y a pas de mauvaise réponse.
        </p>
      </div>
      <CandidatureForm csrfToken={csrfToken} />
    </section>
  );
}
