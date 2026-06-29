"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

/**
 * Bouton de soumission de formulaire : se désactive et affiche un libellé
 * d'attente pendant l'exécution de la server action (useFormStatus).
 */
export function SubmitButton({
  children,
  pendingLabel = "Un instant…",
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={buttonClasses(variant, size, className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
