"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPilierById, validatePilier } from "@/lib/db/piliers";
import { getClienteById } from "@/lib/db/clientes";
import { notifyClienteValidation } from "@/lib/notifications";
import { isValidationDecision } from "@/lib/db/types";

export interface ValidationState {
  error: string | null;
}

/**
 * Décision de la coach sur un pilier soumis (Valider / Retoucher + commentaire).
 * Le gate reste en base (validate_pilier vérifie le rôle coach et l'état
 * submitted, journalise, et débloque le pilier suivant si validated).
 */
export async function validatePilierAction(
  _prev: ValidationState,
  formData: FormData
): Promise<ValidationState> {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "coach") redirect("/login");

  const pilierId = String(formData.get("pilierId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!isValidationDecision(decision)) return { error: "Décision invalide." };
  if (decision === "needs_revision" && !comment) {
    return { error: "Ajoute un commentaire pour guider la retouche." };
  }

  const pilier = await getPilierById(pilierId);
  if (!pilier) return { error: "Pilier introuvable." };
  if (pilier.status !== "submitted") {
    return { error: "Ce pilier n'est pas en attente de validation." };
  }

  try {
    await validatePilier(pilierId, current.user.id, decision, comment);
  } catch {
    return { error: "Validation impossible (état du pilier)." };
  }

  // Notifie la cliente (convention RGPD : payload.cliente_id).
  const cliente = await getClienteById(pilier.cliente_id);
  if (cliente) {
    await notifyClienteValidation({
      clienteUserId: cliente.user_id,
      clienteId: cliente.id,
      numero: pilier.numero,
      validated: decision === "validated",
      comment,
    });
  }

  redirect("/coach/tableau-de-bord");
}
