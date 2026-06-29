/**
 * Tests d'intégration de la Phase 1 — tranche 1 (onboarding + Pilier 1 +
 * validation coach), exécutés contre la base locale. Le gate reste en base :
 * on vérifie le flux complet et la boucle de retouche via les fonctions SQL.
 *
 *   npm test
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sql } from "@/lib/db/client";
import {
  createClienteAccount,
  getUserByEmailWithSecret,
} from "@/lib/db/users";
import { getClienteById, setBoussoleWord } from "@/lib/db/clientes";
import {
  getPiliersForCliente,
  getPilierForCliente,
  submitPilier,
  validatePilier,
} from "@/lib/db/piliers";
import { setConsent, hasConsent } from "@/lib/db/consents";
import {
  getOrCreateMoodboardForPilier,
  addMoodboardItem,
  getMoodboardsForPilier,
} from "@/lib/db/moodboards";
import {
  createNotification,
  notifyClienteValidation,
  listNotifications,
} from "@/lib/notifications";
import { storeClientePhoto } from "@/lib/uploads/store";
import { getStorage } from "@/lib/storage";
import { hashPassword } from "@/lib/auth/password";

let coachId: string;

before(async () => {
  const coach = await getUserByEmailWithSecret("justine@image-coaching.test");
  assert.ok(coach, "compte coach de démo requis (npm run seed:demo)");
  coachId = coach.id;
});

after(async () => {
  await sql.end();
});

async function makeCliente(): Promise<{ clienteId: string; userId: string }> {
  const clienteId = await createClienteAccount({
    email: `test+${crypto.randomUUID()}@alia.test`,
    passwordHash: await hashPassword("Temp12345!"),
    firstName: "Test",
    lastName: "P1",
  });
  const c = await getClienteById(clienteId);
  return { clienteId, userId: c!.user_id };
}

test("onboarding : consentements (dont ai_photo_processing via migration 014)", async () => {
  const { clienteId } = await makeCliente();
  try {
    assert.equal(await hasConsent(clienteId, "traitement_donnees"), false);
    await setConsent(clienteId, "traitement_donnees", true);
    assert.equal(await hasConsent(clienteId, "traitement_donnees"), true);

    await setConsent(clienteId, "ai_photo_processing", true);
    assert.equal(await hasConsent(clienteId, "ai_photo_processing"), true);

    // Révocation.
    await setConsent(clienteId, "photos", true);
    await setConsent(clienteId, "photos", false);
    assert.equal(await hasConsent(clienteId, "photos"), false);
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("Pilier 1 : 3 mots → submit → validate → débloque le Pilier 2", async () => {
  const { clienteId } = await makeCliente();
  try {
    const piliers = await getPiliersForCliente(clienteId);
    const p1 = piliers.find((p) => p.numero === 1)!;

    await setBoussoleWord(clienteId, "who_she_is", "Authentique");
    await setBoussoleWord(clienteId, "what_she_likes", "Lumineuse");
    await setBoussoleWord(clienteId, "to_embody", "Affirmée");

    await submitPilier(p1.id);
    assert.equal((await getPilierForCliente(clienteId, 1))!.status, "submitted");

    await validatePilier(p1.id, coachId, "validated", "Les 3 mots sont justes.");
    assert.equal((await getPilierForCliente(clienteId, 1))!.status, "validated");
    // Gate : le Pilier 2 est débloqué (in_progress).
    assert.equal((await getPilierForCliente(clienteId, 2))!.status, "in_progress");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("Pilier 1 : boucle needs_revision → re-submit → validated", async () => {
  const { clienteId } = await makeCliente();
  try {
    const p1 = (await getPiliersForCliente(clienteId)).find((p) => p.numero === 1)!;
    await setBoussoleWord(clienteId, "who_she_is", "Sincère");
    await setBoussoleWord(clienteId, "what_she_likes", "Solaire");
    await setBoussoleWord(clienteId, "to_embody", "Libre");

    await submitPilier(p1.id);
    await validatePilier(p1.id, coachId, "needs_revision", "Affine le mot 2.");
    assert.equal((await getPilierForCliente(clienteId, 1))!.status, "needs_revision");
    // Pilier 2 toujours verrouillé tant que P1 n'est pas validé.
    assert.equal((await getPilierForCliente(clienteId, 2))!.status, "locked");

    await submitPilier(p1.id); // re-soumission depuis needs_revision
    await validatePilier(p1.id, coachId, "validated", "Parfait.");
    assert.equal((await getPilierForCliente(clienteId, 1))!.status, "validated");
    assert.equal((await getPilierForCliente(clienteId, 2))!.status, "in_progress");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("gate : un pilier verrouillé ne peut pas être soumis", async () => {
  const { clienteId } = await makeCliente();
  try {
    const p2 = (await getPiliersForCliente(clienteId)).find((p) => p.numero === 2)!;
    assert.equal(p2.status, "locked");
    await assert.rejects(() => submitPilier(p2.id), /pilier|in_progress|needs_revision/i);
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("notifications : invariant payload.cliente_id + notif de validation", async () => {
  const { clienteId, userId } = await makeCliente();
  try {
    // Une notif « à propos d'une cliente » sans clienteId est refusée.
    await assert.rejects(
      () => createNotification({ recipientId: coachId, type: "pilier_submitted" }),
      /cliente_id|clienteId/i
    );

    await notifyClienteValidation({
      clienteUserId: userId,
      clienteId,
      numero: 1,
      validated: true,
      comment: null,
    });
    const notifs = await listNotifications(userId, 5);
    const n = notifs.find((x) => x.type === "pilier_validated");
    assert.ok(n, "notif de validation créée");
    assert.equal(n.payload["cliente_id"], clienteId, "payload.cliente_id présent (RGPD)");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("moodboard : ajout d'un item URL → display_url résolu", async () => {
  const { clienteId } = await makeCliente();
  try {
    const p1 = (await getPiliersForCliente(clienteId)).find((p) => p.numero === 1)!;
    const mbId = await getOrCreateMoodboardForPilier(clienteId, p1.id, "Test");
    await addMoodboardItem({ moodboardId: mbId, sourceUrl: "https://example.com/x.jpg" });

    const boards = await getMoodboardsForPilier(clienteId, p1.id);
    assert.equal(boards.length, 1);
    assert.equal(boards[0]!.items[0]!.display_url, "https://example.com/x.jpg");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("upload : conditionné au consentement photos", async () => {
  const { clienteId } = await makeCliente();
  try {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Sans consentement → refusé.
    const denied = await storeClientePhoto({
      clienteId,
      file: new File([png], "t.png", { type: "image/png" }),
      kind: "moodboard",
    });
    assert.equal(denied.ok, false);

    // Avec consentement → accepté, asset créé, URL via la route protégée.
    await setConsent(clienteId, "photos", true);
    const okRes = await storeClientePhoto({
      clienteId,
      file: new File([png], "t.png", { type: "image/png" }),
      kind: "moodboard",
    });
    assert.equal(okRes.ok, true);
    if (okRes.ok) {
      assert.match(okRes.asset.storage_url, /\/api\/storage\/clientes\//);
      await getStorage().delete(okRes.asset.storage_url); // purge du fichier de test
    }
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});
