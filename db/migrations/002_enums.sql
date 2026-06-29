-- =====================================================================
-- 002_enums.sql
-- ---------------------------------------------------------------------
-- Tous les statuts / catégories du domaine sont des ENUM PostgreSQL
-- (jamais de texte libre), conformément aux conventions du projet.
--
-- Comportement de rejeu : CREATE TYPE ne supporte pas IF NOT EXISTS,
-- donc un rejeu brut de cette migration échoue proprement
-- (« type ... already exists ») sans corruption. L'orchestration par
-- run.sh (table schema_migrations) évite tout rejeu involontaire.
-- =====================================================================

-- Rôle d'un compte utilisateur.
CREATE TYPE user_role AS ENUM ('cliente', 'coach');
COMMENT ON TYPE user_role IS 'Rôle d''un compte : cliente ou coach (admin unique du métier).';

-- Cycle de vie de l'accompagnement d'une cliente.
CREATE TYPE cliente_status AS ENUM ('onboarding', 'in_progress', 'completed', 'archived');
COMMENT ON TYPE cliente_status IS 'Statut global de l''accompagnement : onboarding, in_progress, completed, archived.';

-- Statut d'un pilier dans la méthode en 4 étapes.
CREATE TYPE pilier_status AS ENUM ('locked', 'in_progress', 'submitted', 'validated', 'needs_revision');
COMMENT ON TYPE pilier_status IS 'Avancement d''un pilier : locked (verrouillé), in_progress, submitted (soumis à la coach), validated, needs_revision (corrections demandées).';

-- Décision de la coach lors d'une validation.
CREATE TYPE validation_decision AS ENUM ('validated', 'needs_revision');
COMMENT ON TYPE validation_decision IS 'Décision de la coach sur un pilier soumis : validated ou needs_revision.';

-- Nature d'un asset (image stockée hors base, on ne garde que l'URL).
CREATE TYPE asset_type AS ENUM ('piece_photo', 'moodboard', 'look', 'colorimetrie', 'morphologie', 'other');
COMMENT ON TYPE asset_type IS 'Nature d''un asset image : photo de pièce, moodboard, look, planche colorimétrie/morphologie, autre.';

-- Catégorie de garde-robe (pilier 4 — Construction).
CREATE TYPE wardrobe_category AS ENUM ('basique', 'personnalite', 'dopamine');
COMMENT ON TYPE wardrobe_category IS 'Catégorie de pièce dans la nouvelle garde-robe : basique, personnalité, dopamine.';

-- Décision de tri d'une pièce (pilier 3 — Tri).
CREATE TYPE tri_decision AS ENUM ('garder', 'sortir');
COMMENT ON TYPE tri_decision IS 'Résultat du tri guidé d''une pièce : garder ou sortir.';

-- Critère de sortie d'une pièce (pilier 3 — Tri).
CREATE TYPE tri_criterion AS ENUM ('plus_physique', 'plus_correspond', 'plus_aligne');
COMMENT ON TYPE tri_criterion IS 'Critère de sortie : ne va plus physiquement (plus_physique), ne correspond plus (plus_correspond), plus alignée avec qui elle veut être (plus_aligne).';

-- Type de morphologie / silhouette (pilier 2 — Mise en valeur).
CREATE TYPE morpho_type AS ENUM ('H', 'X', 'A', 'V', 'O', '8');
COMMENT ON TYPE morpho_type IS 'Type de silhouette : H, X, A, V, O ou 8.';

-- Périmètre d'un consentement RGPD.
CREATE TYPE consent_scope AS ENUM ('photos', 'traitement_donnees');
COMMENT ON TYPE consent_scope IS 'Périmètre d''un consentement RGPD : photos (données sensibles) ou traitement_donnees.';

-- ---------------------------------------------------------------------
-- Améliorations proposées (hors liste stricte du brief, signalées) :
-- ---------------------------------------------------------------------

-- Rattachement d'une pièce à l'un des 3 mots-boussole. On référence le
-- SLOT (qui elle est / ce qu'elle aime / qui elle veut incarner) plutôt
-- que la valeur texte du mot, pour rester robuste si la cliente modifie
-- le libellé d'un mot. (Le brief évoquait un champ "linked_word".)
CREATE TYPE word_slot AS ENUM ('who_she_is', 'what_she_likes', 'to_embody');
COMMENT ON TYPE word_slot IS 'Slot des 3 mots-boussole : who_she_is, what_she_likes, to_embody. Utilisé pour rattacher une pièce à un mot sans dépendre de son libellé.';

-- Type d'une notification. Le brief laissait "type" libre ; on le borne
-- en ENUM pour respecter la règle « catégories en ENUM ».
CREATE TYPE notification_type AS ENUM ('pilier_submitted', 'pilier_validated', 'pilier_needs_revision', 'message_received', 'system');
COMMENT ON TYPE notification_type IS 'Type de notification applicative : pilier_submitted, pilier_validated, pilier_needs_revision, message_received, system.';
