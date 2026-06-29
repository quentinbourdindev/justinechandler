"use server";

import { revalidatePath } from "next/cache";
import { coachUser } from "@/lib/coach/guard";
import { createSlot, setSlotStatus, deleteSlot, cancelBooking } from "@/lib/db/booking-admin";
import { err, ok, type ActionResult } from "@/lib/action-result";

const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DISPO = "/coach/disponibilites";

export interface CreateSlotState {
  error: string | null;
}

/** Ouvre un créneau (datetime-local début + fin). */
export async function createSlotAction(
  _prev: CreateSlotState,
  formData: FormData
): Promise<CreateSlotState> {
  if (!(await coachUser())) return { error: "Non autorisé." };

  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!DT.test(start) || !DT.test(end)) return { error: "Renseigne le début et la fin." };
  if (end <= start) return { error: "La fin doit être après le début." };

  try {
    await createSlot({ startAt: start, endAt: end, adminNote: note });
  } catch {
    return { error: "Impossible de créer le créneau." };
  }
  revalidatePath(DISPO);
  return { error: null };
}

/** Ferme / rouvre un créneau (available <-> blocked). */
export async function toggleSlotAction(slotId: string, status: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  if (status !== "available" && status !== "blocked") return err("Statut invalide.");
  await setSlotStatus(slotId, status);
  revalidatePath(DISPO);
  return ok;
}

/** Supprime un créneau (refusé s'il est réservé : annuler d'abord). */
export async function deleteSlotAction(slotId: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  try {
    await deleteSlot(slotId);
  } catch {
    return err("Ce créneau est réservé : annule d'abord la réservation.");
  }
  revalidatePath(DISPO);
  return ok;
}

/** Annule une réservation (libère le créneau). */
export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  if (!(await coachUser())) return err("Non autorisé.");
  try {
    await cancelBooking(bookingId);
  } catch {
    return err("Annulation impossible.");
  }
  revalidatePath(DISPO);
  return ok;
}
