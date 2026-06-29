import "server-only";
import { headers } from "next/headers";

/** IP cliente (pour le rate-limiting). Derrière un reverse proxy : X-Forwarded-For. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}
