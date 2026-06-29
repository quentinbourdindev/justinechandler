import "server-only";
import { sql } from "@/lib/db/client";
import type { AssetType } from "@/lib/db/types";

/**
 * Métadonnées d'images (table assets) : la base ne stocke QUE des URLs, jamais
 * de binaire. Le fichier vit dans l'object storage (lib/storage).
 */

export interface Asset {
  id: string;
  cliente_id: string;
  pilier_id: string | null;
  consent_id: string | null;
  type: AssetType;
  storage_url: string;
  storage_provider: string;
  created_at: Date;
}

export async function createAsset(input: {
  clienteId: string;
  type: AssetType;
  storageUrl: string;
  storageProvider: string;
  pilierId?: string | null;
  consentId?: string | null;
}): Promise<Asset> {
  const rows = await sql<Asset[]>`
    INSERT INTO assets (cliente_id, pilier_id, consent_id, type, storage_url, storage_provider)
    VALUES (
      ${input.clienteId},
      ${input.pilierId ?? null},
      ${input.consentId ?? null},
      ${input.type},
      ${input.storageUrl},
      ${input.storageProvider}
    )
    RETURNING id, cliente_id, pilier_id, consent_id, type, storage_url, storage_provider, created_at
  `;
  return rows[0]!;
}

/** Asset par id, restreint à une cliente (isolation). */
export async function getAssetForCliente(
  assetId: string,
  clienteId: string
): Promise<Asset | null> {
  const rows = await sql<Asset[]>`
    SELECT id, cliente_id, pilier_id, consent_id, type, storage_url, storage_provider, created_at
      FROM assets
     WHERE id = ${assetId} AND cliente_id = ${clienteId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Asset par id (accès coach : tous les assets). */
export async function getAssetById(assetId: string): Promise<Asset | null> {
  const rows = await sql<Asset[]>`
    SELECT id, cliente_id, pilier_id, consent_id, type, storage_url, storage_provider, created_at
      FROM assets
     WHERE id = ${assetId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}
