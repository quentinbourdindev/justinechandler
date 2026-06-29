-- =====================================================================
-- 008_booking.sql   (MODULE PRISE DE RDV — appel découverte)
-- ---------------------------------------------------------------------
-- Page PUBLIQUE (sans compte) pour réserver un appel découverte avec la
-- coach. L'admin ouvre/ferme des créneaux ; le public ne voit que les
-- créneaux libres (les autres apparaissent « grisés ») et JAMAIS aucune
-- donnée personnelle d'autrui.
--
-- Ce sont des PROSPECTS, pas des clientes -> tables séparées de clientes.
--
-- Module volontairement isolé (ENUMs définis ici) pour rester modulaire.
-- Conventions identiques au reste du schéma (UUID, timestamptz,
-- set_updated_at, ENUMs, index FK, COMMENT ON FR, CHECK forts).
--
-- Fuseau horaire : tout en timestamptz ; l'affichage Europe/Paris est
-- géré côté application.
--
-- NON couvert (à ajouter plus tard si besoin, cf. README) : règles de
-- RÉCURRENCE de créneaux. Ici un créneau = un slot discret daté.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMs du module
-- ---------------------------------------------------------------------
CREATE TYPE slot_status AS ENUM ('available', 'booked', 'blocked');
COMMENT ON TYPE slot_status IS 'Statut d''un créneau : available (libre), booked (réservé), blocked (fermé par l''admin).';

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
COMMENT ON TYPE booking_status IS 'Statut d''une réservation : confirmed, cancelled, completed, no_show.';

-- ---------------------------------------------------------------------
-- availability_slots — créneaux gérés par l'admin
-- ---------------------------------------------------------------------
CREATE TABLE availability_slots (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    start_at   timestamptz NOT NULL,
    end_at     timestamptz NOT NULL,
    status     slot_status NOT NULL DEFAULT 'available',
    admin_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT availability_slots_interval_chk CHECK (end_at > start_at)
);

-- (status, start_at) : lister rapidement les créneaux à venir par statut.
CREATE INDEX idx_availability_slots_status_start ON availability_slots (status, start_at);
-- start_at seul : sert la vue publique (filtre start_at > now()).
CREATE INDEX idx_availability_slots_start_at ON availability_slots (start_at);

CREATE TRIGGER trg_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  availability_slots            IS 'Créneaux d''appel découverte ouverts/fermés par l''admin (un créneau = un slot daté discret).';
COMMENT ON COLUMN availability_slots.id         IS 'Identifiant technique du créneau (UUID).';
COMMENT ON COLUMN availability_slots.start_at   IS 'Début du créneau (timestamptz, UTC en base).';
COMMENT ON COLUMN availability_slots.end_at     IS 'Fin du créneau (> start_at).';
COMMENT ON COLUMN availability_slots.status     IS 'available (libre), booked (réservé), blocked (fermé par l''admin).';
COMMENT ON COLUMN availability_slots.admin_note IS 'Note réservée à l''admin. JAMAIS exposée à la vue publique.';
COMMENT ON COLUMN availability_slots.created_at IS 'Date de création du créneau.';
COMMENT ON COLUMN availability_slots.updated_at IS 'Date de dernière modification (maintenue par trigger).';

-- ---------------------------------------------------------------------
-- discovery_bookings — réservations (DONNÉES PERSO des prospects)
-- ---------------------------------------------------------------------
CREATE TABLE discovery_bookings (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ON DELETE RESTRICT : on ne supprime pas par accident un créneau réservé.
    slot_id              uuid NOT NULL REFERENCES availability_slots(id) ON DELETE RESTRICT,
    first_name           text NOT NULL,
    last_name            text NOT NULL,
    email                citext NOT NULL,
    phone                text,
    message              text,
    status               booking_status NOT NULL DEFAULT 'confirmed',
    consent_at           timestamptz NOT NULL,
    -- Funnel : relie un prospect devenu cliente. ON DELETE SET NULL pour
    -- ne pas coupler la suppression d'une cliente à celle d'un prospect.
    converted_cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT discovery_bookings_email_format_chk CHECK (position('@' IN email) > 1),
    CONSTRAINT discovery_bookings_first_name_chk   CHECK (length(btrim(first_name)) > 0),
    CONSTRAINT discovery_bookings_last_name_chk    CHECK (length(btrim(last_name))  > 0)
);

