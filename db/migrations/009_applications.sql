-- =====================================================================
-- 009_applications.sql   (MODULE CANDIDATURES — « Rejoins la liste d'attente »)
-- ---------------------------------------------------------------------
-- Reproduit, en page publique hébergée par l'app (et non plus Google
-- Forms), le questionnaire de candidature de Justine. Toute candidature
-- soumise est consultable dans l'admin. Le candidat est un PROSPECT
-- (pas encore cliente) ; Justine sélectionne ensuite les candidates.
--
-- Intérêt vs Google Forms : données hébergées en EU (RGPD), admin
-- unifié, et la candidature alimente le funnel d'onboarding (les « 3
-- mots » de la candidature préfigurent le Pilier 01).
--
-- Différence avec le module RDV : PAS de vue publique « grisée ». Une
-- candidate ne voit jamais les autres ; elle remplit et soumet, point.
-- Seul l'admin lit les soumissions -> une seule table `applications`.
--
-- Module isolé (ENUM défini ici) pour rester modulaire. Mêmes
-- conventions que le reste du schéma.
--
-- Le texte d'accroche de la page (« Ce coaching est fait pour toi
-- si… ») est une copie statique du FRONT : il n'est pas stocké ici
-- (ce n'est pas une donnée par candidature).
--
-- Mapping des 13 questions (toutes obligatoires) -> colonnes :
--   1  Nom & Prénom .......................... full_name
--   2  Ton insta ............................. instagram
--   3  Ton email ............................. email
--   4  Ta date de naissance .................. birth_date
--   5  Profession ............................ profession
--   6  Qu'est-ce qui t'a donné envie ......... motivation
--   7  Comment définirais-tu ton image ....... current_image
--   8  Qu'espères-tu ressentir/incarner ...... goal
--   9  3 mots qui te décrivent aujourd'hui ... words_today
--   10 3 mots de la version à incarner ....... words_to_embody
--   11 Qu'est-ce qui te freine le plus ....... main_blocker
--   12 Pourquoi maintenant, pas dans 6 mois .. why_now
--   13 À quel point es-tu prête à t'engager .. commitment_level
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM de triage
-- ---------------------------------------------------------------------
CREATE TYPE application_status AS ENUM ('new', 'reviewing', 'selected', 'rejected', 'converted');
COMMENT ON TYPE application_status IS 'Statut de triage d''une candidature : new, reviewing, selected, rejected, converted.';

-- ---------------------------------------------------------------------
-- applications — candidatures (DONNÉES PERSO des prospects)
-- ---------------------------------------------------------------------
CREATE TABLE applications (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Q1..Q5 : identité
    full_name            text   NOT NULL,
    instagram            text   NOT NULL,
    email                citext NOT NULL,
    birth_date           date   NOT NULL,
    profession           text   NOT NULL,
    -- Q6..Q13 : réponses libres
    motivation           text   NOT NULL,
    current_image        text   NOT NULL,
    goal                 text   NOT NULL,
    words_today          text   NOT NULL,
    words_to_embody      text   NOT NULL,
    main_blocker         text   NOT NULL,
    why_now              text   NOT NULL,
    commitment_level     text   NOT NULL,
    -- Triage / suivi
    status               application_status NOT NULL DEFAULT 'new',
    consent_at           timestamptz NOT NULL,
    admin_notes          text,
    -- Funnel : cliente créée à partir de cette candidature (si retenue).
    converted_cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT applications_email_format_chk CHECK (position('@' IN email) > 1),
    CONSTRAINT applications_full_name_chk    CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT applications_instagram_chk    CHECK (length(btrim(instagram)) > 0),
    -- Cohérence : converted => cliente liée, et inversement.
    CONSTRAINT applications_converted_link_chk
        CHECK ((status = 'converted') = (converted_cliente_id IS NOT NULL))
);

-- Liste de triage admin : nouvelles candidatures d'abord.
CREATE INDEX idx_applications_status_created ON applications (status, created_at DESC);
CREATE INDEX idx_applications_email          ON applications (email);
CREATE INDEX idx_applications_converted      ON applications (converted_cliente_id);

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  applications                      IS 'Candidatures au coaching (questionnaire public « Rejoins la liste d''attente »). Prospects, séparés de clientes. Données perso -> purge RGPD via delete_application().';
COMMENT ON COLUMN applications.id                   IS 'Identifiant technique de la candidature (UUID).';
COMMENT ON COLUMN applications.full_name            IS 'Q1 — Nom & Prénom du candidat.';
COMMENT ON COLUMN applications.instagram            IS 'Q2 — Handle Instagram.';
COMMENT ON COLUMN applications.email                IS 'Q3 — Email (citext, insensible à la casse).';
COMMENT ON COLUMN applications.birth_date           IS 'Q4 — Date de naissance.';
COMMENT ON COLUMN applications.profession           IS 'Q5 — Profession.';
COMMENT ON COLUMN applications.motivation           IS 'Q6 — Ce qui a donné envie de candidater.';
COMMENT ON COLUMN applications.current_image        IS 'Q7 — Définition de son image actuelle.';
COMMENT ON COLUMN applications.goal                 IS 'Q8 — Ce qu''elle espère ressentir / incarner / accomplir.';
COMMENT ON COLUMN applications.words_today          IS 'Q9 — 3 mots qui la décrivent aujourd''hui (signal pour la coach, NON injecté dans le Pilier 01).';
COMMENT ON COLUMN applications.words_to_embody      IS 'Q10 — 3 mots de la version à incarner (signal pour la coach, NON injecté dans le Pilier 01).';
COMMENT ON COLUMN applications.main_blocker         IS 'Q11 — Ce qui la freine le plus.';
COMMENT ON COLUMN applications.why_now              IS 'Q12 — Pourquoi maintenant et pas dans 6 mois.';
COMMENT ON COLUMN applications.commitment_level     IS 'Q13 — Niveau d''engagement (texte libre ; pourra devenir une échelle 1–10 si Justine préfère).';
COMMENT ON COLUMN applications.status               IS 'Statut de triage (new, reviewing, selected, rejected, converted).';
COMMENT ON COLUMN applications.consent_at           IS 'Horodatage du consentement RGPD donné à la soumission (obligatoire).';
COMMENT ON COLUMN applications.admin_notes          IS 'Notes internes de l''admin. Jamais exposées au candidat.';
COMMENT ON COLUMN applications.converted_cliente_id IS 'Cliente créée à partir de cette candidature, le cas échéant. ON DELETE SET NULL.';
COMMENT ON COLUMN applications.created_at           IS 'Date de soumission de la candidature.';
COMMENT ON COLUMN applications.updated_at           IS 'Date de dernière modification (maintenue par trigger).';

-- ---------------------------------------------------------------------
-- convert_application_to_cliente(application_id)
-- Crée le compte users + le profil clientes à partir de la candidature,
-- marque la candidature « converted » et la relie à la cliente.
--
-- IMPORTANT : on NE pré-remplit PAS les 3 mots validés du Pilier 01.
-- words_today / words_to_embody restent sur la candidature comme
-- RÉFÉRENCE pour la coach ; le Pilier 01 garde son propre flux de
-- validation dans l'app (« l'IA assiste, Justine valide »).
--
-- Le mot de passe est un sentinel non connecté ('!invite_pending') :
-- l'app doit déclencher un flux d'invitation / définition de mot de passe.
-- Le découpage du nom est un PRÉ-REMPLISSAGE à vérifier par l'admin.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_application_to_cliente(p_application_id uuid)
RETURNS clientes
LANGUAGE plpgsql
AS $$
DECLARE
  v_app     applications;
  v_user_id uuid;
  v_cliente clientes;
  v_first   text;
  v_last    text;
  v_age     int;
