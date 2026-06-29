import "server-only";
import crypto from "node:crypto";
import { STORAGE_ROUTE_PREFIX } from "@/lib/storage/route";

export { STORAGE_ROUTE_PREFIX };

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

/** Valide une clé de stockage (anti path-traversal). Lève si invalide. */
export function assertSafeKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error(`Clé de stockage invalide : ${key}`);
  }
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

/** Construit une clé : clientes/<clienteId>/<kind>/<uuid>.<ext>. */
export function buildAssetKey(clienteId: string, kind: string, ext: string): string {
  const safeKind = kind.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "misc";
  const key = `clientes/${clienteId}/${safeKind}/${crypto.randomUUID()}.${ext}`;
  assertSafeKey(key);
  return key;
}

/** Extrait la clé depuis une storage_url absolue (…/api/storage/<key>) ou une clé brute. */
export function keyFromUrlOrPath(s: string): string {
  const i = s.indexOf(STORAGE_ROUTE_PREFIX);
  return i >= 0 ? s.slice(i + STORAGE_ROUTE_PREFIX.length) : s;
}

/** Id de cliente encodé dans la clé (2e segment : clientes/<id>/…). */
export function clienteIdFromKey(key: string): string | null {
  const parts = key.split("/");
  return parts[0] === "clientes" && parts[1] ? parts[1] : null;
}