-- Un créneau ne peut avoir qu'UNE réservation ACTIVE (confirmed) :
-- garde-fou anti double-réservation au niveau base (en plus de book_slot).
CREATE UNIQUE INDEX discovery_bookings_active_slot_uk
    ON discovery_bookings (slot_id) WHERE status = 'confirmed';

CREATE INDEX idx_discovery_bookings_slot_id   ON discovery_bookings (slot_id);
CREATE INDEX idx_discovery_bookings_email     ON discovery_bookings (email);
CREATE INDEX idx_discovery_bookings_status    ON discovery_bookings (status);
CREATE INDEX idx_discovery_bookings_converted ON discovery_bookings (converted_cliente_id);

CREATE TRIGGER trg_discovery_bookings_updated_at
    BEFORE UPDATE ON discovery_bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  discovery_bookings                      IS 'Réservations d''appel découverte (prospects). Contient des données personnelles -> purge RGPD via delete_booking().';
COMMENT ON COLUMN discovery_bookings.id                   IS 'Identifiant technique de la réservation (UUID).';
COMMENT ON COLUMN discovery_bookings.slot_id              IS 'Créneau réservé. ON DELETE RESTRICT (un créneau réservé ne se supprime pas par accident).';
COMMENT ON COLUMN discovery_bookings.first_name           IS 'Prénom du prospect.';
COMMENT ON COLUMN discovery_bookings.last_name            IS 'Nom du prospect.';
COMMENT ON COLUMN discovery_bookings.email                IS 'Email du prospect (citext, insensible à la casse).';
COMMENT ON COLUMN discovery_bookings.phone                IS 'Téléphone du prospect, optionnel.';
COMMENT ON COLUMN discovery_bookings.message              IS 'Message libre du prospect (motivation / contexte), optionnel.';
COMMENT ON COLUMN discovery_bookings.status               IS 'Statut de la réservation (confirmed, cancelled, completed, no_show).';
COMMENT ON COLUMN discovery_bookings.consent_at           IS 'Horodatage du consentement RGPD donné au moment de la réservation (obligatoire).';
COMMENT ON COLUMN discovery_bookings.converted_cliente_id IS 'Cliente issue de ce prospect, le cas échéant (funnel). ON DELETE SET NULL.';
COMMENT ON COLUMN discovery_bookings.created_at           IS 'Date de création de la réservation.';
COMMENT ON COLUMN discovery_bookings.updated_at           IS 'Date de dernière modification (maintenue par trigger).';

-- ---------------------------------------------------------------------
-- VUE PUBLIQUE — le « grisé », SANS aucune donnée personnelle
-- ---------------------------------------------------------------------
-- La page publique lit UNIQUEMENT cette vue. Aucune jointure vers
-- discovery_bookings : il est donc impossible de fuiter un nom/contact.
-- is_available = false  -> le créneau s'affiche grisé (réservé ou fermé).
--
-- Sécurité au niveau BASE (pas seulement applicatif) : une vue s'exécute
-- avec les privilèges de SON propriétaire. Il suffit de donner au rôle
-- « public/anon » un SELECT sur cette vue SANS SELECT sur les tables
-- (cf. README, section Module prise de RDV).
CREATE OR REPLACE VIEW public_availability AS
SELECT
    id,
    start_at,
    end_at,
    (status = 'available') AS is_available
FROM availability_slots
WHERE start_at > now();

COMMENT ON VIEW public_availability IS 'Vue publique des créneaux à venir. N''expose AUCUNE donnée personnelle. is_available=false => créneau grisé (réservé ou fermé).';

-- ---------------------------------------------------------------------
-- book_slot(...) — réservation atomique (anti double-réservation)
-- ---------------------------------------------------------------------
-- Verrou de ligne (SELECT ... FOR UPDATE) : deux réservations
-- concurrentes du même créneau sont sérialisées ; la seconde échoue.
CREATE OR REPLACE FUNCTION book_slot(
    p_slot_id    uuid,
    p_first_name text,
    p_last_name  text,
    p_email      citext,
    p_phone      text DEFAULT NULL,
    p_message    text DEFAULT NULL,
    p_consent_at timestamptz DEFAULT now()
)
RETURNS discovery_bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_slot    availability_slots;
  v_booking discovery_bookings;
