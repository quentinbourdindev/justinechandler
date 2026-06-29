#!/usr/bin/env bash
# =====================================================================
# run.sh — applique les migrations (dans l'ordre) puis le seed.
# ---------------------------------------------------------------------
# Connexion (par ordre de priorité) :
#   1. DATABASE_URL=postgres://user:pass@host:port/db   ./run.sh
#   2. Variables PG* (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
#   3. Valeurs par défaut (image_coaching / localhost:5432)
#
# Options :
#   --no-seed     applique seulement les migrations
#   --seed-only   (ré)applique seulement le seed
#
# Idempotence : une table schema_migrations enregistre les migrations
# déjà appliquées ; un nouvel appel ne rejoue que les fichiers manquants.
# Chaque migration est appliquée dans UNE transaction (--single-transaction,
# ON_ERROR_STOP) : en cas d'erreur, rien n'est appliqué pour ce fichier.
# =====================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIG_DIR="$DIR/migrations"
SEED_FILE="$DIR/seed.sql"

# --- Construction de la commande psql -------------------------------
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL=(psql "$DATABASE_URL")
  TARGET="$DATABASE_URL"
else
  export PGHOST="${PGHOST:-localhost}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-image_coaching}"
  export PGDATABASE="${PGDATABASE:-image_coaching}"
  export PGPASSWORD="${PGPASSWORD:-image_coaching}"
  PSQL=(psql)
  TARGET="$PGDATABASE@$PGHOST:$PGPORT (user $PGUSER)"
fi
PSQL+=( -v ON_ERROR_STOP=1 --no-psqlrc -q )

# --- Options ---------------------------------------------------------
WITH_SEED=1
SEED_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-seed)   WITH_SEED=0 ;;
    --seed-only) SEED_ONLY=1 ;;
    *) echo "Option inconnue : $arg" >&2; exit 2 ;;
  esac
done

echo "==> Cible : $TARGET"
"${PSQL[@]}" -c "SELECT 1;" >/dev/null || { echo "!! Connexion impossible." >&2; exit 1; }

apply_seed() {
  echo "==> Chargement du seed de démonstration (seed.sql)"
  "${PSQL[@]}" --single-transaction -f "$SEED_FILE"
  echo "    + seed chargé."
}

if [[ "$SEED_ONLY" == "1" ]]; then
  apply_seed
  echo "==> Terminé (seed uniquement)."
  exit 0
fi

# --- Ledger des migrations ------------------------------------------
"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  schema_migrations            IS 'Journal des migrations déjà appliquées (géré par run.sh) pour rendre l''application idempotente.';
COMMENT ON COLUMN schema_migrations.filename   IS 'Nom du fichier de migration appliqué.';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Date d''application de la migration.';"

# --- Application des migrations en attente ---------------------------
shopt -s nullglob
applied=0
for f in "$MIG_DIR"/*.sql; do
  base="$(basename "$f")"
  exists="$("${PSQL[@]}" -tAc "SELECT 1 FROM schema_migrations WHERE filename = '${base//\'/\'\'}'")"
  if [[ "$exists" == "1" ]]; then
    echo "    = déjà appliquée : $base"
    continue
  fi
  echo "==> Application : $base"
  # Insert ledger + fichier dans la MÊME transaction (ordre préservé).
  "${PSQL[@]}" --single-transaction \
    -c "INSERT INTO schema_migrations(filename) VALUES ('${base//\'/\'\'}');" \
    -f "$f"
  applied=$((applied+1))
done
echo "==> Migrations appliquées cette fois : $applied"

# --- Seed ------------------------------------------------------------
if [[ "$WITH_SEED" == "1" ]]; then
  apply_seed
fi

echo "==> Terminé."
