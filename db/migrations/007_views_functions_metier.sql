-- =====================================================================
-- 007_views_functions_metier.sql
-- ---------------------------------------------------------------------
-- Logique MÉTIER appliquée en base :
--   1. Création automatique des 4 piliers à l'insertion d'une cliente.
--   2. Gate de validation séquentielle (trigger).
--   3. submit_pilier()  : soumission d'un pilier.
--   4. validate_pilier(): décision de la coach + déblocage du suivant.
--   5. delete_cliente() : droit à l'oubli (retourne les URLs à purger).
--   6. Vue pending_validations : file d'attente du dashboard coach.
--
-- Principe métier : « L'IA assiste, Justine valide. » Un pilier ne se
-- débloque (in_progress) que si le précédent est validé.
--
-- Idempotence : CREATE OR REPLACE FUNCTION / VIEW -> rejouable.
-- Les CREATE TRIGGER ne sont pas idempotents ; on les protège par un
-- DROP TRIGGER IF EXISTS pour que ce fichier reste rejouable seul.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Création automatique des 4 piliers à l'insertion d'une cliente
--    Pilier 1 : in_progress (l'accompagnement démarre par l'Identité).
--    Piliers 2-4 : locked.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_piliers_for_cliente()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO piliers (cliente_id, numero, status) VALUES
    (NEW.id, 1, 'in_progress'),
    (NEW.id, 2, 'locked'),
    (NEW.id, 3, 'locked'),
    (NEW.id, 4, 'locked');
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION create_piliers_for_cliente() IS 'Trigger AFTER INSERT clientes : crée les 4 piliers (1 in_progress, 2-4 locked).';

DROP TRIGGER IF EXISTS trg_clientes_create_piliers ON clientes;
CREATE TRIGGER trg_clientes_create_piliers
    AFTER INSERT ON clientes
    FOR EACH ROW EXECUTE FUNCTION create_piliers_for_cliente();

-- ---------------------------------------------------------------------
-- 2. Gate de validation : un pilier ne passe in_progress que si le
--    pilier précédent est validé (sauf pilier 1). La boucle
--    needs_revision -> in_progress (re-travail) reste autorisée car le
--    pilier précédent est, lui, déjà validé.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_pilier_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_status pilier_status;
BEGIN
  IF NEW.status = 'in_progress' AND NEW.numero > 1 THEN
    SELECT status INTO v_prev_status
      FROM piliers
     WHERE cliente_id = NEW.cliente_id
       AND numero = NEW.numero - 1;

    IF v_prev_status IS DISTINCT FROM 'validated' THEN
      RAISE EXCEPTION
        'Gate de validation : le pilier % ne peut pas passer in_progress tant que le pilier % n''est pas validé (statut actuel : %).',
        NEW.numero, NEW.numero - 1, COALESCE(v_prev_status::text, 'inexistant')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION enforce_pilier_gate() IS 'Trigger BEFORE INSERT/UPDATE piliers : empêche le passage in_progress d''un pilier tant que le précédent n''est pas validé.';

DROP TRIGGER IF EXISTS trg_piliers_gate ON piliers;
CREATE TRIGGER trg_piliers_gate
    BEFORE INSERT OR UPDATE ON piliers
    FOR EACH ROW EXECUTE FUNCTION enforce_pilier_gate();

-- ---------------------------------------------------------------------
-- 3. submit_pilier(pilier_id)
--    Passe un pilier in_progress|needs_revision -> submitted et fixe
--    submitted_at. Retourne la ligne pilier mise à jour.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_pilier(p_pilier_id uuid)
RETURNS piliers
LANGUAGE plpgsql
AS $$
DECLARE
  v_pilier piliers;
BEGIN
  SELECT * INTO v_pilier FROM piliers WHERE id = p_pilier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pilier % introuvable.', p_pilier_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_pilier.status NOT IN ('in_progress', 'needs_revision') THEN
    RAISE EXCEPTION 'Seul un pilier in_progress ou needs_revision peut être soumis (statut actuel : %).',
      v_pilier.status USING ERRCODE = 'check_violation';
  END IF;

  UPDATE piliers
     SET status = 'submitted',
         submitted_at = now()
   WHERE id = p_pilier_id
   RETURNING * INTO v_pilier;

  RETURN v_pilier;
END;
$$;
COMMENT ON FUNCTION submit_pilier(uuid) IS 'Soumet un pilier (in_progress|needs_revision -> submitted, fixe submitted_at).';

-- ---------------------------------------------------------------------
-- 4. validate_pilier(pilier_id, coach_id, decision, comment)
--    - vérifie que coach_id est bien une coach et que le pilier est soumis ;
--    - garde-fou pilier 1 : les 3 mots doivent être renseignés ;
--    - écrit une ligne dans validations ;
--    - validated  -> status validated + validated_at + déblocage du suivant ;
--    - needs_revision -> status needs_revision.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_pilier(
    p_pilier_id uuid,
    p_coach_id  uuid,
    p_decision  validation_decision,
    p_comment   text DEFAULT NULL
)
RETURNS piliers
LANGUAGE plpgsql
AS $$
DECLARE
  v_pilier     piliers;
  v_coach_role user_role;
