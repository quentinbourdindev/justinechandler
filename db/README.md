# `image_coaching` — Schéma de base de données (PostgreSQL 16)

Schéma de données d'une application de **coaching en image** structurée
autour d'une **méthode en 4 piliers séquentiels**, avec le principe
non négociable : **« L'IA assiste, la coach valide. »** Un pilier doit
être validé par la coach avant que la cliente débloque le suivant.

> **Périmètre de ce livrable : la base de données uniquement.**
> Migrations SQL, fonctions, vue, seed de démonstration et documentation.
> Aucun backend, framework ou front n'est inclus (volontairement).

100 % **PostgreSQL standard et portable** (cible de migration future :
**IONOS Managed PostgreSQL**). Seules extensions utilisées :
`pgcrypto` (UUID) et `citext` (emails) — toutes deux disponibles sur IONOS.

---

## 1. Hypothèses retenues (paramètres encore ouverts)

| Sujet | Hypothèse par défaut prise |
| --- | --- |
| **Nom de l'app / marque** | Aucun nom inventé. Base nommée `image_coaching`. |
| **Durée d'accompagnement** | Libre. `accompaniment_start_date` / `end_date` nullables, aucune durée figée. |
| **Accès au contenu après la fin** | Conservé. Statut `archived` ; l'effacement est une action RGPD **explicite** via `delete_cliente()`. |
| **Messagerie** | Implémentée mais **isolée** (migration `006`, optionnelle) car le canal n'est pas confirmé. Retirable sans impact. |
| **Nombre de coachs** | Le métier n'a qu'une coach, mais le schéma **n'interdit pas** plusieurs comptes `coach`. |
| **Notifications** | Générées côté application. La base fournit la table ; le seed simule quelques lignes. |
| **Object storage** | Supabase Storage / IONOS S3. La base ne stocke **que des URL**, jamais de binaire. |

### Écarts assumés par rapport au brief (améliorations, signalées)

1. **Création automatique des 4 piliers** à l'insertion d'une cliente
   (trigger) : pilier 1 `in_progress`, piliers 2–4 `locked`.
2. **`pieces.linked_word` typé en enum `word_slot`** (`who_she_is` /
   `what_she_likes` / `to_embody`) plutôt qu'en texte libre : robuste si
   la cliente modifie le libellé d'un mot.
3. **`notifications.type` typé en enum `notification_type`** (le brief le
   laissait libre) pour respecter la règle « catégories en ENUM ».
4. **`delete_cliente()` supprime aussi le compte `users`** : les
   `notifications` sont rattachées à l'utilisateur, pas à la cliente.
   Sans cela, l'effacement RGPD serait incomplet (cf. §11).
5. **Contraintes `CHECK` supplémentaires** : `tri_criterion` uniquement si
   `tri_decision = 'sortir'` ; un `moodboard_item` exige un `asset_id`
   **ou** une `source_url` ; `birth_date` bornée (≥ 1900 + pas dans le futur) ;
   dates d'accompagnement cohérentes ; URLs en `http(s)://`.
6. **Garde-fou `validate_pilier`** : la validation du pilier 1 exige que
   les 3 mots-boussole soient renseignés ; seul un compte `coach` peut valider.

---

## 2. Démarrage rapide

### Option A — Docker (recommandé pour un poste vierge)

```bash
cd db
cp .env.example .env                     # adapter si besoin
docker compose up -d                     # Postgres 16 sur le port hôte 5433

# Appliquer migrations + seed :
DATABASE_URL="postgres://image_coaching:image_coaching@localhost:5433/image_coaching" ./run.sh
```

### Option B — PostgreSQL local déjà installé

```bash
cd db
createdb image_coaching
DATABASE_URL="postgres:///image_coaching" ./run.sh
```

### Ce que fait `run.sh`

1. Crée la table d'orchestration `schema_migrations` (idempotent).
2. Applique **dans l'ordre** les migrations `migrations/*.sql` **non encore
   appliquées** (chacune dans **une transaction**, `ON_ERROR_STOP`).
3. Charge `seed.sql` (démo).

Options : `./run.sh --no-seed` (migrations seules) · `./run.sh --seed-only`
(recharge la démo). Connexion via `DATABASE_URL` **ou** variables `PG*`
(`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

---

## 3. Comportement de rejeu (idempotence)

| Niveau | Comportement |
| --- | --- |
| **Via `run.sh`** | **Idempotent.** Le ledger `schema_migrations` fait que seules les migrations manquantes sont rejouées (relancer applique 0 migration). |
| **Migration brute rejouée** (`psql -f 002_enums.sql` deux fois) | **Échec propre** : `ERROR: type ... already exists`, code retour ≠ 0, **aucune corruption** (chaque migration est atomique). |
| **`001` / `003` / `007` / `011`** | Volontairement rejouables seuls (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP … IF EXISTS`, `DROP/ADD CONSTRAINT`). |
| **`seed.sql`** | Rejouable : commence par `TRUNCATE ... CASCADE` (⚠️ **destructif**, réservé à une base de démo). |

---

## 4. Modèle de données (ERD)

