-- =====================================================================
-- 013_corrections.sql   (CORRECTIFS DE REVUE)
-- ---------------------------------------------------------------------
-- Migration corrective regroupant 3 points de revue (le 4e est
-- documentaire — cf. README §7.2). Rejouable seule (IF EXISTS /
-- CREATE OR REPLACE / DROP+ADD) ; l'orchestration via le ledger
-- (run.sh / schema_migrations) garantit une seule application.
--
--   Correctif 1 — RGPD : forget_person purge aussi les notifications
--                 NOMINATIVES (reçues par la coach) référençant la
--                 personne via payload->>'cliente_id'.
--   Correctif 2 — clientes.age -> clientes.birth_date (plus robuste).
--   Correctif 3 — suppression de l'index redondant idx_messages_created_at.
--
-- ⚠️ Note PostgreSQL : un CHECK ne peut PAS contenir current_date
-- (fonction STABLE, non IMMUTABLE). Le CHECK ne porte donc que la borne
-- basse immuable (>= 1900-01-01) ; la règle « pas dans le futur » est
-- appliquée par un TRIGGER (équivalent schéma).
--
-- ⚠️ Donnée : la suppression de `age` écarte d'éventuelles valeurs
-- existantes (instantané non convertible en date fiable). birth_date est
-- nullable et renseignée par l'app/les fonctions à partir de maintenant.
-- =====================================================================

-- =====================================================================
-- CORRECTIF 2 — clientes.age -> clientes.birth_date
-- =====================================================================

-- 1. Ajout de birth_date (+ borne basse immuable en CHECK).
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS birth_date date;

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_birth_date_chk;
ALTER TABLE clientes ADD CONSTRAINT clientes_birth_date_chk
    CHECK (birth_date IS NULL OR birth_date >= DATE '1900-01-01');

COMMENT ON COLUMN clientes.birth_date IS 'Date de naissance (remplace age, qui vieillissait mal). L''âge est calculé À LA VOLÉE si besoin (EXTRACT(YEAR FROM age(birth_date))), jamais stocké. Borne : >= 1900-01-01 (CHECK) et <= aujourd''hui (trigger).';

