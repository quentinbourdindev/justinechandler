import "server-only";
import { sql } from "@/lib/db/client";
import type { SafeUser, UserWithSecret } from "@/lib/db/types";

/**
 * Accès aux comptes `users`. Le `password_hash` ne sort de ce module que vers
 * lib/auth (vérification du mot de passe). Toutes les autres surfaces utilisent
 * `SafeUser` (jamais de hash).
 */

const SAFE_COLUMNS = sql`
  id, role, email, must_change_password, password_changed_at, last_login_at
`;

/** Lookup interne AVEC le hash — réservé à la vérification de connexion. */
export async function getUserByEmailWithSecret(
  email: string
): Promise<UserWithSecret | null> {
  const rows = await sql<UserWithSecret[]>`
    SELECT id, role, email, password_hash, must_change_password,
           password_changed_at, last_login_at
      FROM users
     WHERE email = ${email}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Lookup interne AVEC le hash par id — réservé à la vérification (changement de mdp). */
export async function getUserByIdWithSecret(
  id: string
): Promise<UserWithSecret | null> {
  const rows = await sql<UserWithSecret[]>`
    SELECT id, role, email, password_hash, must_change_password,
           password_changed_at, last_login_at
      FROM users
     WHERE id = ${id}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Vue sûre d'un compte (source de vérité « live » pour les guards). */
export async function getSafeUserById(id: string): Promise<SafeUser | null> {
  const rows = await sql<SafeUser[]>`
    SELECT ${SAFE_COLUMNS} FROM users WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Renseigne last_login_at = now() (appelé après une connexion réussie). */
export async function touchLastLogin(id: string): Promise<void> {
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${id}`;
}

// --- Fonctions métier de la base (mot de passe) ----------------------------

/**
 * create_cliente_account(...) — crée users (role cliente, must_change_password)
 * + clientes (+ 4 piliers auto). Reçoit un HASH. Renvoie l'id cliente.
 */
export async function createClienteAccount(params: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  city?: string | null;
  situation?: string | null;
}): Promise<string> {
  const rows = await sql<{ cliente_id: string }[]>`
    SELECT create_cliente_account(
      ${params.email},
      ${params.passwordHash},
      ${params.firstName},
      ${params.lastName},
      ${params.birthDate ?? null}::date,
      ${params.city ?? null},
      ${params.situation ?? null}
    ) AS cliente_id
  `;
  return rows[0]!.cliente_id;
}

/** change_own_password(user_id, hash) — must_change_password=false + horodatage. */
export async function changeOwnPassword(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  await sql`SELECT change_own_password(${userId}, ${newPasswordHash})`;
}

/** admin_reset_cliente_password(cliente_id, hash) — hash temporaire + flag true. */
export async function adminResetClientePassword(
  clienteId: string,
  newPasswordHash: string
): Promise<void> {
  await sql`SELECT admin_reset_cliente_password(${clienteId}, ${newPasswordHash})`;
}
