"use server";

import { getCurrentUser } from "@/lib/auth/guards";
import { getClienteByUserId } from "@/lib/db/clientes";
import { getPilierById } from "@/lib/db/piliers";
import { storeClientePhoto } from "@/lib/uploads/store";

/**
 * Upload générique d'une photo par la cliente (réutilisé en P2/P3).
 * CONDITIONNÉ AU CONSENTEMENT « photos » (vérifié dans storeClientePhoto).
 * Server action → protection same-origin de Next.
 */

export type UploadResult =
  | { ok: true; assetId: string; src: string }
  | { ok: false; error: string };

export async function uploadPhotoAction(formData: FormData): Promise<UploadResult> {
  const current = await getCurrentUser();
  if (!current || current.user.role !== "cliente") return { ok: false, error: "Non autorisé." };
  const cliente = await getClienteByUserId(current.user.id);
  if (!cliente) return { ok: false, error: "Profil introuvable." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Aucun fichier." };

  // Pilier optionnel : doit appartenir à la cliente.
  let pilierId: string | null = null;
  const rawPilier = formData.get("pilierId");
  if (typeof rawPilier === "string" && rawPilier) {
    const pilier = await getPilierById(rawPilier);
    if (!pilier || pilier.cliente_id !== cliente.id) return { ok: false, error: "Pilier invalide." };
    pilierId = pilier.id;
  }

  const result = await storeClientePhoto({
    clienteId: cliente.id,
    file,
    kind: String(formData.get("kind") ?? "other"),
    pilierId,
  });
  if (!result.ok) return result;
  return { ok: true, assetId: result.asset.id, src: result.src };
}
