# Alia — application de coaching en image

Application web responsive **mobile-first** pour la coach **Justine** et ses
clientes. Met en œuvre la méthode en **4 piliers séquentiels**, sous le principe
non négociable : **« L'IA assiste. Justine valide. »** Aucun pilier n'avance
sans la validation de la coach (gate appliqué **en base**, jamais contourné).

> **État : Phase 0 (Fondations) livrée et testée.** Voir la feuille de route en
> bas de page pour les phases suivantes.

---

## Sommaire

- [Prérequis](#prérequis)
- [Démarrage local](#démarrage-local)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Sécurité & RGPD](#sécurité--rgpd)
- [Carte des fonctionnalités par espace](#carte-des-fonctionnalités-par-espace)
- [Déploiement (VPS IONOS, Docker)](#déploiement-vps-ionos-docker)
- [Journal des décisions (Phase 0)](#journal-des-décisions-phase-0)
- [Feuille de route](#feuille-de-route)

---

## Prérequis

- **Node.js ≥ 20** (développé avec Node 24).
- **PostgreSQL 16** avec la base **`image_coaching`** (le dossier `db/` contient
  le schéma, les migrations et le seed — voir `db/README.md`).
- En production : Docker (artefacts produits en Phase 6).

> La logique métier vit **en base** (fonctions/triggers SQL dans `db/`).
> L'application les **appelle** : elle ne réimplémente ni le gate de validation,
> ni le RGPD, ni l'avancement des piliers. Toute évolution du schéma passe par
> une **nouvelle migration** dans `db/migrations/`.

---

## Démarrage local

### 1. Base de données

Si la base `image_coaching` n'existe pas encore (poste vierge) :

```bash
cd db
createdb image_coaching
DATABASE_URL="postgres:///image_coaching" ./run.sh   # migrations + seed
cd ..
```

(Voir `db/README.md` pour l'option Docker du Postgres local.)

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# Éditer .env.local :
#   - DATABASE_URL pointant sur votre base
#   - SESSION_SECRET : openssl rand -hex 32
```

### 3. Dépendances, comptes de démo, lancement

```bash
npm install
npm run seed:demo        # pose de vrais mots de passe sur les comptes de démo
npm run dev              # http://localhost:3000  (port occupé ? npm run dev -- -p 3100)
```

---

## Comptes de démonstration

Posés par `npm run seed:demo` (mots de passe **connus**, pour la soutenance).
Ils sont aussi rappelés sur la page `/login` **hors production**.

| Rôle | Email | Mot de passe | État |
| --- | --- | --- | --- |
| Coach | `justine@image-coaching.test` | `DemoCoach2026!` | actif |
| Cliente | `lea.martin@example.test` | `DemoLea2026!` | **1re connexion → changement de mot de passe forcé** ; pilier 1 validé (boussole remplie) |
| Cliente | `manon.petit@example.test` | `DemoManon2026!` | a déjà changé son mot de passe |

> Léa illustre le flux complet : connexion → écran « choisis ton mot de passe »
> forcé → dashboard cliente avec sa **boussole** (Authentique / Lumineuse /
> Affirmée). Le dashboard coach montre le pilier 4 de Léa **en attente de
> validation**.

---

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement. |
| `npm run build` | Build de production (`output: standalone`, Docker-ready). |
| `npm run start` | Sert le build (en prod, préférer `node .next/standalone/server.js`). |
| `npm run typecheck` | Vérification TypeScript stricte (`tsc --noEmit`). |
| `npm run seed:demo` | Pose les mots de passe des comptes de démo (idempotent). |
| `npm test` | Tests d'intégration (auth, flux mot de passe, gate, Pilier 1, consentements, upload) **contre la base**. |
| `npm run demo:smoke` | Smoke-test HTTP auth + boussole (serveur lancé). `BASE=http://localhost:3100 npm run demo:smoke` |
| `npm run demo:smoke:p1` | Smoke-test HTTP du parcours Pilier 1 (onboarding → soumission → validation → déblocage). |
| `npm run demo:smoke:p234` | Smoke-test HTTP des Piliers 2→3→4 (rendu, revue coach, fiche détaillée, chaîne de gate). |
| `npm run demo:smoke:public` | Smoke-test HTTP du funnel public (landing, candidature, RDV) + preuve d'isolation PII. |
| `npm run demo:smoke:coach` | Smoke-test HTTP de la partie coach (candidatures, dispos, reset) + PII admin visible. |

---

## Architecture

```
app/
  (public)/            accueil + /login         (statique, AUCUN CMS)
  changer-mot-de-passe/ écran de changement (forcé ou volontaire)
  (cliente)/espace/    espace cliente protégé (mobile-first, boussole permanente)
  (coach)/coach/       dashboard coach protégé (desktop/tablette)
lib/
  env.ts               validation des variables d'environnement (Zod, serveur)
  db/                  client postgres.js + wrappers TYPÉS des fonctions/vues SQL
  auth/                bcrypt, sessions JWT (jose), guards de rôle, server actions
  security/            rate-limiting (login) + CSRF (double-submit cookie)
  notifications/       création des notifs in-app (invariant RGPD payload.cliente_id)
  storage/ email/ ai/  abstractions typées (implémentation Phases 2/3/5)
  validation/          schémas Zod partagés
components/            design system « Alia » + composants métier
middleware.ts          gating au bord (rôle, mcp) + garantie du cookie CSRF
scripts/               seed des comptes démo, smoke-test
tests/                 tests d'intégration (node:test)
```

**Stack** : Next.js 15 (App Router) + TypeScript strict · `postgres` (postgres.js)
· Tailwind CSS · sessions JWT `jose` · `bcryptjs` · Zod.

---

## Sécurité & RGPD

- **Mots de passe** hachés côté app (bcrypt, coût 12) ; la base ne reçoit qu'un
  hash, jamais de clair, et ne le logge jamais. Aucune vue n'expose `password_hash`.
- **Sessions** sans état : JWT signé (HS256) dans un cookie **httpOnly** (jamais
  de token en `localStorage`). Le claim `pca` (= `password_changed_at`) est
  comparé à la valeur **live** en base : **toute session émise avant un changement
  de mot de passe est invalidée** (et ré-émise pour l'utilisateur courant).
- **Changement de mot de passe forcé** (`must_change_password`) : redirection au
  bord (middleware) **et** revérification serveur sur l'état **live** du compte.
- **CSRF** sur les mutations d'auth (login + changement de mot de passe) :
  double-submit cookie httpOnly + champ caché + contrôle d'`Origin`.
- **Rate-limiting** sur le login (8 tentatives / 15 min par IP+email) ;
  helper réutilisable pour les formulaires publics (Phase 2).
- **Isolation des données** : guards serveur par `id` de session ; une cliente
  n'accède qu'à ses données.
- **Seam public (PII)** : `lib/db/public-client` n'expose que des accès à la vue
  `public_availability` (aucun nom). En production, pointer
  `DATABASE_URL_PUBLIC` sur un rôle **`app_anon`** à privilèges réduits
  (voir [Déploiement](#déploiement-vps-ionos-docker)).
- **Droit à l'oubli** (Phase 5) : appel des fonctions base `forget_person` /
  `delete_cliente`, puis purge des fichiers object storage à partir des URLs
  renvoyées.

> ⚠️ Limite connue : le rate-limiting est **en mémoire** (OK pour un déploiement
> mono-instance). Un déploiement multi-instances nécessiterait un store partagé
> (Redis).

---

## Carte des fonctionnalités par espace

| Espace | Disponible | À venir |
| --- | --- | --- |
| **Public** | **Landing « Alia »** (statique) · **candidature** (13 questions → `applications`, consentement, email d'accusé) · **prise de RDV** (lecture `public_availability`, réservation `book_slot`, créneaux pris/fermés grisés, **aucune PII**) · **mentions légales** & **confidentialité** | IA (Phase 3) |
| **Cliente** (mobile-first) | Connexion + mot de passe forcé · onboarding & consentements · dashboard (boussole + timeline cliquable + notifications) · **les 4 piliers** : P1 Identité (3 mots + moodboard), P2 Mise en valeur (colorimétrie + morphologie + recommandations), P3 Tri (garder/sortir + critères), P4 Construction (3 catégories + looks) — soumission à chaque pilier, uploads photos | IA, messagerie, RGPD, aide-achat (Phases 3–5) |
| **Coach** (desktop/tablette) | Connexion · dashboard (file `À valider` + portefeuille) · fiche cliente détaillée · validation par pilier · **triage des candidatures** (filtre, statut, **conversion → invitation email**, suppression) · **disponibilités** (ouvrir/fermer des créneaux, voir/annuler les réservations avec PII admin) · **reset mot de passe** + **création directe d'une cliente** (avec invitation) | Messagerie (Phase 4) |

---

## Déploiement (VPS IONOS, Docker)

Les artefacts Docker (`Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`) sont
produits en **Phase 6**. L'app est déjà **Docker-ready** : `output: 'standalone'`
et configuration **100 % par variables d'environnement** (`.env.example`).

**Durcissement PII — rôle `app_anon` (à faire au déploiement).** Le schéma ne
crée pas de rôle (portabilité IONOS). Créer un rôle en lecture seule sur la vue
publique et y pointer `DATABASE_URL_PUBLIC` :

```sql
CREATE ROLE app_anon LOGIN PASSWORD '...';
GRANT SELECT ON public_availability TO app_anon;          -- RDV (aucune PII)
GRANT INSERT ON applications TO app_anon;                 -- candidature publique
GRANT EXECUTE ON FUNCTION book_slot(uuid, text, text, citext, text, text, timestamptz) TO app_anon;
-- NE PAS accorder l'accès à availability_slots ni discovery_bookings
-- ni en lecture sur applications (la candidate ne lit jamais les autres).
```

> **Migration Phase 6 à prévoir** : passer `book_slot` en `SECURITY DEFINER`
> (avec un `search_path` fixe) pour que `app_anon` réserve **via la fonction**
> sans aucun droit direct sur `availability_slots` / `discovery_bookings`. Sans
> cela, `EXECUTE book_slot` sous un rôle réduit échouerait (la fonction écrit
> dans ces tables avec les droits de l'appelant).

```env
DATABASE_URL_PUBLIC=postgresql://app_anon:...@db:5432/image_coaching
```

---

## Journal des décisions (Phase 0)

- **Aucun lien avec le Stellr CMS** : Alia est une application autonome avec sa
  propre base. Pas de SDK, pas de `data-cms-id`, pas de dépendance CMS — y
  compris la landing (statique, dans le code).
- **postgres.js** plutôt qu'un ORM : on appelle les fonctions/vues SQL, la
  logique reste en base ; `LISTEN/NOTIFY` natif utile pour la messagerie (Phase 4).
- **Sessions JWT `jose`** (sans table `sessions`) : respecte « cookie httpOnly +
  secret signé » sans modifier le schéma gelé. Invalidation via le claim `pca`.
- **`bcryptjs`** (pur JS) : compatible format `$2b$` du seed, aucun build natif
  → image Docker `standalone` sans complication.
- **Dates `DATE` en chaîne** dans `lib/db` (parser postgres.js dédié) : évite les
  décalages de fuseau sur `birth_date` / dates d'accompagnement.
- **Docker non disponible sur le poste de dev** : Phase 0 testée contre le
  PostgreSQL local ; les artefacts Docker restent un livrable de Phase 6.
- **Hypothèse** : URLs cliente sous `/espace/*`, coach sous `/coach/*` (les
  groupes de routes `(cliente)`/`(coach)` n'ajoutent pas de segment d'URL) — pour
  un gating par préfixe simple et lisible au niveau du middleware.
- **Migration `014`** : ajout de `ai_photo_processing` à l'enum `consent_scope`
  (absent du schéma initial, requis par le brief) → l'onboarding capture 3
  consentements ; prêt pour la Phase 3. `schema.sql` régénéré.
- **Stockage** : adaptateur **disque local** activé en dev (`storage-dev/`),
  upload **conditionné au consentement photos**, images servies par une route
  **protégée par session** (équivalent privé des URLs signées) ; bascule IONOS
  S3 via variables d'env en prod.
- **Boussole** : reste **vide tant que le Pilier 1 n'est pas validé** par la
  coach, même si les 3 mots sont déjà saisis pendant l'édition (ils existent en
  base car le gate `validate_pilier` les exige à la validation).
- **Tables IA** (`ai_requests` / `ai_outputs`, brief §3) absentes du schéma →
  migration à prévoir en **Phase 3** (hors périmètre actuel).
- **Emails (Phase 2)** : un seul adaptateur **SMTP** (`nodemailer`), console en
  dev. En prod = **Resend** (host `smtp.resend.com`, port 465, user `resend`,
  pass = clé API) — le même adaptateur couvre Scaleway TEM / IONOS. Envois
  **non bloquants** (toute erreur est loggée, jamais propagée à l'UX).
- **Funnel public & PII** : la candidature (INSERT `applications`) et le RDV
  (`public_availability` + `book_slot`) passent par le **seam public**
  (`publicSql`). Aucun écran public ne lit `discovery_bookings`,
  `availability_slots` ni les autres candidatures (vérifié par un smoke
  d'isolation : le nom d'un prospect réservé n'apparaît jamais dans le HTML public).
- **iCloud / `.next`** : le projet vit sur un Desktop iCloud ; le serveur de dev
  écrit `.next` en continu → iCloud crée des copies de conflit (`… 2.ts`). Ces
  artefacts sont gitignorés et `tsconfig` **exclut `.next`** du typecheck
  (`next build` valide les types de routes de son côté).

---

## ⚠️ À compléter avant la mise en ligne

Les **pages légales** (`/mentions-legales`, `/confidentialite`) contiennent des
**placeholders `[à compléter]`** que la cliente doit fournir avant publication :

- **Mentions légales** : raison sociale, statut juridique, **SIRET**, **adresse**,
  hébergeur exact, **email de contact**, directrice de la publication.
- **Confidentialité** : coordonnées du responsable de traitement, **email pour
  exercer les droits RGPD**, durées de conservation précises.

> Ces mentions sont **obligatoires en France** (RGPD + LCEN). Le site ne doit pas
> être mis en ligne tant que ces champs ne sont pas renseignés. Texte à éditer
> directement dans `app/(public)/mentions-legales/page.tsx` et
> `app/(public)/confidentialite/page.tsx`.

## Feuille de route

| Phase | Contenu |
| --- | --- |
| **0 — Fondations** ✅ | Scaffolding, design system, `lib/*`, auth complète (login, changement forcé, guards, CSRF, rate-limit, invalidation session), comptes démo. |
| **1 — Socle** ✅ | Onboarding + consentements ; les **4 piliers** côté cliente (Identité, Mise en valeur, Tri, Construction) ; **validation par pilier** côté coach + **fiche cliente détaillée** ; gate de bout en bout ; notifications ; uploads photos consentement-gated. |
| **2 — Public & emails** ✅ | Funnel public (landing, candidature, RDV sans PII, légales) + emails ; **partie coach** : triage candidatures + conversion/invitation, gestion des disponibilités, reset mot de passe, création directe de cliente. |
| 3 — IA Mistral | Analyses colorimétrie/morpho, conseils looks, suivi — serveur only, journalisé, sous consentement. |
| 4 — Messagerie | Chat cliente ↔ coach temps réel (LISTEN/NOTIFY → SSE), accusés, pièces jointes. |
| 5 — Transverse & RGPD | Aide à l'achat en boutique, profil, export/suppression RGPD, centre de notifications. |
| 6 — Déploiement | Dockerfile, docker-compose, Caddyfile, section déploiement. |
```