BEGIN
  SELECT * INTO v_pilier FROM piliers WHERE id = p_pilier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pilier % introuvable.', p_pilier_id USING ERRCODE = 'no_data_found';
  END IF;

  SELECT role INTO v_coach_role FROM users WHERE id = p_coach_id;
  IF v_coach_role IS DISTINCT FROM 'coach' THEN
    RAISE EXCEPTION 'Seul un utilisateur de rôle coach peut valider (coach_id = %).',
      p_coach_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_pilier.status <> 'submitted' THEN
    RAISE EXCEPTION 'Seul un pilier soumis (submitted) peut être validé (statut actuel : %).',
      v_pilier.status USING ERRCODE = 'check_violation';
  END IF;

  -- Garde-fou pilier 1 (Identité) : les 3 mots-boussole sont obligatoires.
  IF v_pilier.numero = 1 AND p_decision = 'validated' THEN
    PERFORM 1 FROM clientes c
     WHERE c.id = v_pilier.cliente_id
       AND c.word_who_she_is     IS NOT NULL
       AND c.word_what_she_likes IS NOT NULL
       AND c.word_to_embody      IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pilier 1 (Identité) : les 3 mots-boussole doivent être renseignés avant validation.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Journal d'audit
  INSERT INTO validations (pilier_id, coach_id, decision, comment)
  VALUES (p_pilier_id, p_coach_id, p_decision, p_comment);

  IF p_decision = 'validated' THEN
    UPDATE piliers
       SET status = 'validated', validated_at = now()
     WHERE id = p_pilier_id
     RETURNING * INTO v_pilier;

    -- Déblocage du pilier suivant (le trigger gate l'autorise car le
    -- pilier courant vient de passer validated).
    IF v_pilier.numero < 4 THEN
      UPDATE piliers
         SET status = 'in_progress'
       WHERE cliente_id = v_pilier.cliente_id
         AND numero = v_pilier.numero + 1
         AND status = 'locked';
    END IF;
  ELSE
    UPDATE piliers
       SET status = 'needs_revision'
     WHERE id = p_pilier_id
     RETURNING * INTO v_pilier;
  END IF;

  RETURN v_pilier;
END;
$$;
COMMENT ON FUNCTION validate_pilier(uuid, uuid, validation_decision, text) IS 'Décision de la coach : journalise, met à jour le pilier, et débloque le suivant si validated.';

-- ---------------------------------------------------------------------
-- 5. delete_cliente(cliente_id) — Droit à l'oubli RGPD
--    Retourne d'abord la liste des storage_url de tous ses assets
--    (capturée AVANT suppression), puis efface TOUTES ses données.
--    La base ne peut pas effacer les binaires de l'object storage :
--    c'est à l'appelant de supprimer les fichiers à ces URLs.
--
--    On supprime le COMPTE users : la cascade efface alors clientes
--    (user_id ON DELETE CASCADE) et tout son contenu, ET les
--    notifications (recipient_id ON DELETE CASCADE) qui ne sont PAS
--    rattachées à la cliente mais à l'utilisateur.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_cliente(p_cliente_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_urls    text[];
BEGIN
  SELECT user_id INTO v_user_id FROM clientes WHERE id = p_cliente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente % introuvable.', p_cliente_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Capture des URLs AVANT toute suppression.
  SELECT array_agg(a.storage_url ORDER BY a.created_at)
    INTO v_urls
    FROM assets a
   WHERE a.cliente_id = p_cliente_id;

  -- Effacement total par cascade depuis le compte utilisateur.
  DELETE FROM users WHERE id = v_user_id;

  -- Renvoi des URLs à purger côté object storage (vide si aucun asset).
  RETURN QUERY SELECT unnest(COALESCE(v_urls, ARRAY[]::text[]));
END;
$$;
COMMENT ON FUNCTION delete_cliente(uuid) IS 'Droit à l''oubli : renvoie les storage_url des assets (à purger côté object storage) PUIS supprime en cascade la cliente, son compte et toutes ses données.';

-- ---------------------------------------------------------------------
-- 6. Vue pending_validations — file d'attente du dashboard coach
--    Tous les piliers soumis (submitted), triés du plus ancien au plus
--    récent (submitted_at croissant).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW pending_validations AS
SELECT
    p.id           AS pilier_id,
    p.cliente_id,
    c.first_name,
    c.last_name,
    p.numero,
    p.submitted_at,
    p.status
FROM piliers p
JOIN clientes c ON c.id = p.cliente_id
WHERE p.status = 'submitted'
ORDER BY p.submitted_at ASC;

COMMENT ON VIEW pending_validations IS 'File d''attente du dashboard coach : piliers soumis (submitted) en attente, triés par ancienneté (submitted_at croissant).';
