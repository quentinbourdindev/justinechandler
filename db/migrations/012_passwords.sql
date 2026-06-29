-- =====================================================================
-- 012_passwords.sql   (CYCLE DE VIE DU MOT DE PASSE CLIENTE)
-- ---------------------------------------------------------------------
-- Flux supporté :
--   1. L'admin crée le compte cliente (email + mot de passe initial).
--   2. À la 1re connexion, la cliente est FORCÉE de changer son mot de
--      passe -> drapeau must_change_password en base.
--   3. L'admin peut réinitialiser le mot de passe d'une cliente
--      (nouveau hash temporaire + drapeau repassé à true).
--
-- RÈGLE DE SÉCURITÉ NON NÉGOCIABLE :
--   * La base ne stocke QUE le hash (password_hash), jamais le mot de
--     passe en clair. Le hachage (bcrypt/argon2) est fait CÔTÉ APPLICATION.
--     Les fonctions ci-dessous reçoivent un HASH, pas un mot de passe.
--   * Le « forçage » de l'écran de changement est géré côté application :
--     la base se contente de porter le drapeau (hors BDD).
--   * password_hash ne doit JAMAIS apparaître dans les logs, exports ou
--     vues exposées (cf. README, section Sécurité des mots de passe).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouvelles colonnes sur users
-- ---------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN password_changed_at  timestamptz,
  ADD COLUMN last_login_at        timestamptz;

COMMENT ON COLUMN users.must_change_password IS 'Vrai tant que l''utilisateur doit changer son mot de passe (création de compte cliente, reset admin). L''app force alors l''écran de changement.';
COMMENT ON COLUMN users.password_changed_at  IS 'Date du dernier changement de mot de passe par l''utilisateur LUI-MÊME (pas par un reset admin).';
COMMENT ON COLUMN users.last_login_at        IS 'Date de dernière connexion (renseignée par l''app à la connexion). Utile au dashboard admin. Optionnel.';

-- ---------------------------------------------------------------------
-- 2. create_cliente_account(...) — création de compte par l'admin
--    Crée le compte users (role cliente, must_change_password=true) et
--    la ligne clientes (ce qui auto-crée les 4 piliers). Renvoie l'id
--    de la cliente. Échoue proprement si l'email existe déjà.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_cliente_account(
    p_email         citext,
    p_password_hash text,
    p_first_name    text,
    p_last_name     text,
    p_age           int  DEFAULT NULL,
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

  -- Compte : mot de passe initial TEMPORAIRE -> must_change_password = true.
  INSERT INTO users (role, email, password_hash, must_change_password)
  VALUES ('cliente', p_email, p_password_hash, true)
  RETURNING id INTO v_user_id;

  -- Profil cliente (déclenche l'auto-création des 4 piliers).
  INSERT INTO clientes (user_id, first_name, last_name, age, city, situation, status)
  VALUES (v_user_id, p_first_name, p_last_name, p_age, p_city, p_situation, 'onboarding')
  RETURNING id INTO v_cliente_id;

  RETURN v_cliente_id;
END;
$$;
COMMENT ON FUNCTION create_cliente_account(citext, text, text, text, int, text, text) IS 'Crée un compte cliente (users role cliente + clientes + 4 piliers) avec must_change_password=true. Reçoit un HASH, jamais un mot de passe en clair. Renvoie l''id de la cliente.';

-- ---------------------------------------------------------------------
-- 3. change_own_password(user_id, new_password_hash) — action cliente
--    Met à jour le hash, lève le drapeau, horodate le changement.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION change_own_password(p_user_id uuid, p_new_password_hash text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_new_password_hash IS NULL OR length(btrim(p_new_password_hash)) = 0 THEN
    RAISE EXCEPTION 'Le hash du nouveau mot de passe est obligatoire.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE users
     SET password_hash        = p_new_password_hash,
         must_change_password = false,
         password_changed_at  = now()
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur % introuvable.', p_user_id USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;
COMMENT ON FUNCTION change_own_password(uuid, text) IS 'L''utilisateur change SON mot de passe : nouveau hash, must_change_password=false, password_changed_at=now(). Reçoit un HASH.';

-- ---------------------------------------------------------------------
-- 4. admin_reset_cliente_password(cliente_id, new_password_hash)
--    L'admin fixe un hash TEMPORAIRE et repasse must_change_password=true.
--    NB : password_changed_at n'est PAS modifié (il reflète le dernier
--    changement par l'utilisateur lui-même, pas un reset admin).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_reset_cliente_password(p_cliente_id uuid, p_new_password_hash text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_new_password_hash IS NULL OR length(btrim(p_new_password_hash)) = 0 THEN
    RAISE EXCEPTION 'Le hash du mot de passe temporaire est obligatoire.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT user_id INTO v_user_id FROM clientes WHERE id = p_cliente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente % introuvable.', p_cliente_id USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE users
     SET password_hash        = p_new_password_hash,
         must_change_password = true
   WHERE id = v_user_id;
END;
$$;
COMMENT ON FUNCTION admin_reset_cliente_password(uuid, text) IS 'Reset admin : nouveau hash temporaire + must_change_password=true. password_changed_at inchangé (réservé aux changements par l''utilisateur).';

-- ---------------------------------------------------------------------
-- 5. Cohérence : convert_application_to_cliente() (009) crée aussi un
--    compte cliente (avec hash sentinel '!invite_pending'). Maintenant
--    que must_change_password existe, on le redéfinit pour poser le
--    drapeau à true -> la cliente convertie devra définir son mot de
--    passe avant usage (flux d'invitation). Mise à jour FORWARD (009
--    reste inchangé / immuable).
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

  v_first := split_part(btrim(v_app.full_name), ' ', 1);
  v_last  := NULLIF(btrim(regexp_replace(btrim(v_app.full_name), '^\S+\s*', '')), '');
  IF v_last IS NULL THEN
    v_last := v_first;
  END IF;

  v_age := EXTRACT(YEAR FROM age(v_app.birth_date))::int;
  IF v_age < 16 OR v_age > 120 THEN
    v_age := NULL;
  END IF;

  -- Compte sentinel : doit définir son mot de passe -> must_change_password=true.
  INSERT INTO users (role, email, password_hash, must_change_password)
  VALUES ('cliente', v_app.email, '!invite_pending', true)
  RETURNING id INTO v_user_id;

  INSERT INTO clientes (user_id, first_name, last_name, age, status)
  VALUES (v_user_id, v_first, v_last, v_age, 'onboarding')
  RETURNING * INTO v_cliente;

  UPDATE applications
     SET status = 'converted', converted_cliente_id = v_cliente.id
   WHERE id = p_application_id;

  RETURN v_cliente;
END;
$$;