```mermaid
erDiagram
    users ||--o| clientes : "compte 1-1"
    users ||--o{ validations : "coach décide"
    users ||--o{ notifications : "destinataire"
    users ||--o{ messages : "expéditeur"

    clientes ||--o{ piliers : "4 piliers"
    clientes ||--o{ assets : ""
    clientes ||--o{ pieces : ""
    clientes ||--o{ looks : ""
    clientes ||--o| color_profiles : "1-1"
    clientes ||--o| morpho_profiles : "1-1"
    clientes ||--o{ moodboards : ""
    clientes ||--o{ consents : "RGPD"
    clientes ||--o{ messages : "fil unique"

    piliers ||--o{ validations : "historique"
    piliers |o--o{ assets : ""
    piliers |o--o{ moodboards : ""

    consents |o--o{ assets : "couvre"
    assets   |o--o{ pieces : "photo"
    assets   |o--o{ moodboard_items : ""

    looks ||--o{ look_pieces : ""
    pieces ||--o{ look_pieces : ""
    moodboards ||--o{ moodboard_items : ""

    availability_slots ||--o{ discovery_bookings : "réservé par"
    clientes |o--o{ discovery_bookings : "prospect converti"
    clientes |o--o{ applications : "candidate convertie"

    messages ||--o{ message_attachments : "pièces jointes"
    assets ||--o{ message_attachments : "réutilise"

    users {
        uuid id PK
        user_role role
        citext email UK
        text password_hash "jamais exposé"
        boolean must_change_password
        timestamptz password_changed_at
        timestamptz last_login_at
    }
    clientes {
        uuid id PK
        uuid user_id FK "UNIQUE, CASCADE"
        cliente_status status
        date birth_date "nullable (remplace age)"
        text word_who_she_is "nullable"
        text word_what_she_likes "nullable"
        text word_to_embody "nullable"
    }
    piliers {
        uuid id PK
        uuid cliente_id FK
        smallint numero "CHECK 1..4"
        pilier_status status
        timestamptz submitted_at
        timestamptz validated_at
    }
    validations {
        uuid id PK
        uuid pilier_id FK
        uuid coach_id FK
        validation_decision decision
        text comment
    }
    assets {
        uuid id PK
        uuid cliente_id FK
        uuid pilier_id FK "nullable"
        uuid consent_id FK "nullable"
        asset_type type
        text storage_url
    }
    pieces {
        uuid id PK
        uuid cliente_id FK
        uuid asset_id FK "nullable"
        wardrobe_category wardrobe_category "nullable"
        tri_decision tri_decision "nullable"
        tri_criterion tri_criterion "nullable"
        word_slot linked_word "nullable"
        text tags "text[]"
    }
    looks {
        uuid id PK
        uuid cliente_id FK
        wardrobe_category category
    }
    look_pieces {
        uuid look_id PK
        uuid piece_id PK
    }
    color_profiles {
        uuid id PK
        uuid cliente_id FK "UNIQUE"
        text season
        jsonb palette
    }
    morpho_profiles {
        uuid id PK
        uuid cliente_id FK "UNIQUE"
        morpho_type type
        jsonb measurements
    }
    moodboards {
        uuid id PK
        uuid cliente_id FK
        uuid pilier_id FK "nullable"
        text title
    }
    moodboard_items {
        uuid id PK
        uuid moodboard_id FK
        uuid asset_id FK "nullable"
        text source_url
    }
    consents {
        uuid id PK
        uuid cliente_id FK
        consent_scope scope
        boolean granted
    }
    messages {
        uuid id PK
        uuid cliente_id FK
        user_role sender_role
        uuid sender_id FK
        text body
        timestamptz delivered_at "accusé remise"
        timestamptz read_at "accusé lecture"
        timestamptz deleted_at "soft delete"
    }
    message_attachments {
        uuid message_id PK
        uuid asset_id PK
    }
    notifications {
        uuid id PK
        uuid recipient_id FK
        notification_type type
        jsonb payload
    }
    availability_slots {
        uuid id PK
        timestamptz start_at
        timestamptz end_at
        slot_status status
        text admin_note "admin only"
    }
    discovery_bookings {
        uuid id PK
        uuid slot_id FK "RESTRICT"
        text first_name
        text last_name
        citext email
        booking_status status
        timestamptz consent_at
        uuid converted_cliente_id FK "nullable, SET NULL"
    }
    applications {
        uuid id PK
        text full_name
        citext email
        date birth_date
        text words_today
        text words_to_embody
        application_status status
        timestamptz consent_at
        uuid converted_cliente_id FK "nullable, SET NULL"
    }
```

