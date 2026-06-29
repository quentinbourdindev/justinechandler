/**
 * Smoke-test HTTP de la TRANCHE 1 (Phase 1) contre le serveur lancé :
 * onboarding → Pilier 1 (Identité) → soumission → validation coach → déblocage
 * du Pilier 2. Vérifie le RENDU des pages à chaque état et le GATE de bout en
 * bout. Cliente de test jetable (purgée en fin) ; comptes de démo intacts.
 *
 * Les effets des server actions (qui nécessitent un contexte de requête Next)
 * sont SIMULÉS via les fonctions lib/db ; ce sont exactement les mêmes appels
 * que ceux des actions. Les pages, elles, sont servies réellement.
 *
 *   BASE=http://localhost:3100 npm run demo:smoke:p1
 */
import { sql } from "@/lib/db/client";
import {
  createClienteAccount,
  getUserByEmailWithSecret,
  getSafeUserById,
  changeOwnPassword,
} from "@/lib/db/users";
import { getClienteById, setBoussoleWord, setClienteStatus } from "@/lib/db/clientes";
import {
  getPilierForCliente,
  submitPilier,
  validatePilier,
} from "@/lib/db/piliers";
import { setConsent } from "@/lib/db/consents";
import { getOrCreateMoodboardForPilier, addMoodboardItem } from "@/lib/db/moodboards";
import { hashPassword } from "@/lib/auth/password";
import { signSession, pcaEpoch, SESSION_COOKIE } from "@/lib/auth/session";
import crypto from "node:crypto";
import type { SafeUser } from "@/lib/db/types";

const BASE = process.env.BASE ?? "http://localhost:3100";
let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.info(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function cookieFor(user: SafeUser): Promise<string> {
  const token = await signSession({
    sub: user.id,
    role: user.role,
    mcp: user.must_change_password,
    pca: pcaEpoch(user.password_changed_at),
  });
  return `${SESSION_COOKIE}=${token}`;
}

async function get(path: string, cookie: string) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), body };
}

async function main() {
  console.info(`\n=== Smoke-test Tranche 1 (${BASE}) ===\n`);

  const coach = await getUserByEmailWithSecret("justine@image-coaching.test");
  if (!coach) throw new Error("Coach de démo absent (npm run seed:demo).");
  const coachCookie = await cookieFor((await getSafeUserById(coach.id))!);

  // Cliente de test jetable, mot de passe déjà changé (pas de blocage mcp).
  const clienteId = await createClienteAccount({
    email: `test+${crypto.randomUUID()}@alia.test`,
    passwordHash: await hashPassword("Smoke12345!"),
    firstName: "Smoke",
    lastName: "Cliente",
  });
  const clienteRow = await getClienteById(clienteId);
  const userId = clienteRow!.user_id;
  await changeOwnPassword(userId, await hashPassword("Smoke12345!"));
  const clienteCookie = await cookieFor((await getSafeUserById(userId))!);

  try {
    // 1) Gate d'onboarding
    console.info("1) Onboarding (consentement requis)");
    const blocked = await get("/espace/tableau-de-bord", clienteCookie);
    check(
      "sans consentement → redirige vers /espace/onboarding",
      blocked.status === 307 && blocked.location?.endsWith("/espace/onboarding") === true,
      `${blocked.status} → ${blocked.location}`
    );
    const onb = await get("/espace/onboarding", clienteCookie);
    check("page d'onboarding rendue", onb.status === 200 && onb.body.includes("Smoke"));

    // Effet de l'action d'onboarding (consentements + statut).
    await setConsent(clienteId, "traitement_donnees", true);
    await setConsent(clienteId, "photos", true);
    await setConsent(clienteId, "ai_photo_processing", true);
    await setClienteStatus(clienteId, "in_progress");

    const dash = await get("/espace/tableau-de-bord", clienteCookie);
    check("après consentement → dashboard accessible", dash.status === 200 && dash.body.includes("Bonjour"));
    check("boussole VIDE tant que P1 non validé", dash.body.includes("une fois ton Identité validée"));

    // 2) Pilier 1 éditable
    console.info("\n2) Pilier 1 — Identité");
    const p1 = (await getPilierForCliente(clienteId, 1))!;
    const p1page = await get("/espace/piliers/1", clienteCookie);
    check("stepper Identité rendu (in_progress)", p1page.status === 200 && p1page.body.includes("Qui je suis"));

    // Effet de l'édition + soumission.
    await setBoussoleWord(clienteId, "who_she_is", "Authentique");
    await setBoussoleWord(clienteId, "what_she_likes", "Lumineuse");
    await setBoussoleWord(clienteId, "to_embody", "Affirmée");
    const mb = await getOrCreateMoodboardForPilier(clienteId, p1.id, "Mon moodboard");
    await addMoodboardItem({ moodboardId: mb, sourceUrl: "https://example.com/inspiration.jpg" });
    await submitPilier(p1.id);

    const p1submitted = await get("/espace/piliers/1", clienteCookie);
    check("après soumission → lecture seule", p1submitted.body.includes("Soumis à Justine"));

    // 3) Coach : file d'attente + écran de validation
    console.info("\n3) Coach — file d'attente & validation");
    const coachDash = await get("/coach/tableau-de-bord", coachCookie);
    check("cliente dans la file « À valider »", coachDash.body.includes("Smoke"));
    const valPage = await get(`/coach/validations/${p1.id}`, coachCookie);
    check(
      "écran de validation montre le contenu soumis",
      valPage.status === 200 && valPage.body.includes("Authentique") && valPage.body.includes("Les 3 mots")
    );

    // Effet de la décision de la coach.
    await validatePilier(p1.id, coach.id, "validated", "Les 3 mots sont justes.");

    // 4) Gate débloqué + boussole remplie
    console.info("\n4) Validation → déblocage + boussole");
    check(
      "Pilier 2 débloqué (in_progress)",
      (await getPilierForCliente(clienteId, 2))!.status === "in_progress"
    );
    const dashAfter = await get("/espace/tableau-de-bord", clienteCookie);
    check("boussole affiche les 3 mots après validation", dashAfter.body.includes("Authentique"));
    const p1validated = await get("/espace/piliers/1", clienteCookie);
    check("Pilier 1 en lecture seule « Validé »", p1validated.body.includes("Validé par Justine"));
  } finally {
    await sql`SELECT delete_cliente(${clienteId})`;
    console.info("\n→ Cliente de test purgée (delete_cliente).");
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
