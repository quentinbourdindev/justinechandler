import "server-only";
import { getEnv } from "@/lib/env";

/**
 * Abstraction d'envoi d'emails transactionnels (FR, ton Alia).
 *
 * Phase 0 : interface + adaptateur console (dev). Phase 2 branchera un service
 * EU/RGPD (Brevo / Scaleway TEM / SMTP IONOS). L'envoi ne doit JAMAIS bloquer
 * l'UX (fire-and-forget côté appelant).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Corps texte (obligatoire). */
  text: string;
  /** Corps HTML (optionnel). */
  html?: string;
}

export interface EmailAdapter {
  readonly transport: "console" | "smtp";
  send(message: EmailMessage): Promise<void>;
}

/** Adaptateur dev : écrit l'email dans la console serveur (aucun envoi réseau). */
class ConsoleEmailAdapter implements EmailAdapter {
  readonly transport = "console" as const;
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[email:console] → ${message.to}\n  Sujet : ${message.subject}\n  ${message.text.replace(/\n/g, "\n  ")}`
    );
  }
}

class SmtpNotImplementedAdapter implements EmailAdapter {
  readonly transport = "smtp" as const;
  async send(): Promise<void> {
    throw new Error("Email SMTP non implémenté en Phase 0 — prévu Phase 2.");
  }
}

let cached: EmailAdapter | null = null;

export function getEmail(): EmailAdapter {
  if (cached) return cached;
  const env = getEnv();
  cached = env.EMAIL_SMTP_HOST
    ? new SmtpNotImplementedAdapter()
    : new ConsoleEmailAdapter();
  return cached;
}
