import "server-only";
import { publicSql } from "@/lib/db/public-client";

/**
 * Prise de rendez-vous — côté PUBLIC uniquement (seam publicSql). Ne touche QUE
 * la vue public_availability (aucune PII) et la fonction book_slot. Jamais
 * availability_slots ni discovery_bookings en direct. La gestion admin des
 * créneaux vit dans lib/db/booking-admin (pool privilégié).
 */

export interface PublicSlot {
  id: string;
  start_at: Date;
  end_at: Date;
  is_available: boolean;
}

/** Créneaux à venir (libres + grisés), sans aucune donnée personnelle. */
export async function getPublicAvailability(): Promise<PublicSlot[]> {
  return publicSql<PublicSlot[]>`
    SELECT id, start_at, end_at, is_available
      FROM public_availability
     ORDER BY start_at
  `;
}

/**
 * Réservation atomique via book_slot (verrou de ligne en base). Lève une
 * exception claire si le créneau n'est pas libre / expiré / déjà pris.
 * Renvoie l'heure du créneau (pour l'email de confirmation).
 */
export async function bookSlot(input: {
  slotId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string | null;
}): Promise<{ startAt: Date }> {
  const booking = await publicSql<{ slot_id: string }[]>`
    SELECT slot_id FROM book_slot(
      ${input.slotId}, ${input.firstName}, ${input.lastName}, ${input.email}::citext,
      ${input.phone}, ${input.message}, now()
    )
  `;
  const slotId = booking[0]!.slot_id;
  const slot = await publicSql<{ start_at: Date }[]>`
    SELECT start_at FROM public_availability WHERE id = ${slotId} LIMIT 1
  `;
  return { startAt: slot[0]!.start_at };
}
