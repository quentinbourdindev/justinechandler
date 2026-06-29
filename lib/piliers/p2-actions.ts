"use server";

import { revalidatePath } from "next/cache";
import { ownedEditablePilier } from "@/lib/piliers/guard";
import { upsertColorProfile, upsertMorphoProfile } from "@/lib/db/profiles";
import { isMorphoType } from "@/lib/db/types";
import { err, ok, type ActionResult } from "@/lib/action-result";

/** Nettoie une liste de chaînes (trim, retire les vides, dédoublonne). */
function cleanList(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter((s) => s.length > 0))];
}

/** Enregistre la colorimétrie (Pilier 2). */
export async function saveColorProfileAction(
  pilierId: string,
  input: {
    season: string | null;
    dominantes: string[];
    aEviter: string[];
    makeup: string | null;
    hair: string | null;
  }
): Promise<ActionResult> {
  const ctx = await ownedEditablePilier(pilierId, 2);
  if ("error" in ctx) return err(ctx.error);

  await upsertColorProfile(ctx.cliente.id, {
    season: input.season?.trim() || null,
    palette: { dominantes: cleanList(input.dominantes), a_eviter: cleanList(input.aEviter) },
    makeupReco: input.makeup?.trim() || null,
    hairReco: input.hair?.trim() || null,
  });
  revalidatePath("/espace/piliers/2");
  return ok;
}

/** Enregistre la morphologie (Pilier 2). */
export async function saveMorphoProfileAction(
  pilierId: string,
  input: {
    type: string;
    epaules: number | null;
    taille: number | null;
    hanches: number | null;
    valoriser: string[];
    eviter: string[];
  }
): Promise<ActionResult> {
  if (!isMorphoType(input.type)) return err("Type de silhouette invalide.");
  const ctx = await ownedEditablePilier(pilierId, 2);
  if ("error" in ctx) return err(ctx.error);

  const measurements: Record<string, number> = {};
  if (input.epaules) measurements.epaules_cm = input.epaules;
  if (input.taille) measurements.taille_cm = input.taille;
  if (input.hanches) measurements.hanches_cm = input.hanches;

  await upsertMorphoProfile(ctx.cliente.id, {
    type: input.type,
    measurements,
    reco: { valoriser: cleanList(input.valoriser), eviter: cleanList(input.eviter) },
  });
  revalidatePath("/espace/piliers/2");
  return ok;
}
