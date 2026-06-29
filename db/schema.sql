-- =====================================================================
-- schema.sql — SCHÉMA CONSOLIDÉ (généré, ne pas éditer à la main)
-- ---------------------------------------------------------------------
-- Source de vérité = migrations/*.sql appliquées dans l'ordre.
-- Régénérer après toute migration :
--   pg_dump -d image_coaching --schema-only --no-owner --no-privileges \
--           -T schema_migrations > schema.sql
-- (la table d'orchestration schema_migrations est volontairement exclue)
-- =====================================================================

--
-- PostgreSQL database dump
--

\restrict tyZvXRdhOKqgbMIZ94OsilKd7MrO0dufl0LONO1SwmypTot2us0wo53UDuYOf07

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'new',
    'reviewing',
    'selected',
    'rejected',
    'converted'
);


--
-- Name: TYPE application_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.application_status IS 'Statut de triage d''une candidature : new, reviewing, selected, rejected, converted.';


--
-- Name: asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_type AS ENUM (
    'piece_photo',
    'moodboard',
    'look',
    'colorimetrie',
    'morphologie',
    'other'
);


--
-- Name: TYPE asset_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.asset_type IS 'Nature d''un asset image : photo de pièce, moodboard, look, planche colorimétrie/morphologie, autre.';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);


--
-- Name: TYPE booking_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.booking_status IS 'Statut d''une réservation : confirmed, cancelled, completed, no_show.';


--
-- Name: cliente_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cliente_status AS ENUM (
    'onboarding',
    'in_progress',
    'completed',
    'archived'
);


--
-- Name: TYPE cliente_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.cliente_status IS 'Statut global de l''accompagnement : onboarding, in_progress, completed, archived.';


--
-- Name: consent_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_scope AS ENUM (
    'photos',
    'traitement_donnees'
);


--
-- Name: TYPE consent_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.consent_scope IS 'Périmètre d''un consentement RGPD : photos (données sensibles) ou traitement_donnees.';


--
-- Name: morpho_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.morpho_type AS ENUM (
    'H',
    'X',
    'A',
    'V',
    'O',
    '8'
);


--
-- Name: TYPE morpho_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.morpho_type IS 'Type de silhouette : H, X, A, V, O ou 8.';


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'pilier_submitted',
    'pilier_validated',
    'pilier_needs_revision',
    'message_received',
    'system'
);


--
-- Name: TYPE notification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.notification_type IS 'Type de notification applicative : pilier_submitted, pilier_validated, pilier_needs_revision, message_received, system.';


--
-- Name: pilier_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pilier_status AS ENUM (
    'locked',
    'in_progress',
    'submitted',
    'validated',
    'needs_revision'
);


--
-- Name: TYPE pilier_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.pilier_status IS 'Avancement d''un pilier : locked (verrouillé), in_progress, submitted (soumis à la coach), validated, needs_revision (corrections demandées).';


--
-- Name: slot_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.slot_status AS ENUM (
    'available',
    'booked',
    'blocked'
);


--
-- Name: TYPE slot_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.slot_status IS 'Statut d''un créneau : available (libre), booked (réservé), blocked (fermé par l''admin).';


--
-- Name: tri_criterion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tri_criterion AS ENUM (
    'plus_physique',
    'plus_correspond',
    'plus_aligne'
);


--
-- Name: TYPE tri_criterion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.tri_criterion IS 'Critère de sortie : ne va plus physiquement (plus_physique), ne correspond plus (plus_correspond), plus alignée avec qui elle veut être (plus_aligne).';


--
-- Name: tri_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tri_decision AS ENUM (
    'garder',
    'sortir'
);


--
-- Name: TYPE tri_decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.tri_decision IS 'Résultat du tri guidé d''une pièce : garder ou sortir.';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'cliente',
    'coach'
);


--
-- Name: TYPE user_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.user_role IS 'Rôle d''un compte : cliente ou coach (admin unique du métier).';


--
-- Name: validation_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_decision AS ENUM (
    'validated',
    'needs_revision'
);


--
-- Name: TYPE validation_decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.validation_decision IS 'Décision de la coach sur un pilier soumis : validated ou needs_revision.';


--
-- Name: wardrobe_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wardrobe_category AS ENUM (
    'basique',
    'personnalite',
    'dopamine'
);


--
-- Name: TYPE wardrobe_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.wardrobe_category IS 'Catégorie de pièce dans la nouvelle garde-robe : basique, personnalité, dopamine.';


--
-- Name: word_slot; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.word_slot AS ENUM (
    'who_she_is',
    'what_she_likes',
    'to_embody'
);


--
-- Name: TYPE word_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.word_slot IS 'Slot des 3 mots-boussole : who_she_is, what_she_likes, to_embody. Utilisé pour rattacher une pièce à un mot sans dépendre de son libellé.';


--
-- Name: admin_reset_cliente_password(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_reset_cliente_password(p_cliente_id uuid, p_new_password_hash text) RETURNS void
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


--
-- Name: FUNCTION admin_reset_cliente_password(p_cliente_id uuid, p_new_password_hash text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.admin_reset_cliente_password(p_cliente_id uuid, p_new_password_hash text) IS 'Reset admin : nouveau hash temporaire + must_change_password=true. password_changed_at inchangé (réservé aux changements par l''utilisateur).';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: discovery_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discovery_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email public.citext NOT NULL,
    phone text,
    message text,
    status public.booking_status DEFAULT 'confirmed'::public.booking_status NOT NULL,
    consent_at timestamp with time zone NOT NULL,
    converted_cliente_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discovery_bookings_email_format_chk CHECK ((POSITION(('@'::text) IN (email)) > 1)),
    CONSTRAINT discovery_bookings_first_name_chk CHECK ((length(btrim(first_name)) > 0)),
    CONSTRAINT discovery_bookings_last_name_chk CHECK ((length(btrim(last_name)) > 0))
);


--
-- Name: TABLE discovery_bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discovery_bookings IS 'Réservations d''appel découverte (prospects). Contient des données personnelles -> purge RGPD via delete_booking().';


--
-- Name: COLUMN discovery_bookings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.id IS 'Identifiant technique de la réservation (UUID).';


--
-- Name: COLUMN discovery_bookings.slot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.slot_id IS 'Créneau réservé. ON DELETE RESTRICT (un créneau réservé ne se supprime pas par accident).';


--
-- Name: COLUMN discovery_bookings.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.first_name IS 'Prénom du prospect.';


--
-- Name: COLUMN discovery_bookings.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.last_name IS 'Nom du prospect.';


--
-- Name: COLUMN discovery_bookings.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.email IS 'Email du prospect (citext, insensible à la casse).';


--
-- Name: COLUMN discovery_bookings.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.phone IS 'Téléphone du prospect, optionnel.';


--
-- Name: COLUMN discovery_bookings.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.message IS 'Message libre du prospect (motivation / contexte), optionnel.';


--
-- Name: COLUMN discovery_bookings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.status IS 'Statut de la réservation (confirmed, cancelled, completed, no_show).';


--
-- Name: COLUMN discovery_bookings.consent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.consent_at IS 'Horodatage du consentement RGPD donné au moment de la réservation (obligatoire).';


--
-- Name: COLUMN discovery_bookings.converted_cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.converted_cliente_id IS 'Cliente issue de ce prospect, le cas échéant (funnel). ON DELETE SET NULL.';


--
-- Name: COLUMN discovery_bookings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.created_at IS 'Date de création de la réservation.';


--
-- Name: COLUMN discovery_bookings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discovery_bookings.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: book_slot(uuid, text, text, public.citext, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.book_slot(p_slot_id uuid, p_first_name text, p_last_name text, p_email public.citext, p_phone text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_consent_at timestamp with time zone DEFAULT now()) RETURNS public.discovery_bookings
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


--
-- Name: FUNCTION book_slot(p_slot_id uuid, p_first_name text, p_last_name text, p_email public.citext, p_phone text, p_message text, p_consent_at timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.book_slot(p_slot_id uuid, p_first_name text, p_last_name text, p_email public.citext, p_phone text, p_message text, p_consent_at timestamp with time zone) IS 'Réserve un créneau de façon atomique (verrou de ligne) : crée la réservation et passe le créneau à booked. Échoue si le créneau n''est pas libre.';


--
-- Name: cancel_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_booking(p_booking_id uuid) RETURNS public.discovery_bookings
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


--
-- Name: FUNCTION cancel_booking(p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_booking(p_booking_id uuid) IS 'Annule une réservation confirmée (status=cancelled) et libère le créneau (status=available).';


--
-- Name: change_own_password(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_own_password(p_user_id uuid, p_new_password_hash text) RETURNS void
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


--
-- Name: FUNCTION change_own_password(p_user_id uuid, p_new_password_hash text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.change_own_password(p_user_id uuid, p_new_password_hash text) IS 'L''utilisateur change SON mot de passe : nouveau hash, must_change_password=false, password_changed_at=now(). Reçoit un HASH.';


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    city text,
    situation text,
    status public.cliente_status DEFAULT 'onboarding'::public.cliente_status NOT NULL,
    accompaniment_start_date date,
    accompaniment_end_date date,
    word_who_she_is text,
    word_what_she_likes text,
    word_to_embody text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    birth_date date,
    CONSTRAINT clientes_birth_date_chk CHECK (((birth_date IS NULL) OR (birth_date >= '1900-01-01'::date))),
    CONSTRAINT clientes_dates_chk CHECK (((accompaniment_end_date IS NULL) OR (accompaniment_start_date IS NULL) OR (accompaniment_end_date >= accompaniment_start_date)))
);


--
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clientes IS 'Profil d''une cliente accompagnée. Relation 1-1 avec un compte users de rôle cliente.';


--
-- Name: COLUMN clientes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.id IS 'Identifiant technique de la cliente (UUID).';


--
-- Name: COLUMN clientes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.user_id IS 'Compte de connexion associé (unique). ON DELETE CASCADE : supprimer le compte supprime la cliente et toutes ses données (droit à l''oubli).';


--
-- Name: COLUMN clientes.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.first_name IS 'Prénom de la cliente.';


--
-- Name: COLUMN clientes.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.last_name IS 'Nom de la cliente.';


--
-- Name: COLUMN clientes.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.city IS 'Ville de la cliente, optionnel.';


--
-- Name: COLUMN clientes.situation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.situation IS 'Situation / contexte de vie déclaré, optionnel.';


--
-- Name: COLUMN clientes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.status IS 'Statut global de l''accompagnement (onboarding, in_progress, completed, archived).';


--
-- Name: COLUMN clientes.accompaniment_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.accompaniment_start_date IS 'Date de début d''accompagnement, optionnelle.';


--
-- Name: COLUMN clientes.accompaniment_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.accompaniment_end_date IS 'Date de fin d''accompagnement, optionnelle (>= date de début).';


--
-- Name: COLUMN clientes.word_who_she_is; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.word_who_she_is IS 'Mot-boussole 1 : qui elle est. Nullable tant que le pilier 1 n''est pas validé.';


--
-- Name: COLUMN clientes.word_what_she_likes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.word_what_she_likes IS 'Mot-boussole 2 : ce qu''elle aime. Nullable tant que le pilier 1 n''est pas validé.';


--
-- Name: COLUMN clientes.word_to_embody; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.word_to_embody IS 'Mot-boussole 3 : qui elle veut incarner. Nullable tant que le pilier 1 n''est pas validé.';


--
-- Name: COLUMN clientes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.created_at IS 'Date de création du profil.';


--
-- Name: COLUMN clientes.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: COLUMN clientes.birth_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clientes.birth_date IS 'Date de naissance (remplace age, qui vieillissait mal). L''âge est calculé À LA VOLÉE si besoin (EXTRACT(YEAR FROM age(birth_date))), jamais stocké. Borne : >= 1900-01-01 (CHECK) et <= aujourd''hui (trigger).';


--
-- Name: convert_application_to_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_application_to_cliente(p_application_id uuid) RETURNS public.clientes
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


--
-- Name: FUNCTION convert_application_to_cliente(p_application_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.convert_application_to_cliente(p_application_id uuid) IS 'Crée users + clientes à partir d''une candidature et la marque converted. NE pré-remplit PAS les 3 mots du Pilier 01 (référence seulement). Mot de passe sentinel à réinitialiser via invitation.';


--
-- Name: create_cliente_account(public.citext, text, text, text, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_cliente_account(p_email public.citext, p_password_hash text, p_first_name text, p_last_name text, p_birth_date date DEFAULT NULL::date, p_city text DEFAULT NULL::text, p_situation text DEFAULT NULL::text) RETURNS uuid
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


--
-- Name: FUNCTION create_cliente_account(p_email public.citext, p_password_hash text, p_first_name text, p_last_name text, p_birth_date date, p_city text, p_situation text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_cliente_account(p_email public.citext, p_password_hash text, p_first_name text, p_last_name text, p_birth_date date, p_city text, p_situation text) IS 'Crée un compte cliente (users role cliente + clientes + 4 piliers) avec must_change_password=true. Reçoit un HASH et une date de naissance. Renvoie l''id de la cliente.';


--
-- Name: create_piliers_for_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_piliers_for_cliente() RETURNS trigger
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


--
-- Name: FUNCTION create_piliers_for_cliente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_piliers_for_cliente() IS 'Trigger AFTER INSERT clientes : crée les 4 piliers (1 in_progress, 2-4 locked).';


--
-- Name: delete_application(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_application(p_application_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM applications WHERE id = p_application_id) THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = 'no_data_found';
  END IF;
  DELETE FROM applications WHERE id = p_application_id;
END;
$$;


--
-- Name: FUNCTION delete_application(p_application_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_application(p_application_id uuid) IS 'Purge RGPD d''un prospect : supprime la candidature. Le compte cliente éventuellement converti subsiste (séparé) ; utiliser delete_cliente() pour l''effacer aussi.';


--
-- Name: delete_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_booking(p_booking_id uuid) RETURNS boolean
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


--
-- Name: FUNCTION delete_booking(p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_booking(p_booking_id uuid) IS 'Purge RGPD d''un prospect : supprime la réservation ; libère le créneau si elle était confirmée. Retourne TRUE si le créneau a été libéré.';


--
-- Name: delete_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_cliente(p_cliente_id uuid) RETURNS SETOF text
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


--
-- Name: FUNCTION delete_cliente(p_cliente_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_cliente(p_cliente_id uuid) IS 'Droit à l''oubli : renvoie les storage_url des assets (à purger côté object storage) PUIS supprime en cascade la cliente, son compte et toutes ses données.';


--
-- Name: enforce_birth_date_not_future(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_birth_date_not_future() RETURNS trigger
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


--
-- Name: FUNCTION enforce_birth_date_not_future(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.enforce_birth_date_not_future() IS 'Trigger : interdit une birth_date dans le futur (règle impossible en CHECK car current_date n''est pas IMMUTABLE).';


--
-- Name: enforce_cliente_user_is_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_cliente_user_is_cliente() RETURNS trigger
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


--
-- Name: FUNCTION enforce_cliente_user_is_cliente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.enforce_cliente_user_is_cliente() IS 'Trigger : garantit qu''une ligne clientes pointe vers un compte users de rôle cliente.';


--
-- Name: enforce_pilier_gate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_pilier_gate() RETURNS trigger
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


--
-- Name: FUNCTION enforce_pilier_gate(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.enforce_pilier_gate() IS 'Trigger BEFORE INSERT/UPDATE piliers : empêche le passage in_progress d''un pilier tant que le précédent n''est pas validé.';


--
-- Name: forget_person(public.citext); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.forget_person(p_email public.citext) RETURNS SETOF text
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


--
-- Name: FUNCTION forget_person(p_email public.citext); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.forget_person(p_email public.citext) IS 'Effacement RGPD complet par email : clientes (+ cascade messages/attachments/assets/…), notifications nominatives (payload.cliente_id), discovery_bookings et applications. Renvoie les storage_url à purger. Tolérant aux emails inconnus.';


--
-- Name: notify_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_message() RETURNS trigger
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


--
-- Name: FUNCTION notify_new_message(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notify_new_message() IS 'Trigger AFTER INSERT messages : émet pg_notify(''new_message'', {id, cliente_id, sender_role, created_at}) pour le temps réel applicatif (LISTEN/WebSocket).';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_updated_at(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger générique BEFORE UPDATE : force updated_at = now(). Appliqué à toutes les tables horodatées en écriture.';


--
-- Name: piliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.piliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    numero smallint NOT NULL,
    status public.pilier_status DEFAULT 'locked'::public.pilier_status NOT NULL,
    submitted_at timestamp with time zone,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT piliers_numero_chk CHECK (((numero >= 1) AND (numero <= 4)))
);


--
-- Name: TABLE piliers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.piliers IS 'Avancement d''un pilier (1 à 4) pour une cliente. Les 4 piliers sont créés automatiquement à l''insertion de la cliente (cf. 007).';


--
-- Name: COLUMN piliers.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.id IS 'Identifiant technique du pilier (UUID).';


--
-- Name: COLUMN piliers.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN piliers.numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.numero IS 'Numéro de pilier : 1 (Identité), 2 (Mise en valeur), 3 (Tri), 4 (Construction).';


--
-- Name: COLUMN piliers.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.status IS 'Statut du pilier. Défaut locked ; le pilier 1 démarre in_progress.';


--
-- Name: COLUMN piliers.submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.submitted_at IS 'Date de soumission à la coach (renseignée par submit_pilier).';


--
-- Name: COLUMN piliers.validated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.validated_at IS 'Date de validation par la coach (renseignée par validate_pilier).';


--
-- Name: COLUMN piliers.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.created_at IS 'Date de création de la ligne pilier.';


--
-- Name: COLUMN piliers.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.piliers.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: submit_pilier(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_pilier(p_pilier_id uuid) RETURNS public.piliers
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


--
-- Name: FUNCTION submit_pilier(p_pilier_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.submit_pilier(p_pilier_id uuid) IS 'Soumet un pilier (in_progress|needs_revision -> submitted, fixe submitted_at).';


--
-- Name: validate_pilier(uuid, uuid, public.validation_decision, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_pilier(p_pilier_id uuid, p_coach_id uuid, p_decision public.validation_decision, p_comment text DEFAULT NULL::text) RETURNS public.piliers
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


--
-- Name: FUNCTION validate_pilier(p_pilier_id uuid, p_coach_id uuid, p_decision public.validation_decision, p_comment text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_pilier(p_pilier_id uuid, p_coach_id uuid, p_decision public.validation_decision, p_comment text) IS 'Décision de la coach : journalise, met à jour le pilier, et débloque le suivant si validated.';


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    instagram text NOT NULL,
    email public.citext NOT NULL,
    birth_date date NOT NULL,
    profession text NOT NULL,
    motivation text NOT NULL,
    current_image text NOT NULL,
    goal text NOT NULL,
    words_today text NOT NULL,
    words_to_embody text NOT NULL,
    main_blocker text NOT NULL,
    why_now text NOT NULL,
    commitment_level text NOT NULL,
    status public.application_status DEFAULT 'new'::public.application_status NOT NULL,
    consent_at timestamp with time zone NOT NULL,
    admin_notes text,
    converted_cliente_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT applications_converted_link_chk CHECK (((converted_cliente_id IS NULL) OR (status = 'converted'::public.application_status))),
    CONSTRAINT applications_email_format_chk CHECK ((POSITION(('@'::text) IN (email)) > 1)),
    CONSTRAINT applications_full_name_chk CHECK ((length(btrim(full_name)) > 0)),
    CONSTRAINT applications_instagram_chk CHECK ((length(btrim(instagram)) > 0))
);


--
-- Name: TABLE applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.applications IS 'Candidatures au coaching (questionnaire public « Rejoins la liste d''attente »). Prospects, séparés de clientes. Données perso -> purge RGPD via delete_application().';


--
-- Name: COLUMN applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.id IS 'Identifiant technique de la candidature (UUID).';


--
-- Name: COLUMN applications.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.full_name IS 'Q1 — Nom & Prénom du candidat.';


--
-- Name: COLUMN applications.instagram; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.instagram IS 'Q2 — Handle Instagram.';


--
-- Name: COLUMN applications.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.email IS 'Q3 — Email (citext, insensible à la casse).';


--
-- Name: COLUMN applications.birth_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.birth_date IS 'Q4 — Date de naissance.';


--
-- Name: COLUMN applications.profession; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.profession IS 'Q5 — Profession.';


--
-- Name: COLUMN applications.motivation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.motivation IS 'Q6 — Ce qui a donné envie de candidater.';


--
-- Name: COLUMN applications.current_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.current_image IS 'Q7 — Définition de son image actuelle.';


--
-- Name: COLUMN applications.goal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.goal IS 'Q8 — Ce qu''elle espère ressentir / incarner / accomplir.';


--
-- Name: COLUMN applications.words_today; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.words_today IS 'Q9 — 3 mots qui la décrivent aujourd''hui (signal pour la coach, NON injecté dans le Pilier 01).';


--
-- Name: COLUMN applications.words_to_embody; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.words_to_embody IS 'Q10 — 3 mots de la version à incarner (signal pour la coach, NON injecté dans le Pilier 01).';


--
-- Name: COLUMN applications.main_blocker; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.main_blocker IS 'Q11 — Ce qui la freine le plus.';


--
-- Name: COLUMN applications.why_now; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.why_now IS 'Q12 — Pourquoi maintenant et pas dans 6 mois.';


--
-- Name: COLUMN applications.commitment_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.commitment_level IS 'Q13 — Niveau d''engagement (texte libre ; pourra devenir une échelle 1–10 si Justine préfère).';


--
-- Name: COLUMN applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.status IS 'Statut de triage (new, reviewing, selected, rejected, converted).';


--
-- Name: COLUMN applications.consent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.consent_at IS 'Horodatage du consentement RGPD donné à la soumission (obligatoire).';


--
-- Name: COLUMN applications.admin_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.admin_notes IS 'Notes internes de l''admin. Jamais exposées au candidat.';


--
-- Name: COLUMN applications.converted_cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.converted_cliente_id IS 'Cliente créée à partir de cette candidature, le cas échéant. ON DELETE SET NULL.';


--
-- Name: COLUMN applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.created_at IS 'Date de soumission de la candidature.';


--
-- Name: COLUMN applications.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.applications.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    pilier_id uuid,
    consent_id uuid,
    type public.asset_type DEFAULT 'other'::public.asset_type NOT NULL,
    storage_url text NOT NULL,
    storage_provider text DEFAULT 'supabase'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assets_storage_url_chk CHECK ((storage_url ~ '^https?://'::text))
);


--
-- Name: TABLE assets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assets IS 'Métadonnées des images (photos de pièces, planches, looks...). Le binaire est stocké hors base ; seule l''URL est conservée.';


--
-- Name: COLUMN assets.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.id IS 'Identifiant technique de l''asset (UUID).';


--
-- Name: COLUMN assets.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN assets.pilier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.pilier_id IS 'Pilier de rattachement, optionnel. ON DELETE SET NULL.';


--
-- Name: COLUMN assets.consent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.consent_id IS 'Consentement RGPD couvrant l''image, optionnel. ON DELETE SET NULL.';


--
-- Name: COLUMN assets.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.type IS 'Nature de l''asset (piece_photo, moodboard, look, colorimetrie, morphologie, other).';


--
-- Name: COLUMN assets.storage_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.storage_url IS 'URL absolue de l''objet dans l''object storage (http/https). Jamais de binaire en base.';


--
-- Name: COLUMN assets.storage_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.storage_provider IS 'Fournisseur de stockage (ex. supabase, ionos_s3).';


--
-- Name: COLUMN assets.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.created_at IS 'Date d''enregistrement de l''asset.';


--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status public.slot_status DEFAULT 'available'::public.slot_status NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_slots_interval_chk CHECK ((end_at > start_at))
);


--
-- Name: TABLE availability_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.availability_slots IS 'Créneaux d''appel découverte ouverts/fermés par l''admin (un créneau = un slot daté discret).';


--
-- Name: COLUMN availability_slots.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.id IS 'Identifiant technique du créneau (UUID).';


--
-- Name: COLUMN availability_slots.start_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.start_at IS 'Début du créneau (timestamptz, UTC en base).';


--
-- Name: COLUMN availability_slots.end_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.end_at IS 'Fin du créneau (> start_at).';


--
-- Name: COLUMN availability_slots.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.status IS 'available (libre), booked (réservé), blocked (fermé par l''admin).';


--
-- Name: COLUMN availability_slots.admin_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.admin_note IS 'Note réservée à l''admin. JAMAIS exposée à la vue publique.';


--
-- Name: COLUMN availability_slots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.created_at IS 'Date de création du créneau.';


--
-- Name: COLUMN availability_slots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.availability_slots.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: color_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.color_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    season text,
    palette jsonb DEFAULT '{}'::jsonb NOT NULL,
    makeup_reco text,
    hair_reco text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE color_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.color_profiles IS 'Profil colorimétrie d''une cliente (pilier 2). Relation 1-1.';


--
-- Name: COLUMN color_profiles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.id IS 'Identifiant technique (UUID).';


--
-- Name: COLUMN color_profiles.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.cliente_id IS 'Cliente concernée (unique). ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN color_profiles.season; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.season IS 'Saison colorimétrique (ex. « Printemps clair », « Hiver froid »). Texte libre pour couvrir les systèmes 4 ou 12 saisons.';


--
-- Name: COLUMN color_profiles.palette; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.palette IS 'Palette de couleurs (JSON : dominantes, à éviter, etc.).';


--
-- Name: COLUMN color_profiles.makeup_reco; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.makeup_reco IS 'Recommandations maquillage.';


--
-- Name: COLUMN color_profiles.hair_reco; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.hair_reco IS 'Recommandations cheveux / coloration.';


--
-- Name: COLUMN color_profiles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.created_at IS 'Date de création du profil.';


--
-- Name: COLUMN color_profiles.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.color_profiles.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    scope public.consent_scope NOT NULL,
    granted boolean DEFAULT false NOT NULL,
    granted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consents_granted_at_chk CHECK (((granted = false) OR (granted_at IS NOT NULL))),
    CONSTRAINT consents_revoked_after_granted_chk CHECK (((revoked_at IS NULL) OR (granted_at IS NULL) OR (revoked_at >= granted_at)))
);


--
-- Name: TABLE consents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.consents IS 'Consentements RGPD d''une cliente, un enregistrement par périmètre (photos, traitement_donnees).';


--
-- Name: COLUMN consents.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.id IS 'Identifiant technique du consentement (UUID).';


--
-- Name: COLUMN consents.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.cliente_id IS 'Cliente concernée. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN consents.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.scope IS 'Périmètre : photos ou traitement_donnees.';


--
-- Name: COLUMN consents.granted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.granted IS 'Vrai si le consentement est actuellement accordé.';


--
-- Name: COLUMN consents.granted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.granted_at IS 'Date d''octroi (obligatoire si granted = true).';


--
-- Name: COLUMN consents.revoked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.revoked_at IS 'Date de révocation, le cas échéant (>= granted_at).';


--
-- Name: COLUMN consents.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.created_at IS 'Date de création de l''enregistrement.';


--
-- Name: COLUMN consents.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consents.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: look_pieces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.look_pieces (
    look_id uuid NOT NULL,
    piece_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE look_pieces; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.look_pieces IS 'Association N-N entre looks et pièces.';


--
-- Name: COLUMN look_pieces.look_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.look_pieces.look_id IS 'Look concerné. ON DELETE CASCADE.';


--
-- Name: COLUMN look_pieces.piece_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.look_pieces.piece_id IS 'Pièce composant le look. ON DELETE CASCADE.';


--
-- Name: COLUMN look_pieces.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.look_pieces.created_at IS 'Date d''ajout de la pièce au look.';


--
-- Name: looks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.looks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    name text NOT NULL,
    category public.wardrobe_category,
    annotation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE looks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.looks IS 'Tenues (looks) créées au pilier 4, composées de plusieurs pièces.';


--
-- Name: COLUMN looks.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.id IS 'Identifiant technique du look (UUID).';


--
-- Name: COLUMN looks.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN looks.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.name IS 'Nom du look.';


--
-- Name: COLUMN looks.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.category IS 'Catégorie dominante du look, optionnelle (basique, personnalite, dopamine).';


--
-- Name: COLUMN looks.annotation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.annotation IS 'Note libre de la coach ou de la cliente sur le look.';


--
-- Name: COLUMN looks.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.created_at IS 'Date de création du look.';


--
-- Name: COLUMN looks.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_attachments (
    message_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE message_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_attachments IS 'Pièces jointes d''un message (N-N messages <-> assets). Réutilise assets (consentement + hébergement EU).';


--
-- Name: COLUMN message_attachments.message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.message_attachments.message_id IS 'Message porteur. ON DELETE CASCADE.';


--
-- Name: COLUMN message_attachments.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.message_attachments.asset_id IS 'Asset joint (photo, etc.). ON DELETE CASCADE.';


--
-- Name: COLUMN message_attachments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.message_attachments.created_at IS 'Date d''ajout de la pièce jointe.';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    sender_role public.user_role NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT messages_body_not_empty_chk CHECK ((length(btrim(body)) > 0))
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Messagerie cliente <-> coach (un fil par cliente). Table OPTIONNELLE et isolée.';


--
-- Name: COLUMN messages.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.id IS 'Identifiant technique du message (UUID).';


--
-- Name: COLUMN messages.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.cliente_id IS 'Cliente dont c''est le fil. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN messages.sender_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.sender_role IS 'Rôle de l''expéditeur (cliente ou coach), dupliqué pour l''affichage.';


--
-- Name: COLUMN messages.sender_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.sender_id IS 'Compte expéditeur. ON DELETE CASCADE.';


--
-- Name: COLUMN messages.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.body IS 'Contenu du message (non vide).';


--
-- Name: COLUMN messages.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.read_at IS 'Date de lecture, NULL si non lu.';


--
-- Name: COLUMN messages.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.created_at IS 'Date d''envoi du message.';


--
-- Name: COLUMN messages.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.updated_at IS 'Date de dernière modification de la ligne (maintenue par trigger set_updated_at).';


--
-- Name: COLUMN messages.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.delivered_at IS 'Accusé de remise (message arrivé au destinataire). Distinct de read_at (accusé de lecture).';


--
-- Name: COLUMN messages.edited_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.edited_at IS 'Date de dernière édition du contenu, NULL si jamais modifié.';


--
-- Name: COLUMN messages.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.deleted_at IS 'Soft delete : masque le message sans casser l''historique du fil. NULL si actif.';


--
-- Name: moodboard_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moodboard_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moodboard_id uuid NOT NULL,
    asset_id uuid,
    source_url text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moodboard_items_source_chk CHECK (((asset_id IS NOT NULL) OR (source_url IS NOT NULL))),
    CONSTRAINT moodboard_items_source_url_format_chk CHECK (((source_url IS NULL) OR (source_url ~ '^https?://'::text)))
);


--
-- Name: TABLE moodboard_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.moodboard_items IS 'Éléments d''une planche d''inspiration : asset interne ou lien externe.';


--
-- Name: COLUMN moodboard_items.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.id IS 'Identifiant technique (UUID).';


--
-- Name: COLUMN moodboard_items.moodboard_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.moodboard_id IS 'Planche parente. ON DELETE CASCADE.';


--
-- Name: COLUMN moodboard_items.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.asset_id IS 'Asset interne référencé, optionnel. ON DELETE SET NULL.';


--
-- Name: COLUMN moodboard_items.source_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.source_url IS 'URL externe d''inspiration (http/https), optionnelle si asset_id présent.';


--
-- Name: COLUMN moodboard_items.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.note IS 'Note libre sur l''élément.';


--
-- Name: COLUMN moodboard_items.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboard_items.created_at IS 'Date d''ajout de l''élément.';


--
-- Name: moodboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moodboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    pilier_id uuid,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE moodboards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.moodboards IS 'Planches d''inspiration d''une cliente (pilier 1 « mot 2 » et pilier 4).';


--
-- Name: COLUMN moodboards.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.id IS 'Identifiant technique (UUID).';


--
-- Name: COLUMN moodboards.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN moodboards.pilier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.pilier_id IS 'Pilier de rattachement, optionnel. ON DELETE SET NULL.';


--
-- Name: COLUMN moodboards.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.title IS 'Titre de la planche.';


--
-- Name: COLUMN moodboards.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.created_at IS 'Date de création.';


--
-- Name: COLUMN moodboards.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.moodboards.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: morpho_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.morpho_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    type public.morpho_type NOT NULL,
    measurements jsonb DEFAULT '{}'::jsonb NOT NULL,
    reco jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE morpho_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.morpho_profiles IS 'Profil morphologie d''une cliente (pilier 2). Relation 1-1.';


--
-- Name: COLUMN morpho_profiles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.id IS 'Identifiant technique (UUID).';


--
-- Name: COLUMN morpho_profiles.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.cliente_id IS 'Cliente concernée (unique). ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN morpho_profiles.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.type IS 'Type de silhouette : H, X, A, V, O, 8.';


--
-- Name: COLUMN morpho_profiles.measurements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.measurements IS 'Mensurations (JSON : épaules, taille, hanches...).';


--
-- Name: COLUMN morpho_profiles.reco; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.reco IS 'Recommandations coupes / volumes (JSON).';


--
-- Name: COLUMN morpho_profiles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.created_at IS 'Date de création du profil.';


--
-- Name: COLUMN morpho_profiles.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.morpho_profiles.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    type public.notification_type NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Notifications applicatives destinées à un utilisateur (cliente ou coach).';


--
-- Name: COLUMN notifications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.id IS 'Identifiant technique (UUID).';


--
-- Name: COLUMN notifications.recipient_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.recipient_id IS 'Utilisateur destinataire. ON DELETE CASCADE.';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.type IS 'Type de notification (enum notification_type).';


--
-- Name: COLUMN notifications.payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.payload IS 'Charge utile JSON (contexte de la notification). CONVENTION RGPD : toute notification concernant une cliente DOIT porter son id dans payload->>''cliente_id'' (utilisé par forget_person pour purger les notifications nominatives reçues par la coach).';


--
-- Name: COLUMN notifications.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.read_at IS 'Date de lecture, NULL si non lue.';


--
-- Name: COLUMN notifications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.created_at IS 'Date de création de la notification.';


--
-- Name: pending_validations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_validations AS
 SELECT p.id AS pilier_id,
    p.cliente_id,
    c.first_name,
    c.last_name,
    p.numero,
    p.submitted_at,
    p.status
   FROM (public.piliers p
     JOIN public.clientes c ON ((c.id = p.cliente_id)))
  WHERE (p.status = 'submitted'::public.pilier_status)
  ORDER BY p.submitted_at;


--
-- Name: VIEW pending_validations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.pending_validations IS 'File d''attente du dashboard coach : piliers soumis (submitted) en attente, triés par ancienneté (submitted_at croissant).';


--
-- Name: pieces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pieces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    asset_id uuid,
    name text NOT NULL,
    wardrobe_category public.wardrobe_category,
    tri_decision public.tri_decision,
    tri_criterion public.tri_criterion,
    linked_word public.word_slot,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pieces_criterion_requires_sortir_chk CHECK (((tri_criterion IS NULL) OR (tri_decision = 'sortir'::public.tri_decision)))
);


--
-- Name: TABLE pieces; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pieces IS 'Vêtements et accessoires de la cliente (utilisés au pilier 3 Tri et au pilier 4 Construction).';


--
-- Name: COLUMN pieces.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.id IS 'Identifiant technique de la pièce (UUID).';


--
-- Name: COLUMN pieces.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.cliente_id IS 'Cliente propriétaire. ON DELETE CASCADE (droit à l''oubli).';


--
-- Name: COLUMN pieces.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.asset_id IS 'Photo associée, optionnelle. ON DELETE SET NULL.';


--
-- Name: COLUMN pieces.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.name IS 'Libellé de la pièce.';


--
-- Name: COLUMN pieces.wardrobe_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.wardrobe_category IS 'Catégorie garde-robe (pilier 4) : basique, personnalite, dopamine. Null tant que non catégorisée.';


--
-- Name: COLUMN pieces.tri_decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.tri_decision IS 'Décision de tri (pilier 3) : garder ou sortir. Null tant que non triée.';


--
-- Name: COLUMN pieces.tri_criterion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.tri_criterion IS 'Critère de sortie (pilier 3), uniquement si tri_decision = sortir.';


--
-- Name: COLUMN pieces.linked_word; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.linked_word IS 'Mot-boussole auquel la pièce se rattache (slot parmi who_she_is / what_she_likes / to_embody).';


--
-- Name: COLUMN pieces.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.tags IS 'Étiquettes libres (tableau de texte), indexées (GIN) pour le filtrage.';


--
-- Name: COLUMN pieces.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.created_at IS 'Date de création de la pièce.';


--
-- Name: COLUMN pieces.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pieces.updated_at IS 'Date de dernière modification (maintenue par trigger).';


--
-- Name: public_availability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_availability AS
 SELECT id,
    start_at,
    end_at,
    (status = 'available'::public.slot_status) AS is_available
   FROM public.availability_slots
  WHERE (start_at > now());


--
-- Name: VIEW public_availability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.public_availability IS 'Vue publique des créneaux à venir. N''expose AUCUNE donnée personnelle. is_available=false => créneau grisé (réservé ou fermé).';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.user_role NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    password_changed_at timestamp with time zone,
    last_login_at timestamp with time zone,
    CONSTRAINT users_email_format_chk CHECK ((POSITION(('@'::text) IN (email)) > 1)),
    CONSTRAINT users_password_hash_not_empty_chk CHECK ((length(password_hash) > 0))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Comptes de connexion de l''application. Deux rôles possibles : cliente ou coach (admin).';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS 'Identifiant technique du compte (UUID).';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Rôle du compte : cliente ou coach.';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'Email de connexion, insensible à la casse (citext), unique.';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Hash du mot de passe (jamais stocké en clair). Le hachage est réalisé côté application.';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS 'Date de création du compte.';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS 'Date de dernière modification (maintenue par trigger set_updated_at).';


--
-- Name: COLUMN users.must_change_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.must_change_password IS 'Vrai tant que l''utilisateur doit changer son mot de passe (création de compte cliente, reset admin). L''app force alors l''écran de changement.';


--
-- Name: COLUMN users.password_changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_changed_at IS 'Date du dernier changement de mot de passe par l''utilisateur LUI-MÊME (pas par un reset admin).';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS 'Date de dernière connexion (renseignée par l''app à la connexion). Utile au dashboard admin. Optionnel.';


--
-- Name: validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pilier_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    decision public.validation_decision NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE validations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.validations IS 'Journal des décisions de la coach sur les piliers soumis (audit, non modifiable).';


--
-- Name: COLUMN validations.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.id IS 'Identifiant technique de la décision (UUID).';


--
-- Name: COLUMN validations.pilier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.pilier_id IS 'Pilier concerné. ON DELETE CASCADE (suit la cliente).';


--
-- Name: COLUMN validations.coach_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.coach_id IS 'Coach auteur de la décision. ON DELETE RESTRICT : on n''efface pas une coach qui a un historique de validations.';


--
-- Name: COLUMN validations.decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.decision IS 'Décision : validated ou needs_revision.';


--
-- Name: COLUMN validations.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.comment IS 'Commentaire / consigne de la coach, optionnel.';


--
-- Name: COLUMN validations.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.validations.created_at IS 'Horodatage de la décision.';


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_user_id_key UNIQUE (user_id);


--
-- Name: color_profiles color_profiles_cliente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.color_profiles
    ADD CONSTRAINT color_profiles_cliente_id_key UNIQUE (cliente_id);


--
-- Name: color_profiles color_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.color_profiles
    ADD CONSTRAINT color_profiles_pkey PRIMARY KEY (id);


--
-- Name: consents consents_cliente_scope_uk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_cliente_scope_uk UNIQUE (cliente_id, scope);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: discovery_bookings discovery_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_bookings
    ADD CONSTRAINT discovery_bookings_pkey PRIMARY KEY (id);


--
-- Name: look_pieces look_pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_pkey PRIMARY KEY (look_id, piece_id);


--
-- Name: looks looks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (message_id, asset_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: moodboard_items moodboard_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_pkey PRIMARY KEY (id);


--
-- Name: moodboards moodboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_pkey PRIMARY KEY (id);


--
-- Name: morpho_profiles morpho_profiles_cliente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.morpho_profiles
    ADD CONSTRAINT morpho_profiles_cliente_id_key UNIQUE (cliente_id);


--
-- Name: morpho_profiles morpho_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.morpho_profiles
    ADD CONSTRAINT morpho_profiles_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pieces pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_pkey PRIMARY KEY (id);


--
-- Name: piliers piliers_cliente_numero_uk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piliers
    ADD CONSTRAINT piliers_cliente_numero_uk UNIQUE (cliente_id, numero);


--
-- Name: piliers piliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piliers
    ADD CONSTRAINT piliers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: validations validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validations
    ADD CONSTRAINT validations_pkey PRIMARY KEY (id);


--
-- Name: discovery_bookings_active_slot_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX discovery_bookings_active_slot_uk ON public.discovery_bookings USING btree (slot_id) WHERE (status = 'confirmed'::public.booking_status);


--
-- Name: idx_applications_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_converted ON public.applications USING btree (converted_cliente_id);


--
-- Name: idx_applications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_email ON public.applications USING btree (email);


--
-- Name: idx_applications_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status_created ON public.applications USING btree (status, created_at DESC);


--
-- Name: idx_assets_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_cliente_id ON public.assets USING btree (cliente_id);


--
-- Name: idx_assets_consent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_consent_id ON public.assets USING btree (consent_id);


--
-- Name: idx_assets_pilier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_pilier_id ON public.assets USING btree (pilier_id);


--
-- Name: idx_assets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_type ON public.assets USING btree (type);


--
-- Name: idx_availability_slots_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_start_at ON public.availability_slots USING btree (start_at);


--
-- Name: idx_availability_slots_status_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_slots_status_start ON public.availability_slots USING btree (status, start_at);


--
-- Name: idx_clientes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_status ON public.clientes USING btree (status);


--
-- Name: idx_consents_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consents_cliente_id ON public.consents USING btree (cliente_id);


--
-- Name: idx_discovery_bookings_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discovery_bookings_converted ON public.discovery_bookings USING btree (converted_cliente_id);


--
-- Name: idx_discovery_bookings_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discovery_bookings_email ON public.discovery_bookings USING btree (email);


--
-- Name: idx_discovery_bookings_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discovery_bookings_slot_id ON public.discovery_bookings USING btree (slot_id);


--
-- Name: idx_discovery_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discovery_bookings_status ON public.discovery_bookings USING btree (status);


--
-- Name: idx_look_pieces_piece_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_look_pieces_piece_id ON public.look_pieces USING btree (piece_id);


--
-- Name: idx_looks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_looks_category ON public.looks USING btree (category);


--
-- Name: idx_looks_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_looks_cliente_id ON public.looks USING btree (cliente_id);


--
-- Name: idx_message_attachments_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_attachments_asset_id ON public.message_attachments USING btree (asset_id);


--
-- Name: idx_messages_cliente_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_cliente_created ON public.messages USING btree (cliente_id, created_at);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (cliente_id) WHERE ((read_at IS NULL) AND (deleted_at IS NULL));


--
-- Name: idx_moodboard_items_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboard_items_asset_id ON public.moodboard_items USING btree (asset_id);


--
-- Name: idx_moodboard_items_moodboard_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboard_items_moodboard_id ON public.moodboard_items USING btree (moodboard_id);


--
-- Name: idx_moodboards_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboards_cliente_id ON public.moodboards USING btree (cliente_id);


--
-- Name: idx_moodboards_pilier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboards_pilier_id ON public.moodboards USING btree (pilier_id);


--
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- Name: idx_notifications_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_id ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_pieces_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pieces_asset_id ON public.pieces USING btree (asset_id);


--
-- Name: idx_pieces_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pieces_cliente_id ON public.pieces USING btree (cliente_id);


--
-- Name: idx_pieces_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pieces_tags ON public.pieces USING gin (tags);


--
-- Name: idx_pieces_tri_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pieces_tri_decision ON public.pieces USING btree (tri_decision);


--
-- Name: idx_pieces_wardrobe_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pieces_wardrobe_category ON public.pieces USING btree (wardrobe_category);


--
-- Name: idx_piliers_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_piliers_cliente_id ON public.piliers USING btree (cliente_id);


--
-- Name: idx_piliers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_piliers_status ON public.piliers USING btree (status);


--
-- Name: idx_piliers_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_piliers_submitted_at ON public.piliers USING btree (submitted_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_validations_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validations_coach_id ON public.validations USING btree (coach_id);


--
-- Name: idx_validations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validations_created_at ON public.validations USING btree (created_at);


--
-- Name: idx_validations_pilier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validations_pilier_id ON public.validations USING btree (pilier_id);


--
-- Name: applications trg_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: availability_slots trg_availability_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_availability_slots_updated_at BEFORE UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clientes trg_clientes_birth_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_birth_date BEFORE INSERT OR UPDATE OF birth_date ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.enforce_birth_date_not_future();


--
-- Name: clientes trg_clientes_create_piliers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_create_piliers AFTER INSERT ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.create_piliers_for_cliente();


--
-- Name: clientes trg_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clientes trg_clientes_user_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_user_role BEFORE INSERT OR UPDATE OF user_id ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.enforce_cliente_user_is_cliente();


--
-- Name: color_profiles trg_color_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_color_profiles_updated_at BEFORE UPDATE ON public.color_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: consents trg_consents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_consents_updated_at BEFORE UPDATE ON public.consents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: discovery_bookings trg_discovery_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_discovery_bookings_updated_at BEFORE UPDATE ON public.discovery_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: looks trg_looks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_looks_updated_at BEFORE UPDATE ON public.looks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: messages trg_messages_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();


--
-- Name: messages trg_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: moodboards trg_moodboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_moodboards_updated_at BEFORE UPDATE ON public.moodboards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: morpho_profiles trg_morpho_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_morpho_profiles_updated_at BEFORE UPDATE ON public.morpho_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pieces trg_pieces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pieces_updated_at BEFORE UPDATE ON public.pieces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: piliers trg_piliers_gate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_piliers_gate BEFORE INSERT OR UPDATE ON public.piliers FOR EACH ROW EXECUTE FUNCTION public.enforce_pilier_gate();


--
-- Name: piliers trg_piliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_piliers_updated_at BEFORE UPDATE ON public.piliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications applications_converted_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_converted_cliente_id_fkey FOREIGN KEY (converted_cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: assets assets_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: assets assets_consent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_consent_id_fkey FOREIGN KEY (consent_id) REFERENCES public.consents(id) ON DELETE SET NULL;


--
-- Name: assets assets_pilier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pilier_id_fkey FOREIGN KEY (pilier_id) REFERENCES public.piliers(id) ON DELETE SET NULL;


--
-- Name: clientes clientes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: color_profiles color_profiles_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.color_profiles
    ADD CONSTRAINT color_profiles_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: consents consents_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: discovery_bookings discovery_bookings_converted_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_bookings
    ADD CONSTRAINT discovery_bookings_converted_cliente_id_fkey FOREIGN KEY (converted_cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: discovery_bookings discovery_bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_bookings
    ADD CONSTRAINT discovery_bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.availability_slots(id) ON DELETE RESTRICT;


--
-- Name: look_pieces look_pieces_look_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_look_id_fkey FOREIGN KEY (look_id) REFERENCES public.looks(id) ON DELETE CASCADE;


--
-- Name: look_pieces look_pieces_piece_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_piece_id_fkey FOREIGN KEY (piece_id) REFERENCES public.pieces(id) ON DELETE CASCADE;


--
-- Name: looks looks_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moodboard_items moodboard_items_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: moodboard_items moodboard_items_moodboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_moodboard_id_fkey FOREIGN KEY (moodboard_id) REFERENCES public.moodboards(id) ON DELETE CASCADE;


--
-- Name: moodboards moodboards_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: moodboards moodboards_pilier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_pilier_id_fkey FOREIGN KEY (pilier_id) REFERENCES public.piliers(id) ON DELETE SET NULL;


--
-- Name: morpho_profiles morpho_profiles_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.morpho_profiles
    ADD CONSTRAINT morpho_profiles_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pieces pieces_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: pieces pieces_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pieces
    ADD CONSTRAINT pieces_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: piliers piliers_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.piliers
    ADD CONSTRAINT piliers_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: validations validations_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validations
    ADD CONSTRAINT validations_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: validations validations_pilier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validations
    ADD CONSTRAINT validations_pilier_id_fkey FOREIGN KEY (pilier_id) REFERENCES public.piliers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict tyZvXRdhOKqgbMIZ94OsilKd7MrO0dufl0LONO1SwmypTot2us0wo53UDuYOf07

