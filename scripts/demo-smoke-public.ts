/**
 * Smoke-test HTTP du funnel PUBLIC (Phase 2) contre le serveur :
 * rendu landing / candidature / RDV / pages légales, et surtout PREUVE
 * d'isolation PII — le nom d'un prospect ayant réservé n'apparaît JAMAIS dans
 * le HTML de la page publique de prise de RDV.
 *
 *   BASE=http://localhost:3100 npm run demo:smoke:public
 */
import { sql } from "@/lib/db/client";
import { bookSlot } from "@/lib/db/booking";
import crypto from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3100";
let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.info(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}
async function get(path: string) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return { status: res.status, body: res.status === 200 ? await res.text() : "" };
}
async function makeSlot(status: "available", offsetDays: number, hour: number): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO availability_slots (start_at, end_at, status)
    VALUES (
      now() + ${`${offsetDays} days`}::interval + ${`${hour} hours`}::interval,
      now() + ${`${offsetDays} days`}::interval + ${`${hour} hours`}::interval + interval '45 minutes',
      ${status}
    ) RETURNING id`;
  return rows[0]!.id;
}

async function main() {
  console.info(`\n=== Smoke-test funnel public (${BASE}) ===\n`);

  const SECRET = `Ztopsecretname${crypto.randomUUID().slice(0, 8)}`;
  const freeSlot = await makeSlot("available", 8, 10);
  const bookedSlot = await makeSlot("available", 8, 15);

  try {
    // Réserve bookedSlot avec un nom unique → ne doit JAMAIS apparaître côté public.
    await bookSlot({ slotId: bookedSlot, firstName: SECRET, lastName: SECRET, email: "zsecret@example.test", phone: null, message: null });

    console.info("1) Landing & pages publiques");
    const home = await get("/");
    check("landing rendue (accroche + méthode + mantra)",
      home.status === 200 &&
      home.body.includes("Réapproprie-toi ton image") &&
      home.body.includes("La méthode, en 4 piliers") &&
      home.body.includes("L'IA assiste. Justine valide."));

    const cand = await get("/candidature");
    // NB : les composants client échappent l'apostrophe en &#x27; → fragments sans apostrophe.
    check("candidature : questions + consentement + envoi",
      cand.status === 200 &&
      cand.body.includes("3 mots qui te décrivent") &&
      cand.body.includes("Pourquoi maintenant") &&
      cand.body.includes("accepte que mes réponses") &&
      cand.body.includes("Envoyer ma candidature"));

    const ml = await get("/mentions-legales");
    const cf = await get("/confidentialite");
    check("pages légales rendues", ml.status === 200 && cf.status === 200 &&
      cf.body.includes("Politique de confidentialité"));

    console.info("\n2) Prise de RDV + isolation PII");
    const rdv = await get("/rendez-vous");
    check("page RDV rendue", rdv.status === 200 && rdv.body.includes("Prendre rendez-vous"));
    check("au moins un créneau présenté", rdv.body.includes("Réserver ce créneau") || rdv.body.includes("rounded-xl border"));
    check("AUCUNE PII : le nom du prospect réservé est absent du HTML public",
      !rdv.body.includes(SECRET), SECRET);
  } finally {
    await sql`DELETE FROM discovery_bookings WHERE slot_id = ANY(${[freeSlot, bookedSlot]})`;
    await sql`DELETE FROM availability_slots WHERE id = ANY(${[freeSlot, bookedSlot]})`;
    console.info("\n→ Créneaux de test purgés.");
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
