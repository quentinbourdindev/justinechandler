import "server-only";
import { sql } from "@/lib/db/client";
import type {
  TriDecision,
  TriCriterion,
  WardrobeCategory,
  WordSlot,
} from "@/lib/db/types";

/**
 * Pièces (vêtements/accessoires). Utilisées au Pilier 3 (tri garder/sortir) et
 * au Pilier 4 (catégorie garde-robe + rattachement à un mot). Le CHECK base
 * impose tri_criterion uniquement si tri_decision = 'sortir'.
 */

export interface Piece {
  id: string;
  name: string;
  asset_id: string | null;
  display_url: string | null;
  wardrobe_category: WardrobeCategory | null;
  tri_decision: TriDecision | null;
  tri_criterion: TriCriterion | null;
  linked_word: WordSlot | null;
  tags: string[];
}

const PIECE_COLUMNS = sql`
  p.id, p.name, p.asset_id, a.storage_url AS display_url,
  p.wardrobe_category, p.tri_decision, p.tri_criterion, p.linked_word, p.tags
`;

export async function createPiece(
  clienteId: string,
  input: {
    name: string;
    assetId?: string | null;
    triDecision?: TriDecision | null;
    triCriterion?: TriCriterion | null;
    wardrobeCategory?: WardrobeCategory | null;
    linkedWord?: WordSlot | null;
    tags?: string[];
  }
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO pieces
      (cliente_id, name, asset_id, tri_decision, tri_criterion,
       wardrobe_category, linked_word, tags)
    VALUES (
      ${clienteId}, ${input.name}, ${input.assetId ?? null},
      ${input.triDecision ?? null}, ${input.triCriterion ?? null},
      ${input.wardrobeCategory ?? null}, ${input.linkedWord ?? null},
      ${input.tags ?? []}
    )
    RETURNING id
  `;
  return rows[0]!.id;
}

/** Met à jour la décision de tri (P3). garder ⇒ critère effacé (cohérence CHECK). */
export async function updatePieceTri(
  pieceId: string,
  clienteId: string,
  triDecision: TriDecision,
  triCriterion: TriCriterion | null
): Promise<void> {
  const criterion = triDecision === "sortir" ? triCriterion : null;
  await sql`
    UPDATE pieces SET tri_decision = ${triDecision}, tri_criterion = ${criterion}
     WHERE id = ${pieceId} AND cliente_id = ${clienteId}
  `;
}

/** Met à jour la catégorie garde-robe + le mot rattaché (P4). */
export async function updatePieceWardrobe(
  pieceId: string,
  clienteId: string,
  wardrobeCategory: WardrobeCategory,
  linkedWord: WordSlot | null
): Promise<void> {
  await sql`
    UPDATE pieces SET wardrobe_category = ${wardrobeCategory}, linked_word = ${linkedWord}
     WHERE id = ${pieceId} AND cliente_id = ${clienteId}
  `;
}

export async function deletePiece(pieceId: string, clienteId: string): Promise<void> {
  await sql`DELETE FROM pieces WHERE id = ${pieceId} AND cliente_id = ${clienteId}`;
}

/** Pièces triées (P3) : tri_decision renseignée. */
export async function listPiecesForTri(clienteId: string): Promise<Piece[]> {
  return sql<Piece[]>`
    SELECT ${PIECE_COLUMNS}
      FROM pieces p LEFT JOIN assets a ON a.id = p.asset_id
     WHERE p.cliente_id = ${clienteId} AND p.tri_decision IS NOT NULL
     ORDER BY p.created_at
  `;
}

/** Pièces de la nouvelle garde-robe (P4) : wardrobe_category renseignée. */
export async function listPiecesForWardrobe(clienteId: string): Promise<Piece[]> {
  return sql<Piece[]>`
    SELECT ${PIECE_COLUMNS}
      FROM pieces p LEFT JOIN assets a ON a.id = p.asset_id
     WHERE p.cliente_id = ${clienteId} AND p.wardrobe_category IS NOT NULL
     ORDER BY p.created_at
  `;
}

/** Pièce par id, restreinte à la cliente (pour vérif de propriété). */
export async function getPieceForCliente(
  pieceId: string,
  clienteId: string
): Promise<Piece | null> {
  const rows = await sql<Piece[]>`
    SELECT ${PIECE_COLUMNS}
      FROM pieces p LEFT JOIN assets a ON a.id = p.asset_id
     WHERE p.id = ${pieceId} AND p.cliente_id = ${clienteId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}
