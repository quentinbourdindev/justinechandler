import "server-only";
import { sql } from "@/lib/db/client";
import type { ConsentScope } from "@/lib/db/types";

/**
 * Consentements RGPD (table consents, UNIQUE(cliente_id, scope)).
 * Écriture de données (pas de logique métier en base) : upsert par périmètre.
 */

export interface Consent {
  scope: ConsentScope;
  granted: boolean;
  granted_at: Date | null;
  revoked_at: Date | null;
}

/** Accorde ou révoque un consentement (upsert). */
export async function setConsent(
  clienteId: string,
  scope: ConsentScope,
  granted: boolean
): Promise<void> {
  await sql`
    INSERT INTO consents (cliente_id, scope, granted, granted_at, revoked_at)
    VALUES (
      ${clienteId},
      ${scope},
      ${granted},
      ${granted ? sql`now()` : sql`NULL`},
      ${granted ? sql`NULL` : sql`now()`}
    )
    ON CONFLICT (cliente_id, scope) DO UPDATE
      SET granted    = EXCLUDED.granted,
          granted_at = CASE WHEN EXCLUDED.granted THEN now() ELSE consents.granted_at END,
          revoked_at = CASE WHEN EXCLUDED.granted THEN NULL ELSE now() END
  `;
}

/** Tous les consentements d'une cliente. */
export async function getConsents(clienteId: string): Promise<Consent[]> {
  return sql<Consent[]>`
    SELECT scope, granted, granted_at, revoked_at
      FROM consents
     WHERE cliente_id = ${clienteId}
  `;
}

/** Id du consentement (scope) d'une cliente, ou null. */
export async function getConsentId(
  clienteId: string,
  scope: ConsentScope
): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM consents
     WHERE cliente_id = ${clienteId} AND scope = ${scope}
     LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/** Vrai si le consentement (scope) est actuellement accordé. */
export async function hasConsent(
  clienteId: string,
  scope: ConsentScope
): Promise<boolean> {
  const rows = await sql<{ ok: boolean }[]>`
    SELECT true AS ok
      FROM consents
     WHERE cliente_id = ${clienteId} AND scope = ${scope} AND granted = true
     LIMIT 1
  `;
  return rows.length > 0;
}
