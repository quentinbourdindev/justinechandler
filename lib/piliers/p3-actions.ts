"use server";

import { revalidatePath } from "next/cache";
import { ownedEditablePilier } from "@/lib/piliers/guard";
import { createPiece, updatePieceTri, deletePiece } from "@/lib/db/pieces";
import { storeClientePhoto } from "@/lib/uploads/store";
import { isTriDecision, isTriCriterion } from "@/lib/db/types";
import { err, ok, type ActionResult } from "@/lib/action-result";

/** Ajoute une pièce triée (Pilier 3) — garder, ou sortir + critère. Photo optionnelle. */
export async function addTriPieceAction(formData: FormData): Promise<ActionResult> {
  const pilierId = String(formData.get("pilierId") ?? "");
  const ctx = await ownedEditablePilier(pilierId, 3);
  if ("error" in ctx) return err(ctx.error);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return err("Nomme la pièce.");

  const decision = String(formData.get("decision") ?? "");
  if (!isTriDecision(decision)) return err("Choisis garder ou sortir.");

  let criterion: "plus_physique" | "plus_correspond" | "plus_aligne" | null = null;
  if (decision === "sortir") {
    const c = String(formData.get("criterion") ?? "");
    if (!isTriCriterion(c)) return err("Choisis un critère de sortie.");
    criterion = c;
  }

  let assetId: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const stored = await storeClientePhoto({
      clienteId: ctx.cliente.id,
      file,
      kind: "piece",
      pilierId,
    });
    if (!stored.ok) return err(stored.error);
    assetId = stored.asset.id;
  }

  await createPiece(ctx.cliente.id, {
    name,
    assetId,
    triDecision: decision,
    triCriterion: criterion,
  });
  revalidatePath("/espace/piliers/3");
  return ok;
}

/** Modifie la décision de tri d'une pièce existante. */
export async function updateTriPieceAction(
  pilierId: string,
  pieceId: string,
  decision: string,
  criterion: string | null
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 3);
  if ("error" in ctx) return err(ctx.error);
  if (!isTriDecision(decision)) return err("Décision invalide.");

  let crit: "plus_physique" | "plus_correspond" | "plus_aligne" | null = null;
  if (decision === "sortir") {
    if (!criterion || !isTriCriterion(criterion)) return err("Critère de sortie requis.");
    crit = criterion;
  }
  await updatePieceTri(pieceId, ctx.cliente.id, decision, crit);
  revalidatePath("/espace/piliers/3");
  return ok;
}

/** Supprime une pièce (Pilier 3 ou 4). */
export async function deletePieceAction(
  pilierId: string,
  pieceId: string
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId);
  if ("error" in ctx) return err(ctx.error);
  await deletePiece(pieceId, ctx.cliente.id);
  revalidatePath(`/espace/piliers/${ctx.pilier.numero}`);
  return ok;
}
