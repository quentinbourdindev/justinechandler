-- =====================================================================
-- 006_tables_messaging.sql   (OPTIONNEL — isolé)
-- ---------------------------------------------------------------------
-- Messagerie cliente <-> coach : un fil par cliente.
--
-- Le canal de messagerie n'est PAS confirmé côté produit ; cette
-- migration est volontairement isolée pour pouvoir être retirée sans
-- impacter le reste du schéma. Si la messagerie est externalisée
-- (email, WhatsApp...), il suffit de ne pas appliquer ce fichier.
-- =====================================================================

CREATE TABLE messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    sender_role user_role NOT NULL,
    sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        text NOT NULL,
    read_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT messages_body_not_empty_chk CHECK (length(btrim(body)) > 0)
);

CREATE INDEX idx_messages_cliente_id ON messages (cliente_id);
CREATE INDEX idx_messages_sender_id  ON messages (sender_id);
CREATE INDEX idx_messages_created_at ON messages (created_at);

COMMENT ON TABLE  messages             IS 'Messagerie cliente <-> coach (un fil par cliente). Table OPTIONNELLE et isolée.';
COMMENT ON COLUMN messages.id          IS 'Identifiant technique du message (UUID).';
COMMENT ON COLUMN messages.cliente_id  IS 'Cliente dont c''est le fil. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN messages.sender_role IS 'Rôle de l''expéditeur (cliente ou coach), dupliqué pour l''affichage.';
COMMENT ON COLUMN messages.sender_id   IS 'Compte expéditeur. ON DELETE CASCADE.';
COMMENT ON COLUMN messages.body        IS 'Contenu du message (non vide).';
COMMENT ON COLUMN messages.read_at     IS 'Date de lecture, NULL si non lu.';
COMMENT ON COLUMN messages.created_at  IS 'Date d''envoi du message.';
