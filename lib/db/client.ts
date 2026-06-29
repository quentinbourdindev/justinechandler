import "server-only";
import postgres from "postgres";
import { getEnv } from "@/lib/env";

/**
 * Client PostgreSQL privilégié (postgres.js) — espace cliente + dashboard coach.
 * On APPELLE les fonctions/vues SQL existantes : aucune logique métier n'est
 * réimplémentée ici (cf. db/).
 *
 * Singleton mémorisé sur globalThis pour survivre au HMR de Next en dev (sinon
 * chaque rechargement ouvrirait un nouveau pool et épuiserait les connexions).
 */

// DATE (OID 1082) renvoyé en chaîne brute 'YYYY-MM-DD' (pas de Date => pas de
// décalage de fuseau sur birth_date / accompaniment_*).
const dateAsString = {
  date: {
    to: 1082,
    from: [1082] as number[],
    serialize: (x: string) => x,
    parse: (x: string) => x,
  },
};

function create(url: string) {
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    types: dateAsString,
    onnotice: () => {}, // silence les NOTICE PostgreSQL côté logs app
  });
}

type Sql = ReturnType<typeof create>;

const globalForDb = globalThis as unknown as { __aliaSql?: Sql };

export const sql: Sql = globalForDb.__aliaSql ?? create(getEnv().DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__aliaSql = sql;
}
