import "server-only";
import bcrypt from "bcryptjs";

/**
 * Hachage des mots de passe — TOUJOURS côté application (bcrypt). La base ne
 * reçoit qu'un hash, jamais de clair, et ne le logge jamais.
 */

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Le sentinel d'invitation (`!invite_pending`) ou un hash vide ne sont pas
  // des hashs bcrypt valides : on refuse sans tenter de comparer.
  if (!hash || !hash.startsWith("$2")) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * Hash factice (calculé une fois) pour égaliser le temps de réponse quand
 * l'email n'existe pas — limite l'oracle temporel d'énumération de comptes.
 */
export const DUMMY_HASH: string = bcrypt.hashSync("alia-timing-equalizer", COST);
