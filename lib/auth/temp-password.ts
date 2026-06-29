import "server-only";
import crypto from "node:crypto";

/**
 * Génère un mot de passe temporaire lisible (création de compte / reset admin).
 * Le compte est créé avec must_change_password=true → la cliente le remplace à
 * sa première connexion. ~12 caractères, sans caractères ambigus.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
