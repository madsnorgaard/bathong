#!/usr/bin/env bash
# Deploy the checked-out main to this server: dump the database, fast-forward
# the checkout, rebuild both images, restart the platform profile and wait
# for Payload to come back (it applies pending migrations before serving).
#
# Run from anywhere on the server: ~/docker/bathong/ops/deploy.sh
# The GitHub deploy workflow runs exactly this over SSH after CI passes on main.
set -euo pipefail

cd "$(dirname "$0")/.."
site="${SITE_DOMAIN:-$(grep -E '^SITE_DOMAIN=' .env | cut -d= -f2)}"
db_container="${site}_db"
payload_container="${site}_payload"
stamp="$(date +%Y%m%d-%H%M%S)"
backups="${HOME}/backups"

echo "== bathong deploy ${stamp}"
echo "rollback commit: $(git rev-parse --short HEAD)"

mkdir -p "${backups}"
docker exec -i "${db_container}" pg_dump -U bathong -d bathong | gzip > "${backups}/bathong-pre-${stamp}.sql.gz"
echo "database dump: ${backups}/bathong-pre-${stamp}.sql.gz ($(du -h "${backups}/bathong-pre-${stamp}.sql.gz" | cut -f1))"
# keep the last 20 dumps
ls -1t "${backups}"/bathong-pre-*.sql.gz 2>/dev/null | tail -n +21 | xargs -r rm -f

git fetch -q origin main
git pull -q --ff-only origin main
echo "deploying commit: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

docker compose --profile platform build 2>&1 | grep -E "Built|ERROR|error" || true
docker compose --profile platform up -d

# Payload runs migrations before `next start`; wait for it, then show them.
for _ in $(seq 1 60); do
  if docker logs --since 5m "${payload_container}" 2>&1 | grep -q "Ready in"; then break; fi
  sleep 5
done
docker logs --since 5m "${payload_container}" 2>&1 | grep -E "Migrat|Ready in|rror" || true
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E "${site}_(payload|nuxt|db)"

# The site must answer before we call it done.
for _ in $(seq 1 12); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://${site}/" || true)"
  [ "${code}" = "200" ] && break
  sleep 5
done
echo "https://${site}/ -> ${code}"
[ "${code}" = "200" ]
