import "server-only";
import { getEnv } from "@/lib/env";
import { LocalDiskAdapter } from "@/lib/storage/local-disk";

/**
 * Abstraction de stockage objet (photos sensibles).
 *
 * - dev  : adaptateur disque local (`storage-dev/`), service via une route
 *          protégée par session (équivalent privé des URLs signées).
 * - prod : IONOS Object Storage (S3-compatible), bucket PRIVÉ + URLs signées
 *          (Phase 3/5) ; `assets.storage_provider = 'ionos_s3'`.
 *
 * Règle : aucune photo n'est jamais servie en public direct, et tout upload est
 * conditionné au consentement RGPD (vérifié par l'appelant).
 */

export interface PutObjectInput {
  /** Clé/chemin logique : `clientes/<clienteId>/<kind>/<uuid>.<ext>`. */
  key: string;
  body: Uint8Array | Buffer;
  contentType: string;
}

export interface StorageAdapter {
  readonly provider: "ionos_s3" | "local_disk";
  put(input: PutObjectInput): Promise<{ key: string }>;
  /** URL d'accès (locale : route protégée ; S3 : URL signée à durée limitée). */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Suppression (droit à l'oubli : purge des objets renvoyés par delete_cliente). */
  delete(keyOrUrl: string): Promise<void>;
}

class S3NotImplementedAdapter implements StorageAdapter {
  readonly provider = "ionos_s3" as const;
  private fail(): never {
    throw new Error("Storage IONOS S3 non implémenté en Phase 0/1 — prévu Phase 3/5.");
  }
  put(): Promise<{ key: string }> {
    return this.fail();
  }
  getUrl(): Promise<string> {
    return this.fail();
  }
  delete(): Promise<void> {
    return this.fail();
  }
}

let cached: StorageAdapter | null = null;

/** Fabrique d'adaptateur selon l'environnement (S3 si configuré, sinon disque). */
export function getStorage(): StorageAdapter {
  if (cached) return cached;
  const env = getEnv();
  cached = env.S3_BUCKET ? new S3NotImplementedAdapter() : new LocalDiskAdapter(env.APP_URL);
  return cached;
}
