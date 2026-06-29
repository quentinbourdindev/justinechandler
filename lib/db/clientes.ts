import "server-only";
import { sql } from "@/lib/db/client";
import type { BoussoleWords, Cliente } from "@/lib/db/types";

/** Profil cliente par compte (session). */
export async function getClienteByUserId(userId: string): Promise<Cliente | null> {
  const rows = await sql<Cliente[]>`
    SELECT id, user_id, first_name, last_name, city, situation, status,
           birth_date, accompaniment_start_date, accompaniment_end_date,
           word_who_she_is, word_what_she_likes, word_to_embody,
           created_at, updated_at
      FROM clientes
     WHERE user_id = ${userId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Profil cliente par id. */
export async function getClienteById(clienteId: string): Promise<Cliente | null> {
  const rows = await sql<Cliente[]>`
    SELECT id, user_id, first_name, last_name, city, situation, status,
           birth_date, accompaniment_start_date, accompaniment_end_date,
           word_who_she_is, word_what_she_likes, word_to_embody,
           created_at, updated_at
      FROM clientes
     WHERE id = ${clienteId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Les 3 mots-boussole (affichés en permanence dans l'espace cliente). */
export function boussoleFromCliente(c: Cliente | null): BoussoleWords {
  return {
    who_she_is: c?.word_who_she_is ?? null,
    what_she_likes: c?.word_what_she_likes ?? null,
    to_embody: c?.word_to_embody ?? null,
  };
}

/** Calcule l'âge à la volée (la base stocke birth_date, jamais l'âge). */
export function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

/** Portefeuille coach : liste légère des clientes. */
export interface ClienteListItem {
  id: string;
  first_name: string;
  last_name: string;
  status: Cliente["status"];
  validated_count: number;
  total_piliers: number;
}

export async function listClientes(): Promise<ClienteListItem[]> {
  return sql<ClienteListItem[]>`
    SELECT c.id, c.first_name, c.last_name, c.status,
           count(*) FILTER (WHERE p.status = 'validated')::int AS validated_count,
           count(p.*)::int AS total_piliers
      FROM clientes c
      LEFT JOIN piliers p ON p.cliente_id = c.id
     GROUP BY c.id, c.first_name, c.last_name, c.status
     ORDER BY c.created_at DESC
  `;
}
