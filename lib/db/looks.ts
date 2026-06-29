import "server-only";
import { sql } from "@/lib/db/client";
import type { WardrobeCategory } from "@/lib/db/types";

/** Looks (Pilier 4) composés de pièces via look_pieces (N-N). */

export interface LookPiece {
  id: string;
  name: string;
  display_url: string | null;
}

export interface Look {
  id: string;
  name: string;
  category: WardrobeCategory | null;
  annotation: string | null;
  pieces: LookPiece[];
}

export async function createLook(
  clienteId: string,
  input: { name: string; category?: WardrobeCategory | null; annotation?: string | null }
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO looks (cliente_id, name, category, annotation)
    VALUES (${clienteId}, ${input.name}, ${input.category ?? null}, ${input.annotation ?? null})
    RETURNING id
  `;
  return rows[0]!.id;
}

export async function deleteLook(lookId: string, clienteId: string): Promise<void> {
  await sql`DELETE FROM looks WHERE id = ${lookId} AND cliente_id = ${clienteId}`;
}

/** Ajoute une pièce à un look (les deux doivent appartenir à la cliente). */
export async function addPieceToLook(
  lookId: string,
  pieceId: string,
  clienteId: string
): Promise<void> {
  await sql`
    INSERT INTO look_pieces (look_id, piece_id)
    SELECT l.id, p.id
      FROM looks l, pieces p
     WHERE l.id = ${lookId} AND l.cliente_id = ${clienteId}
       AND p.id = ${pieceId} AND p.cliente_id = ${clienteId}
    ON CONFLICT (look_id, piece_id) DO NOTHING
  `;
}

export async function removePieceFromLook(
  lookId: string,
  pieceId: string,
  clienteId: string
): Promise<void> {
  await sql`
    DELETE FROM look_pieces lp
     USING looks l
     WHERE lp.look_id = ${lookId} AND lp.piece_id = ${pieceId}
       AND lp.look_id = l.id AND l.cliente_id = ${clienteId}
  `;
}

/** Looks d'une cliente avec leurs pièces (URL d'affichage résolue). */
export async function listLooks(clienteId: string): Promise<Look[]> {
  const looks = await sql<{ id: string; name: string; category: WardrobeCategory | null; annotation: string | null }[]>`
    SELECT id, name, category, annotation
      FROM looks WHERE cliente_id = ${clienteId} ORDER BY created_at
  `;
  if (looks.length === 0) return [];

  const ids = looks.map((l) => l.id);
  const rows = await sql<{ look_id: string; id: string; name: string; display_url: string | null }[]>`
    SELECT lp.look_id, p.id, p.name, a.storage_url AS display_url
      FROM look_pieces lp
      JOIN pieces p ON p.id = lp.piece_id
      LEFT JOIN assets a ON a.id = p.asset_id
     WHERE lp.look_id = ANY(${ids})
     ORDER BY lp.created_at
  `;

  return looks.map((l) => ({
    ...l,
    pieces: rows
      .filter((r) => r.look_id === l.id)
      .map((r) => ({ id: r.id, name: r.name, display_url: r.display_url })),
  }));
}
