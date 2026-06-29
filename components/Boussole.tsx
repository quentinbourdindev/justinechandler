import { cn } from "@/components/ui/cn";
import type { BoussoleWords } from "@/lib/db/types";

/**
 * Boussole — les 3 mots-boussole, affichés en permanence dans l'espace cliente.
 * Vide tant que le Pilier 01 (Identité) n'est pas validé : on affiche alors un
 * message d'attente bienveillant plutôt que des emplacements vides.
 */
export function Boussole({
  words,
  className,
}: {
  words: BoussoleWords;
  className?: string;
}) {
  const filled = [words.who_she_is, words.what_she_likes, words.to_embody].filter(
    (w): w is string => Boolean(w)
  );

  if (filled.length === 0) {
    return (
      <p className={cn("text-sm text-navy-300", className)}>
        Tes 3 mots apparaîtront ici une fois ton Identité validée.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)} aria-label="Tes 3 mots">
      {filled.map((word) => (
        <li
          key={word}
          className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-600"
        >
          {word}
        </li>
      ))}
    </ul>
  );
}
