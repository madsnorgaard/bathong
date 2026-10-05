#!/usr/bin/env bash
# The production side of the off-host backup: the one thing the backup host's
# SSH key may run here. In ~/.ssh/authorized_keys on production the key is
# pinned to this script:
#
#   command="/home/<user>/docker/bathong/ops/backup/serve.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA... bathong-backup
#
# so whatever the backup host asks for arrives in SSH_ORIGINAL_COMMAND and is
# answered here or refused. It can ask for two things, both read-only:
#
#   dump    a gzip'd pg_dump of the database on stdout
#   rsync   a sender-only rsync of ./media, handed to rrsync -ro (the
#           restricted rsync that ships with rsync), which refuses writes and
#           any path outside the folder
#
# Production holds no key or password for the backup host: the backup pulls.
# A compromised production can spoil the next pull, never the history.
set -euo pipefail

cd "$(dirname "$0")/../.."
site="${SITE_DOMAIN:-$(grep -E '^SITE_DOMAIN=' .env | cut -d= -f2)}"
request="${SSH_ORIGINAL_COMMAND:-}"

case "${request}" in
  dump)
    # pipefail: a failed pg_dump fails the whole request, so the backup host
    # never mistakes half a dump for a whole one
    docker exec -i "${site}_db" pg_dump -U bathong -d bathong | gzip
    ;;
  "rsync --server --sender "*)
    rrsync="$(command -v rrsync || true)"
    # Debian and Ubuntu shipped it under doc/ before rsync 3.2.4
    [ -n "${rrsync}" ] || rrsync=/usr/share/doc/rsync/scripts/rrsync
    if [ ! -e "${rrsync}" ]; then
      echo "bathong backup: rrsync is not installed on production" >&2
      exit 1
    fi
    # rrsync reads SSH_ORIGINAL_COMMAND itself and enforces read-only
    exec "${rrsync}" -ro "${PWD}/media"
    ;;
  *)
    echo "bathong backup: refused" >&2
    exit 1
    ;;
esac
