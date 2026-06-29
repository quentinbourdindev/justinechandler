import "server-only";

/**
 * Rate-limiting en mémoire (fenêtre fixe), réutilisable :
 *  - login (anti brute-force) en Phase 0 ;
 *  - formulaires publics (candidature, réservation) en Phase 2.
 *
 * Suffisant pour un déploiement mono-instance (VPS IONOS + PM2/Docker unique).
 * ⚠️ Multi-instances : il faudrait un store partagé (Redis). Documenté comme
 * limite connue.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRl = globalThis as unknown as { __aliaRateStore?: Map<string, Bucket> };
const store: Map<string, Bucket> = globalForRl.__aliaRateStore ?? new Map();
if (process.env.NODE_ENV !== "production") globalForRl.__aliaRateStore = store;

export interface RateLimitOptions {
  /** Nombre maximal d'actions autorisées dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre, en millisecondes. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Secondes avant réinitialisation (utile pour l'en-tête Retry-After). */
  retryAfterSec: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - existing.count),
    retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Réinitialise un compteur (ex. après une connexion réussie). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Politique de connexion : 8 tentatives / 15 minutes par (IP + email). */
export const LOGIN_RATE_LIMIT: RateLimitOptions = {
  limit: 8,
  windowMs: 15 * 60 * 1000,
};
