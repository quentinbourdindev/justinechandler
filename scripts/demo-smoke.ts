/**
 * Smoke-test HTTP de bout en bout contre le serveur en cours d'exécution.
 * Démontre, SANS navigateur, que l'app tourne réellement :
 *  - pages publiques rendues ;
 *  - session coach valide → dashboard coach (file d'attente, portefeuille) ;
 *  - flux « changement forcé » de Léa (must_change_password) ;
 *  - boussole (3 mots) rendue sur le dashboard cliente une fois le pilier 1 validé ;
 *  - cloisonnement des rôles.
 *
 * Les cookies de session sont signés avec le MÊME SESSION_SECRET que le serveur
 * (.env.local) et traversent les vrais guards (getCurrentUser → vérif live base).
 *
 *   BASE=http://localhost:3100 npm run demo:smoke   (serveur dev déjà lancé)
 */
import { sql } from "@/lib/db/client";
import { getSafeUserById, getUserByEmailWithSecret, changeOwnPassword } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { signSession, pcaEpoch, SESSION_COOKIE } from "@/lib/auth/session";
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

async function get(path: string, cookie?: string) {
  const res = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), body };
}

async function main() {
  console.info(`\n=== Smoke-test Alia (${BASE}) ===\n`);

  // 1. Pages publiques
  console.info("1) Pages publiques");
  const home = await get("/");
  check("GET / → 200", home.status === 200);
  check("accueil contient l'accroche", home.body.includes("Réapproprie-toi ton image"));
  const login = await get("/login");
  check("GET /login → 200", login.status === 200);
  check("login affiche les comptes de démo", login.body.includes("Comptes de démo"));

  // 2. Session coach → dashboard coach
  console.info("\n2) Dashboard coach (session valide)");
  const coachUser = await getUserByEmailWithSecret("justine@image-coaching.test");
  if (!coachUser) throw new Error("Compte coach de démo introuvable (lancer npm run seed:demo).");
  const coachSafe = await getSafeUserById(coachUser.id);
  const coachCookie = await cookieFor(coachSafe!);
  const coachDash = await get("/coach/tableau-de-bord", coachCookie);
  check("GET /coach/tableau-de-bord → 200", coachDash.status === 200);
  check("salutation coach", coachDash.body.includes("Bonjour Justine"));
  check("file d'attente « À valider »", coachDash.body.includes("À valider"));
  check("pilier en attente de Léa visible", coachDash.body.includes("Léa"));

  // 3. Flux changement forcé (Léa, must_change_password = true après seed)
  console.info("\n3) Flux « changement de mot de passe forcé » (Léa)");
  const leaUser = await getUserByEmailWithSecret("lea.martin@example.test");
  if (!leaUser) throw new Error("Compte Léa de démo introuvable.");
  let leaSafe = await getSafeUserById(leaUser.id);
  check("Léa.must_change_password = true (état initial démo)", leaSafe!.must_change_password === true);
  const leaForcedCookie = await cookieFor(leaSafe!);
  const leaBlocked = await get("/espace/tableau-de-bord", leaForcedCookie);
  check(
    "accès espace cliente → redirige vers /changer-mot-de-passe",
    leaBlocked.status === 307 && leaBlocked.location?.endsWith("/changer-mot-de-passe") === true,
    `status=${leaBlocked.status} → ${leaBlocked.location}`
  );
  const changePage = await get("/changer-mot-de-passe", leaForcedCookie);
  check("page de changement accessible (200)", changePage.status === 200);
  check("intitulé « Choisis ton mot de passe »", changePage.body.includes("Choisis ton mot de passe"));

  // 4. Boussole sur le dashboard cliente (après 1re connexion réalisée)
  console.info("\n4) Boussole (3 mots) sur le dashboard cliente");
  await changeOwnPassword(leaUser.id, await hashPassword("DemoLea2026!")); // simule la 1re connexion
  leaSafe = await getSafeUserById(leaUser.id);
  check("Léa.must_change_password = false après changement", leaSafe!.must_change_password === false);
  const leaCookie = await cookieFor(leaSafe!);
  const leaDash = await get("/espace/tableau-de-bord", leaCookie);
  check("GET /espace/tableau-de-bord → 200", leaDash.status === 200);
  // (React insère des marqueurs entre texte statique et dynamique → on teste les deux fragments.)
  check("salutation cliente (Bonjour … Léa)", leaDash.body.includes("Bonjour") && leaDash.body.includes("Léa"));
  const boussoleOk =
    leaDash.body.includes("Authentique") &&
    leaDash.body.includes("Lumineuse") &&
    leaDash.body.includes("Affirmée");
  check("boussole affiche les 3 mots (Authentique / Lumineuse / Affirmée)", boussoleOk);

  // 5. Cloisonnement des rôles
  console.info("\n5) Cloisonnement des rôles");
  const coachOnEspace = await get("/espace/tableau-de-bord", coachCookie);
  check(
    "coach sur /espace → redirige vers son espace",
    coachOnEspace.status === 307 && coachOnEspace.location?.includes("/coach/") === true,
    `→ ${coachOnEspace.location}`
  );
  const leaOnCoach = await get("/coach/tableau-de-bord", leaCookie);
  check(
    "cliente sur /coach → redirige vers son espace",
    leaOnCoach.status === 307 && leaOnCoach.location?.includes("/espace/") === true,
    `→ ${leaOnCoach.location}`
  );

  // Remise en état : Léa repasse en « changement forcé » pour la soutenance.
  console.info("\n→ Remise en état des comptes de démo…");
  await sql`
    UPDATE users
       SET password_hash = ${await hashPassword("DemoLea2026!")},
           must_change_password = true,
           password_changed_at = NULL
     WHERE email = 'lea.martin@example.test'
  `;
  console.info("  ✓ Léa réinitialisée (changement forcé restauré).");

  console.info(`\n=== Résultat : ${pass} OK, ${fail} KO ===\n`);
  await sql.end();
  if (fail > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Smoke-test échoué :", err);
  await sql.end().catch(() => {});
  process.exit(1);
});
