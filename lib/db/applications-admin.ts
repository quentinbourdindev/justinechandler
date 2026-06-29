import "server-only";
import { sql } from "@/lib/db/client";
import type { ApplicationStatus } from "@/lib/db/types";

/**
 * Lecture / triage des candidatures — côté ADMIN (pool privilégié). La coach
 * lit toutes les soumissions ; le public n'y a jamais accès (pas de vue
 * publique). On appelle les fonctions SQL existantes pour convertir/supprimer.
 */

export interface Application {
  id: string;
  full_name: string;
  instagram: string;
  email: string;
  birth_date: string;
  profession: string;
  motivation: string;
  current_image: string;
  goal: string;
  words_today: string;
  words_to_embody: string;
  main_blocker: string;
  why_now: string;
  commitment_level: string;
  status: ApplicationStatus;
  consent_at: Date;
  admin_notes: string | null;
  converted_cliente_id: string | null;
  created_at: Date;
}

export interface ApplicationListItem {
  id: string;
  full_name: string;
  email: string;
  status: ApplicationStatus;
  created_at: Date;
}

/** Liste de triage (optionnellement filtrée par statut), récentes d'abord. */
export async function listApplications(
  status?: ApplicationStatus
): Promise<ApplicationListItem[]> {
  if (status) {
    return sql<ApplicationListItem[]>`
      SELECT id, full_name, email, status, created_at
        FROM applications WHERE status = ${status}
       ORDER BY created_at DESC
    `;
  }
  return sql<ApplicationListItem[]>`
    SELECT id, full_name, email, status, created_at
      FROM applications ORDER BY created_at DESC
  `;
}

/** Compte par statut (badges de la file de triage). */
export async function countApplicationsByStatus(): Promise<Record<string, number>> {
  const rows = await sql<{ status: string; n: number }[]>`
    SELECT status, count(*)::int AS n FROM applications GROUP BY status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function getApplication(id: string): Promise<Application | null> {
  const rows = await sql<Application[]>`
    SELECT id, full_name, instagram, email, birth_date, profession, motivation,
           current_image, goal, words_today, words_to_embody, main_blocker,
           why_now, commitment_level, status, consent_at, admin_notes,
           converted_cliente_id, created_at
      FROM applications WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Change le statut de triage (jamais vers/depuis 'converted' — voir convert). */
export async function updateApplicationStatus(
  id: string,
  status: Exclude<ApplicationStatus, "converted">
): Promise<void> {
  await sql`UPDATE applications SET status = ${status} WHERE id = ${id}`;
}

/** convert_application_to_cliente : crée le compte + 4 piliers, marque converted. */
export async function convertApplication(
  id: string
): Promise<{ id: string; user_id: string; first_name: string; last_name: string }> {
  const rows = await sql<{ id: string; user_id: string; first_name: string; last_name: string }[]>`
    SELECT id, user_id, first_name, last_name
      FROM convert_application_to_cliente(${id})
  `;
  return rows[0]!;
}

/** delete_application : purge RGPD d'une candidature. */
export async function deleteApplication(id: string): Promise<void> {
  await sql`SELECT delete_application(${id})`;
}