> **Modules prospects**, séparés de `clientes` :
> - **Prise de RDV** (migration `008`) : `availability_slots` +
>   `discovery_bookings`. Vue publique `public_availability` (non
>   représentée, c'est une vue) = `id, start_at, end_at, is_available`.
>   Détails en **§7**.
> - **Candidatures** (migration `009`) : `applications` (questionnaire
>   public). Pas de vue publique (la candidate ne voit jamais les
>   autres). Détails en **§8**.

---

## 5. Description des tables

| Table | Rôle | Notes clés |
| --- | --- | --- |
| `users` | Comptes de connexion (cliente ou coach) | `email` `citext` unique ; **`password_hash` (hash uniquement, jamais exposé)** ; cycle mot de passe : `must_change_password`, `password_changed_at`, `last_login_at` (mig. `012`, §10). |
| `clientes` | Profil cliente, **1-1** avec `users` | Porte les **3 mots-boussole** (nullables tant que pilier 1 non validé) ; `birth_date` (**remplace `age`**, mig. `013` — l'âge se calcule à la volée). Trigger : compte lié de rôle `cliente`. |
| `piliers` | Avancement des 4 piliers | `UNIQUE(cliente_id, numero)`, `CHECK numero 1..4`. **Auto-créés** à l'insertion de la cliente. |
| `validations` | Journal des décisions coach (audit) | Append-only ; `coach_id` en `ON DELETE RESTRICT`. Plusieurs lignes par pilier (allers-retours). |
| `consents` | Consentements RGPD | `UNIQUE(cliente_id, scope)` ; `granted_at` obligatoire si `granted`. |
| `assets` | **Métadonnées** d'images | **Aucun binaire** : `storage_url` (http/https) + `storage_provider`. Lien optionnel vers `consents`. |
| `pieces` | Vêtements / accessoires | Pilier 3 (`tri_decision`/`tri_criterion`) **et** pilier 4 (`wardrobe_category`). `tags text[]` indexé GIN. |
| `looks` | Tenues | Composées de pièces via `look_pieces`. |
| `look_pieces` | Liaison **N-N** looks ↔ pièces | PK composite `(look_id, piece_id)`. |
| `color_profiles` | Colorimétrie (pilier 2) | **1-1** ; `palette` en `jsonb`. |
| `morpho_profiles` | Morphologie (pilier 2) | **1-1** ; `type` H/X/A/V/O/8 ; `measurements`/`reco` `jsonb`. |
| `moodboards` / `moodboard_items` | Planches d'inspiration | Item = asset interne **ou** URL externe (`CHECK`). |
| `notifications` | Notifications applicatives | Rattachées à l'**utilisateur** (`recipient_id`), pas à la cliente. |
| `messages` *(mig. 006, enrichie 010)* | Messagerie cliente ↔ coach | Un fil par cliente. Accusés `delivered_at`/`read_at`, `edited_at`, **soft delete** `deleted_at` ; **trigger NOTIFY** temps réel. |
| `message_attachments` *(mig. 010)* | Pièces jointes des messages | Liaison **N-N** `messages ↔ assets` (réutilise le consentement + l'hébergement EU). |
| `availability_slots` *(mig. 008)* | Créneaux d'appel découverte | Gérés par l'admin ; `CHECK end_at > start_at` ; index `(status, start_at)`. |
| `discovery_bookings` *(mig. 008)* | Réservations **prospects** (données perso) | **Séparée de `clientes`** ; `slot_id` en `RESTRICT` ; **index unique partiel** `(slot_id) WHERE status='confirmed'`. |
| `applications` *(mig. 009)* | Candidatures au coaching (**prospects**) | Questionnaire public (13 questions) ; **séparée de `clientes`** ; triage `application_status` ; `converted_cliente_id` (funnel). |

**Conventions appliquées partout** : PK `uuid DEFAULT gen_random_uuid()` ·
identifiants anglais `snake_case` · `COMMENT ON` français sur **chaque table
et chaque colonne** · `created_at`/`updated_at` (`updated_at` maintenu par le
trigger `set_updated_at` sur les tables mutables ; tables-journal en
`created_at` seul) · statuts/catégories en **ENUM** · index explicites sur les
FK et les colonnes de filtrage/tri.

### ENUMs

`user_role`, `cliente_status`, `pilier_status`, `validation_decision`,
`asset_type`, `wardrobe_category`, `tri_decision`, `tri_criterion`,
`morpho_type`, `consent_scope` (brief) + `word_slot`, `notification_type`
(améliorations §1) + `slot_status`, `booking_status` (module RDV, mig. `008`)
+ `application_status` (module candidatures, mig. `009`) — **15 ENUMs** au total.

---

## 6. Règles métier en base

### 6.1 Gate de validation séquentielle

Le trigger `enforce_pilier_gate` (sur `piliers`) **interdit qu'un pilier
passe `in_progress` tant que le pilier précédent n'est pas `validated`**
(sauf le pilier 1). La boucle `needs_revision → in_progress` (re-travail du
même pilier) reste autorisée, car le pilier précédent est, lui, déjà validé.

La vue **`pending_validations`** est la **file d'attente du dashboard coach** :
tous les piliers `submitted`, triés par `submitted_at` **croissant** (plus
ancien d'abord).

```sql
SELECT * FROM pending_validations;
```

### 6.2 Avancement (fonctions)

| Fonction | Effet |
| --- | --- |
| `submit_pilier(pilier_id)` | `in_progress`/`needs_revision` → `submitted`, fixe `submitted_at`. |
| `validate_pilier(pilier_id, coach_id, decision, comment)` | Vérifie que `coach_id` est une coach **et** que le pilier est `submitted` ; (pilier 1) exige les 3 mots ; **écrit une ligne `validations`** ; puis `validated` (+`validated_at`, **débloque le pilier suivant** en `in_progress`) ou `needs_revision`. |

```sql
-- Exemple : la coach valide le pilier soumis
SELECT validate_pilier('<pilier_uuid>', '<coach_uuid>', 'validated', 'Parfait, on continue.');
```

### 6.3 Cycle d'un pilier

```
locked ──(pilier préc. validé)──▶ in_progress ──submit──▶ submitted
                                       ▲                      │
                                       │                 validate_pilier
                                       │                 ┌────┴─────┐
                                  needs_revision ◀───────┘          ▼
                                                              validated ──▶ (débloque pilier suivant)
```

---

## 7. Module prise de rendez-vous (appel découverte) — migration `008`

Page **publique** (sans compte) pour réserver un appel découverte. L'admin
(Justine) ouvre/ferme des créneaux ; le public ne voit que les créneaux
libres, les autres apparaissent **grisés**, et **aucune donnée personnelle
d'autrui n'est visible**. Les réservants sont des **prospects** (pas des
clientes) → **tables séparées**.

### 7.1 Tables

- **`availability_slots`** — créneaux datés discrets gérés par l'admin
  (`status` = `available` / `booked` / `blocked`). `admin_note` n'est
  **jamais** exposée au public. Ouvrir/fermer un créneau = simple
  `INSERT` / `UPDATE status` (rôle admin).
- **`discovery_bookings`** — réservations contenant les **données perso**
  du prospect (nom, prénom, email, téléphone, message, `consent_at`).
  `slot_id` en **`ON DELETE RESTRICT`** (on ne supprime pas un créneau
  réservé par accident). `converted_cliente_id` relie un prospect devenu
  cliente (funnel), en `ON DELETE SET NULL`.

### 7.2 Visibilité — la vue publique (le « grisé », au niveau base)

```sql
SELECT id, start_at, end_at, is_available FROM public_availability;
```

La vue **`public_availability`** n'expose **que** `id, start_at, end_at,
is_available` (= `status = 'available'`) pour les créneaux **à venir**.
**Aucune jointure** vers `discovery_bookings` → impossible de fuiter un nom.
`is_available = false` ⇒ créneau **grisé** (réservé ou fermé).

| Acteur | Lit | Voit les données perso ? |
| --- | --- | --- |
| **Public** (anonyme) | `public_availability` **uniquement** | ❌ jamais |
| **Admin** (Justine) | les 2 tables directement | ✅ qui a réservé |

> **Sécurité au niveau base (pas seulement applicatif).** Une vue s'exécute
> avec les privilèges de son **propriétaire** : un rôle à privilège minimal
> peut lire la vue **sans** accès aux tables sous-jacentes. L'isolation n'est
> **réelle** que si l'endpoint public interroge la base avec un tel rôle.
> ```sql
> -- Au DÉPLOIEMENT, créer un rôle public en lecture seule sur la vue :
> CREATE ROLE app_anon NOLOGIN;
> GRANT SELECT ON public_availability TO app_anon;
> -- ne PAS accorder SELECT sur availability_slots ni discovery_bookings :
> -- REVOKE SELECT ON availability_slots, discovery_bookings FROM app_anon;
> ```
> 👉 **L'endpoint public DOIT utiliser ce rôle `app_anon`** (et lui seul).
> Le schéma **ne crée pas de rôle** : les rôles sont spécifiques à
> l'hébergeur et gérés **hors migration**, pour rester portable IONOS.

### 7.3 Fonctions métier

| Fonction | Effet |
| --- | --- |
| `book_slot(slot_id, first_name, last_name, email, phone, message, consent_at)` | **Réservation atomique** : `SELECT … FOR UPDATE` sur le créneau, vérifie qu'il est `available` et à venir, crée la réservation `confirmed`, passe le créneau à `booked`. **Pas de race condition.** Échec clair si déjà pris (`unique_violation`) ou fermé. |
| `cancel_booking(booking_id)` | Réservation → `cancelled` et créneau **libéré** (`available`). |
| `delete_booking(booking_id)` | **Purge RGPD** d'un prospect : supprime la réservation ; libère le créneau si elle était `confirmed`. Renvoie `TRUE` si le créneau a été libéré. |

Double garde anti double-réservation : la fonction (verrou de ligne) **et**
l'**index unique partiel** `(slot_id) WHERE status='confirmed'` au niveau base.

```sql
-- Réserver (page publique) :
SELECT book_slot('<slot_uuid>', 'Camille', 'Durand', 'camille@exemple.fr',
                 '+33 6 11 22 33 44', 'Reconversion pro', now());
```

### 7.4 RGPD prospects & rétention

Les données d'un prospect sont **personnelles**. Politique par défaut
proposée (à arbitrer avec Justine) :

- **Consentement** capturé à la réservation (`consent_at`, obligatoire).
- **Rétention** : conserver une réservation `completed`/`no_show` le temps
  utile au suivi commercial (ex. **12 mois**), puis purge via
  `delete_booking()`. Purge **immédiate** sur demande du prospect.
- Supprimer une **cliente** (`delete_cliente`) **ne purge pas** son ancienne
  réservation prospect (lien `converted_cliente_id` simplement mis à `NULL`,
  tables séparées) : pour un effacement total de la personne, appeler **aussi**
  `delete_booking()` sur les réservations liées.

### 7.5 Limite connue / évolution

- **Récurrence non gérée** : un créneau = un slot daté unique. Pas de règle
  « tous les mardis 10h ». À ajouter plus tard (table de règles + génération
  de slots) si le besoin se confirme.

---

## 8. Module candidatures (« Rejoins la liste d'attente ») — migration `009`

Reproduit, en **page publique** hébergée par l'app (et non plus Google
Forms), le questionnaire de candidature de Justine (13 questions, toutes
obligatoires). Toute candidature est consultable **dans l'admin**. Le
candidat est un **prospect** ; Justine **sélectionne** ensuite.

**Pourquoi sortir de Google Forms** : données hébergées **en EU** (RGPD)
au lieu de chez Google, **admin unifié**, et la candidature **alimente le
funnel d'onboarding** (les « 3 mots » préfigurent le Pilier 01).

> Le texte d'accroche (« Ce coaching est fait pour toi si… le problème ce
> n'est pas toi, c'est que ton dressing n'a pas évolué avec la femme que
> tu es devenue. ») est une **copie statique du front** : non stockée en
> base (ce n'est pas une donnée par candidature).

### 8.1 Table `applications` & mapping des 13 questions

Table **unique**, autonome (comme `discovery_bookings`). **Pas de vue
publique** : contrairement au RDV, une candidate ne voit jamais les
autres — elle remplit et soumet, point. **Seul l'admin lit** les soumissions.

| # | Question | Colonne |
| --- | --- | --- |
| 1 | Nom & Prénom | `full_name` |
| 2 | Ton insta | `instagram` |
| 3 | Ton email | `email` |
| 4 | Ta date de naissance | `birth_date` |
| 5 | Profession | `profession` |
| 6 | Qu'est-ce qui t'a donné envie de candidater ? | `motivation` |
| 7 | Comment définirais-tu ton image actuelle ? | `current_image` |
| 8 | Qu'espères-tu ressentir / incarner / accomplir ? | `goal` |
| 9 | 3 mots qui te décrivent aujourd'hui | `words_today` |
| 10 | 3 mots de la version à incarner | `words_to_embody` |
| 11 | Qu'est-ce qui te freine le plus ? | `main_blocker` |
| 12 | Pourquoi maintenant, et pas dans 6 mois ? | `why_now` |
| 13 | À quel point es-tu prête à t'engager ? | `commitment_level` |

> `commitment_level` est stocké en **texte** (le formulaire est en réponse
> libre). Il pourra devenir une **échelle 1–10** si Justine préfère — à
> arbitrer.

### 8.2 Flux public → admin (triage)

`status` (enum `application_status`) : **`new` → `reviewing` → `selected`
→ `converted`** (ou **`rejected`**). Index `(status, created_at DESC)` :
les nouvelles candidatures d'abord dans la liste de triage admin.

| Acteur | Action |
| --- | --- |
| **Public** | `INSERT` d'une candidature (`status` par défaut `new`, `consent_at` obligatoire). |
| **Admin** | Lit/trie ; passe le statut ; convertit une candidate retenue. |

### 8.3 Conversion en cliente

`convert_application_to_cliente(application_id)` crée le compte `users`
(rôle `cliente`, mot de passe **sentinel `!invite_pending`** → l'app
déclenche une invitation / définition de mot de passe) **+** le profil
`clientes` (pré-rempli : prénom/nom découpés de `full_name`, **`birth_date`
copiée** de la candidature), marque la candidature `converted` et la relie. L'insertion
de la cliente **crée automatiquement ses 4 piliers** (pilier 1 `in_progress`).

> ⚠️ **Le Pilier 01 garde son propre flux de validation.** La fonction
> **n'écrit pas** les 3 mots validés (`clientes.word_*` restent `NULL`).
> `words_today` / `words_to_embody` sont un **signal pour la coach**,
> conservés sur la candidature comme **référence** — pré-remplissage
> proposé seulement, jamais injecté comme « mots validés ».

Garde-fous : refus si déjà convertie, si rejetée, ou si l'email est déjà
utilisé ; `CHECK` de cohérence : **un lien `converted_cliente_id` implique
`status='converted'`** (contrainte assouplie en `011` pour autoriser l'état
post-effacement RGPD — lien nulé alors que la candidature reste convertie ;
cf. §11).

```sql
SELECT * FROM convert_application_to_cliente('<application_uuid>');
```

### 8.4 RGPD prospects & rétention

Données **personnelles** → `consent_at` capturé à la soumission ;
`delete_application(application_id)` purge la candidature. Rétention
proposée : conserver une candidature `rejected` un délai court (ex. **6
mois**) pour traçabilité du choix, puis purge ; purge **immédiate** sur
demande. Supprimer la **cliente** convertie (`delete_cliente`) **ne purge
pas** sa candidature d'origine (cycles séparés) : pour un effacement total,
appeler **aussi** `delete_application()` — ou, plus simplement,
**`forget_person(email)`** qui couvre les trois surfaces d'un coup (§11).

---

## 9. Module messagerie (temps réel) — table `messages` (006) enrichie en `010`

Un **fil = une cliente** (chaque cliente ne parle qu'à l'unique coach). La
table `messages` existait déjà (006) ; la migration `010` l'enrichit, **sans
la recréer**.

### 9.1 Accusés, édition, soft delete

| Colonne | Rôle |
| --- | --- |
| `delivered_at` | **Accusé de remise** (message arrivé). |
| `read_at` | **Accusé de lecture** (distinct de la remise). |
| `edited_at` | Date de dernière édition du contenu. |
| `deleted_at` | **Soft delete** : masque le message **sans casser l'historique** du fil. |
| `updated_at` | Maintenu par `set_updated_at` (cohérence schéma). |

### 9.2 Pièces jointes

`message_attachments` (N-N `messages ↔ assets`) : une cliente envoie une
photo dans le chat (« est-ce que ce haut me va ? »). On **réutilise `assets`**
→ le **consentement** et l'**hébergement EU** déjà en place s'appliquent.

### 9.3 Index

- `messages (cliente_id, created_at)` — charger un fil rapidement (remplace
  l'index simple sur `cliente_id` de 006, devenu redondant).
- `messages (cliente_id) WHERE read_at IS NULL AND deleted_at IS NULL` —
  **compteur de non-lus** efficace (index partiel ; on exclut aussi les
  messages soft-deleted, raffinement vs spec).

### 9.4 Temps réel — `pg_notify` (natif, portable IONOS)

Un trigger **`AFTER INSERT`** sur `messages` émet :

```
pg_notify('new_message', '{"id":…,"cliente_id":…,"sender_role":…,"created_at":…}')
```

L'application s'abonne via **`LISTEN new_message`** et pousse le message au
bon destinataire (WebSocket navigateur). **La base ne « fait » pas le temps
réel — elle le déclenche** ; le transport (WebSocket) est la couche appli,
hors BDD. Mécanisme **natif PostgreSQL**, sans dépendance externe, portable
IONOS.

```text
INSERT message ──▶ trigger ──▶ pg_notify('new_message', payload)
                                      │
   backend  LISTEN new_message  ◀─────┘   ──▶  WebSocket ──▶ navigateur
```

> **RGPD** : `messages` et `message_attachments` cascadent depuis `clientes`
> → déjà couverts par `delete_cliente()` / `forget_person()` (§11). Vérifié :
> 0 message / 0 pièce jointe orphelins après suppression.

---

## 10. Sécurité des comptes & mots de passe — migration `012`

### 10.1 Règle non négociable

La base **ne stocke que le hash** (`password_hash`), **jamais** le mot de
passe en clair. Le **hachage (bcrypt/argon2) est fait côté application** : les
fonctions ci-dessous reçoivent un **hash**, pas un mot de passe.

> 🔒 **Confidentialité** : `password_hash` ne doit **jamais** apparaître dans
> les logs, les exports, ni dans une **vue exposée**. Aucune vue du schéma ne
> le sélectionne (vérifié). Toute vue d'administration (`last_login_at`, etc.)
> doit **exclure** explicitement `password_hash`.

### 10.2 Flux

1. **L'admin crée le compte** (`create_cliente_account`) : mot de passe
   initial **temporaire** → `must_change_password = true`.
2. **1re connexion** : tant que `must_change_password = true`, **l'app force**
   l'écran « changer mon mot de passe » (forçage **côté application** ; la base
   porte seulement le drapeau). La cliente appelle `change_own_password`
   → `must_change_password = false`, `password_changed_at = now()`.
3. **Reset admin** (`admin_reset_cliente_password`) : nouveau hash temporaire
   → `must_change_password` repasse à `true`. (`password_changed_at` **n'est
   pas** modifié : il reflète le dernier changement par l'utilisateur lui-même.)

### 10.3 Fonctions

| Fonction | Effet |
| --- | --- |
| `create_cliente_account(email, password_hash, first_name, last_name, …)` | Crée `users` (role cliente, `must_change_password=true`) **+** `clientes` (→ 4 piliers auto-créés). Renvoie l'`id` cliente. Échec propre si l'email existe. |
| `change_own_password(user_id, new_password_hash)` | `password_hash` ← nouveau ; `must_change_password=false` ; `password_changed_at=now()`. |
| `admin_reset_cliente_password(cliente_id, new_password_hash)` | Hash temporaire ; `must_change_password=true` ; `password_changed_at` inchangé. |

```sql
-- L'app hache AVANT d'appeler (jamais de clair en base) :
SELECT create_cliente_account('cliente@exemple.fr', '<bcrypt_hash>', 'Prénom', 'Nom');
```

> **Cohérence (mig. `012`)** : `convert_application_to_cliente` a été redéfinie
> (forward) pour poser aussi `must_change_password=true` sur le compte sentinel
> d'une candidate convertie — elle devra définir son mot de passe via le flux
> d'invitation. (`009` reste inchangé.)

> **Évolution possible (hors périmètre)** : un « mot de passe oublié » en
> self-service (lien par email) nécessiterait une table `password_reset_tokens`
> (token, expiration, usage unique). Ici la demande = **reset par l'admin**,
> donc non nécessaire pour l'instant.

---

## 11. RGPD — Droit à l'oubli

Toutes les FK partant d'une cliente sont en **`ON DELETE CASCADE`** : la
suppression est câblée **dans le schéma**.

### 11.1 `delete_cliente(cliente_id)`

1. **Retourne d'abord la liste des `storage_url`** de tous les assets de la
   cliente (capturée **avant** suppression).
2. **Supprime le compte `users` lié** → cascade sur `clientes` et **tout** son
   contenu (assets, piliers, **messages + pièces jointes**, …), **et** sur ses
   `notifications` (rattachées à l'utilisateur).

> ⚠️ **La base ne peut pas effacer les fichiers de l'object storage.** Les URL
> renvoyées sont la **liste de purge** que l'appelant (backend) doit supprimer
> côté Supabase / IONOS S3.

```sql
-- Renvoie les URL à purger, puis efface toutes les données en base :
SELECT * FROM delete_cliente('11111111-1111-1111-1111-111111111111');
```

### 11.2 `forget_person(email)` — effacement complet inter-modules

Une même personne peut exister sur **trois surfaces** : cliente, prospect RDV
(`discovery_bookings`), prospect candidature (`applications`).
**`forget_person(email)`** efface les trois d'un coup (en réutilisant
`delete_cliente` + `delete_booking` + `delete_application`), **purge aussi les
notifications nominatives** (cf. ci-dessous) et **retourne les `storage_url`**
à purger. Tolérant aux emails inconnus (ensemble vide, pas d'erreur). Le compte
**coach n'est jamais touché**.

```sql
SELECT * FROM forget_person('lea.martin@example.test');
```

> **Notifications nominatives (correctif mig. `013`).** Une notification
> reçue par la **coach** (« Cliente X a soumis le pilier 2 ») a `recipient_id`
> = la coach → elle **ne cascade pas** avec la cliente, mais son `payload`
> contient le nom/l'id de la personne → **résidu de données personnelles**.
> **Convention** : toute notification concernant une cliente **doit** porter
> son id dans `payload->>'cliente_id'`. `forget_person` capture le
> `cliente_id` **avant** la suppression, puis exécute :
> ```sql
> DELETE FROM notifications WHERE payload->>'cliente_id' = <cliente_id>::text;
> ```

> **Correctif de robustesse (mig. `011`)** : la suppression d'une **cliente
> convertie** était bloquée par une contrainte `CHECK` bidirectionnelle de
> `009` (le `ON DELETE SET NULL` sur `applications.converted_cliente_id`
> laissait une candidature `converted` sans lien → violation). La contrainte a
> été **assouplie** (un lien implique `converted`, l'inverse n'est plus exigé)
> pour autoriser l'état post-effacement. Découvert et corrigé via les tests.

> **Résiduel (dépend de la convention)** : seules les notifications respectant
> la convention (`payload.cliente_id`) sont purgées. Une notification qui
> mentionnerait une personne **sans** ce champ échapperait à la purge →
> l'application doit **toujours** renseigner `payload.cliente_id` (la convention
> est rappelée dans le `COMMENT` de `notifications.payload`).

---

## 12. Structure du dossier

```
db/
├── docker-compose.yml          # Postgres 16 local (port hôte 5433)
├── .env.example                # variables pour docker-compose
├── migrations/
│   ├── 001_extensions.sql      # pgcrypto + citext
│   ├── 002_enums.sql           # 12 ENUMs (+ 2 dans 008, +1 dans 009)
│   ├── 003_functions_triggers.sql   # set_updated_at()
│   ├── 004_tables_core.sql     # users, clientes, piliers, validations
│   ├── 005_tables_content.sql  # consents, assets, pieces, looks, profils, moodboards, notifications
│   ├── 006_tables_messaging.sql# messages (fil cliente↔coach)
│   ├── 007_views_functions_metier.sql  # gate, auto-piliers, submit/validate/delete, vue
│   ├── 008_booking.sql         # module RDV : slots, bookings, vue publique, book/cancel/delete
│   ├── 009_applications.sql    # module candidatures : applications, convert/delete
│   ├── 010_messaging.sql       # messagerie enrichie : accusés, soft delete, pièces jointes, NOTIFY
│   ├── 011_rgpd_forget_person.sql  # RGPD : correctif CHECK + forget_person(email) inter-modules
│   ├── 012_passwords.sql       # cycle mot de passe : create/change/reset, must_change_password
│   └── 013_corrections.sql     # revue : notifs RGPD, age→birth_date, index redondant
├── seed.sql                    # 2 clientes (états mot de passe) + 4 piliers + RDV + candidatures + messagerie
├── schema.sql                  # schéma consolidé (généré par pg_dump)
├── run.sh                      # applique migrations + seed
└── README.md
```

---

## 13. Jeu de démonstration (`seed.sql`)

Cliente **Léa Martin** (coach **Justine**). Le parcours est rejoué **via les
fonctions métier** — charger le seed sans erreur prouve que le gate et
l'avancement fonctionnent. État final :

| Pilier | Statut | Contenu |
| --- | --- | --- |
| 1 — Identité | `validated` | 3 mots (Authentique / Lumineuse / Affirmée) + moodboard |
| 2 — Mise en valeur | `validated` | colorimétrie + morphologie ; historique `needs_revision` **puis** `validated` (2 décisions) |
| 3 — Tri | `validated` | pièces gardées / sortie (avec critère) |
| 4 — Construction | `submitted` | basiques / personnalité / dopamine + 1 look → **visible dans `pending_validations`** |

**Module RDV** : 5 créneaux (2 libres, 1 réservé via `book_slot`, 1 `blocked`,
1 passé) + 1 réservation prospect **Camille Durand**. Permet de vérifier que
`public_availability` masque le créneau réservé (grisé) **sans** exposer le nom.

**Module candidatures** : 3 candidatures de démo — **Sophie Bernard** (`new`),
**Inès Morel** (`selected`), **Léa Martin** (`converted`, reliée à la cliente
démo) — pour tester la liste de triage et la conversion en cliente.

**Module messagerie** : échange entre Léa et la coach — un message **lu**, un
message **non lu avec pièce jointe** (photo dans le chat) — pour tester le
compteur de non-lus et les pièces jointes.

**Comptes & mots de passe** : **Léa** est créée via `create_cliente_account`
→ `must_change_password = true` (mot de passe initial à changer à la 1re
connexion) ; une 2ᵉ cliente **Manon Petit** a déjà changé le sien
(`must_change_password = false` + `password_changed_at` renseigné).

---

## 14. Critères d'acceptation — vérifiés

| # | Critère | Statut |
| --- | --- | --- |
| 1 | `run.sh` applique migrations + seed sur base vierge sans erreur | ✅ |
| 2 | Rejeu : idempotent via ledger ; rejeu brut **échoue proprement**, sans corruption | ✅ |
| 3 | `pending_validations` renvoie les piliers `submitted` triés par ancienneté | ✅ |
| 4 | `validate_pilier(..., 'validated', ...)` débloque le pilier suivant | ✅ |
| 5 | `delete_cliente()` renvoie les `storage_url` puis efface en cascade (aucun orphelin) | ✅ |
| 6 | Toutes les tables **et** colonnes ont un `COMMENT ON` en français | ✅ (20 tables, 2 vues) |

### Module RDV (migration `008`) — vérifié aussi

| Critère | Statut |
| --- | --- |
| `public_availability` ne contient **aucune** colonne nom/email/contact | ✅ (4 colonnes : `id, start_at, end_at, is_available`) |
| `book_slot()` sur un créneau déjà pris **échoue proprement** | ✅ (`unique_violation`) + index unique partiel en garde-fou |
| `book_slot()` sur un créneau `blocked` est refusé | ✅ |
| `ON DELETE RESTRICT` empêche de supprimer un créneau réservé | ✅ |
| `cancel_booking()` / `delete_booking()` libèrent le créneau | ✅ |

### Module candidatures (migration `009`) — vérifié aussi

| Critère | Statut |
| --- | --- |
| Une candidature insérée est lisible en base (admin) | ✅ |
| `convert_application_to_cliente()` crée un compte cliente cohérent (+ 4 piliers) et passe la candidature à `converted` | ✅ |
| La conversion **n'écrit pas** les 3 mots du Pilier 01 (`clientes.word_*` restent `NULL`) | ✅ |
| Garde-fous : double conversion / email déjà utilisé refusés ; `CHECK` lien ↔ statut cohérent | ✅ |
| `delete_application()` purge un prospect | ✅ |

### Module messagerie + RGPD inter-modules (migrations `010`–`011`) — vérifié aussi

| Critère | Statut |
| --- | --- |
| `INSERT` d'un message émet le `pg_notify('new_message', …)` (payload id/cliente/role) | ✅ (reçu via `LISTEN`) |
| Compteur de non-lus via l'index partiel correct | ✅ |
| `delete_cliente()` purge `messages` **et** `message_attachments` (0 orphelin) | ✅ |
| `forget_person(email)` efface les **3 surfaces** (cliente + RDV + candidature) et renvoie les URL | ✅ |
| Suppression d'une **cliente convertie** possible (correctif `CHECK` mig. `011`) | ✅ |

### Module mots de passe (migration `012`) — vérifié aussi

| Critère | Statut |
| --- | --- |
| `create_cliente_account()` → `must_change_password=true` (+ 4 piliers) ; email dupliqué refusé | ✅ |
| `change_own_password()` → `must_change_password=false` + `password_changed_at` renseigné | ✅ |
| `admin_reset_cliente_password()` → `must_change_password=true`, `password_changed_at` **inchangé** | ✅ |
| Conversion candidature → compte aussi `must_change_password=true` | ✅ |
| **Aucune vue n'expose `password_hash`** | ✅ (0 colonne `password*` dans les vues) |

### Correctifs de revue (migration `013`) — vérifié aussi

| Critère | Statut |
| --- | --- |
| La migration s'applique sur la base existante ; rejeu = 0 (ledger) | ✅ (013 aussi replay-safe) |
| Après `forget_person('<email>')` : 0 notification `payload.cliente_id`, et cliente/bookings/applications vides | ✅ (2 notifs nominatives → 0) |
| `clientes` n'a plus de colonne `age` ; `birth_date` présent ; `create_cliente_account(…, DATE …)` et `convert…` renseignent `birth_date` | ✅ |
| `birth_date` future refusée (trigger) ; < 1900 refusée (`CHECK`) | ✅ |
| `idx_messages_created_at` supprimé ; `idx_messages_cliente_created` + `idx_messages_unread` conservés | ✅ |
| Tests précédents (gate, `validate_pilier`, `delete_cliente`, `book_slot`, `pending_validations`) passent toujours | ✅ |

Régénérer `schema.sql` après une migration :

```bash
pg_dump -d image_coaching --schema-only --no-owner --no-privileges -T schema_migrations > schema.sql
```
