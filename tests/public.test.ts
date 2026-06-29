/**
 * Tests d'intégration du funnel public (contre la base) : prise de RDV
 * (book_slot, double-réservation, créneaux passés/fermés), isolation PII de
 * public_availability, et candidature. Appels aux fonctions/vues SQL existantes.
 *
 *   npm test
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sql } from "@/lib/db/client";
import { getPublicAvailability, bookSlot } from "@/lib/db/booking";
import { createApplication } from "@/lib/db/applications";

after(async () => {
  await sql.end();
});

async function makeSlot(status: "available" | "blocked", offsetDays: number): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO availability_slots (start_at, end_at, status)
    VALUES (
      now() + ${`${offsetDays} days`}::interval + interval '10 hours',
      now() + ${`${offsetDays} days`}::interval + interval '10 hours 45 minutes',
      ${status}
    ) RETURNING id
  `;
  return rows[0]!.id;
}

async function cleanup(ids: string[]) {
  await sql`DELETE FROM discovery_bookings WHERE slot_id = ANY(${ids})`;
  await sql`DELETE FROM availability_slots WHERE id = ANY(${ids})`;
}

test("public_availability : créneaux à venir, AUCUNE PII, grisé selon le statut", async () => {
  const future = await makeSlot("available", 3);
  const blocked = await makeSlot("blocked", 4);
  const past = await makeSlot("available", -5);
  try {
    const slots = await getPublicAvailability();
    const ids = new Set(slots.map((s) => s.id));

    assert.ok(ids.has(future), "créneau futur libre présent");
    assert.ok(ids.has(blocked), "créneau futur fermé présent (grisé)");
    assert.ok(!ids.has(past), "créneau passé masqué");

    assert.equal(slots.find((s) => s.id === future)!.is_available, true);
    assert.equal(slots.find((s) => s.id === blocked)!.is_available, false);

    // La vue n'expose QUE id, start_at, end_at, is_available.
    const keys = Object.keys(slots.find((s) => s.id === future)!).sort();
    assert.deepEqual(keys, ["end_at", "id", "is_available", "start_at"]);
  } finally {
    await cleanup([future, blocked, past]);
  }
});

test("book_slot : réservation, puis double-réservation refusée + grisé", async () => {
  const slot = await makeSlot("available", 6);
  const email = `test+${crypto.randomUUID()}@alia.test`;
  try {
    const res = await bookSlot({
      slotId: slot, firstName: "Camille", lastName: "Durand", email, phone: null, message: null,
    });
    assert.ok(res.startAt instanceof Date);

    // Le créneau est désormais grisé dans la vue publique (is_available=false), sans nom.
    const slots = await getPublicAvailability();
    const view = slots.find((s) => s.id === slot)!;
    assert.equal(view.is_available, false);
    assert.ok(!("first_name" in view) && !("email" in view), "aucune PII dans la vue");

    // Double-réservation → échec (course gérée en base).
    await assert.rejects(
      () => bookSlot({ slotId: slot, firstName: "X", lastName: "Y", email: "x@y.fr", phone: null, message: null }),
      /réserv|disponible|unique/i
    );
  } finally {
    await cleanup([slot]);
  }
});

test("book_slot : créneau fermé et créneau passé refusés", async () => {
  const blocked = await makeSlot("blocked", 7);
  const past = await makeSlot("available", -3);
  try {
    await assert.rejects(
      () => bookSlot({ slotId: blocked, firstName: "A", lastName: "B", email: "a@b.fr", phone: null, message: null }),
      /ouvert|disponible|réserv/i
    );
    await assert.rejects(
      () => bookSlot({ slotId: past, firstName: "A", lastName: "B", email: "a@b.fr", phone: null, message: null }),
      /expiré|disponible|réserv/i
    );
  } finally {
    await cleanup([blocked, past]);
  }
});

test("candidature : INSERT (status new, consent_at) lisible côté admin", async () => {
  const email = `test+${crypto.randomUUID()}@alia.test`;
  const id = await createApplication({
    fullName: "Sophie Bernard",
    instagram: "@sophie",
    email,
    birthDate: "1990-04-12",
    profession: "Avocate",
    motivation: "Je veux me sentir alignée.",
    currentImage: "Brouillonne.",
    goal: "Légitime et sereine.",
    wordsToday: "Rigoureuse, discrète, fatiguée",
    wordsToEmbody: "Affirmée, élégante, sereine",
    mainBlocker: "La peur du jugement.",
    whyNow: "Nommée associée.",
    commitmentLevel: "Très prête.",
  });
  try {
    const rows = await sql<{ status: string; consent_present: boolean }[]>`
      SELECT status, (consent_at IS NOT NULL) AS consent_present
        FROM applications WHERE id = ${id}
    `;
    assert.equal(rows[0]!.status, "new");
    assert.equal(rows[0]!.consent_present, true);
  } finally {
    await sql`SELECT delete_application(${id})`;
  }
});
