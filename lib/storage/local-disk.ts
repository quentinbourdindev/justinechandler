import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PutObjectInput, StorageAdapter } from "@/lib/storage";
import { STORAGE_ROUTE_PREFIX, assertSafeKey, keyFromUrlOrPath } from "@/lib/storage/keys";

/**
 * Adaptateur de stockage sur disque (développement). Les fichiers vivent sous
 * `storage-dev/` (gitignoré) et sont servis par la route protégée
 * `/api/storage/[...key]` (session + propriété), jamais en public direct.
 */
export class LocalDiskAdapter implements StorageAdapter {
  readonly provider = "local_disk" as const;
  private readonly baseDir = path.join(process.cwd(), "storage-dev");

  constructor(private readonly appUrl: string) {}

  private fullPath(key: string): string {
    assertSafeKey(key);
    return path.join(this.baseDir, key);
  }

  async put(input: PutObjectInput): Promise<{ key: string }> {
    const target = this.fullPath(input.key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.body);
    return { key: input.key };
  }

  /** URL absolue (satisfait le CHECK http(s) de assets.storage_url). */
  async getUrl(key: string): Promise<string> {
    assertSafeKey(key);
    return `${this.appUrl}${STORAGE_ROUTE_PREFIX}${key}`;
  }

  async delete(keyOrUrl: string): Promise<void> {
    const key = keyFromUrlOrPath(keyOrUrl);
    try {
      await fs.unlink(this.fullPath(key));
    } catch (e) {
      // Fichier déjà absent : la purge RGPD doit rester tolérante.
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  /** Lecture brute (utilisée par la route de service). */
  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.fullPath(key));
  }
}
