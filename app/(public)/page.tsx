import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PILIERS_META, PILIERS_ORDER } from "@/lib/piliers-meta";

/**
 * Landing « Alia » — 100 % statique, dans le code Alia. Aucun CMS, aucun lien
 * Stellr. Présente la méthode et oriente vers la candidature / la prise de RDV.
 */
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5">
      {/* Hero */}
      <section className="flex flex-col items-center py-14 text-center sm:py-20">
        <p className="text-sm uppercase tracking-widest text-rose-500">Coaching en image</p>
        <h1 className="mt-3 font-display text-4xl text-navy-800 sm:text-5xl">
          Réapproprie-toi ton image.
        </h1>
        <p className="mt-4 max-w-md text-navy-500">
          Le problème, ce n'est pas toi : c'est que ton dressing n'a pas évolué avec
          la femme que tu es devenue. Alia t'accompagne, pas à pas, pour la révéler.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/candidature" className={buttonClasses("primary", "lg")}>
            Candidater
          </Link>
          <Link href="/rendez-vous" className={buttonClasses("secondary", "lg")}>
            Prendre rendez-vous
          </Link>
        </div>
      </section>

      {/* Méthode — 4 piliers */}
      <section className="py-10">
        <h2 className="text-center font-display text-3xl text-navy-800">La méthode, en 4 piliers</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-navy-500">
          Chaque pilier est validé par Justine avant de débloquer le suivant. On
          avance à ton rythme, jamais à vide.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PILIERS_ORDER.map((n) => {
            const m = PILIERS_META[n];
            return (
              <Card key={n} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-500 font-display text-white">
                  {String(n).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-lg text-navy-800">{m.nom}</p>
                  <p className="mt-0.5 text-sm text-navy-500">{m.sous_titre}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Mantra */}
      <section className="my-10 rounded-2xl bg-navy-500 px-6 py-10 text-center text-white">
        <p className="font-display text-2xl sm:text-3xl">L'IA assiste. Justine valide.</p>
        <p className="mx-auto mt-3 max-w-md text-navy-50/90">
          L'intelligence artificielle t'aide à explorer — couleurs, coupes, looks —
          mais c'est toujours le regard de Justine qui valide chaque étape. Jamais de
          jugement, jamais d'automatisme.
        </p>
      </section>

      {/* Pour qui */}
      <section className="py-10 text-center">
        <h2 className="font-display text-3xl text-navy-800">Ce coaching est fait pour toi si…</h2>
        <p className="mx-auto mt-4 max-w-xl text-navy-600">
          Ton corps a changé, ta vie aussi, et tu ne te reconnais plus dans ton dressing.
          Tu veux te sentir alignée, légitime et lumineuse — sans te déguiser. Tu es prête
          à être guidée, pas à pas, avec bienveillance.
        </p>
        <div className="mt-8">
          <Link href="/candidature" className={buttonClasses("primary", "lg")}>
            Je candidate
          </Link>
        </div>
      </section>
    </div>
  );
}
