/**
 * Pose de VRAIS hashs bcrypt pour les comptes de démo (mots de passe connus),
 * pour la soutenance. Idempotent. Ne touche ni au schéma, ni aux migrations.
 *
 *   npm run seed:demo
 *
 * Les hashs du seed SQL sont des placeholders (`$2b$12$DEMODEMO…`) inutilisables
 * pour se connecter : ce script les remplace par des hashs valides.
 */
import { sql } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

interface DemoAccount {
  email: string;
  password: string;
  mustChange: boolean;
  /** true => password_changed_at = now() (cliente ayant déjà changé). */
  alreadyChanged?: boolean;
}

const ACCOUNTS: DemoAccount[] = [
  { email: "justine@image-coaching.test", password: "DemoCoach2026!", mustChange: false },
  // Léa : illustre la 1re connexion (changement de mot de passe forcé).
  { email: "lea.martin@example.test", password: "DemoLea2026!", mustChange: true },
  // Manon : a déjà changé son mot de passe.
  {
    email: "manon.petit@example.test",
    password: "DemoManon2026!",
    mustChange: false,
    alreadyChanged: true,
  },
];

async function main() {
  console.info("→ Pose des mots de passe de démo…\n");

  for (const acc of ACCOUNTS) {
    const hash = await hashPassword(acc.password);
    const rows = await sql<{ email: string }[]>`
      UPDATE users
         SET password_hash = ${hash},
             must_change_password = ${acc.mustChange},
             password_changed_at = ${
               acc.alreadyChanged ? sql`now()` : acc.mustChange ? sql`NULL` : sql`password_changed_at`
             }
       WHERE email = ${acc.email}
       RETURNING email
    `;
    if (rows.length === 0) {
      console.warn(`  ⚠️  ${acc.email} — compte absent (ignoré).`);
    } else {
      console.info(
        `  ✓ ${acc.email} — mot de passe posé` +
          (acc.mustChange ? " (changement forcé à la 1re connexion)" : "")
      );
    }
  }

  console.info("\n✅ Terminé. Identifiants de démo :");
  for (const acc of ACCOUNTS) {
    console.info(`   ${acc.email}  /  ${acc.password}`);
  }

  await sql.end();
}

main().catch(async (err) => {
  console.error("Échec du seed des mots de passe :", err);
  await sql.end().catch(() => {});
  process.exit(1);
});
