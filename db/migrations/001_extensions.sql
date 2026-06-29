-- =====================================================================
-- 001_extensions.sql
-- ---------------------------------------------------------------------
-- Extensions strictement nécessaires et garanties disponibles sur
-- IONOS Managed PostgreSQL (cible de migration future).
--
--   * pgcrypto : fournit gen_random_uuid() pour les clés primaires UUID.
--   * citext   : type texte insensible à la casse (emails).
--
-- AUCUNE autre extension n'est utilisée, afin de préserver la
-- portabilité du schéma (PostgreSQL standard).
--
-- Idempotence : ces deux instructions utilisent IF NOT EXISTS et sont
-- donc rejouables sans erreur (les extensions sont des objets partagés).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
