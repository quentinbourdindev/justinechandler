import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import type { UserRole } from "@/lib/db/types";

/**
 * Session sans état : JWT signé (HS256) déposé dans un cookie httpOnly.
 *
 * Module volontairement « edge-safe » (jose + env uniquement, aucune
 * dépendance base / next/headers) afin d'être importable par le middleware.
 *
 * Claims :
 *  - `sub` : id utilisateur ;
 *  - `role` : rôle (gating de routes) ;
 *  - `mcp` : must_change_password à l'émission (redirection forcée au bord) ;
 *  - `pca` : password_changed_at (epoch ms) à l'émission. Comparé à la valeur
 *    « live » en base par les guards : toute session émise AVANT un changement
 *    de mot de passe devient invalide (cf. exigence d'invalidation de session).
 */

const ALG = "HS256";
const TTL = "7d";

export const SESSION_COOKIE = "alia_session";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 j
  };
}

export interface SessionClaims {
  sub: string;
  role: UserRole;
  mcp: boolean;
  pca: number | null;
}

function key(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export function pcaEpoch(passwordChangedAt: Date | null): number | null {
  return passwordChangedAt ? passwordChangedAt.getTime() : null;
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, mcp: claims.mcp, pca: claims.pca })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(key());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    if (!payload.sub) return null;
    return {
      sub: String(payload.sub),
      role: payload.role as UserRole,
      mcp: Boolean(payload.mcp),
      pca: payload.pca == null ? null : Number(payload.pca),
    };
  } catch {
    return null;
  }
}
