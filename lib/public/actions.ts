"use server";

import { assertCsrf, CsrfError } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { candidatureSchema, bookingSchema } from "@/lib/validation";
import { createApplication } from "@/lib/db/applications";
import { bookSlot } from "@/lib/db/booking";
import { sendCandidatureAck, sendBookingConfirmation } from "@/lib/email/send";

export interface PublicFormState {
  status: "idle" | "success" | "error";
  error?: string;
}

const CANDIDATURE_RL = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5/h par IP
const BOOKING_RL = { limit: 10, windowMs: 60 * 60 * 1000 }; // 10/h par IP

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full.trim();
}

/** Soumission d'une candidature (page publique). */
export async function submitCandidatureAction(
  _prev: PublicFormState,
  formData: FormData
): Promise<PublicFormState> {
  try {
    await assertCsrf(formData);

    const ip = await clientIp();
    if (!rateLimit(`candidature:${ip}`, CANDIDATURE_RL).ok) {
      return { status: "error", error: "Trop de tentatives. Réessaie plus tard." };
    }
    if (formData.get("consent") !== "on") {
      return { status: "error", error: "Le consentement est requis pour candidater." };
    }

    const parsed = candidatureSchema.safeParse({
      fullName: formData.get("fullName"),
      instagram: formData.get("instagram"),
      email: formData.get("email"),
      birthDate: formData.get("birthDate"),
      profession: formData.get("profession"),
      motivation: formData.get("motivation"),
      currentImage: formData.get("currentImage"),
      goal: formData.get("goal"),
      wordsToday: formData.get("wordsToday"),
      wordsToEmbody: formData.get("wordsToEmbody"),
      mainBlocker: formData.get("mainBlocker"),
      whyNow: formData.get("whyNow"),
      commitmentLevel: formData.get("commitmentLevel"),
    });
    if (!parsed.success) {
      return { status: "error", error: parsed.error.issues[0]?.message ?? "Formulaire incomplet." };
    }

    await createApplication(parsed.data);
    await sendCandidatureAck(parsed.data.email, firstNameOf(parsed.data.fullName));
    return { status: "success" };
  } catch (e) {
    if (e instanceof CsrfError) {
      return { status: "error", error: "Session expirée. Recharge la page et réessaie." };
    }
    console.error("[candidature] échec :", e);
    return { status: "error", error: "Une erreur est survenue. Réessaie." };
  }
}

/** Réservation d'un créneau d'appel découverte (page publique). */
export async function bookSlotAction(
  _prev: PublicFormState,
  formData: FormData
): Promise<PublicFormState> {
  try {
    await assertCsrf(formData);

    const ip = await clientIp();
    if (!rateLimit(`booking:${ip}`, BOOKING_RL).ok) {
      return { status: "error", error: "Trop de tentatives. Réessaie plus tard." };
    }
    if (formData.get("consent") !== "on") {
      return { status: "error", error: "Le consentement est requis pour réserver." };
    }

    const parsed = bookingSchema.safeParse({
      slotId: formData.get("slotId"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone") ?? "",
      message: formData.get("message") ?? "",
    });
    if (!parsed.success) {
      return { status: "error", error: parsed.error.issues[0]?.message ?? "Formulaire incomplet." };
    }

    let startAt: Date;
    try {
      const res = await bookSlot({
        slotId: parsed.data.slotId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message || null,
      });
      startAt = res.startAt;
    } catch {
      // Toute erreur book_slot = créneau plus disponible (pris/fermé/expiré).
      return {
        status: "error",
        error: "Ce créneau n'est plus disponible. Choisis-en un autre.",
      };
    }

    await sendBookingConfirmation(parsed.data.email, parsed.data.firstName, startAt);
    return { status: "success" };
  } catch (e) {
    if (e instanceof CsrfError) {
      return { status: "error", error: "Session expirée. Recharge la page et réessaie." };
    }
    console.error("[réservation] échec :", e);
    return { status: "error", error: "Une erreur est survenue. Réessaie." };
  }
}