-- 2. Règle « date de naissance pas dans le futur » (impossible en CHECK
--    car current_date n'est pas IMMUTABLE) -> trigger.
CREATE OR REPLACE FUNCTION enforce_birth_date_not_future()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL AND NEW.birth_date > current_date THEN
    RAISE EXCEPTION 'La date de naissance ne peut pas être dans le futur (%).', NEW.birth_date
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION enforce_birth_date_not_future() IS 'Trigger : interdit une birth_date dans le futur (règle impossible en CHECK car current_date n''est pas IMMUTABLE).';

DROP TRIGGER IF EXISTS trg_clientes_birth_date ON clientes;
CREATE TRIGGER trg_clientes_birth_date
    BEFORE INSERT OR UPDATE OF birth_date ON clientes
    FOR EACH ROW EXECUTE FUNCTION enforce_birth_date_not_future();

-- 3. create_cliente_account : p_age int -> p_birth_date date (signature
--    modifiée -> DROP de l'ancienne puis CREATE).
DROP FUNCTION IF EXISTS create_cliente_account(citext, text, text, text, int, text, text);
CREATE OR REPLACE FUNCTION create_cliente_account(
    p_email         citext,
    p_password_hash text,
    p_first_name    text,
    p_last_name     text,
    p_birth_date    date DEFAULT NULL,
    p_city          text DEFAULT NULL,
    p_situation     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id    uuid;
  v_cliente_id uuid;
BEGIN
  IF p_password_hash IS NULL OR length(btrim(p_password_hash)) = 0 THEN
    RAISE EXCEPTION 'Le hash du mot de passe est obligatoire (le hachage est fait côté application).'
      USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Un compte existe déjà avec l''email %.', p_email USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO users (role, email, password_hash, must_change_password)
  VALUES ('cliente', p_email, p_password_hash, true)
  RETURNING id INTO v_user_id;

  INSERT INTO clientes (user_id, first_name, last_name, birth_date, city, situation, status)
  VALUES (v_user_id, p_first_name, p_last_name, p_birth_date, p_city, p_situation, 'onboarding')
  RETURNING id INTO v_cliente_id;

  RETURN v_cliente_id;
END;
$$;
COMMENT ON FUNCTION create_cliente_account(citext, text, text, text, date, text, text) IS 'Crée un compte cliente (users role cliente + clientes + 4 piliers) avec must_change_password=true. Reçoit un HASH et une date de naissance. Renvoie l''id de la cliente.';

-- 4. convert_application_to_cliente : copie birth_date (plus de calcul d'âge).
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

  v_first := split_part(btrim(v_app.full_name), ' ', 1);
  v_last  := NULLIF(btrim(regexp_replace(btrim(v_app.full_name), '^\S+\s*', '')), '');
  IF v_last IS NULL THEN
    v_last := v_first;
  END IF;

  INSERT INTO users (role, email, password_hash, must_change_password)
  VALUES ('cliente', v_app.email, '!invite_pending', true)
  RETURNING id INTO v_user_id;

  -- birth_date copiée directement depuis la candidature (pas d'âge stocké).
  INSERT INTO clientes (user_id, first_name, last_name, birth_date, status)
  VALUES (v_user_id, v_first, v_last, v_app.birth_date, 'onboarding')
  RETURNING * INTO v_cliente;

  UPDATE applications
     SET status = 'converted', converted_cliente_id = v_cliente.id
   WHERE id = p_application_id;

  RETURN v_cliente;
END;
$$;

-- 5. Suppression de l'ancienne colonne age (et de sa contrainte associée).
ALTER TABLE clientes DROP COLUMN IF EXISTS age;

-- =====================================================================
-- CORRECTIF 1 — RGPD : forget_person purge les notifications nominatives
-- =====================================================================
-- Convention (documentée) : toute notification concernant une cliente
-- DOIT porter son id dans payload->>'cliente_id'.
COMMENT ON COLUMN notifications.payload IS 'Charge utile JSON (contexte de la notification). CONVENTION RGPD : toute notification concernant une cliente DOIT porter son id dans payload->>''cliente_id'' (utilisé par forget_person pour purger les notifications nominatives reçues par la coach).';

CREATE OR REPLACE FUNCTION forget_person(p_email citext)
RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_cliente_id uuid;
  v_urls       text[] := ARRAY[]::text[];
  v_id         uuid;
BEGIN
  -- 1. Surface CLIENTE (via le compte users). On capture v_cliente_id
  --    AVANT delete_cliente (qui supprime la cliente pendant l'appel).
  SELECT c.id INTO v_cliente_id
    FROM clientes c
    JOIN users u ON u.id = c.user_id
   WHERE u.email = p_email;

  IF v_cliente_id IS NOT NULL THEN
    SELECT coalesce(array_agg(x), ARRAY[]::text[])
      INTO v_urls
      FROM delete_cliente(v_cliente_id) AS x;

    -- Purge des notifications NOMINATIVES : reçues par d'autres (la coach),
    -- donc non cascadées, mais référençant la personne via payload.cliente_id.
    DELETE FROM notifications
     WHERE payload->>'cliente_id' = v_cliente_id::text;
  END IF;

  -- 2. Surface PROSPECT — réservations d'appel découverte.
  FOR v_id IN SELECT id FROM discovery_bookings WHERE email = p_email LOOP
    PERFORM delete_booking(v_id);
  END LOOP;

  -- 3. Surface PROSPECT — candidatures.
  FOR v_id IN SELECT id FROM applications WHERE email = p_email LOOP
    PERFORM delete_application(v_id);
  END LOOP;

  RETURN QUERY SELECT unnest(v_urls);
END;
$$;
COMMENT ON FUNCTION forget_person(citext) IS 'Effacement RGPD complet par email : clientes (+ cascade messages/attachments/assets/…), notifications nominatives (payload.cliente_id), discovery_bookings et applications. Renvoie les storage_url à purger. Tolérant aux emails inconnus.';

-- =====================================================================
-- CORRECTIF 3 — index redondant sur messages
-- =====================================================================
-- idx_messages_created_at (006) est couvert par idx_messages_cliente_created
-- (010), qui a cliente_id en tête. On conserve idx_messages_cliente_created
-- et idx_messages_unread.
DROP INDEX IF EXISTS idx_messages_created_at;