BEGIN
  IF p_first_name IS NULL OR length(btrim(p_first_name)) = 0
     OR p_last_name IS NULL OR length(btrim(p_last_name)) = 0
     OR p_email IS NULL OR length(btrim(p_email::text)) = 0 THEN
    RAISE EXCEPTION 'Prénom, nom et email sont obligatoires.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_consent_at IS NULL THEN
    RAISE EXCEPTION 'Le consentement RGPD (consent_at) est obligatoire.' USING ERRCODE = 'check_violation';
  END IF;

  -- Verrou de ligne sur le créneau.
  SELECT * INTO v_slot FROM availability_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Créneau % introuvable.', p_slot_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_slot.status = 'booked' THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé.' USING ERRCODE = 'unique_violation';
  ELSIF v_slot.status = 'blocked' THEN
    RAISE EXCEPTION 'Ce créneau n''est pas ouvert à la réservation.' USING ERRCODE = 'check_violation';
  END IF;

  IF v_slot.start_at <= now() THEN
    RAISE EXCEPTION 'Ce créneau est expiré.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO discovery_bookings (slot_id, first_name, last_name, email, phone, message, status, consent_at)
  VALUES (p_slot_id, btrim(p_first_name), btrim(p_last_name), p_email, p_phone, p_message, 'confirmed', p_consent_at)
  RETURNING * INTO v_booking;

  UPDATE availability_slots SET status = 'booked' WHERE id = p_slot_id;

  RETURN v_booking;
END;
$$;
COMMENT ON FUNCTION book_slot(uuid, text, text, citext, text, text, timestamptz) IS 'Réserve un créneau de façon atomique (verrou de ligne) : crée la réservation et passe le créneau à booked. Échoue si le créneau n''est pas libre.';

-- ---------------------------------------------------------------------
-- cancel_booking(booking_id) — annulation + libération du créneau
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id uuid)
RETURNS discovery_bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking discovery_bookings;
BEGIN
  SELECT * INTO v_booking FROM discovery_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation % introuvable.', p_booking_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Seule une réservation confirmée peut être annulée (statut actuel : %).',
      v_booking.status USING ERRCODE = 'check_violation';
  END IF;

  UPDATE discovery_bookings SET status = 'cancelled' WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  -- Libère le créneau (s'il était bien réservé).
  UPDATE availability_slots SET status = 'available'
   WHERE id = v_booking.slot_id AND status = 'booked';

  RETURN v_booking;
END;
$$;
COMMENT ON FUNCTION cancel_booking(uuid) IS 'Annule une réservation confirmée (status=cancelled) et libère le créneau (status=available).';

-- ---------------------------------------------------------------------
-- delete_booking(booking_id) — purge RGPD d'un prospect
-- ---------------------------------------------------------------------
-- Supprime la réservation (donc toutes les données perso du prospect).
-- Si elle était active (confirmed), le créneau est libéré (available) ;
-- sinon le statut du créneau est laissé tel quel.
-- Retourne TRUE si le créneau a été libéré.
-- Politique de rétention : cf. README (par défaut, purge sur demande
-- du prospect ou après expiration du délai de conservation prospect).
CREATE OR REPLACE FUNCTION delete_booking(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_slot_id uuid;
  v_status  booking_status;
  v_freed   boolean := false;
BEGIN
  SELECT slot_id, status INTO v_slot_id, v_status
    FROM discovery_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation % introuvable.', p_booking_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_status = 'confirmed' THEN
    UPDATE availability_slots SET status = 'available'
     WHERE id = v_slot_id AND status = 'booked';
    v_freed := true;
  END IF;

  DELETE FROM discovery_bookings WHERE id = p_booking_id;
  RETURN v_freed;
END;
$$;
COMMENT ON FUNCTION delete_booking(uuid) IS 'Purge RGPD d''un prospect : supprime la réservation ; libère le créneau si elle était confirmée. Retourne TRUE si le créneau a été libéré.';
