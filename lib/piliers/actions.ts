"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setBoussoleWord } from "@/lib/db/clientes";
import { submitPilier as dbSubmitPilier } from "@/lib/db/piliers";
import {
  getOrCreateMoodboardForPilier,
  addMoodboardItem,
  deleteMoodboardItem,
} from "@/lib/db/moodboards";
import { getCoachUserIds } from "@/lib/db/users";
import { notifyCoachesPilierSubmitted } from "@/lib/notifications";
import { storeClientePhoto } from "@/lib/uploads/store";
import { ownedEditablePilier } from "@/lib/piliers/guard";
import { err, ok, type ActionResult } from "@/lib/action-result";
import type { WordSlot } from "@/lib/db/types";

/** Enregistre un mot-boussole (Pilier 1). */
export async function saveWordAction(
  pilierId: string,
  slot: WordSlot,
  value: string
): Promise<ActionResult> {
  const trimmed = value.trim();
  if (trimmed.length === 0) return err("Le mot ne peut pas être vide.");
  if (trimmed.length > 60) return err("60 caractères maximum.");

  const ctx = await ownedEditablePilier(pilierId, 1);
  if ("error" in ctx) return err(ctx.error);

  await setBoussoleWord(ctx.cliente.id, slot, trimmed);
  revalidatePath("/espace/piliers/1");
  return ok;
}

/** Ajoute une inspiration au moodboard du pilier via une URL externe. */
export async function addMoodboardUrlAction(
  pilierId: string,
  url: string,
  note: string | null
): Promise<ActionResult> {
  if (!/^https?:\/\//.test(url.trim())) return err("URL invalide (http/https).");
  const ctx = await ownedEditablePilier(pilierId, 1);
  if ("error" in ctx) return err(ctx.error);

  const moodboardId = await getOrCreateMoodboardForPilier(
    ctx.cliente.id,
    pilierId,
    "Mon moodboard"
  );
  await addMoodboardItem({ moodboardId, sourceUrl: url.trim(), note: note?.trim() || null });
  revalidatePath("/espace/piliers/1");
  return ok;
}

/** Ajoute une inspiration au moodboard via une photo uploadée (consentement requis). */
export async function addMoodboardPhotoAction(formData: FormData): Promise<ActionResult> {
  const pilierId = String(formData.get("pilierId") ?? "");
  const ctx = await ownedEditablePilier(pilierId, 1);
  if ("error" in ctx) return err(ctx.error);

  const file = formData.get("file");
  if (!(file instanceof File)) return err("Aucun fichier.");

  const stored = await storeClientePhoto({
    clienteId: ctx.cliente.id,
    file,
    kind: "moodboard",
    pilierId,
  });
  if (!stored.ok) return err(stored.error);

  const moodboardId = await getOrCreateMoodboardForPilier(ctx.cliente.id, pilierId, "Mon moodboard");
  await addMoodboardItem({ moodboardId, assetId: stored.asset.id });
  revalidatePath("/espace/piliers/1");
  return ok;
}

/** Retire un item du moodboard. */
export async function removeMoodboardItemAction(
  pilierId: string,
  itemId: string
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 1);
  if ("error" in ctx) return err(ctx.error);
  await deleteMoodboardItem(itemId, ctx.cliente.id);
  revalidatePath("/espace/piliers/1");
  return ok;
}

/**
 * Soumet un pilier à la coach. La base (submit_pilier) reste seule garante des
 * transitions ; on notifie ensuite la/les coach(s).
 */
export async function submitPilierAction(pilierId: string): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId);
  if ("error" in ctx) return err(ctx.error);

  // Garde-fou Pilier 1 : les 3 mots doivent être présents (la base le revérifie
  // à la validation ; on évite ici une soumission prématurée).
  if (ctx.pilier.numero === 1) {
    const c = ctx.cliente;
    if (!c.word_who_she_is || !c.word_what_she_likes || !c.word_to_embody) {
      return err("Renseigne tes 3 mots avant de soumettre.");
    }
  }

  try {
    await dbSubmitPilier(pilierId);
  } catch {
    return err("Soumission impossible (état du pilier).");
  }

  const coachIds = await getCoachUserIds();
  await notifyCoachesPilierSubmitted({
    coachUserIds: coachIds,
    clienteId: ctx.cliente.id,
    clienteName: `${ctx.cliente.first_name} ${ctx.cliente.last_name}`,
    numero: ctx.pilier.numero,
  });

  revalidatePath("/espace/tableau-de-bord");
  redirect("/espace/tableau-de-bord");
}
