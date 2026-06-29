import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getClienteByUserId } from "@/lib/db/clientes";
import { getStorage } from "@/lib/storage";
import { LocalDiskAdapter } from "@/lib/storage/local-disk";
import { assertSafeKey, clienteIdFromKey } from "@/lib/storage/keys";

/**
 * Service protégé des fichiers (dev, disque local). Équivalent privé des URLs
 * signées S3 : seul le propriétaire (la cliente) ou une coach peut lire une
 * image. Aucune photo n'est servie en public.
 */

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  try {
    assertSafeKey(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  // Autorisation : session requise + propriété (ou rôle coach).
  const current = await getCurrentUser();
  if (!current) return new Response("Not found", { status: 404 });

  if (current.user.role !== "coach") {
    const cliente = await getClienteByUserId(current.user.id);
    const owner = clienteIdFromKey(key);
    if (!cliente || !owner || cliente.id !== owner) {
      return new Response("Not found", { status: 404 });
    }
  }

  const storage = getStorage();
  if (!(storage instanceof LocalDiskAdapter)) {
    // En prod (S3), les images passent par des URLs signées, pas par cette route.
    return new Response("Not found", { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await storage.read(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
