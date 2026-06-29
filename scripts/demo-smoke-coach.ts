/**
 * Smoke-test HTTP de la partie COACH (Phase 2) contre le serveur : rendu des
 * écrans candidatures / détail / disponibilités / nouvelle cliente / fiche, et
 * contraste PII — côté admin, le nom d'un prospect réservé EST visible (à
 * l'inverse de la page publique). Données de test purgées en fin.
 *
 *   BASE=http://localhost:3100 npm run demo:smoke:coach
 */
import { sql } from "@/lib/db/client";
import { getUserByEmailWithSecret, getSafeUserById } from "@/lib/db/users";
import { getClienteByUserId } from "@/lib/db/clientes";
import { createApplication } from "@/lib/db/applications";
import { bookSlot } from "@/lib/db/booking";
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
  console.info(`\n=== Smoke-test partie coach (${BASE}) ===\n`);
  const coach = await getUserByEmailWithSecret("justine@image-coaching.test");
  if (!coach) throw new Error("Coach absent (npm run seed:demo).");
  const cookie = await cookieFor((await getSafeUserById(coach.id))!);

  const APPLICANT = `Zsmoke${crypto.randomUUID().slice(0, 8)}`;
  const SECRET = `Zbooker${crypto.randomUUID().slice(0, 8)}`;
  const appId = await createApplication({
    fullName: APPLICANT, instagram: "@z", email: `z+${crypto.randomUUID()}@alia.test`,
    birthDate: "1990-04-12", profession: "Avocate", motivation: "m", currentImage: "i",
    goal: "g", wordsToday: "a", wordsToEmbody: "b", mainBlocker: "x", whyNow: "y", commitmentLevel: "z",
  });
  const slot = (await sql<{ id: string }[]>`
    INSERT INTO availability_slots (start_at, end_at, status)
    VALUES (now() + interval '11 days' + interval '10 hours', now() + interval '11 days' + interval '10 hours 45 minutes', 'available')
    RETURNING id`)[0]!.id;

  try {
    await bookSlot({ slotId: slot, firstName: SECRET, lastName: SECRET, email: "z@x.fr", phone: null, message: null });

    // 1) Candidatures
    console.info("1) Candidatures");
    const list = await get("/coach/candidatures", cookie);
    check("file de triage rendue + candidate listée", list.status === 200 && list.body.includes(APPLICANT));
    const filtered = await get("/coach/candidatures?status=new", cookie);
    check("filtre par statut", filtered.status === 200 && filtered.body.includes(APPLICANT));
    const detail = await get(`/coach/candidatures/${appId}`, cookie);
    check("détail : réponses + actions",
      detail.status === 200 && detail.body.includes("Avocate") && detail.body.includes("Convertir en cliente"));

    // 2) Disponibilités — PII admin VISIBLE (contraste avec le public)
    console.info("\n2) Disponibilités (PII admin visible)");
    const dispo = await get("/coach/disponibilites", cookie);
    check("page rendue + formulaire d'ouverture", dispo.status === 200 && dispo.body.includes("Ouvrir le créneau"));
    check("le nom du prospect réservé EST visible côté admin", dispo.body.includes(SECRET), SECRET);

    // 3) Nouvelle cliente
    console.info("\n3) Création directe");
    const nouvelle = await get("/coach/clientes/nouvelle", cookie);
    check("formulaire de création rendu", nouvelle.status === 200 && nouvelle.body.includes("Créer une cliente"));

    // 4) Reset sur la fiche cliente (Léa)
    console.info("\n4) Fiche cliente — reset");
    const lea = await getUserByEmailWithSecret("lea.martin@example.test");
    const cliente = await getClienteByUserId(lea!.id);
    const fiche = await get(`/coach/clientes/${cliente!.id}`, cookie);
    check("bouton de réinitialisation présent",
      fiche.status === 200 && fiche.body.includes("Réinitialiser le mot de passe"));
  } finally {
    await sql`DELETE FROM discovery_bookings WHERE slot_id = ${slot}`;
    await sql`DELETE FROM availability_slots WHERE id = ${slot}`;
    await sql`SELECT delete_application(${appId})`.catch(() => {});
    console.info("\n→ Données de test purgées.");
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
