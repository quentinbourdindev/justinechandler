import "server-only";
import { sql } from "@/lib/db/client";

/**
 * Moodboards (Pilier 1 « mot 2 » et Pilier 4). Un item = un asset interne
 * (photo uploadée) OU une URL externe d'inspiration (CHECK en base).
 */

export interface MoodboardItem {
  id: string;
  moodboard_id: string;
  asset_id: string | null;
  source_url: string | null;
  note: string | null;
  /** URL d'affichage résolue : storage_url de l'asset, sinon source_url. */
  display_url: string;
  created_at: Date;
}

export interface MoodboardWithItems {
  id: string;
  cliente_id: string;
  pilier_id: string | null;
  title: string;
  items: MoodboardItem[];
}

/** Récupère (ou crée) le moodboard d'un pilier pour une cliente. */
export async function getOrCreateMoodboardForPilier(
  clienteId: string,
  pilierId: string,
  title: string
): Promise<string> {
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM moodboards
     WHERE cliente_id = ${clienteId} AND pilier_id = ${pilierId}
     ORDER BY created_at
     LIMIT 1
  `;
  if (existing[0]) return existing[0].id;

  const created = await sql<{ id: string }[]>`
    INSERT INTO moodboards (cliente_id, pilier_id, title)
    VALUES (${clienteId}, ${pilierId}, ${title})
    RETURNING id
  `;
  return created[0]!.id;
}

/** Ajoute un item au moodboard (asset interne OU URL externe). */
export async function addMoodboardItem(input: {
  moodboardId: string;
  assetId?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
}): Promise<void> {
  if (!input.assetId && !input.sourceUrl) {
    throw new Error("Un item de moodboard exige un asset ou une URL.");
  }
  await sql`
    INSERT INTO moodboard_items (moodboard_id, asset_id, source_url, note)
    VALUES (${input.moodboardId}, ${input.assetId ?? null}, ${input.sourceUrl ?? null}, ${input.note ?? null})
  `;
}

/** Supprime un item (restreint à la cliente propriétaire). */
export async function deleteMoodboardItem(
  itemId: string,
  clienteId: string
): Promise<void> {
  await sql`
    DELETE FROM moodboard_items mi
     USING moodboards m
     WHERE mi.id = ${itemId}
       AND mi.moodboard_id = m.id
       AND m.cliente_id = ${clienteId}
  `;
}

/** Moodboards d'un pilier (avec items + URL d'affichage résolue). */
export async function getMoodboardsForPilier(
  clienteId: string,
  pilierId: string
): Promise<MoodboardWithItems[]> {
  const boards = await sql<{ id: string; cliente_id: string; pilier_id: string; title: string }[]>`
    SELECT id, cliente_id, pilier_id, title
      FROM moodboards
     WHERE cliente_id = ${clienteId} AND pilier_id = ${pilierId}
     ORDER BY created_at
  `;
  if (boards.length === 0) return [];

  const ids = boards.map((b) => b.id);
  const items = await sql<MoodboardItem[]>`
    SELECT mi.id, mi.moodboard_id, mi.asset_id, mi.source_url, mi.note,
           COALESCE(a.storage_url, mi.source_url) AS display_url,
           mi.created_at
      FROM moodboard_items mi
      LEFT JOIN assets a ON a.id = mi.asset_id
     WHERE mi.moodboard_id = ANY(${ids})
     ORDER BY mi.created_at
  `;

  return boards.map((b) => ({
    ...b,
    items: items.filter((it) => it.moodboard_id === b.id),
  }));
}
