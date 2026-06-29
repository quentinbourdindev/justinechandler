import "server-only";
import { hasConsent, getConsentId } from "@/lib/db/consents";
import { createAsset, type Asset } from "@/lib/db/assets";
import { getStorage } from "@/lib/storage";
import { buildAssetKey, extForMime } from "@/lib/storage/keys";
import { assetDisplaySrc } from "@/lib/storage/display";
import type { AssetType } from "@/lib/db/types";

/**
 * Stocke une photo de cliente : vérifie le consentement « photos », valide le
 * fichier, écrit l'objet (lib/storage) et crée l'asset (URL uniquement).
 * Helper partagé par les server actions d'upload (moodboard, colorimétrie,
 * pièces…). N'est PAS une action : la vérification de session/propriété est
 * faite par l'appelant.
 */

const MAX_BYTES = 8 * 1024 * 1024;

const KIND_TO_TYPE: Record<string, AssetType> = {
  moodboard: "moodboard",
  colorimetrie: "colorimetrie",
  morphologie: "morphologie",
  piece: "piece_photo",
  look: "look",
};

export type StorePhotoResult =
  | { ok: true; asset: Asset; src: string }
  | { ok: false; error: string };

export async function storeClientePhoto(input: {
  clienteId: string;
  file: File;
  kind: string;
  pilierId?: string | null;
}): Promise<StorePhotoResult> {
  if (!(await hasConsent(input.clienteId, "photos"))) {
    return { ok: false, error: "Le consentement photos est requis pour envoyer une image." };
  }
  if (input.file.size === 0) return { ok: false, error: "Aucun fichier." };
  if (input.file.size > MAX_BYTES) return { ok: false, error: "Image trop lourde (8 Mo max)." };

  const ext = extForMime(input.file.type);
  if (!ext) return { ok: false, error: "Format non supporté (JPG, PNG, WebP, GIF)." };

  const storage = getStorage();
  const key = buildAssetKey(input.clienteId, input.kind, ext);
  await storage.put({
    key,
    body: Buffer.from(await input.file.arrayBuffer()),
    contentType: input.file.type,
  });
  const storageUrl = await storage.getUrl(key);

  const asset = await createAsset({
    clienteId: input.clienteId,
    type: KIND_TO_TYPE[input.kind] ?? "other",
    storageUrl,
    storageProvider: storage.provider,
    pilierId: input.pilierId ?? null,
    consentId: await getConsentId(input.clienteId, "photos"),
  });

  return { ok: true, asset, src: assetDisplaySrc(storageUrl) };
}
