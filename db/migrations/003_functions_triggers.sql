-- =====================================================================
-- 003_functions_triggers.sql
-- ---------------------------------------------------------------------
-- Fonctions / triggers GÉNÉRIQUES (indépendants du métier).
-- La logique métier (gate de validation, avancement des piliers,
-- droit à l'oubli) est définie en 007_views_functions_metier.sql.
--
-- Idempotence : CREATE OR REPLACE -> rejouable sans erreur.
-- =====================================================================

-- Trigger générique : maintient updated_at = now() à chaque UPDATE.
-- Appliqué (en 004/005/006) à toutes les tables possédant updated_at.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS 'Trigger générique BEFORE UPDATE : force updated_at = now(). Appliqué à toutes les tables horodatées en écriture.';
