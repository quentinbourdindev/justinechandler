import "server-only";
import { getCurrentUser } from "@/lib/auth/guards";
import { getClienteByUserId } from "@/lib/db/clientes";
import { getPilierById } from "@/lib/db/piliers";
import type { Cliente, Pilier } from "@/lib/db/types";

const EDITABLE = new Set(["in_progress", "needs_revision"]);

export type OwnedPilier =
  | { cliente: Cliente; pilier: Pilier }
  | { error: string };

/**
 * Vérifie que la cliente connectée possède le pilier et qu'il est ÉDITABLE.
 * Isolation : aucune écriture sur le pilier d'une autre cliente. Partagé par
 * toutes les server actions des piliers (P1→P4).
 */
export async function ownedEditablePilier(
  pilierId: string,
  expectedNumero?: number
): Promise<OwnedPilier> {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "cliente") return { error: "Non autorisé." };
  const cliente = await getClienteByUserId(current.user.id);
  if (!cliente) return { error: "Profil introuvable." };
  const pilier = await getPilierById(pilierId);
  if (!pilier || pilier.cliente_id !== cliente.id) return { error: "Pilier introuvable." };
  if (expectedNumero && pilier.numero !== expectedNumero) return { error: "Pilier inattendu." };
  if (!EDITABLE.has(pilier.status)) {
    return { error: "Ce pilier n'est plus modifiable (soumis ou validé)." };
  }
  return { cliente, pilier };
}
