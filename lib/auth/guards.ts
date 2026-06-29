import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SafeUser, UserRole } from "@/lib/db/types";
import { getSafeUserById } from "@/lib/db/users";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  pcaEpoch,
  type SessionClaims,
} from "@/lib/auth/session";

/**
 * Guards de rôle + résolution de la session « live ».
 *
 * Deux couches : le middleware fait le gating grossier au bord (signature JWT,
 * préfixe de route). Ici, côté serveur, on recharge l'état RÉEL du compte en
 * base — must_change_password et password_changed_at font foi — pour invalider
 * les sessions périmées (changement de mot de passe, changement de rôle).
 */

export function homePathForRole(role: UserRole): string {
  return role === "coach" ? "/coach/tableau-de-bord" : "/espace/tableau-de-bord";
}

/** Émet la session pour un utilisateur et pose le cookie (login + ré-émission). */
export async function setSession(user: SafeUser): Promise<void> {
  const token = await signSession({
    sub: user.id,
    role: user.role,
    mcp: user.must_change_password,
    pca: pcaEpoch(user.password_changed_at),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function getSessionClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export interface CurrentUser {
  user: SafeUser;
  claims: SessionClaims;
}

/**
 * Utilisateur courant validé contre la base, ou null. Ne redirige pas.
 * Renvoie null (session ignorée) si : compte introuvable, rôle divergent, ou
 * pca du jeton ≠ pca « live » (session émise avant un changement de mot de passe).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;

  const user = await getSafeUserById(claims.sub);
  if (!user) return null;
  if (user.role !== claims.role) return null;
  if (pcaEpoch(user.password_changed_at) !== claims.pca) return null;

  return { user, claims };
}

/** Exige une session valide (n'importe quel rôle). */
export async function requireUser(): Promise<SafeUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current.user;
}

/** Exige le rôle cliente + applique la redirection « changement forcé ». */
export async function requireCliente(): Promise<SafeUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.role !== "cliente") redirect(homePathForRole(current.user.role));
  if (current.user.must_change_password) redirect("/changer-mot-de-passe");
  return current.user;
}

/** Exige le rôle coach + applique la redirection « changement forcé ». */
export async function requireCoach(): Promise<SafeUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.user.role !== "coach") redirect(homePathForRole(current.user.role));
  if (current.user.must_change_password) redirect("/changer-mot-de-passe");
  return current.user;
}
