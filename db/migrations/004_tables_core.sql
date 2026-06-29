-- =====================================================================
-- 004_tables_core.sql
-- ---------------------------------------------------------------------
-- Tables coeur : users, clientes, piliers, validations.
-- Inclut : triggers updated_at, index sur FK et colonnes de filtrage,
-- contraintes CHECK/UNIQUE, et COMMENT ON (FR) sur tables + colonnes.
-- =====================================================================

-- =====================================================================
-- users — comptes de connexion (cliente ou coach)
-- =====================================================================
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role          user_role   NOT NULL,
    email         citext      NOT NULL UNIQUE,
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_format_chk CHECK (position('@' IN email) > 1),
    CONSTRAINT users_password_hash_not_empty_chk CHECK (length(password_hash) > 0)
);

CREATE INDEX idx_users_role ON users (role);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  users               IS 'Comptes de connexion de l''application. Deux rôles possibles : cliente ou coach (admin).';
COMMENT ON COLUMN users.id            IS 'Identifiant technique du compte (UUID).';
COMMENT ON COLUMN users.role          IS 'Rôle du compte : cliente ou coach.';
COMMENT ON COLUMN users.email         IS 'Email de connexion, insensible à la casse (citext), unique.';
COMMENT ON COLUMN users.password_hash IS 'Hash du mot de passe (jamais stocké en clair). Le hachage est réalisé côté application.';
COMMENT ON COLUMN users.created_at    IS 'Date de création du compte.';
COMMENT ON COLUMN users.updated_at    IS 'Date de dernière modification (maintenue par trigger set_updated_at).';

-- =====================================================================
-- clientes — profil d'une cliente, lié 1-1 à un compte users (rôle cliente)
-- =====================================================================
CREATE TABLE clientes (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name               text NOT NULL,
    last_name                text NOT NULL,
    age                      integer,
    city                     text,
    situation                text,
    status                   cliente_status NOT NULL DEFAULT 'onboarding',
    accompaniment_start_date date,
    accompaniment_end_date   date,
    -- Les 3 mots-boussole (pilier 1). Nullables tant que le pilier 1
    -- n'est pas validé ; leur présence est exigée par validate_pilier()
    -- au moment de valider le pilier 1.
    word_who_she_is          text,
    word_what_she_likes      text,
    word_to_embody           text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT clientes_age_chk
        CHECK (age IS NULL OR age BETWEEN 16 AND 120),
    CONSTRAINT clientes_dates_chk
        CHECK (accompaniment_end_date IS NULL
            OR accompaniment_start_date IS NULL
            OR accompaniment_end_date >= accompaniment_start_date)
);

-- user_id est déjà couvert par la contrainte UNIQUE (index implicite).
CREATE INDEX idx_clientes_status ON clientes (status);

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Garde-fou d'intégrité : le compte lié doit avoir le rôle 'cliente'.
-- (Impossible à exprimer en CHECK car nécessite une sous-requête.)
CREATE OR REPLACE FUNCTION enforce_cliente_user_is_cliente()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.user_id;
  IF v_role IS DISTINCT FROM 'cliente' THEN
    RAISE EXCEPTION 'Le compte % doit avoir le rôle cliente (rôle trouvé : %).',
      NEW.user_id, COALESCE(v_role::text, 'inexistant')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION enforce_cliente_user_is_cliente() IS 'Trigger : garantit qu''une ligne clientes pointe vers un compte users de rôle cliente.';

CREATE TRIGGER trg_clientes_user_role
    BEFORE INSERT OR UPDATE OF user_id ON clientes
    FOR EACH ROW EXECUTE FUNCTION enforce_cliente_user_is_cliente();

