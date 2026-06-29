-- =====================================================================
-- 011_rgpd_forget_person.sql   (RGPD — effacement complet par email)
-- ---------------------------------------------------------------------
-- Une même personne peut exister sous plusieurs « surfaces » :
--   * cliente accompagnée (via son compte users.email),
--   * prospect ayant réservé un appel découverte (discovery_bookings),
--   * prospect ayant candidaté (applications).
--
-- forget_person(email) réalise l'effacement RGPD COMPLET à travers ces
-- trois surfaces, en réutilisant les fonctions déjà testées :
--   - delete_cliente()      -> cascade assets, piliers, messages,
--                              message_attachments, notifications, etc.
--   - delete_booking()      -> chaque réservation de ce prospect,
--   - delete_application()  -> chaque candidature de ce prospect.
--
-- Retourne les storage_url des assets à purger côté object storage
-- (seules les clientes en possèdent ; la base ne peut pas effacer les
-- binaires — c'est à l'appelant de le faire).
--
-- Le compte coach n'est jamais touché (il n'a pas de ligne clientes).
-- La fonction est tolérante : un email inconnu ne lève pas d'erreur
-- (déjà « oublié »), elle renvoie un ensemble vide.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Correctif préalable indispensable à l'effacement RGPD
-- ---------------------------------------------------------------------
-- La contrainte applications_converted_link_chk (migration 009) était
-- BIDIRECTIONNELLE : (status='converted') = (converted_cliente_id NOT NULL).
-- Or supprimer une cliente déclenche le ON DELETE SET NULL sur
-- applications.converted_cliente_id : la candidature reste « converted »
-- mais perd son lien -> violation de la contrainte -> l'effacement d'une
-- cliente CONVERTIE échouait (donc delete_cliente() ET forget_person()).
--
-- On relâche en contrainte UNIDIRECTIONNELLE : « un lien implique
-- converted » (l'inverse n'est plus exigé). Cela autorise l'état légitime
-- post-effacement : candidature convertie dont la cliente a été effacée.
-- (Idempotent : DROP puis ADD ; la fonction de conversion fixe toujours
-- les deux champs ensemble, l'invariant utile est préservé.)
ALTER TABLE applications DROP CONSTRAINT applications_converted_link_chk;
ALTER TABLE applications ADD CONSTRAINT applications_converted_link_chk
    CHECK (converted_cliente_id IS NULL OR status = 'converted');

CREATE OR REPLACE FUNCTION forget_person(p_email citext)
RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_cliente_id uuid;
  v_urls       text[] := ARRAY[]::text[];
  v_id         uuid;
BEGIN
  -- 1. Surface CLIENTE (via le compte users) — cascade tout son contenu,
  --    y compris messages + message_attachments (migration 010).
  SELECT c.id INTO v_cliente_id
    FROM clientes c
    JOIN users u ON u.id = c.user_id
   WHERE u.email = p_email;

  IF v_cliente_id IS NOT NULL THEN
    SELECT coalesce(array_agg(x), ARRAY[]::text[])
      INTO v_urls
      FROM delete_cliente(v_cliente_id) AS x;
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
COMMENT ON FUNCTION forget_person(citext) IS 'Effacement RGPD complet d''une personne par email à travers clientes (+ cascade messages/attachments/assets/…), discovery_bookings et applications. Renvoie les storage_url à purger côté object storage. Tolérant aux emails inconnus.';
