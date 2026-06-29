import "server-only";
import { sql } from "@/lib/db/client";
import type {
  Pilier,
  PendingValidation,
  PilierNumero,
  ValidationDecision,
} from "@/lib/db/types";

/** Décision de validation journalisée (table validations). */
export interface Validation {
  id: string;
  pilier_id: string;
  coach_id: string;
  decision: ValidationDecision;
  comment: string | null;
  created_at: Date;
}

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

/** Un pilier précis d'une cliente (par numéro). */
export async function getPilierForCliente(
  clienteId: string,
  numero: PilierNumero
): Promise<Pilier | null> {
  const rows = await sql<Pilier[]>`
    SELECT id, cliente_id, numero, status, submitted_at, validated_at
      FROM piliers
     WHERE cliente_id = ${clienteId} AND numero = ${numero}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Un pilier par id (avec sa cliente, pour les écrans coach). */
export async function getPilierById(pilierId: string): Promise<Pilier | null> {
  const rows = await sql<Pilier[]>`
    SELECT id, cliente_id, numero, status, submitted_at, validated_at
      FROM piliers
     WHERE id = ${pilierId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** File d'attente du dashboard coach (vue pending_validations). */
export async function getPendingValidations(): Promise<PendingValidation[]> {
  return sql<PendingValidation[]>`
    SELECT pilier_id, cliente_id, first_name, last_name, numero, submitted_at, status
      FROM pending_validations
  `;
}

/**
 * Soumet un pilier à la coach (fonction base submit_pilier). Le gate reste en
 * base : seul un pilier in_progress|needs_revision peut être soumis.
 */
export async function submitPilier(pilierId: string): Promise<Pilier> {
  const rows = await sql<Pilier[]>`SELECT * FROM submit_pilier(${pilierId})`;
  return rows[0]!;
}

/**
 * Décision de la coach (fonction base validate_pilier) : journalise, met à jour
 * le pilier, et débloque le suivant si validated. La base vérifie que coach_id
 * est bien une coach et que le pilier est submitted.
 */
export async function validatePilier(
  pilierId: string,
  coachId: string,
  decision: ValidationDecision,
  comment: string | null
): Promise<Pilier> {
  const rows = await sql<Pilier[]>`
    SELECT * FROM validate_pilier(
      ${pilierId}, ${coachId}, ${decision}::validation_decision, ${comment}
    )
  `;
  return rows[0]!;
}

/** Historique des décisions de la coach sur un pilier (récentes d'abord). */
export async function getValidationsForPilier(
  pilierId: string
): Promise<Validation[]> {
  return sql<Validation[]>`
    SELECT id, pilier_id, coach_id, decision, comment, created_at
      FROM validations
     WHERE pilier_id = ${pilierId}
     ORDER BY created_at DESC
  `;
}
