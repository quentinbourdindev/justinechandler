/**
 * Smoke-test HTTP du parcours Piliers 2 → 3 → 4 (Phase 1) contre le serveur :
 * rendu des pages cliente à chaque pilier, revue coach, fiche détaillée, et
 * chaîne de gate complète. Effets des actions simulés via lib/db (mêmes appels).
 * Cliente jetable, purgée en fin.
 *
 *   BASE=http://localhost:3100 npm run demo:smoke:p234
 */
import { sql } from "@/lib/db/client";
import {
  createClienteAccount,
  getUserByEmailWithSecret,
  getSafeUserById,
  changeOwnPassword,
} from "@/lib/db/users";
import { getClienteById, setBoussoleWord, setClienteStatus } from "@/lib/db/clientes";
import { getPilierForCliente, submitPilier, validatePilier } from "@/lib/db/piliers";
import { setConsent } from "@/lib/db/consents";
import { upsertColorProfile, upsertMorphoProfile } from "@/lib/db/profiles";
import { createPiece } from "@/lib/db/pieces";
import { createLook, addPieceToLook } from "@/lib/db/looks";
import { hashPassword } from "@/lib/auth/password";
import { signSession, pcaEpoch, SESSION_COOKIE } from "@/lib/auth/session";
import crypto from "node:crypto";
import type { SafeUser } from "@/lib/db/types";

const BASE = process.env.BASE ?? "http://localhost:3100";
let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.info(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}
async function cookieFor(u: SafeUser): Promise<string> {
  return `${SESSION_COOKIE}=${await signSession({ sub: u.id, role: u.role, mcp: u.must_change_password, pca: pcaEpoch(u.password_changed_at) })}`;
}
async function get(path: string, cookie: string) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, body: res.status === 200 ? await res.text() : "" };
}

async function main() {
  console.info(`\n=== Smoke-test Piliers 2→4 (${BASE}) ===\n`);
  const coach = await getUserByEmailWithSecret("justine@image-coaching.test");
  if (!coach) throw new Error("Coach absent (npm run seed:demo).");
  const coachCookie = await cookieFor((await getSafeUserById(coach.id))!);

  const clienteId = await createClienteAccount({
    email: `test+${crypto.randomUUID()}@alia.test`,
    passwordHash: await hashPassword("Smoke12345!"),
    firstName: "Smoke", lastName: "P234",
  });
  const userId = (await getClienteById(clienteId))!.user_id;
  await changeOwnPassword(userId, await hashPassword("Smoke12345!"));
  const cookie = await cookieFor((await getSafeUserById(userId))!);

  try {
    // Onboarding + P1 validés (préalable).
    await setConsent(clienteId, "traitement_donnees", true);
    await setConsent(clienteId, "photos", true);
    await setClienteStatus(clienteId, "in_progress");
    await setBoussoleWord(clienteId, "who_she_is", "Authentique");
    await setBoussoleWord(clienteId, "what_she_likes", "Lumineuse");
    await setBoussoleWord(clienteId, "to_embody", "Affirmée");
    const p1 = (await getPilierForCliente(clienteId, 1))!;
    await submitPilier(p1.id);
    await validatePilier(p1.id, coach.id, "validated", null);

    // ---- Pilier 2 ----
    console.info("1) Pilier 2 — Mise en valeur");
    const p2 = (await getPilierForCliente(clienteId, 2))!;
    const p2page = await get("/espace/piliers/2", cookie);
    check("page P2 rendue (colorimétrie + morphologie)",
      p2page.status === 200 && p2page.body.includes("Colorimétrie") && p2page.body.includes("Morphologie"));
    await upsertColorProfile(clienteId, { season: "Printemps clair", palette: { dominantes: ["corail"], a_eviter: ["noir"] }, makeupReco: null, hairReco: null });
    await upsertMorphoProfile(clienteId, { type: "X", measurements: {}, reco: { valoriser: ["cintrer la taille"], eviter: [] } });
    await submitPilier(p2.id);
    const valP2 = await get(`/coach/validations/${p2.id}`, coachCookie);
    check("revue coach P2 montre la colorimétrie soumise",
      valP2.status === 200 && valP2.body.includes("Printemps clair") && valP2.body.includes("corail"));
    await validatePilier(p2.id, coach.id, "validated", null);
    check("P3 débloqué", (await getPilierForCliente(clienteId, 3))!.status === "in_progress");

    // ---- Pilier 3 ----
    console.info("\n2) Pilier 3 — Tri");
    const p3 = (await getPilierForCliente(clienteId, 3))!;
    const p3page = await get("/espace/piliers/3", cookie);
    check("page P3 rendue (module de tri)",
      p3page.status === 200 && p3page.body.includes("Je garde") && p3page.body.includes("Je sors"));
    await createPiece(clienteId, { name: "Blazer écru", triDecision: "garder" });
    await createPiece(clienteId, { name: "Jean noir", triDecision: "sortir", triCriterion: "plus_aligne" });
    await submitPilier(p3.id);
    const valP3 = await get(`/coach/validations/${p3.id}`, coachCookie);
    check("revue coach P3 montre le tri",
      valP3.body.includes("Tri du dressing") && valP3.body.includes("Blazer écru") && valP3.body.includes("Jean noir"));
    await validatePilier(p3.id, coach.id, "validated", null);
    check("P4 débloqué", (await getPilierForCliente(clienteId, 4))!.status === "in_progress");

    // ---- Pilier 4 ----
    console.info("\n3) Pilier 4 — Construction");
    const p4 = (await getPilierForCliente(clienteId, 4))!;
    const p4page = await get("/espace/piliers/4", cookie);
    check("page P4 rendue (catégories + looks)",
      p4page.status === 200 && p4page.body.includes("Basiques") && p4page.body.includes("Mes looks"));
    const pieceId = await createPiece(clienteId, { name: "Blazer corail", wardrobeCategory: "personnalite", linkedWord: "to_embody" });
    await createPiece(clienteId, { name: "T-shirt blanc", wardrobeCategory: "basique" });
    const lookId = await createLook(clienteId, { name: "Look bureau lumineux" });
    await addPieceToLook(lookId, pieceId, clienteId);
    await submitPilier(p4.id);
    const valP4 = await get(`/coach/validations/${p4.id}`, coachCookie);
    check("revue coach P4 montre garde-robe + looks",
      valP4.body.includes("Nouvelle garde-robe") && valP4.body.includes("Blazer corail") && valP4.body.includes("Look bureau lumineux"));
    await validatePilier(p4.id, coach.id, "validated", null);

    // ---- Fiche cliente détaillée ----
    console.info("\n4) Fiche cliente détaillée (coach)");
    const fiche = await get(`/coach/clientes/${clienteId}`, coachCookie);
    check("fiche montre P2 + P3 + P4",
      fiche.status === 200 &&
      fiche.body.includes("Printemps clair") &&
      fiche.body.includes("Jean noir") &&
      fiche.body.includes("Look bureau lumineux"));
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
    console.info("\n→ Cliente de test purgée.");
  }

  console.info(`\n=== Résultat : ${pass} OK, ${fail} KO ===\n`);
  await sql.end();
  if (fail > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Smoke-test échoué :", err);
  await sql.end().catch(() => {});
  process.exit(1);
});
