import { STORAGE_ROUTE_PREFIX } from "@/lib/storage/route";

/**
 * Source d'affichage d'un asset (client-safe). Pour un asset local, renvoie un
 * chemin même-origine (indépendant du port de dev) ; sinon l'URL telle quelle
 * (URL signée S3 en prod).
 */
export function assetDisplaySrc(storageUrl: string): string {
  const i = storageUrl.indexOf(STORAGE_ROUTE_PREFIX);
  return i >= 0 ? storageUrl.slice(i) : storageUrl;
}
