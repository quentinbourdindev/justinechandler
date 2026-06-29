import "server-only";
import { getEmail, type EmailMessage } from "@/lib/email";
import {
  candidatureAckTemplate,
  bookingConfirmationTemplate,
  clienteInvitationTemplate,
  passwordResetTemplate,
} from "@/lib/email/templates";
import { getEnv } from "@/lib/env";

/**
 * Envois transactionnels. NE bloquent JAMAIS l'UX : toute erreur d'envoi est
 * loggée et avalée (l'action métier a déjà réussi).
 */
async function safeSend(message: EmailMessage): Promise<void> {
  try {
    await getEmail().send(message);
  } catch (err) {
    console.error(`[email] échec d'envoi à ${message.to} :`, err);
  }
}

function loginUrl(): string {
  return `${getEnv().APP_URL}/login`;
}

export async function sendCandidatureAck(to: string, firstName: string): Promise<void> {
  await safeSend({ to, ...candidatureAckTemplate(firstName) });
}

export async function sendBookingConfirmation(
  to: string,
  firstName: string,
  startAt: Date | string
): Promise<void> {
  await safeSend({ to, ...bookingConfirmationTemplate(firstName, startAt) });
}

export async function sendClienteInvitation(input: {
  to: string;
  firstName: string;
  email: string;
  tempPassword: string;
}): Promise<void> {
  await safeSend({
    to: input.to,
    ...clienteInvitationTemplate({
      firstName: input.firstName,
      email: input.email,
      tempPassword: input.tempPassword,
      loginUrl: loginUrl(),
    }),
  });
}

export async function sendPasswordReset(input: {
  to: string;
  firstName: string;
  email: string;
  tempPassword: string;
}): Promise<void> {
  await safeSend({
    to: input.to,
    ...passwordResetTemplate({
      firstName: input.firstName,
      email: input.email,
      tempPassword: input.tempPassword,
      loginUrl: loginUrl(),
    }),
  });
}
