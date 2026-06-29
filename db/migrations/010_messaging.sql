-- =====================================================================
-- 010_messaging.sql   (ENRICHISSEMENT MESSAGERIE + TEMPS RÉEL)
-- ---------------------------------------------------------------------
-- La table `messages` (migration 006) existe déjà (un fil = une cliente,
-- qui ne parle qu'à l'unique coach). On NE la recrée pas : on l'enrichit.
--
-- Ajouts :
--   1. Colonnes accusés (delivered_at, read_at déjà présent), édition
--      (edited_at), soft delete (deleted_at), updated_at + trigger.
--   2. Pièces jointes (message_attachments) réutilisant la table assets
--      existante (donc consentement + hébergement EU déjà en place).
--   3. Index : chargement de fil + compteur de non-lus (index partiel).
--   4. Déclencheur temps réel : pg_notify('new_message', ...) AFTER INSERT.
--      L'app s'abonne via LISTEN new_message et pousse au destinataire.
--      Mécanisme natif PostgreSQL, sans dépendance externe, portable IONOS.
--
-- RGPD : messages et message_attachments cascadent depuis clientes ->
-- déjà couverts par delete_cliente() / forget_person().
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouvelles colonnes sur messages
-- ---------------------------------------------------------------------
ALTER TABLE messages
  ADD COLUMN updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN edited_at    timestamptz,
  ADD COLUMN deleted_at   timestamptz;

COMMENT ON COLUMN messages.updated_at   IS 'Date de dernière modification de la ligne (maintenue par trigger set_updated_at).';
COMMENT ON COLUMN messages.delivered_at IS 'Accusé de remise (message arrivé au destinataire). Distinct de read_at (accusé de lecture).';
COMMENT ON COLUMN messages.edited_at    IS 'Date de dernière édition du contenu, NULL si jamais modifié.';
COMMENT ON COLUMN messages.deleted_at   IS 'Soft delete : masque le message sans casser l''historique du fil. NULL si actif.';

CREATE TRIGGER trg_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Index
-- ---------------------------------------------------------------------
-- L'index composite (cliente_id, created_at) rend redondant l'index
-- simple sur cliente_id créé en 006 : on le remplace.
DROP INDEX IF EXISTS idx_messages_cliente_id;
CREATE INDEX idx_messages_cliente_created ON messages (cliente_id, created_at);

-- Compteur de non-lus efficace : on n'indexe que les messages ACTIFS
-- non lus (index partiel). Raffinement vs spec : on exclut aussi les
-- messages soft-deleted (un message supprimé ne doit pas compter).
CREATE INDEX idx_messages_unread
    ON messages (cliente_id)
    WHERE read_at IS NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 3. Pièces jointes (réutilise assets : consentement + EU déjà en place)
-- ---------------------------------------------------------------------
CREATE TABLE message_attachments (
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    asset_id   uuid NOT NULL REFERENCES assets(id)   ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, asset_id)
);

-- La PK indexe déjà (message_id, asset_id) ; index inverse pour assets.
CREATE INDEX idx_message_attachments_asset_id ON message_attachments (asset_id);

COMMENT ON TABLE  message_attachments            IS 'Pièces jointes d''un message (N-N messages <-> assets). Réutilise assets (consentement + hébergement EU).';
COMMENT ON COLUMN message_attachments.message_id IS 'Message porteur. ON DELETE CASCADE.';
COMMENT ON COLUMN message_attachments.asset_id   IS 'Asset joint (photo, etc.). ON DELETE CASCADE.';
COMMENT ON COLUMN message_attachments.created_at IS 'Date d''ajout de la pièce jointe.';

-- ---------------------------------------------------------------------
-- 4. Déclencheur temps réel : NOTIFY à chaque nouveau message
-- ---------------------------------------------------------------------
-- La base ne « fait » pas le temps réel : elle le DÉCLENCHE. La couche
-- appli (LISTEN new_message -> WebSocket navigateur) est hors BDD.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'id',          NEW.id,
      'cliente_id',  NEW.cliente_id,
      'sender_role', NEW.sender_role,
      'created_at',  NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION notify_new_message() IS 'Trigger AFTER INSERT messages : émet pg_notify(''new_message'', {id, cliente_id, sender_role, created_at}) pour le temps réel applicatif (LISTEN/WebSocket).';

DROP TRIGGER IF EXISTS trg_messages_notify ON messages;
CREATE TRIGGER trg_messages_notify
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();
