#!/usr/bin/env bash
# Deploy main to this server: dump the database, move the checkout to the
# commit being deployed, rebuild both images, restart the platform profile
# and wait for Payload to come back (it applies pending migrations before
# serving).
#
# Run from anywhere on the server: ~/docker/bathong/ops/deploy.sh [commit]
# The GitHub deploy workflow runs exactly this over SSH after CI passes on
# main, passing the commit that CI ran on. Without an argument the tip of
# origin/main is deployed (a manual run on the server).
#
# Why the argument: the workflow fires when a CI run on main completes. Two
# merges a few minutes apart would otherwise let the first merge's green CI
# deploy the second merge before its own CI had finished (#228).
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
target="${1:-origin/main}"
# Only commits that are on main get deployed, whoever asks.
if ! git merge-base --is-ancestor "${target}" origin/main; then
  echo "refusing to deploy ${target}: not a commit on origin/main"
  exit 1
fi
# Point local main at the target and check it out. Local changes to tracked
# files stop this the way `git pull` did, and the next run fast-forwards on
# from here because the target is an ancestor of origin/main.
git checkout -q -B main "${target}"
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

# The image cache reads its config at start. Test the pulled config inside the
# running container and reload gracefully; a config that fails the test fails
# the deploy here and the running one keeps serving.
ipx_container="${site}_ipx_cache"
docker exec "${ipx_container}" nginx -t
docker exec "${ipx_container}" nginx -s reload
echo "image cache: config reloaded"

# Last, encode the image variants the entry pages use before a visitor asks
# for one (a first encode is about 2 seconds per image). The deploy is done
# by now and this must never fail it: the `||` keeps `set -e` out of it and
# `timeout` bounds a run that hangs. Its last line is the summary.
timeout 720 bash ops/warm-images.sh "https://${site}" \
  || echo "image warm-up: incomplete (exit $?), the deploy itself is done"
