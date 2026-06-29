import "server-only";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import { sql as privilegedSql } from "@/lib/db/client";

/**
 * Seam PUBLIC — isolation des données personnelles (PII).
 *
 * Les routes publiques (réservation de RDV, dispo) ne doivent JAMAIS pouvoir
 * lire `availability_slots` ni `discovery_bookings` directement : uniquement la
 * vue `public_availability` (qui n'expose aucun nom) et la fonction `book_slot`.
 *
 * En PRODUCTION : pointer `DATABASE_URL_PUBLIC` sur un rôle `app_anon` à
 * privilèges réduits (GRANT SELECT sur public_availability + EXECUTE sur
 * book_slot uniquement). Voir README, section déploiement (Phase 6).
 *
 * En DEV : si `DATABASE_URL_PUBLIC` est vide, on retombe sur le client
 * privilégié — le cloisonnement reste assuré par la DISCIPLINE de code
 * (ce module n'expose que des helpers touchant la vue publique).
 */

const globalForPublic = globalThis as unknown as {
  __aliaPublicSql?: ReturnType<typeof postgres>;
};

function resolvePublicSql() {
  const { DATABASE_URL_PUBLIC } = getEnv();
  if (!DATABASE_URL_PUBLIC) {
    // Pas de rôle réduit configuré : on réutilise le pool privilégié.
    return privilegedSql;
  }
  if (globalForPublic.__aliaPublicSql) return globalForPublic.__aliaPublicSql;
  const client = postgres(DATABASE_URL_PUBLIC, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPublic.__aliaPublicSql = client;
  }
  return client;
}

export const publicSql = resolvePublicSql();
