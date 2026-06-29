import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Accueil public — version minimale de Phase 0 (statique, dans le code Alia,
 * AUCUN CMS). La vraie landing marketing, la candidature et la prise de RDV
 * arrivent en Phase 2.
 */
export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-sm uppercase tracking-widest text-rose-500">
        Coaching en image
      </p>
      <h1 className="mt-3 font-display text-4xl text-navy-800 sm:text-5xl">
        Réapproprie-toi ton image.
      </h1>
      <p className="mt-4 max-w-md text-navy-500">
        Une méthode en 4 piliers, à ton rythme. L'IA t'assiste, Justine valide
        chaque étape. Rien n'avance sans son regard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className={buttonClasses("primary", "lg")}>
          Accéder à mon espace
        </Link>
      </div>
      <p className="mt-6 text-xs text-navy-400">
        Candidature & prise de rendez-vous : bientôt disponibles (Phase 2).
      </p>
    </section>
  );
}
