import "server-only";
import { getEnv } from "@/lib/env";

/**
 * Abstraction de stockage objet (photos sensibles).
 *
 * Phase 0 : interface + sélection d'adaptateur. L'implémentation réelle arrive
 * en Phase 3/5 :
 *  - prod : IONOS Object Storage (S3-compatible), bucket PRIVÉ + URLs signées
 *    courtes ; `assets.storage_provider = 'ionos_s3'`.
 *  - dev  : adaptateur disque local derrière la même interface.
 *
 * Règle : aucune photo n'est jamais servie en public direct — toujours via une
 * URL signée à durée limitée, et conditionnée au consentement RGPD.
 */

export interface PutObjectInput {
  /** Clé/chemin logique (ex. `clientes/<id>/colorimetrie/<uuid>.jpg`). */
  key: string;
  body: Uint8Array | Buffer;
  contentType: string;
}

export interface StorageAdapter {
  readonly provider: "ionos_s3" | "local_disk";
  put(input: PutObjectInput): Promise<{ key: string }>;
  /** URL signée à durée limitée pour lire un objet privé. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Suppression (droit à l'oubli : purge des objets renvoyés par delete_cliente). */
  delete(keyOrUrl: string): Promise<void>;
}

class NotImplementedAdapter implements StorageAdapter {
  constructor(readonly provider: "ionos_s3" | "local_disk", private phase: string) {}
  private fail(): never {
    throw new Error(
      `Storage (${this.provider}) non implémenté en Phase 0 — prévu ${this.phase}.`
    );
  }
  put(): Promise<{ key: string }> {
    return this.fail();
  }
  getSignedUrl(): Promise<string> {
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
  cached = env.S3_BUCKET
    ? new NotImplementedAdapter("ionos_s3", "Phase 3/5")
    : new NotImplementedAdapter("local_disk", "Phase 3/5");
  return cached;
}
