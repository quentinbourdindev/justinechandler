-- =====================================================================
-- 014 — Consentement IA dédié (ai_photo_processing).
-- ---------------------------------------------------------------------
-- Le périmètre produit prévoit un consentement RGPD distinct pour l'envoi
-- de photos à l'IA (Mistral, Phase 3) : « L'IA assiste, Justine valide. »
-- L'enum consent_scope ne contenait que photos + traitement_donnees ; on
-- ajoute ai_photo_processing pour que l'onboarding (Phase 1) capture les
-- trois consentements et que la Phase 3 puisse conditionner tout envoi de
-- photo à ce consentement.
--
-- Idempotent (ADD VALUE IF NOT EXISTS) ; non destructif. Autorisé en
-- transaction sur PostgreSQL 12+ tant que la valeur n'est pas utilisée dans
-- la même transaction (ici on ne fait qu'ajouter la valeur + un COMMENT).
-- =====================================================================

ALTER TYPE consent_scope ADD VALUE IF NOT EXISTS 'ai_photo_processing';

COMMENT ON TYPE public.consent_scope IS 'Périmètre d''un consentement RGPD : photos (données sensibles), traitement_donnees, ou ai_photo_processing (envoi de photos à l''IA Mistral).';
