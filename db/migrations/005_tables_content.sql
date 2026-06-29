-- =====================================================================
-- 005_tables_content.sql
-- ---------------------------------------------------------------------
-- Contenu produit pendant l'accompagnement : consentements RGPD,
-- assets (métadonnées d'images), pièces, looks, profils colorimétrie /
-- morphologie, moodboards et notifications.
--
-- Rappel : AUCUN binaire d'image n'est stocké en base ; seules les URL
-- vers l'object storage (Supabase / IONOS S3) et les métadonnées le sont.
--
-- Toutes les FK partant d'une cliente sont en ON DELETE CASCADE
-- (droit à l'oubli câblé dans le schéma).
-- =====================================================================

-- =====================================================================
-- consents — consentements RGPD (créé avant assets : assets y référence)
-- =====================================================================
CREATE TABLE consents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    scope      consent_scope NOT NULL,
    granted    boolean NOT NULL DEFAULT false,
    granted_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT consents_cliente_scope_uk UNIQUE (cliente_id, scope),
    CONSTRAINT consents_granted_at_chk
        CHECK (granted = false OR granted_at IS NOT NULL),
    CONSTRAINT consents_revoked_after_granted_chk
        CHECK (revoked_at IS NULL OR granted_at IS NULL OR revoked_at >= granted_at)
);

CREATE INDEX idx_consents_cliente_id ON consents (cliente_id);

CREATE TRIGGER trg_consents_updated_at
    BEFORE UPDATE ON consents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  consents            IS 'Consentements RGPD d''une cliente, un enregistrement par périmètre (photos, traitement_donnees).';
COMMENT ON COLUMN consents.id         IS 'Identifiant technique du consentement (UUID).';
COMMENT ON COLUMN consents.cliente_id IS 'Cliente concernée. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN consents.scope      IS 'Périmètre : photos ou traitement_donnees.';
COMMENT ON COLUMN consents.granted    IS 'Vrai si le consentement est actuellement accordé.';
COMMENT ON COLUMN consents.granted_at IS 'Date d''octroi (obligatoire si granted = true).';
COMMENT ON COLUMN consents.revoked_at IS 'Date de révocation, le cas échéant (>= granted_at).';
COMMENT ON COLUMN consents.created_at IS 'Date de création de l''enregistrement.';
COMMENT ON COLUMN consents.updated_at IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- assets — métadonnées d'images (l'URL pointe vers l'object storage)
-- =====================================================================
-- Table append-only (created_at seulement) : une image n'est pas
-- « modifiée » ; on en crée une nouvelle. Le binaire vit hors base.
CREATE TABLE assets (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id       uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    pilier_id        uuid REFERENCES piliers(id)  ON DELETE SET NULL,
    consent_id       uuid REFERENCES consents(id) ON DELETE SET NULL,
    type             asset_type NOT NULL DEFAULT 'other',
    storage_url      text NOT NULL,
    storage_provider text NOT NULL DEFAULT 'supabase',
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assets_storage_url_chk CHECK (storage_url ~ '^https?://')
);

CREATE INDEX idx_assets_cliente_id ON assets (cliente_id);
CREATE INDEX idx_assets_pilier_id  ON assets (pilier_id);
CREATE INDEX idx_assets_consent_id ON assets (consent_id);
CREATE INDEX idx_assets_type       ON assets (type);

COMMENT ON TABLE  assets                  IS 'Métadonnées des images (photos de pièces, planches, looks...). Le binaire est stocké hors base ; seule l''URL est conservée.';
COMMENT ON COLUMN assets.id               IS 'Identifiant technique de l''asset (UUID).';
COMMENT ON COLUMN assets.cliente_id       IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN assets.pilier_id        IS 'Pilier de rattachement, optionnel. ON DELETE SET NULL.';
COMMENT ON COLUMN assets.consent_id       IS 'Consentement RGPD couvrant l''image, optionnel. ON DELETE SET NULL.';
COMMENT ON COLUMN assets.type             IS 'Nature de l''asset (piece_photo, moodboard, look, colorimetrie, morphologie, other).';
COMMENT ON COLUMN assets.storage_url      IS 'URL absolue de l''objet dans l''object storage (http/https). Jamais de binaire en base.';
COMMENT ON COLUMN assets.storage_provider IS 'Fournisseur de stockage (ex. supabase, ionos_s3).';
COMMENT ON COLUMN assets.created_at       IS 'Date d''enregistrement de l''asset.';

-- =====================================================================
-- pieces — vêtements / accessoires de la cliente
-- =====================================================================
CREATE TABLE pieces (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id        uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    asset_id          uuid REFERENCES assets(id) ON DELETE SET NULL,
    name              text NOT NULL,
    wardrobe_category wardrobe_category,
    tri_decision      tri_decision,
    tri_criterion     tri_criterion,
    linked_word       word_slot,
    tags              text[] NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    -- Un critère de sortie n'a de sens que si la pièce est « sortie ».
    CONSTRAINT pieces_criterion_requires_sortir_chk
        CHECK (tri_criterion IS NULL OR tri_decision = 'sortir')
);

CREATE INDEX idx_pieces_cliente_id        ON pieces (cliente_id);
CREATE INDEX idx_pieces_asset_id          ON pieces (asset_id);
CREATE INDEX idx_pieces_wardrobe_category ON pieces (wardrobe_category);
CREATE INDEX idx_pieces_tri_decision      ON pieces (tri_decision);
CREATE INDEX idx_pieces_tags              ON pieces USING gin (tags);

CREATE TRIGGER trg_pieces_updated_at
    BEFORE UPDATE ON pieces
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  pieces                   IS 'Vêtements et accessoires de la cliente (utilisés au pilier 3 Tri et au pilier 4 Construction).';
COMMENT ON COLUMN pieces.id                IS 'Identifiant technique de la pièce (UUID).';
COMMENT ON COLUMN pieces.cliente_id        IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN pieces.asset_id          IS 'Photo associée, optionnelle. ON DELETE SET NULL.';
COMMENT ON COLUMN pieces.name              IS 'Libellé de la pièce.';
COMMENT ON COLUMN pieces.wardrobe_category IS 'Catégorie garde-robe (pilier 4) : basique, personnalite, dopamine. Null tant que non catégorisée.';
COMMENT ON COLUMN pieces.tri_decision      IS 'Décision de tri (pilier 3) : garder ou sortir. Null tant que non triée.';
COMMENT ON COLUMN pieces.tri_criterion     IS 'Critère de sortie (pilier 3), uniquement si tri_decision = sortir.';
COMMENT ON COLUMN pieces.linked_word       IS 'Mot-boussole auquel la pièce se rattache (slot parmi who_she_is / what_she_likes / to_embody).';
COMMENT ON COLUMN pieces.tags              IS 'Étiquettes libres (tableau de texte), indexées (GIN) pour le filtrage.';
COMMENT ON COLUMN pieces.created_at        IS 'Date de création de la pièce.';
COMMENT ON COLUMN pieces.updated_at        IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- looks — tenues composées de plusieurs pièces (pilier 4)
-- =====================================================================
CREATE TABLE looks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    name       text NOT NULL,
    category   wardrobe_category,
    annotation text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_looks_cliente_id ON looks (cliente_id);
CREATE INDEX idx_looks_category   ON looks (category);

CREATE TRIGGER trg_looks_updated_at
    BEFORE UPDATE ON looks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  looks            IS 'Tenues (looks) créées au pilier 4, composées de plusieurs pièces.';
COMMENT ON COLUMN looks.id         IS 'Identifiant technique du look (UUID).';
COMMENT ON COLUMN looks.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN looks.name       IS 'Nom du look.';
COMMENT ON COLUMN looks.category   IS 'Catégorie dominante du look, optionnelle (basique, personnalite, dopamine).';
COMMENT ON COLUMN looks.annotation IS 'Note libre de la coach ou de la cliente sur le look.';
COMMENT ON COLUMN looks.created_at IS 'Date de création du look.';
COMMENT ON COLUMN looks.updated_at IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- look_pieces — table de liaison looks <-> pieces (N-N)
-- =====================================================================
CREATE TABLE look_pieces (
    look_id    uuid NOT NULL REFERENCES looks(id)  ON DELETE CASCADE,
    piece_id   uuid NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (look_id, piece_id)
);

-- La PK indexe déjà (look_id, piece_id) ; on ajoute l'index inverse.
CREATE INDEX idx_look_pieces_piece_id ON look_pieces (piece_id);

COMMENT ON TABLE  look_pieces            IS 'Association N-N entre looks et pièces.';
COMMENT ON COLUMN look_pieces.look_id    IS 'Look concerné. ON DELETE CASCADE.';
COMMENT ON COLUMN look_pieces.piece_id   IS 'Pièce composant le look. ON DELETE CASCADE.';
COMMENT ON COLUMN look_pieces.created_at IS 'Date d''ajout de la pièce au look.';

-- =====================================================================
-- color_profiles — colorimétrie (1-1 avec la cliente, pilier 2)
-- =====================================================================
CREATE TABLE color_profiles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  uuid NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
    season      text,
    palette     jsonb NOT NULL DEFAULT '{}'::jsonb,
    makeup_reco text,
    hair_reco   text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- cliente_id couvert par UNIQUE (index implicite).
CREATE TRIGGER trg_color_profiles_updated_at
    BEFORE UPDATE ON color_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  color_profiles             IS 'Profil colorimétrie d''une cliente (pilier 2). Relation 1-1.';
COMMENT ON COLUMN color_profiles.id          IS 'Identifiant technique (UUID).';
COMMENT ON COLUMN color_profiles.cliente_id  IS 'Cliente concernée (unique). ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN color_profiles.season      IS 'Saison colorimétrique (ex. « Printemps clair », « Hiver froid »). Texte libre pour couvrir les systèmes 4 ou 12 saisons.';
COMMENT ON COLUMN color_profiles.palette     IS 'Palette de couleurs (JSON : dominantes, à éviter, etc.).';
COMMENT ON COLUMN color_profiles.makeup_reco IS 'Recommandations maquillage.';
COMMENT ON COLUMN color_profiles.hair_reco   IS 'Recommandations cheveux / coloration.';
COMMENT ON COLUMN color_profiles.created_at  IS 'Date de création du profil.';
COMMENT ON COLUMN color_profiles.updated_at  IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- morpho_profiles — morphologie (1-1 avec la cliente, pilier 2)
-- =====================================================================
CREATE TABLE morpho_profiles (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id   uuid NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
    type         morpho_type NOT NULL,
    measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
    reco         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_morpho_profiles_updated_at
    BEFORE UPDATE ON morpho_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  morpho_profiles              IS 'Profil morphologie d''une cliente (pilier 2). Relation 1-1.';
COMMENT ON COLUMN morpho_profiles.id           IS 'Identifiant technique (UUID).';
COMMENT ON COLUMN morpho_profiles.cliente_id   IS 'Cliente concernée (unique). ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN morpho_profiles.type         IS 'Type de silhouette : H, X, A, V, O, 8.';
COMMENT ON COLUMN morpho_profiles.measurements IS 'Mensurations (JSON : épaules, taille, hanches...).';
COMMENT ON COLUMN morpho_profiles.reco         IS 'Recommandations coupes / volumes (JSON).';
COMMENT ON COLUMN morpho_profiles.created_at   IS 'Date de création du profil.';
COMMENT ON COLUMN morpho_profiles.updated_at   IS 'Date de dernière modification (maintenue par trigger).';

-- =====================================================================
-- moodboards + moodboard_items — planches d'inspiration
-- =====================================================================
CREATE TABLE moodboards (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    pilier_id  uuid REFERENCES piliers(id) ON DELETE SET NULL,
    title      text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_moodboards_cliente_id ON moodboards (cliente_id);
CREATE INDEX idx_moodboards_pilier_id  ON moodboards (pilier_id);

CREATE TRIGGER trg_moodboards_updated_at
    BEFORE UPDATE ON moodboards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  moodboards            IS 'Planches d''inspiration d''une cliente (pilier 1 « mot 2 » et pilier 4).';
COMMENT ON COLUMN moodboards.id         IS 'Identifiant technique (UUID).';
COMMENT ON COLUMN moodboards.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';
COMMENT ON COLUMN moodboards.pilier_id  IS 'Pilier de rattachement, optionnel. ON DELETE SET NULL.';
COMMENT ON COLUMN moodboards.title      IS 'Titre de la planche.';
COMMENT ON COLUMN moodboards.created_at IS 'Date de création.';
COMMENT ON COLUMN moodboards.updated_at IS 'Date de dernière modification (maintenue par trigger).';

CREATE TABLE moodboard_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    moodboard_id uuid NOT NULL REFERENCES moodboards(id) ON DELETE CASCADE,
    asset_id     uuid REFERENCES assets(id) ON DELETE SET NULL,
    source_url   text,
    note         text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    -- Un item référence soit un asset interne, soit une URL externe.
    CONSTRAINT moodboard_items_source_chk
        CHECK (asset_id IS NOT NULL OR source_url IS NOT NULL),
    CONSTRAINT moodboard_items_source_url_format_chk
        CHECK (source_url IS NULL OR source_url ~ '^https?://')
);

CREATE INDEX idx_moodboard_items_moodboard_id ON moodboard_items (moodboard_id);
CREATE INDEX idx_moodboard_items_asset_id     ON moodboard_items (asset_id);

COMMENT ON TABLE  moodboard_items              IS 'Éléments d''une planche d''inspiration : asset interne ou lien externe.';
COMMENT ON COLUMN moodboard_items.id           IS 'Identifiant technique (UUID).';
COMMENT ON COLUMN moodboard_items.moodboard_id IS 'Planche parente. ON DELETE CASCADE.';
COMMENT ON COLUMN moodboard_items.asset_id     IS 'Asset interne référencé, optionnel. ON DELETE SET NULL.';
COMMENT ON COLUMN moodboard_items.source_url   IS 'URL externe d''inspiration (http/https), optionnelle si asset_id présent.';
COMMENT ON COLUMN moodboard_items.note         IS 'Note libre sur l''élément.';
COMMENT ON COLUMN moodboard_items.created_at   IS 'Date d''ajout de l''élément.';

-- =====================================================================
-- notifications — notifications applicatives, par utilisateur
-- =====================================================================
-- Indexées par destinataire (users), PAS par cliente : c'est pourquoi
-- delete_cliente() supprime aussi le compte users (cf. 007 / README).
CREATE TABLE notifications (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         notification_type NOT NULL,
    payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_notifications_read_at      ON notifications (read_at);
CREATE INDEX idx_notifications_type         ON notifications (type);

COMMENT ON TABLE  notifications              IS 'Notifications applicatives destinées à un utilisateur (cliente ou coach).';
COMMENT ON COLUMN notifications.id           IS 'Identifiant technique (UUID).';
COMMENT ON COLUMN notifications.recipient_id IS 'Utilisateur destinataire. ON DELETE CASCADE.';
COMMENT ON COLUMN notifications.type         IS 'Type de notification (enum notification_type).';
COMMENT ON COLUMN notifications.payload      IS 'Charge utile JSON (contexte de la notification).';
COMMENT ON COLUMN notifications.read_at      IS 'Date de lecture, NULL si non lue.';
COMMENT ON COLUMN notifications.created_at   IS 'Date de création de la notification.';
