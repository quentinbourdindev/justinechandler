"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coachUser } from "@/lib/coach/guard";
import { createClienteSchema } from "@/lib/validation";
import { createClienteAccount, adminResetClientePassword } from "@/lib/db/users";
import { getClienteContact } from "@/lib/db/clientes";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { sendClienteInvitation, sendPasswordReset } from "@/lib/email/send";
import { err, ok, type ActionResult } from "@/lib/action-result";

export interface CreateClienteState {
  error: string | null;
}

/** Réinitialise le mot de passe d'une cliente (admin) + email. */
export async function resetClientePasswordAction(clienteId: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  const contact = await getClienteContact(clienteId);
  if (!contact) return err("Cliente introuvable.");

  const tempPassword = generateTempPassword();
  await adminResetClientePassword(clienteId, await hashPassword(tempPassword));
  await sendPasswordReset({
    to: contact.email,
    firstName: contact.firstName,
    email: contact.email,
    tempPassword,
  });
  revalidatePath(`/coach/clientes/${clienteId}`);
  return ok;
}

/** Crée directement un compte cliente (admin) + invitation email. */
export async function createClienteAction(
  _prev: CreateClienteState,
  formData: FormData
): Promise<CreateClienteState> {
  if (!(await coachUser())) return { error: "Non autorisé." };

  const parsed = createClienteSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate") ?? "",
    city: formData.get("city") ?? "",
    situation: formData.get("situation") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const tempPassword = generateTempPassword();
  let clienteId: string;
  try {
    clienteId = await createClienteAccount({
      email: parsed.data.email,
      passwordHash: await hashPassword(tempPassword),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      birthDate: parsed.data.birthDate || null,
      city: parsed.data.city || null,
      situation: parsed.data.situation || null,
    });
  } catch {
    return { error: "Un compte existe peut-être déjà avec cet email." };
  }

  await sendClienteInvitation({
    to: parsed.data.email,
    firstName: parsed.data.firstName,
    email: parsed.data.email,
    tempPassword,
  });

  revalidatePath("/coach/tableau-de-bord");
  redirect(`/coach/clientes/${clienteId}`);
}
