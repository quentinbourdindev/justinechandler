import { formatDateTimeFr } from "@/lib/format";

/** Contenu d'un email (sans destinataire). */
export interface TemplateContent {
  subject: string;
  text: string;
  html: string;
}

/** Gabarit HTML commun (sobre, compatible clients mail). */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#FAF7F2;font-family:Arial,Helvetica,sans-serif;color:#24344A;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <p style="font-size:24px;color:#4B72A2;margin:0 0 24px;font-weight:bold;">Alia</p>
    <h1 style="font-size:20px;margin:0 0 16px;color:#2A3F59;">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#85A4C6;">L'IA assiste, Justine valide. — Alia</p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:#4B72A2;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;display:inline-block;">${label}</a></p>`;
}

export function candidatureAckTemplate(firstName: string): TemplateContent {
  const subject = "Ta candidature est bien reçue ✨";
  const text = `Bonjour ${firstName},

Merci pour ta candidature à l'accompagnement Alia. Je la lis personnellement et je reviens vers toi très vite.

À très bientôt,
Justine`;
  const html = layout(
    "Ta candidature est bien reçue",
    `<p>Bonjour ${firstName},</p>
     <p>Merci pour ta candidature à l'accompagnement <strong>Alia</strong>. Je la lis personnellement et je reviens vers toi très vite.</p>
     <p>À très bientôt,<br/>Justine</p>`
  );
  return { subject, text, html };
}

export function bookingConfirmationTemplate(
  firstName: string,
  startAt: Date | string
): TemplateContent {
  const when = formatDateTimeFr(startAt);
  const subject = "Ton appel découverte est confirmé";
  const text = `Bonjour ${firstName},

Ton appel découverte avec Justine est confirmé pour le ${when}.

À très vite,
Justine`;
  const html = layout(
    "Appel découverte confirmé",
    `<p>Bonjour ${firstName},</p>
     <p>Ton appel découverte avec Justine est confirmé pour le <strong>${when}</strong>.</p>
     <p>À très vite,<br/>Justine</p>`
  );
  return { subject, text, html };
}

export function clienteInvitationTemplate(input: {
  firstName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): TemplateContent {
  const subject = "Bienvenue chez Alia — tes accès";
  const text = `Bonjour ${input.firstName},

Ton espace Alia est prêt. Voici tes identifiants pour ta première connexion :

  Email : ${input.email}
  Mot de passe temporaire : ${input.tempPassword}

Connecte-toi ici : ${input.loginUrl}
À ta première connexion, tu choisiras ton propre mot de passe.

Au plaisir de t'accompagner,
Justine`;
  const html = layout(
    "Bienvenue chez Alia",
    `<p>Bonjour ${input.firstName},</p>
     <p>Ton espace Alia est prêt. Voici tes identifiants pour ta première connexion :</p>
     <p style="background:#fff;border:1px solid #D6E1ED;border-radius:12px;padding:16px;">
       Email : <strong>${input.email}</strong><br/>
       Mot de passe temporaire : <strong>${input.tempPassword}</strong>
     </p>
     ${button(input.loginUrl, "Accéder à mon espace")}
     <p style="font-size:14px;color:#6388B4;">À ta première connexion, tu choisiras ton propre mot de passe.</p>
     <p>Au plaisir de t'accompagner,<br/>Justine</p>`
  );
  return { subject, text, html };
}

export function passwordResetTemplate(input: {
  firstName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): TemplateContent {
  const subject = "Ton mot de passe Alia a été réinitialisé";
  const text = `Bonjour ${input.firstName},

Ton mot de passe a été réinitialisé. Nouveau mot de passe temporaire :

  Email : ${input.email}
  Mot de passe temporaire : ${input.tempPassword}

Connecte-toi ici : ${input.loginUrl}
Tu choisiras un nouveau mot de passe dès ta connexion.

Justine`;
  const html = layout(
    "Mot de passe réinitialisé",
    `<p>Bonjour ${input.firstName},</p>
     <p>Ton mot de passe a été réinitialisé. Voici ton mot de passe temporaire :</p>
     <p style="background:#fff;border:1px solid #D6E1ED;border-radius:12px;padding:16px;">
       Email : <strong>${input.email}</strong><br/>
       Mot de passe temporaire : <strong>${input.tempPassword}</strong>
     </p>
     ${button(input.loginUrl, "Me connecter")}
     <p style="font-size:14px;color:#6388B4;">Tu choisiras un nouveau mot de passe dès ta connexion.</p>
     <p>Justine</p>`
  );
  return { subject, text, html };
}
