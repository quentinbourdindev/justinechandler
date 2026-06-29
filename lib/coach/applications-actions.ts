"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coachUser } from "@/lib/coach/guard";
import {
  getApplication,
  updateApplicationStatus,
  convertApplication,
  deleteApplication,
} from "@/lib/db/applications-admin";
import { adminResetClientePassword } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { sendClienteInvitation } from "@/lib/email/send";
import { err, ok, type ActionResult } from "@/lib/action-result";

const TRIAGE = new Set(["new", "reviewing", "selected", "rejected"]);

/** Change le statut de triage d'une candidature. */
export async function setApplicationStatusAction(
  applicationId: string,
  status: string
): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  if (!TRIAGE.has(status)) return err("Statut invalide.");

  const app = await getApplication(applicationId);
  if (!app) return err("Candidature introuvable.");
  if (app.status === "converted") return err("Candidature déjà convertie.");

  await updateApplicationStatus(applicationId, status as "new" | "reviewing" | "selected" | "rejected");
  revalidatePath(`/coach/candidatures/${applicationId}`);
  revalidatePath("/coach/candidatures");
  return ok;
}

/** Convertit une candidature en cliente + envoie l'invitation. */
export async function convertApplicationAction(applicationId: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");

  const app = await getApplication(applicationId);
  if (!app) return err("Candidature introuvable.");
  if (app.status === "converted" || app.converted_cliente_id) {
    return err("Cette candidature est déjà convertie.");
  }
  if (app.status === "rejected") {
    return err("Candidature rejetée : re-sélectionne-la avant conversion.");
  }

  let clienteId: string;
  let firstName: string;
  try {
    const cliente = await convertApplication(applicationId);
    clienteId = cliente.id;
    firstName = cliente.first_name;
  } catch {
    return err("Conversion impossible (un compte existe peut-être déjà avec cet email).");
  }

  // Pose un mot de passe temporaire (le sentinel n'est pas connectable) + invitation.
  const tempPassword = generateTempPassword();
  await adminResetClientePassword(clienteId, await hashPassword(tempPassword));
  await sendClienteInvitation({
    to: app.email,
    firstName,
    email: app.email,
    tempPassword,
  });

  revalidatePath("/coach/candidatures");
  redirect(`/coach/clientes/${clienteId}`);
}

/** Supprime (purge RGPD) une candidature. */
export async function deleteApplicationAction(applicationId: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  await deleteApplication(applicationId);
  revalidatePath("/coach/candidatures");
  redirect("/coach/candidatures");
}
