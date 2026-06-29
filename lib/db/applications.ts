import "server-only";
import { publicSql } from "@/lib/db/public-client";

/**
 * Candidatures publiques (table applications). L'INSERT passe par le SEAM
 * PUBLIC (publicSql) : une candidate écrit sa propre candidature et ne lit
 * jamais celles des autres (aucune vue publique). Le triage/lecture côté coach
 * vit dans lib/db/applications-admin (pool privilégié).
 */

export interface CreateApplicationInput {
  fullName: string;
  instagram: string;
  email: string;
  birthDate: string; // 'YYYY-MM-DD'
  profession: string;
  motivation: string;
  currentImage: string;
  goal: string;
  wordsToday: string;
  wordsToEmbody: string;
  mainBlocker: string;
  whyNow: string;
  commitmentLevel: string;
}

export async function createApplication(input: CreateApplicationInput): Promise<string> {
  const rows = await publicSql<{ id: string }[]>`
    INSERT INTO applications (
      full_name, instagram, email, birth_date, profession, motivation,
      current_image, goal, words_today, words_to_embody, main_blocker,
      why_now, commitment_level, consent_at
    ) VALUES (
      ${input.fullName}, ${input.instagram}, ${input.email}, ${input.birthDate}::date,
      ${input.profession}, ${input.motivation}, ${input.currentImage}, ${input.goal},
      ${input.wordsToday}, ${input.wordsToEmbody}, ${input.mainBlocker}, ${input.whyNow},
      ${input.commitmentLevel}, now()
    )
    RETURNING id
  `;
  return rows[0]!.id;
}
