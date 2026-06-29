"use server";

import { revalidatePath } from "next/cache";
import { ownedEditablePilier } from "@/lib/piliers/guard";
import { createPiece } from "@/lib/db/pieces";
import { createLook, addPieceToLook, removePieceFromLook, deleteLook } from "@/lib/db/looks";
import { storeClientePhoto } from "@/lib/uploads/store";
import { isWardrobeCategory, isWordSlot, type WardrobeCategory, type WordSlot } from "@/lib/db/types";
import { err, ok, type ActionResult } from "@/lib/action-result";

const P4 = "/espace/piliers/4";

/** Ajoute une pièce à la nouvelle garde-robe (catégorie + mot rattaché). Photo optionnelle. */
export async function addWardrobePieceAction(formData: FormData): Promise<ActionResult> {
  const pilierId = String(formData.get("pilierId") ?? "");
  const ctx = await ownedEditablePilier(pilierId, 4);
  if ("error" in ctx) return err(ctx.error);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return err("Nomme la pièce.");

  const category = String(formData.get("category") ?? "");
  if (!isWardrobeCategory(category)) return err("Choisis une catégorie.");

  let linkedWord: WordSlot | null = null;
  const lw = String(formData.get("linkedWord") ?? "");
  if (lw && isWordSlot(lw)) linkedWord = lw;

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
    wardrobeCategory: category,
    linkedWord,
  });
  revalidatePath(P4);
  return ok;
}

/** Crée un look. */
export async function createLookAction(
  pilierId: string,
  name: string,
  category: string | null,
  annotation: string | null
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 4);
  if ("error" in ctx) return err(ctx.error);
  if (!name.trim()) return err("Nomme le look.");

  let cat: WardrobeCategory | null = null;
  if (category && isWardrobeCategory(category)) cat = category;

  await createLook(ctx.cliente.id, {
    name: name.trim(),
    category: cat,
    annotation: annotation?.trim() || null,
  });
  revalidatePath(P4);
  return ok;
}

export async function addPieceToLookAction(
  pilierId: string,
  lookId: string,
  pieceId: string
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 4);
  if ("error" in ctx) return err(ctx.error);
  await addPieceToLook(lookId, pieceId, ctx.cliente.id);
  revalidatePath(P4);
  return ok;
}

export async function removePieceFromLookAction(
  pilierId: string,
  lookId: string,
  pieceId: string
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 4);
  if ("error" in ctx) return err(ctx.error);
  await removePieceFromLook(lookId, pieceId, ctx.cliente.id);
  revalidatePath(P4);
  return ok;
}

export async function deleteLookAction(
  pilierId: string,
  lookId: string
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 4);
  if ("error" in ctx) return err(ctx.error);
  await deleteLook(lookId, ctx.cliente.id);
  revalidatePath(P4);
  return ok;
}
