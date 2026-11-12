#!/usr/bin/env bash
# Loads schema.sql into a throwaway local Postgres and runs rls.sql against it.
# Needs the Postgres server binaries (initdb, pg_ctl) on PATH or in PG_BIN.
#   PG_BIN=/usr/lib/postgresql/16/bin supabase/tests/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="${PG_BIN:+$PG_BIN/}"
data="$(mktemp -d)"
port="${PGPORT:-54329}"
trap '"${bin}pg_ctl" -D "$data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$data"' EXIT
"${bin}initdb" -D "$data" -U postgres -A trust >/dev/null
"${bin}pg_ctl" -D "$data" -o "-p $port -c listen_addresses='' -k $data" -w start >/dev/null
run() { "${bin}psql" -h "$data" -p "$port" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run -f "$here/shim.sql"
run -f "$here/../schema.sql"
(cd "$here" && run -o /dev/null -f rls.sql)
