"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertCsrf, CsrfError } from "@/lib/security/csrf";
import { rateLimit, resetRateLimit, LOGIN_RATE_LIMIT } from "@/lib/security/rate-limit";
import { loginSchema, changePasswordSchema } from "@/lib/validation";
import {
  getUserByEmailWithSecret,
  getUserByIdWithSecret,
  getSafeUserById,
  touchLastLogin,
  changeOwnPassword,
} from "@/lib/db/users";
import { verifyPassword, hashPassword, DUMMY_HASH } from "@/lib/auth/password";
import {
  setSession,
  clearSession,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/guards";

export interface AuthFormState {
  error: string | null;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}

/** Connexion email + mot de passe. */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  let redirectTo: string | null = null;

  try {
    await assertCsrf(formData);

    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { error: "Email ou mot de passe invalide." };
    }
    const { email, password } = parsed.data;

    // Anti brute-force : par (IP + email).
    const ip = await clientIp();
    const rl = rateLimit(`login:${ip}:${email.toLowerCase()}`, LOGIN_RATE_LIMIT);
    if (!rl.ok) {
      const minutes = Math.ceil(rl.retryAfterSec / 60);
      return { error: `Trop de tentatives. Réessayez dans ${minutes} min.` };
    }

    const user = await getUserByEmailWithSecret(email);
    // Comparaison systématique (même si compte inexistant) pour égaliser le temps.
    const valid = user
      ? await verifyPassword(password, user.password_hash)
      : (await verifyPassword(password, DUMMY_HASH), false);

    if (!user || !valid) {
      return { error: "Identifiants invalides." };
    }

    resetRateLimit(`login:${ip}:${email.toLowerCase()}`);
    await touchLastLogin(user.id);
    const { password_hash: _omit, ...safe } = user;
    await setSession(safe);

    redirectTo = user.must_change_password
      ? "/changer-mot-de-passe"
      : homePathForRole(user.role);
  } catch (e) {
    if (e instanceof CsrfError) {
      return { error: "Session expirée. Rechargez la page et réessayez." };
    }
    throw e;
  }

  redirect(redirectTo);
}

/** Déconnexion. */
export async function logoutAction(formData: FormData): Promise<void> {
  try {
    await assertCsrf(formData);
  } catch (e) {
    if (!(e instanceof CsrfError)) throw e;
    // En cas de jeton manquant, on déconnecte quand même (action sans risque).
  }
  await clearSession();
  redirect("/login");
}

/** Changement de mot de passe par l'utilisateur (flux forcé inclus). */
export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  let redirectTo: string | null = null;

  try {
    await assertCsrf(formData);

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }

    const full = await getUserByIdWithSecret(current.user.id);
    if (!full) return { error: "Compte introuvable." };

    const ok = await verifyPassword(parsed.data.currentPassword, full.password_hash);
    if (!ok) return { error: "Mot de passe actuel incorrect." };

    const newHash = await hashPassword(parsed.data.newPassword);
    await changeOwnPassword(current.user.id, newHash);

    // Ré-émission de la session : nouvelle pca + must_change_password=false →
    // toute ancienne session (autre appareil) devient invalide.
    const fresh = await getSafeUserById(current.user.id);
    if (fresh) await setSession(fresh);

    redirectTo = homePathForRole(current.user.role);
  } catch (e) {
    if (e instanceof CsrfError) {
      return { error: "Session expirée. Rechargez la page et réessayez." };
    }
    throw e;
  }

  redirect(redirectTo);
}
