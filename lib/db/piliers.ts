import "server-only";
import { sql } from "@/lib/db/client";
import type { Pilier, PendingValidation } from "@/lib/db/types";

/**
 * Lectures de l'avancement des piliers. Les mutations (submit_pilier /
 * validate_pilier) sont câblées en Phase 1 — le gate de validation reste
 * en base (trigger), jamais contourné côté app.
 */

/** Les 4 piliers d'une cliente, ordonnés. */
export async function getPiliersForCliente(clienteId: string): Promise<Pilier[]> {
  return sql<Pilier[]>`
    SELECT id, cliente_id, numero, status, submitted_at, validated_at
      FROM piliers
     WHERE cliente_id = ${clienteId}
     ORDER BY numero
  `;
}

/** File d'attente du dashboard coach (vue pending_validations). */
export async function getPendingValidations(): Promise<PendingValidation[]> {
  return sql<PendingValidation[]>`
    SELECT pilier_id, cliente_id, first_name, last_name, numero, submitted_at, status
      FROM pending_validations
  `;
}
