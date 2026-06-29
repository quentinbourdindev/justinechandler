/**
 * Tests d'intégration de la partie coach (Phase 2) contre la base : triage et
 * conversion des candidatures, gestion des créneaux, annulation, reset admin,
 * création directe de cliente. Appels aux fonctions SQL existantes.
 *
 *   npm test
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sql } from "@/lib/db/client";
import { createApplication } from "@/lib/db/applications";
import {
  getApplication,
  updateApplicationStatus,
  convertApplication,
  deleteApplication,
} from "@/lib/db/applications-admin";
import { createSlot, listSlots, setSlotStatus, deleteSlot, cancelBooking } from "@/lib/db/booking-admin";
import { bookSlot, getPublicAvailability } from "@/lib/db/booking";
import {
  createClienteAccount,
  getSafeUserById,
  getUserByEmailWithSecret,
  adminResetClientePassword,
} from "@/lib/db/users";
import { getClienteById } from "@/lib/db/clientes";
import { getPiliersForCliente } from "@/lib/db/piliers";
import { hashPassword } from "@/lib/auth/password";

after(async () => {
  await sql.end();
});

const uniqEmail = () => `test+${crypto.randomUUID()}@alia.test`;

async function makeApplication(email: string): Promise<string> {
  return createApplication({
    fullName: "Sophie Bernard",
    instagram: "@sophie",
    email,
    birthDate: "1990-04-12",
    profession: "Avocate",
    motivation: "m",
    currentImage: "i",
    goal: "g",
    wordsToday: "a, b, c",
    wordsToEmbody: "d, e, f",
    mainBlocker: "x",
    whyNow: "y",
    commitmentLevel: "z",
  });
}

test("candidature : triage de statut puis suppression", async () => {
  const id = await makeApplication(uniqEmail());
  try {
    await updateApplicationStatus(id, "reviewing");
    assert.equal((await getApplication(id))!.status, "reviewing");
    await updateApplicationStatus(id, "selected");
    assert.equal((await getApplication(id))!.status, "selected");
  } finally {
    await sql`SELECT delete_application(${id})`;
  }
  assert.equal(await getApplication(id), null, "purgée");
});

test("conversion : compte (mcp) + 4 piliers + 3 mots NON écrits ; double conversion refusée", async () => {
  const email = uniqEmail();
  const appId = await makeApplication(email);
  let clienteId = "";
  try {
    const cliente = await convertApplication(appId);
    clienteId = cliente.id;

    // Compte créé, must_change_password true, sentinel non connectable.
    const user = await getSafeUserById(cliente.user_id);
    assert.equal(user!.must_change_password, true);
    const withSecret = await getUserByEmailWithSecret(email);
    assert.equal(withSecret!.password_hash, "!invite_pending");

    // 4 piliers auto, 3 mots NON pré-remplis (référence seulement).
    assert.equal((await getPiliersForCliente(clienteId)).length, 4);
    const c = await getClienteById(clienteId);
    assert.equal(c!.word_who_she_is, null);
    assert.equal(c!.word_what_she_likes, null);

    // Candidature marquée converted.
    assert.equal((await getApplication(appId))!.status, "converted");

    // Invitation : l'app pose un mot de passe temporaire réel (compte connectable).
    await adminResetClientePassword(clienteId, await hashPassword("Temp123456"));
    const after = await getUserByEmailWithSecret(email);
    assert.match(after!.password_hash, /^\$2/, "hash bcrypt réel");
    assert.equal(after!.must_change_password, true);

    // Double conversion refusée.
    await assert.rejects(() => convertApplication(appId), /déjà|convert|unique/i);
  } finally {
    if (clienteId) await sql`SELECT delete_cliente(${clienteId})`;
    await sql`SELECT delete_application(${appId})`.catch(() => {});
  }
});

test("disponibilités : créer / fermer / supprimer un créneau", async () => {
  const note = `t-${crypto.randomUUID()}`;
  await createSlot({ startAt: "2099-01-01T10:00", endAt: "2099-01-01T10:45", adminNote: note });
  const find = async () => (await listSlots()).find((s) => s.admin_note === note);
  let slot = await find();
  assert.ok(slot, "créneau créé et listé");
  assert.equal(slot!.status, "available");

  await setSlotStatus(slot!.id, "blocked");
  slot = await find();
  assert.equal(slot!.status, "blocked");

  await deleteSlot(slot!.id);
  assert.equal(await find(), undefined, "supprimé");
});

test("annulation : cancel_booking libère le créneau", async () => {
  const ins = await sql<{ id: string }[]>`
    INSERT INTO availability_slots (start_at, end_at, status)
    VALUES (now() + interval '9 days' + interval '10 hours', now() + interval '9 days' + interval '10 hours 45 minutes', 'available')
    RETURNING id`;
  const slotId = ins[0]!.id;
  try {
    await bookSlot({ slotId, firstName: "Cam", lastName: "Dur", email: "cam@x.fr", phone: null, message: null });
    assert.equal((await getPublicAvailability()).find((s) => s.id === slotId)!.is_available, false);

    const booking = await sql<{ id: string }[]>`SELECT id FROM discovery_bookings WHERE slot_id = ${slotId} AND status='confirmed'`;
    await cancelBooking(booking[0]!.id);
    assert.equal((await getPublicAvailability()).find((s) => s.id === slotId)!.is_available, true, "libéré");
  } finally {
    await sql`DELETE FROM discovery_bookings WHERE slot_id = ${slotId}`;
    await sql`DELETE FROM availability_slots WHERE id = ${slotId}`;
  }
});

test("création directe : create_cliente_account + reset admin (mcp conservé)", async () => {
  const email = uniqEmail();
  const clienteId = await createClienteAccount({
    email,
    passwordHash: await hashPassword("Initial123"),
    firstName: "Manon",
    lastName: "Test",
    birthDate: "1996-07-15",
  });
  try {
    const user = await getUserByEmailWithSecret(email);
    assert.equal(user!.must_change_password, true);
    assert.equal(user!.password_changed_at, null);

    await adminResetClientePassword(clienteId, await hashPassword("NewTemp123"));
    const after = await getUserByEmailWithSecret(email);
    assert.equal(after!.must_change_password, true);
    assert.equal(after!.password_changed_at, null, "reset admin ne touche pas password_changed_at");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});
