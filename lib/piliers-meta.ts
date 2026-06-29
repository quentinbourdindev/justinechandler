import type { PilierNumero } from "@/lib/db/types";

/**
 * Libellés des 4 piliers (méthode de Justine). Données pures, utilisables
 * côté serveur ET client (pas de dépendance base).
 */
export const PILIERS_META: Record<
  PilierNumero,
  { numero: PilierNumero; nom: string; sous_titre: string }
> = {
  1: { numero: 1, nom: "Identité", sous_titre: "Tes 3 mots — ta boussole." },
  2: { numero: 2, nom: "Mise en valeur", sous_titre: "Colorimétrie & morphologie." },
  3: { numero: 3, nom: "Tri", sous_titre: "Trier le dressing, pièce par pièce." },
  4: { numero: 4, nom: "Construction", sous_titre: "Nouvelle garde-robe & looks." },
};

export const PILIERS_ORDER: PilierNumero[] = [1, 2, 3, 4];
