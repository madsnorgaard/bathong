#!/usr/bin/env bash
# The backup host's side of the off-host backup (#82). Each night it pulls a
# database dump and a mirror of ./media from production over SSH, takes an
# encrypted restic snapshot of what it pulled, and thins the history to
# KEEP_DAILY daily and KEEP_MONTHLY monthly snapshots.
#
#   ops/backup/pull.sh [/etc/bathong-backup.env]
#
# The key it uses is pinned on production to ops/backup/serve.sh, which
# answers a dump and a read-only rsync and nothing else. Production holds
# nothing that reaches this host.
#
# A night that looks wrong (the dump fails or is cut short, or media shrinks
# to less than half of what the last good night held) is still snapshotted,
# because it may be all there is, but it is reported as a failure and the
# history is not thinned: a bad night must never cost a good one. The shrink
# is measured against the last good night, not the night before, so it keeps
# failing, and the history keeps whole, until the files are back or someone
# says the loss was meant: ACCEPT_SHRINK=1 ops/backup/pull.sh, once.
#
# Needs bash, ssh, rsync, gzip, flock and restic. Exit status 0 only when
# every step succeeded; the last line says which.
#
# No `set -e`: every step is checked, so one failure does not hide the rest.
set -uo pipefail

env_file="${1:-/etc/bathong-backup.env}"
if [ -f "${env_file}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${env_file}"
  set +a
fi

source_host="${BACKUP_SOURCE:-}"
backup_dir="${BACKUP_DIR:-/var/lib/bathong-backup}"
keep_daily="${KEEP_DAILY:-30}"
keep_monthly="${KEEP_MONTHLY:-12}"
heartbeat="${HEARTBEAT_URL:-}"
ssh_cmd="${BACKUP_SSH:-ssh}"            # a stand-in for tests
min_dump_bytes="${MIN_DUMP_BYTES:-4096}"
export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-${backup_dir}/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/etc/bathong-backup.pass}"

started="$(date +%s)"
media_count=""
problems=()
say() { echo "bathong backup: $*"; }

finish() {
  local took=$(( $(date +%s) - started ))
  if [ "${#problems[@]}" -eq 0 ]; then
    date -u +%FT%TZ > "${backup_dir}/state/last-success" 2>/dev/null || true
    [ -z "${media_count}" ] || echo "${media_count}" > "${backup_dir}/state/media-count" 2>/dev/null || true
    [ -z "${heartbeat}" ] || curl -fsS -m 10 --retry 2 "${heartbeat}" >/dev/null 2>&1 || true
    say "ok: $1 (${took}s)"
    exit 0
  fi
  [ -z "${heartbeat}" ] || curl -fsS -m 10 --retry 2 "${heartbeat}/fail" >/dev/null 2>&1 || true
  local IFS=';'
  say "FAILED: ${problems[*]} (${took}s)"
  exit 1
}

for tool in "${ssh_cmd}" rsync gzip flock restic; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    problems+=("${tool} is not installed")
  fi
done
[ -n "${source_host}" ] || problems+=("BACKUP_SOURCE is not set (${env_file})")
[ -r "${RESTIC_PASSWORD_FILE}" ] || problems+=("cannot read ${RESTIC_PASSWORD_FILE}")
[ "${#problems[@]}" -eq 0 ] || finish ""

mirror="${backup_dir}/mirror"
mkdir -p "${mirror}/db" "${mirror}/media" "${backup_dir}/state" || { problems+=("cannot write under ${backup_dir}"); finish ""; }

# one run at a time: a slow night must not meet the next one
exec 9> "${backup_dir}/state/lock"
if ! flock -n 9; then
  problems+=("another run holds the lock")
  finish ""
fi

if ! restic cat config >/dev/null 2>&1; then
  problems+=("no restic repository at ${RESTIC_REPOSITORY}: run restic init once")
  finish ""
fi

# 1. the database: fetched beside the last good dump, checked, then swapped
#    in. A dump that fails any check leaves the previous one in the mirror.
dump="${mirror}/db/bathong.sql.gz"
dump_note="dump kept from an earlier night"
if "${ssh_cmd}" "${source_host}" dump > "${dump}.new" 2>"${backup_dir}/state/dump.err"; then
  size="$(wc -c < "${dump}.new" | tr -d ' ')"
  if ! gzip -t "${dump}.new" 2>/dev/null; then
    problems+=("the dump is not a whole gzip file")
  elif [ "${size}" -lt "${min_dump_bytes}" ]; then
    problems+=("the dump is only ${size} bytes")
  elif ! gzip -dc "${dump}.new" | tail -n 12 | grep -q "PostgreSQL database dump complete"; then
    problems+=("the dump does not end where pg_dump ends one")
  else
    mv "${dump}.new" "${dump}"
    dump_note="dump ${size} bytes"
  fi
else
  problems+=("production refused or failed the dump: $(tr '\n' ' ' < "${backup_dir}/state/dump.err" | cut -c1-160)")
fi
rm -f "${dump}.new"

# 2. the photographs: a mirror of ./media. --delete keeps it a mirror; what
#    was deleted on production stays in the snapshots already taken.
count_media() { find "${mirror}/media" -type f | wc -l | tr -d ' '; }
# what the last good night held; the first run has only the mirror to go by
before="$(cat "${backup_dir}/state/media-count" 2>/dev/null || count_media)"
if ! rsync -a --delete -e "${ssh_cmd}" "${source_host}:./" "${mirror}/media/" 2>"${backup_dir}/state/rsync.err"; then
  problems+=("the media mirror failed: $(tr '\n' ' ' < "${backup_dir}/state/rsync.err" | cut -c1-160)")
fi
after="$(count_media)"
media_count="${after}"
if [ "${before}" -gt 0 ] && [ "$(( after * 2 ))" -lt "${before}" ] && [ "${ACCEPT_SHRINK:-}" != "1" ]; then
  problems+=("media shrank from ${before} files at the last good night to ${after}; if that was meant, run once with ACCEPT_SHRINK=1")
fi

# 3. the snapshot, taken even on a bad night: it may be all there is
snapshot="none"
if out="$(restic backup "${mirror}" --tag bathong --host bathong 2>&1)"; then
  snapshot="$(printf '%s\n' "${out}" | sed -n 's/^snapshot \([0-9a-f]*\) saved.*/\1/p' | tail -n 1)"
else
  problems+=("restic backup failed: $(printf '%s' "${out}" | tail -n 2 | tr '\n' ' ' | cut -c1-160)")
fi

# 4. thin the history, only after a clean night
if [ "${#problems[@]}" -eq 0 ]; then
  if ! out="$(restic forget --tag bathong --host bathong --keep-daily "${keep_daily}" --keep-monthly "${keep_monthly}" --prune 2>&1)"; then
    problems+=("restic forget failed: $(printf '%s' "${out}" | tail -n 2 | tr '\n' ' ' | cut -c1-160)")
  fi
  # once a week, read the repository back
  if [ "$(date +%u)" = "7" ] || [ "${BACKUP_CHECK:-}" = "1" ]; then
    restic check >/dev/null 2>&1 || problems+=("restic check found a damaged repository")
  fi
fi

finish "${dump_note}, ${after} media files, snapshot ${snapshot:-none}"
