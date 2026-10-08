#!/usr/bin/env bash
# Base de datos de pruebas.
#
# Levanta un Postgres desechable con la estructura de producción (sin datos),
# aplica encima las migraciones nuevas y ejecuta las pruebas de supabase/tests/db.
# Así una migración o un cambio de permisos se prueba ANTES de tocar producción.
#
# Uso:
#   scripts/db-test.sh                  # Postgres temporal (necesita postgres instalado)
#   DATABASE_URL=postgres://... scripts/db-test.sh   # usa una base ya levantada (CI)
#
# Orden de carga:
#   1. supabase/schema/stubs.sql        roles y auth de Supabase simulados
#   2. supabase/schema/prod_schema.sql  instantánea de producción
#   3. supabase/migrations/*.sql        solo las de versión > snapshot_version
#   4. supabase/tests/db/*.sql          pruebas (cada una en su transacción)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_DIR="$ROOT/supabase/schema"
SNAPSHOT="$SCHEMA_DIR/prod_schema.sql"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
TESTS_DIR="$ROOT/supabase/tests/db"

SNAPSHOT_VERSION="$(sed -n 's/^-- snapshot_version: \([0-9]*\).*/\1/p' "$SNAPSHOT")"
if [ -z "$SNAPSHOT_VERSION" ]; then
  echo "No encuentro snapshot_version en $SNAPSHOT" >&2
  exit 1
fi

# ── Postgres temporal si no nos dan uno ───────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  PGBIN="$(pg_config --bindir 2>/dev/null || true)"
  if [ ! -x "$PGBIN/initdb" ]; then
    PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
  fi
  if [ ! -x "${PGBIN:-}/initdb" ]; then
    echo "No encuentro initdb: instala PostgreSQL o pasa DATABASE_URL." >&2
    exit 1
  fi

  RUN=()
  if [ "$(id -u)" = "0" ]; then RUN=(runuser -u postgres --); fi

  PGDATA_DIR="$(mktemp -d)"
  PORT="${DB_TEST_PORT:-54329}"
  [ "$(id -u)" = "0" ] && chown postgres "$PGDATA_DIR"

  cleanup() {
    "${RUN[@]}" "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA_DIR"
  }
  trap cleanup EXIT

  "${RUN[@]}" "$PGBIN/initdb" -D "$PGDATA_DIR" -U postgres -A trust >/dev/null
  "${RUN[@]}" "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -l "$PGDATA_DIR/log" \
    -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null
  DATABASE_URL="postgresql://postgres@/postgres?host=/tmp&port=$PORT"
fi

PSQL=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 --set=SHOW_CONTEXT=never)

echo "▸ Supabase simulado"
"${PSQL[@]}" -f "$SCHEMA_DIR/stubs.sql"

echo "▸ Instantánea de producción ($SNAPSHOT_VERSION)"
"${PSQL[@]}" -f "$SNAPSHOT"

echo "▸ Migraciones nuevas"
applied=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$f" | grep -o '^[0-9]*')"
  if [ -n "$version" ] && [ "$version" -gt "$SNAPSHOT_VERSION" ]; then
    echo "  · $(basename "$f")"
    "${PSQL[@]}" -1 -f "$f"
    applied=$((applied + 1))
  fi
done
[ "$applied" = 0 ] && echo "  (ninguna: producción ya está al día)"

echo "▸ Pruebas"
# Cada archivo abre su transacción y termina con rollback: no deja datos.
failed=0
errfile="$(mktemp)"
for t in "$TESTS_DIR"/*.sql; do
  if "${PSQL[@]}" -f "$t" >/dev/null 2>"$errfile"; then
    echo "  ✓ $(basename "$t")"
  else
    echo "  ✗ $(basename "$t")"
    sed 's/^/      /' "$errfile"
    failed=$((failed + 1))
  fi
done
rm -f "$errfile"

if [ "$failed" -gt 0 ]; then
  echo "$failed archivo(s) de pruebas con fallos." >&2
  exit 1
fi
echo "Todo correcto."