COMMENT ON TABLE  clientes                          IS 'Profil d''une cliente accompagnée. Relation 1-1 avec un compte users de rôle cliente.';
COMMENT ON COLUMN clientes.id                       IS 'Identifiant technique de la cliente (UUID).';
COMMENT ON COLUMN clientes.user_id                  IS 'Compte de connexion associé (unique). ON DELETE CASCADE : supprimer le compte supprime la cliente et toutes ses données (droit à l''oubli).';
COMMENT ON COLUMN clientes.first_name               IS 'Prénom de la cliente.';
COMMENT ON COLUMN clientes.last_name                IS 'Nom de la cliente.';
COMMENT ON COLUMN clientes.age                      IS 'Âge de la cliente (16 à 120), optionnel.';
COMMENT ON COLUMN clientes.city                     IS 'Ville de la cliente, optionnel.';
COMMENT ON COLUMN clientes.situation                IS 'Situation / contexte de vie déclaré, optionnel.';
COMMENT ON COLUMN clientes.status                   IS 'Statut global de l''accompagnement (onboarding, in_progress, completed, archived).';
COMMENT ON COLUMN clientes.accompaniment_start_date IS 'Date de début d''accompagnement, optionnelle.';
COMMENT ON COLUMN clientes.accompaniment_end_date   IS 'Date de fin d''accompagnement, optionnelle (>= date de début).';
COMMENT ON COLUMN clientes.word_who_she_is          IS 'Mot-boussole 1 : qui elle est. Nullable tant que le pilier 1 n''est pas validé.';
COMMENT ON COLUMN clientes.word_what_she_likes      IS 'Mot-boussole 2 : ce qu''elle aime. Nullable tant que le pilier 1 n''est pas validé.';
COMMENT ON COLUMN clientes.word_to_embody           IS 'Mot-boussole 3 : qui elle veut incarner. Nullable tant que le pilier 1 n''est pas validé.';
COMMENT ON COLUMN clientes.created_at               IS 'Date de création du profil.';
COMMENT ON COLUMN clientes.updated_at               IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- piliers — avancement des 4 piliers séquentiels d'une cliente
-- =====================================================================
CREATE TABLE piliers (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id   uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    numero       smallint NOT NULL,
    status       pilier_status NOT NULL DEFAULT 'locked',
    submitted_at timestamptz,
    validated_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT piliers_numero_chk        CHECK (numero BETWEEN 1 AND 4),
    CONSTRAINT piliers_cliente_numero_uk UNIQUE (cliente_id, numero)
);

CREATE INDEX idx_piliers_cliente_id   ON piliers (cliente_id);
CREATE INDEX idx_piliers_status       ON piliers (status);
CREATE INDEX idx_piliers_submitted_at ON piliers (submitted_at);

CREATE TRIGGER trg_piliers_updated_at
    BEFORE UPDATE ON piliers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  piliers              IS 'Avancement d''un pilier (1 à 4) pour une cliente. Les 4 piliers sont créés automatiquement à l''insertion de la cliente (cf. 007).';
COMMENT ON COLUMN piliers.id           IS 'Identifiant technique du pilier (UUID).';
COMMENT ON COLUMN piliers.cliente_id   IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN piliers.numero       IS 'Numéro de pilier : 1 (Identité), 2 (Mise en valeur), 3 (Tri), 4 (Construction).';
COMMENT ON COLUMN piliers.status       IS 'Statut du pilier. Défaut locked ; le pilier 1 démarre in_progress.';
COMMENT ON COLUMN piliers.submitted_at IS 'Date de soumission à la coach (renseignée par submit_pilier).';
COMMENT ON COLUMN piliers.validated_at IS 'Date de validation par la coach (renseignée par validate_pilier).';
COMMENT ON COLUMN piliers.created_at   IS 'Date de création de la ligne pilier.';
COMMENT ON COLUMN piliers.updated_at   IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- validations — historique (journal) des décisions de la coach
-- =====================================================================
-- Table append-only (journal d'audit) : pas de updated_at, seulement
-- created_at. Chaque soumission peut générer plusieurs lignes au fil
-- des allers-retours needs_revision -> validated.
CREATE TABLE validations (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pilier_id  uuid NOT NULL REFERENCES piliers(id) ON DELETE CASCADE,
    coach_id   uuid NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
    decision   validation_decision NOT NULL,
    comment    text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_validations_pilier_id  ON validations (pilier_id);
CREATE INDEX idx_validations_coach_id   ON validations (coach_id);
CREATE INDEX idx_validations_created_at ON validations (created_at);

COMMENT ON TABLE  validations            IS 'Journal des décisions de la coach sur les piliers soumis (audit, non modifiable).';
COMMENT ON COLUMN validations.id         IS 'Identifiant technique de la décision (UUID).';
COMMENT ON COLUMN validations.pilier_id  IS 'Pilier concerné. ON DELETE CASCADE (suit la cliente).';
COMMENT ON COLUMN validations.coach_id   IS 'Coach auteur de la décision. ON DELETE RESTRICT : on n''efface pas une coach qui a un historique de validations.';
COMMENT ON COLUMN validations.decision   IS 'Décision : validated ou needs_revision.';
COMMENT ON COLUMN validations.comment    IS 'Commentaire / consigne de la coach, optionnel.';
COMMENT ON COLUMN validations.created_at IS 'Horodatage de la décision.';
