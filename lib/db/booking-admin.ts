import "server-only";
import { sql } from "@/lib/db/client";

/**
 * Gestion ADMIN des créneaux d'appel découverte (pool privilégié). La coach voit
 * QUI a réservé (PII assumée côté admin). Le public, lui, ne lit que la vue
 * public_availability (cf. lib/db/booking). On appelle cancel_booking en base.
 */

export interface AdminBooking {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string | null;
}

export interface AdminSlot {
  id: string;
  start_at: Date;
  end_at: Date;
  status: "available" | "booked" | "blocked";
  admin_note: string | null;
  booking: AdminBooking | null;
}

/** Créneaux à venir (et récents), avec la réservation confirmée éventuelle. */
export async function listSlots(): Promise<AdminSlot[]> {
  const rows = await sql<
    {
      id: string;
      start_at: Date;
      end_at: Date;
      status: AdminSlot["status"];
      admin_note: string | null;
      b_id: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      message: string | null;
    }[]
  >`
    SELECT s.id, s.start_at, s.end_at, s.status, s.admin_note,
           b.id AS b_id, b.first_name, b.last_name, b.email, b.phone, b.message
      FROM availability_slots s
      LEFT JOIN discovery_bookings b ON b.slot_id = s.id AND b.status = 'confirmed'
     WHERE s.start_at >= now() - interval '1 day'
     ORDER BY s.start_at
  `;

  return rows.map((r) => ({
    id: r.id,
    start_at: r.start_at,
    end_at: r.end_at,
    status: r.status,
    admin_note: r.admin_note,
    booking: r.b_id
      ? {
          id: r.b_id,
          first_name: r.first_name!,
          last_name: r.last_name!,
          email: r.email!,
          phone: r.phone,
          message: r.message,
        }
      : null,
  }));
}

/** Ouvre un créneau (status available par défaut). */
export async function createSlot(input: {
  startAt: string;
  endAt: string;
  adminNote: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO availability_slots (start_at, end_at, status, admin_note)
    VALUES (${input.startAt}::timestamptz, ${input.endAt}::timestamptz, 'available', ${input.adminNote})
  `;
}

/** Bascule un créneau libre <-> fermé (jamais 'booked' : réservé via book_slot). */
export async function setSlotStatus(
  slotId: string,
  status: "available" | "blocked"
): Promise<void> {
  await sql`
    UPDATE availability_slots SET status = ${status}
     WHERE id = ${slotId} AND status IN ('available', 'blocked')
  `;
}

/** Supprime un créneau (RESTRICT si une réservation confirmée existe → lève). */
export async function deleteSlot(slotId: string): Promise<void> {
  await sql`DELETE FROM availability_slots WHERE id = ${slotId}`;
}

/** cancel_booking : annule une réservation et libère le créneau. */
export async function cancelBooking(bookingId: string): Promise<void> {
  await sql`SELECT cancel_booking(${bookingId})`;
}
