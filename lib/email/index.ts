import "server-only";
import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

/**
 * Abstraction d'envoi d'emails transactionnels (FR, ton Alia).
 *
 * - dev  : adaptateur console (aucun envoi réseau).
 * - prod : adaptateur SMTP (nodemailer), configuré par env. Couvre Resend
 *          (host smtp.resend.com, port 465, user "resend", pass = clé API),
 *          Scaleway TEM, SMTP IONOS, etc. Sélection auto : si EMAIL_SMTP_HOST
 *          est défini → SMTP, sinon console.
 *
 * L'envoi ne doit JAMAIS bloquer l'UX → voir lib/email/send (try/catch).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  readonly transport: "console" | "smtp";
  send(message: EmailMessage): Promise<void>;
}

/** Adaptateur dev : écrit l'email dans la console serveur. */
class ConsoleEmailAdapter implements EmailAdapter {
  readonly transport = "console" as const;
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[email:console] → ${message.to}\n  Sujet : ${message.subject}\n  ${message.text.replace(/\n/g, "\n  ")}`
    );
  }
}

/** Adaptateur prod : SMTP via nodemailer. */
class SmtpEmailAdapter implements EmailAdapter {
  readonly transport = "smtp" as const;
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(cfg: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  }) {
    this.from = cfg.from;
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465, // 465 = TLS implicite (Resend)
      auth: { user: cfg.user, pass: cfg.password },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

let cached: EmailAdapter | null = null;

export function getEmail(): EmailAdapter {
  if (cached) return cached;
  const env = getEnv();
  cached = env.EMAIL_SMTP_HOST
    ? new SmtpEmailAdapter({
        host: env.EMAIL_SMTP_HOST,
        port: env.EMAIL_SMTP_PORT,
        user: env.EMAIL_SMTP_USER,
        password: env.EMAIL_SMTP_PASSWORD,
        from: env.EMAIL_FROM,
      })
    : new ConsoleEmailAdapter();
  return cached;
}
