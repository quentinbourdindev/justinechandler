import "server-only";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";
import { CSRF_COOKIE, CSRF_FIELD } from "@/lib/security/csrf-constants";

export { CSRF_COOKIE, CSRF_FIELD };

/**
 * Protection CSRF par double-submit cookie, pour les mutations d'auth (login +
 * changement de mot de passe), avant même qu'une session existe.
 *
 * - Le cookie `alia_csrf` (httpOnly) est posé/garanti par le middleware (un RSC
 *   ne peut pas écrire de cookie pendant son rendu).
 * - Le formulaire rend la même valeur dans un champ caché `csrfToken`.
 * - À la soumission : le champ doit égaler le cookie (comparaison à temps
 *   constant) ET l'en-tête Origin doit correspondre à APP_URL.
 *
 * Un attaquant cross-site ne peut ni lire le cookie httpOnly ni deviner le
 * jeton → mismatch → rejet. Combiné au SameSite=Lax des cookies et au contrôle
 * d'Origin des Server Actions Next, c'est une défense en profondeur.
 */

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 h
  };
}

/** Valeur du jeton CSRF courant (pour alimenter le champ caché du formulaire). */
export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? "";
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Vérifie le jeton CSRF d'une mutation. Lève une erreur si invalide.
 * À appeler en tête de chaque server action sensible.
 */
export async function assertCsrf(formData: FormData): Promise<void> {
  const submitted = String(formData.get(CSRF_FIELD) ?? "");
  const cookieToken = await getCsrfToken();

  if (!cookieToken || !submitted || !timingSafeEqual(submitted, cookieToken)) {
    throw new CsrfError("Jeton CSRF invalide ou absent.");
  }

  // Contrôle d'Origin (défense en profondeur).
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (origin) {
    const expected = new URL(getEnv().APP_URL).origin;
    if (origin !== expected) {
      throw new CsrfError(`Origin non autorisée : ${origin}.`);
    }
  }
}

export class CsrfError extends Error {}
