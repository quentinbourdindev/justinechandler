/**
 * Tests des points critiques de la Phase 0, exécutés RÉELLEMENT contre la base
 * locale image_coaching :
 *  - création de compte cliente (must_change_password + 4 piliers auto) ;
 *  - hachage / vérification du mot de passe ;
 *  - invalidation des sessions après change_own_password (claim pca) ;
 *  - gate de validation séquentielle (trigger base) non contournable.
 *
 *   npm test
 *
 * Chaque test crée des comptes temporaires (emails uniques) et les purge via
 * delete_cliente — la base de démo n'est pas polluée.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { sql } from "@/lib/db/client";
import {
  createClienteAccount,
  getUserByEmailWithSecret,
  getSafeUserById,
  changeOwnPassword,
} from "@/lib/db/users";
import { getPiliersForCliente } from "@/lib/db/piliers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession, verifySession, pcaEpoch } from "@/lib/auth/session";

const uniqEmail = () => `test+${crypto.randomUUID()}@alia.test`;

after(async () => {
  await sql.end();
});

test("create_cliente_account → must_change_password + 4 piliers (1 in_progress)", async () => {
  const email = uniqEmail();
  const clienteId = await createClienteAccount({
    email,
    passwordHash: await hashPassword("Temp12345!"),
    firstName: "Test",
    lastName: "Création",
  });
  try {
    const user = await getUserByEmailWithSecret(email);
    assert.ok(user, "compte créé");
    assert.equal(user.role, "cliente");
    assert.equal(user.must_change_password, true);

    const piliers = await getPiliersForCliente(clienteId);
    assert.equal(piliers.length, 4, "4 piliers auto-créés");
    assert.equal(piliers.find((p) => p.numero === 1)?.status, "in_progress");
    assert.equal(piliers.filter((p) => p.status === "locked").length, 3);
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("mot de passe : hash bcrypt + vérification", async () => {
  const hash = await hashPassword("Sup3rSecret!");
  assert.equal(await verifyPassword("Sup3rSecret!", hash), true);
  assert.equal(await verifyPassword("mauvais", hash), false);
  // Le sentinel d'invitation n'est pas un hash bcrypt → refusé sans comparaison.
  assert.equal(await verifyPassword("peu importe", "!invite_pending"), false);
});

test("change_own_password invalide les sessions antérieures (claim pca)", async () => {
  const email = uniqEmail();
  const clienteId = await createClienteAccount({
    email,
    passwordHash: await hashPassword("Init12345!"),
    firstName: "Test",
    lastName: "Pca",
  });
  try {
    const created = await getUserByEmailWithSecret(email);
    assert.ok(created);
    const before = await getSafeUserById(created.id);
    assert.ok(before);

    // Session émise AVANT le changement (pca = password_changed_at d'origine = null).
    const token = await signSession({
      sub: before.id,
      role: before.role,
      mcp: before.must_change_password,
      pca: pcaEpoch(before.password_changed_at),
    });
    const claims = await verifySession(token);
    assert.ok(claims);
    assert.equal(claims.pca, null);

    // Changement de mot de passe.
    await changeOwnPassword(before.id, await hashPassword("Nouveau12345!"));
    const afterUser = await getSafeUserById(before.id);
    assert.ok(afterUser);
    assert.equal(afterUser.must_change_password, false, "flag retombé à false");
    assert.notEqual(afterUser.password_changed_at, null, "password_changed_at renseigné");

    // Le guard compare pca du jeton (null) à la valeur live (renseignée) → périmé.
    const stale = pcaEpoch(afterUser.password_changed_at) !== claims.pca;
    assert.equal(stale, true, "l'ancienne session est invalidée");
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});

test("gate de validation : un pilier verrouillé ne peut pas passer in_progress", async () => {
  const email = uniqEmail();
  const clienteId = await createClienteAccount({
    email,
    passwordHash: await hashPassword("Init12345!"),
    firstName: "Test",
    lastName: "Gate",
  });
  try {
    const piliers = await getPiliersForCliente(clienteId);
    const p2 = piliers.find((p) => p.numero === 2);
    assert.ok(p2);
    assert.equal(p2.status, "locked");

    // Tentative de contournement direct du gate → rejet par le trigger base.
    await assert.rejects(
      () => sql`UPDATE piliers SET status = 'in_progress' WHERE id = ${p2.id}`,
      /Gate de validation|pilier/i,
      "le trigger doit bloquer la transition illégale"
    );
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
  }
});
