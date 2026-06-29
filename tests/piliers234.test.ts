/**
 * Tests d'intégration Piliers 2/3/4 (contre la base). Gate inchangé (fonctions
 * SQL) + écritures de données via les wrappers lib/db.
 *
 *   npm test
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sql } from "@/lib/db/client";
import { createClienteAccount, getUserByEmailWithSecret } from "@/lib/db/users";
import { getClienteById } from "@/lib/db/clientes";
import {
  getPiliersForCliente,
  getPilierForCliente,
  submitPilier,
  validatePilier,
} from "@/lib/db/piliers";
import { upsertColorProfile, getColorProfile, upsertMorphoProfile, getMorphoProfile } from "@/lib/db/profiles";
import { createPiece, updatePieceTri, listPiecesForTri, listPiecesForWardrobe } from "@/lib/db/pieces";
import { createLook, addPieceToLook, removePieceFromLook, listLooks } from "@/lib/db/looks";
import { hashPassword } from "@/lib/auth/password";

let coachId: string;
before(async () => {
  const coach = await getUserByEmailWithSecret("justine@image-coaching.test");
  assert.ok(coach);
  coachId = coach.id;
});
after(async () => {
  await sql.end();
});

async function makeCliente(): Promise<string> {
  return createClienteAccount({
    email: `test+${crypto.randomUUID()}@alia.test`,
    passwordHash: await hashPassword("Temp12345!"),
    firstName: "Test",
    lastName: "P234",
  });
}

test("gate : chaîne complète P1 → P2 → P3 → P4", async () => {
  const clienteId = await makeCliente();
  try {
    const piliers = await getPiliersForCliente(clienteId);
    const p1 = piliers.find((p) => p.numero === 1)!;
    await sql`UPDATE clientes SET word_who_she_is='A', word_what_she_likes='B', word_to_embody='C' WHERE id=${clienteId}`;

    await submitPilier(p1.id);
    await validatePilier(p1.id, coachId, "validated", null);
    assert.equal((await getPilierForCliente(clienteId, 2))!.status, "in_progress");

    const p2 = (await getPilierForCliente(clienteId, 2))!;
    await submitPilier(p2.id);
    await validatePilier(p2.id, coachId, "validated", null);
    assert.equal((await getPilierForCliente(clienteId, 3))!.status, "in_progress");

    const p3 = (await getPilierForCliente(clienteId, 3))!;
    await submitPilier(p3.id);
    await validatePilier(p3.id, coachId, "validated", null);
    assert.equal((await getPilierForCliente(clienteId, 4))!.status, "in_progress");

    const p4 = (await getPilierForCliente(clienteId, 4))!;
    await submitPilier(p4.id);
    const res = await validatePilier(p4.id, coachId, "validated", null);
    assert.equal(res.status, "validated");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("P2 : profils colorimétrie/morphologie en 1-1 (upsert)", async () => {
  const clienteId = await makeCliente();
  try {
    await upsertColorProfile(clienteId, {
      season: "Printemps clair",
      palette: { dominantes: ["corail"], a_eviter: ["noir"] },
      makeupReco: "pêche",
      hairReco: "doré",
    });
    // Second upsert : met à jour, ne duplique pas (sinon unique_violation).
    await upsertColorProfile(clienteId, {
      season: "Été froid",
      palette: { dominantes: ["bleu"], a_eviter: [] },
      makeupReco: null,
      hairReco: null,
    });
    const color = await getColorProfile(clienteId);
    assert.equal(color!.season, "Été froid");

    await upsertMorphoProfile(clienteId, {
      type: "X",
      measurements: { epaules_cm: 96 },
      reco: { valoriser: ["cintrer"], eviter: [] },
    });
    const morpho = await getMorphoProfile(clienteId);
    assert.equal(morpho!.type, "X");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("P3 : tri + CHECK tri_criterion ⇒ sortir", async () => {
  const clienteId = await makeCliente();
  try {
    // garder + critère → violation du CHECK base.
    await assert.rejects(
      () => createPiece(clienteId, { name: "X", triDecision: "garder", triCriterion: "plus_aligne" }),
      /check|criterion|sortir/i
    );

    const id = await createPiece(clienteId, { name: "Jean noir", triDecision: "sortir", triCriterion: "plus_aligne" });
    await createPiece(clienteId, { name: "Blazer écru", triDecision: "garder" });
    const tri = await listPiecesForTri(clienteId);
    assert.equal(tri.length, 2);

    // garder ⇒ critère effacé (cohérence).
    await updatePieceTri(id, clienteId, "garder", "plus_physique");
    const after = (await listPiecesForTri(clienteId)).find((p) => p.id === id)!;
    assert.equal(after.tri_decision, "garder");
    assert.equal(after.tri_criterion, null);
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("P4 : garde-robe + looks + isolation cross-cliente", async () => {
  const a = await makeCliente();
  const b = await makeCliente();
  try {
    const pieceA = await createPiece(a, { name: "Blazer corail", wardrobeCategory: "personnalite", linkedWord: "to_embody" });
    await createPiece(a, { name: "T-shirt blanc", wardrobeCategory: "basique" });
    assert.equal((await listPiecesForWardrobe(a)).length, 2);

    const lookA = await createLook(a, { name: "Look bureau" });
    await addPieceToLook(lookA, pieceA, a);
    let looksA = await listLooks(a);
    assert.equal(looksA[0]!.pieces.length, 1);

    // Isolation : la cliente B ne peut pas attacher la pièce de A à un look à elle.
    const lookB = await createLook(b, { name: "Look B" });
    await addPieceToLook(lookB, pieceA, b); // pieceA n'appartient pas à B → ignoré
    const looksB = await listLooks(b);
    assert.equal(looksB[0]!.pieces.length, 0, "aucune pièce d'une autre cliente");

    // Retrait.
    await removePieceFromLook(lookA, pieceA, a);
    looksA = await listLooks(a);
    assert.equal(looksA[0]!.pieces.length, 0);
  } finally {
    await sql`SELECT delete_cliente(${a})`;
    await sql`SELECT delete_cliente(${b})`;
  }
});
