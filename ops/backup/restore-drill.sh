#!/usr/bin/env bash
# The restore drill (#82): a backup that has never been restored is a hope,
# not a backup. Run on the backup host, monthly:
#
#   ops/backup/restore-drill.sh [/etc/bathong-backup.env]
#
# It restores the latest snapshot into a scratch directory, checks the dump
# is whole, and, when docker is here, loads it into a throwaway Postgres and
# asks it what it holds: how many frames, essays, people and media rows, and
# whether the original file of every media row came back with it. Without
# docker it checks the dump and counts the files, and says that is all it
# did. Nothing on production is touched, and the scratch copy and the
# throwaway database are removed on the way out.
#
# Exit status 0 only when the dump is whole and no original is missing.
set -uo pipefail

env_file="${1:-/etc/bathong-backup.env}"
if [ -f "${env_file}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${env_file}"
  set +a
fi

backup_dir="${BACKUP_DIR:-/var/lib/bathong-backup}"
export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-${backup_dir}/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/etc/bathong-backup.pass}"
heartbeat="${DRILL_HEARTBEAT_URL:-}"

say() { echo "bathong restore drill: $*"; }
fail() {
  [ -z "${heartbeat}" ] || curl -fsS -m 10 --retry 2 "${heartbeat}/fail" >/dev/null 2>&1 || true
  say "FAILED: $*"
  exit 1
}

command -v restic >/dev/null 2>&1 || fail "restic is not installed"

scratch="$(mktemp -d "${TMPDIR:-/tmp}/bathong-drill.XXXXXX")" || fail "cannot make a scratch directory"
container=""
cleanup() {
  [ -z "${container}" ] || docker rm -f "${container}" >/dev/null 2>&1 || true
  rm -rf "${scratch}"
}
trap cleanup EXIT

snapshot="$(restic snapshots --tag bathong --host bathong --latest 1 --json 2>/dev/null | sed -n 's/.*"short_id":"\([0-9a-f]*\)".*/\1/p' | tail -n 1)"
taken="$(restic snapshots --tag bathong --host bathong --latest 1 --json 2>/dev/null | sed -n 's/.*"time":"\([^"]*\)".*/\1/p' | tail -n 1)"
[ -n "${snapshot}" ] || fail "the repository has no snapshot to restore"
restic restore latest --tag bathong --host bathong --target "${scratch}" >/dev/null 2>&1 || fail "restic could not restore snapshot ${snapshot}"

dump="$(find "${scratch}" -type f -name 'bathong.sql.gz' | head -n 1)"
media="$(find "${scratch}" -type d -name media -path '*/mirror/media' | head -n 1)"
[ -n "${dump}" ] || fail "snapshot ${snapshot} has no database dump in it"
[ -n "${media}" ] || fail "snapshot ${snapshot} has no media folder in it"
gzip -t "${dump}" 2>/dev/null || fail "the restored dump is not a whole gzip file"
gzip -dc "${dump}" | tail -n 12 | grep -q "PostgreSQL database dump complete" \
  || fail "the restored dump does not end where pg_dump ends one"
files="$(find "${media}" -type f | wc -l | tr -d ' ')"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  say "ok, as far as it goes: snapshot ${snapshot} (${taken}), dump whole, ${files} media files. No docker here, so the dump was not loaded into a database."
  [ -z "${heartbeat}" ] || curl -fsS -m 10 --retry 2 "${heartbeat}" >/dev/null 2>&1 || true
  exit 0
fi

# A throwaway Postgres of the version production runs: no published port,
# no volume, gone when the drill ends.
container="bathong-drill-$$"
docker run -d --name "${container}" -e POSTGRES_DB=bathong -e POSTGRES_USER=bathong \
  -e POSTGRES_PASSWORD=drill postgres:16-alpine >/dev/null 2>&1 || fail "could not start a throwaway Postgres"
for _ in $(seq 1 30); do
  docker exec "${container}" pg_isready -U bathong -d bathong >/dev/null 2>&1 && break
  sleep 1
done
gzip -dc "${dump}" | docker exec -i "${container}" psql -q -v ON_ERROR_STOP=1 -U bathong -d bathong >/dev/null 2>"${scratch}/load.err" \
  || fail "the dump did not load: $(tail -n 2 "${scratch}/load.err" | tr '\n' ' ' | cut -c1-200)"

count() { docker exec "${container}" psql -At -U bathong -d bathong -c "select count(*) from $1" 2>/dev/null || echo "?"; }
frames="$(count frames)"; essays="$(count essays)"; people="$(count people)"; rows="$(count media)"

# every media row names its original file; each must have come back
missing=0
while IFS= read -r name; do
  [ -z "${name}" ] && continue
  [ -f "${media}/${name}" ] || missing=$((missing + 1))
done < <(docker exec "${container}" psql -At -U bathong -d bathong -c "select filename from media where filename is not null" 2>/dev/null)

summary="snapshot ${snapshot} (${taken}): ${frames} frames, ${essays} essays, ${people} people, ${rows} media rows, ${files} files restored, ${missing} originals missing"
[ "${missing}" -eq 0 ] || fail "${summary}"
[ -z "${heartbeat}" ] || curl -fsS -m 10 --retry 2 "${heartbeat}" >/dev/null 2>&1 || true
say "ok: ${summary}"