BEGIN
  SELECT * INTO v_app FROM applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_app.status = 'converted' OR v_app.converted_cliente_id IS NOT NULL THEN
    RAISE EXCEPTION 'Candidature % déjà convertie en cliente.', p_application_id USING ERRCODE = 'unique_violation';
  END IF;
  IF v_app.status = 'rejected' THEN
    RAISE EXCEPTION 'Candidature % rejetée : la re-sélectionner avant conversion.', p_application_id USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE email = v_app.email) THEN
    RAISE EXCEPTION 'Un compte existe déjà avec l''email %.', v_app.email USING ERRCODE = 'unique_violation';
  END IF;

  -- Découpage naïf du nom (pré-remplissage, à vérifier).
  v_first := split_part(btrim(v_app.full_name), ' ', 1);
  v_last  := NULLIF(btrim(regexp_replace(btrim(v_app.full_name), '^\S+\s*', '')), '');
  IF v_last IS NULL THEN
    v_last := v_first;
  END IF;

  -- Âge dérivé, seulement si plausible (CHECK clientes 16..120).
  v_age := EXTRACT(YEAR FROM age(v_app.birth_date))::int;
  IF v_age < 16 OR v_age > 120 THEN
    v_age := NULL;
  END IF;

  INSERT INTO users (role, email, password_hash)
  VALUES ('cliente', v_app.email, '!invite_pending')
  RETURNING id INTO v_user_id;

  -- L'insertion déclenche la création automatique des 4 piliers.
  -- Les 3 mots-boussole (word_*) restent NULL : Pilier 01 garde son flux.
  INSERT INTO clientes (user_id, first_name, last_name, age, status)
  VALUES (v_user_id, v_first, v_last, v_age, 'onboarding')
  RETURNING * INTO v_cliente;

  UPDATE applications
     SET status = 'converted', converted_cliente_id = v_cliente.id
   WHERE id = p_application_id;

  RETURN v_cliente;
END;
$$;
COMMENT ON FUNCTION convert_application_to_cliente(uuid) IS 'Crée users + clientes à partir d''une candidature et la marque converted. NE pré-remplit PAS les 3 mots du Pilier 01 (référence seulement). Mot de passe sentinel à réinitialiser via invitation.';

-- ---------------------------------------------------------------------
-- delete_application(application_id) — purge RGPD d'un prospect
-- ---------------------------------------------------------------------
-- Supprime la candidature (toutes les données perso du prospect).
-- Si la candidature était convertie, le compte cliente lié SUBSISTE
-- (cycles de vie séparés) : pour effacer aussi la personne devenue
-- cliente, appeler également delete_cliente(). Cf. README (rétention).
CREATE OR REPLACE FUNCTION delete_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM applications WHERE id = p_application_id) THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = 'no_data_found';
  END IF;
  DELETE FROM applications WHERE id = p_application_id;
END;
$$;
COMMENT ON FUNCTION delete_application(uuid) IS 'Purge RGPD d''un prospect : supprime la candidature. Le compte cliente éventuellement converti subsiste (séparé) ; utiliser delete_cliente() pour l''effacer aussi.';
