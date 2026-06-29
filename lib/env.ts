import "server-only";
import { z } from "zod";

/**
 * Validation centralisée des variables d'environnement, côté serveur uniquement.
 * Importé par les couches serveur (db, auth, storage, email, ai). Empêche un
 * démarrage avec une configuration incohérente, et garde les secrets hors client.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire"),
  // Seam public : si vide, on retombe sur DATABASE_URL (cf. lib/db/public-client).
  DATABASE_URL_PUBLIC: z.string().optional().default(""),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Optionnels en Phase 0 (branchés aux phases ultérieures).
  MISTRAL_API_KEY: z.string().optional().default(""),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("eu-central-1"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY: z.string().optional().default(""),
  S3_SECRET_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("Alia <bonjour@alia.stellrstudio.fr>"),
  EMAIL_SMTP_HOST: z.string().optional().default(""),
  EMAIL_SMTP_PORT: z.coerce.number().optional().default(587),
  EMAIL_SMTP_USER: z.string().optional().default(""),
  EMAIL_SMTP_PASSWORD: z.string().optional().default(""),
});

let cached: z.infer<typeof schema> | null = null;

export function getEnv(): z.infer<typeof schema> {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export type Env = z.infer<typeof schema>;
