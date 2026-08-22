# Bathong. - platform architecture

The platform behind bathong.africa. Status: v1 site live (M3 cutover done);
members, payments and the archive still ahead. This document is the reference
for how the pieces fit, how data is modelled and how deploys happen.

## Stack

- **Backend:** Payload CMS 3.x on Next, `@payloadcms/db-postgres`
  (postgres:16-alpine). Admin UI + REST/GraphQL API on `api.bathong.africa`.
- **Frontend:** Nuxt 3, server-rendered, consuming the design system
  (`design-system/styles.css`) and the Payload API.
- **Holding page:** `holding/index.html` served by nginx:alpine - retired at
  the M3 cutover, kept unrouted as the fallback.
- **Hosting:** docker compose behind Traefik (external `web` network,
  per-project `internal` network, lets-encrypt resolver), same pattern as the
  other production sites.

Domains: **bathong.africa** primary; `www.` and `bathong.org` variants 301 to
it; `api.bathong.africa` reserved for Payload.

## Deploy (manual for now)

Deploys are git + SSH; CI runs the test suite on push, no deploy pipeline yet.
Since the M3 cutover (#12), `bathong.africa` is served by `bathong_nuxt` and
the holding page is the unrouted fallback (re-point the primary router to
`bathong_holding` to take the platform down gracefully).

```bash
# on the server, in the compose directory (a clone of this repo)
git pull
docker compose --profile platform build
docker compose --profile platform up -d
# (the payload container applies pending migrations itself before serving)
```

`.env` for the live site needs `CORS_ORIGINS` to include
`https://bathong.africa` (plus `https://next.bathong.africa` if the preview
router is used).

Required `.env` next to the compose file (names only - values never live in
git):

| Key | Stage |
|---|---|
| `SITE_DOMAIN`, `ALT_DOMAIN` | holding (now) |
| `DB_PASSWORD`, `PAYLOAD_SECRET`, `CORS_ORIGINS` | platform |
| `STAGING_BASIC_AUTH` | preview router (#39) |
| `NUXT_PUBLIC_SITE_URL` | optional override; defaults to `https://$SITE_DOMAIN` |
| `SMTP_PASS` | platform - the noreply@ mailbox password (mail repo's `setup-bathong.sh`) |

The rest of the SMTP settings (`SMTP_HOST`/`PORT`/`USER`/`FROM`) are fixed in
the compose file. With `SMTP_HOST` unset (local dev, e2e) Payload logs
would-be emails to the console instead of sending.

## Security headers (#37)

Two layers, no overlap. Traefik (compose labels) owns HSTS on every router
of both hosts and the baseline headers on the API host, plus rate limits.
The Nuxt app (`frontend/nuxt.config.ts`) owns everything on the site host:
the baseline headers (X-Frame-Options DENY, nosniff, Referrer-Policy,
Permissions-Policy, COOP/CORP same-origin) on every response via routeRules,
and a nonce-based Content-Security-Policy on HTML renders via the
`nuxt-security` module. Each SSR `<script>` gets a per-request nonce and
`'strict-dynamic'` lets the nonced entry load its chunks, so script-src
carries no `unsafe-inline`. Styles keep `unsafe-inline` (Vue SSR emits style
attributes, which nonces cannot cover). `connect-src` allows the API host
(forms, member sign-in) and the analytics origin; `worker-src` allows `blob:`
for the maplibre tile worker. The module's rate limiter, request size limit,
XSS validator and CORS handler are all off: Traefik and Payload do those
jobs. `frontend/e2e/security-headers.spec.ts` asserts the header set and
that the main pages render with a clean console.

## Preview router (#39): next.SITE_DOMAIN behind basic auth

Alongside the primary host, `bathong_nuxt` also answers at
`next.${SITE_DOMAIN}` behind basic auth - same build, same content, useful
for reviewing on a real URL before pointing people at the primary domain.

Prerequisites, once per server:

1. DNS: an `A` record for `next.bathong.africa` pointing at the server
   (Let's Encrypt must be able to resolve it).
2. `STAGING_BASIC_AUTH` in `.env`: `htpasswd -nB bathong`, then double every
   `$` in the hash as `$$` (compose interpolates single `$`).
3. `CORS_ORIGINS` must include `https://next.bathong.africa` or the RSVP and
   photocall forms cannot POST to `api.bathong.africa` from the preview host.

## First deploy: content and the first admin

Migrations run automatically, but the database
starts empty. Seed it once from inside the container (tsx ships in the
image):

```bash
docker compose exec \
  -e SEED_ADMIN_EMAIL=you@example.com \
  -e SEED_ADMIN_PASSWORD='a-real-password' \
  -e SEED_DEMO=true \
  bathong_payload npm run seed
```

`SEED_ADMIN_*` creates the first admin login for `api.bathong.africa/admin`.
`SEED_DEMO=true` adds the demo essay/frames so the site looks lived-in for a
review; drop it for the real launch (the demo frames are still Johannesburg
placeholders, issue #11). The seed is idempotent - rerunning updates rather
than duplicates.

Verify after a deploy: `https://bathong.africa` serves the site (walks page
shows the route map, an RSVP submits, the devtools console shows no CSP
violations, admin reachable at `api.bathong.africa/admin`), `www.` and `bathong.org` 301 to the primary
host, and `next.bathong.africa` (if DNS exists) challenges for the password.

## Data model (Payload collections)

The photo essay (12-20 sequenced, credited frames) is the platform's core
unit; everything else feeds it or shows it.

| Collection | Purpose | Notes |
|---|---|---|
| `users` (auth) | Accounts | roles `admin`/`editor`/`member`; admin panel gated to admin+editor; members sign in via REST from the frontend. Membership fields (`tier`, `status`, `expires`) exist now, admin-only, filled by future payments. |
| `people` | Public profiles | founding circle + members + guests; may exist without an account |
| `media` (upload) | File library | `visibility` public/restricted + `uploadedBy`; member uploads stay restricted until published. Raster-only, sharp sizes, `./media` bind mount |
| `frames` | The atomic editorial unit | wraps one media item; `photographer` relationship **required** - the credit rule enforced structurally; reusable across essays, exhibitions and the future archive |
| `essays` | Photo stories | drafts on; ordered sequence of frame refs with optional caption override; 12-20 soft validation; sequence and lead frame edited visually (see below) |
| `walks` | Photowalks/events | pricing display fields + external `bookingUrl` until payments land; `resultEssay` closes the walk -> group edit -> essay loop |
| `exhibitions` | Walls | frames + venue + dates; NPC partnership line |
| `photocalls` | Open calls | includes `terms` rich text (photographer keeps copyright, non-exclusive licence - the brief requires this in writing) |
| `submissions` | Member responses | status pipeline submitted -> shortlisted -> published/rejected; `reviewNotes` visible to the submitter ("here is why, frame by frame"), `internalNotes` editor-only; hooks keep attached media restricted until published |
| `orders` | Payments-shaped hole | hidden, empty until a provider is chosen; type/amount/status/provider/ref/raw - a future gateway webhook writes here and flips membership fields, nothing restructures |

Globals: `site-settings` (ticker, socials, newsletter URL), `manifesto`
(dictionary card + manifesto text), `membership` (benefits, prices - honest
TBC until the collective decides).

Drafts/versions only on essays, walks, exhibitions, photocalls and the
manifesto/membership globals.

## Visual sequence editor (essays)

Sequencing a photo essay is a visual judgement, so the essay's `sequence`
and `leadFrame` fields replace the stock admin UI with custom components
(`backend/src/fields/sequence/`). The strip shows every block as a
thumbnail tile - full-bleed frames render wider so the rhythm reads at a
glance, pairs as a double tile, text interludes as an excerpt tile - with
drag or arrow-button reorder, an inline full-bleed toggle, a remove
control, a lightbox on click, and a live count against the 12-20 guidance.
"Add frames" opens a picker drawer (searchable, filterable by
photographer, multi-select appends in click order); frames already used
are marked but stay selectable. Thumbnails come from `GET
/api/frames-index`, an editor-gated endpoint returning the whole archive
in one flat response. Pairs, text bodies and caption overrides are edited
in the collapsible "Structural editor" under the strip - the stock blocks
UI bound to the same form state, so both views always agree and the saved
data is byte-identical with the default UI (asserted by
`frontend/e2e/admin-sequence.spec.ts`; run those specs alone against a dev
backend with `npx playwright test --config=playwright.admin.config.ts`).

## Share cards (og:image per entity)

Sharing a URL shows a card generated for that entity, per the share-cards
spec (design-system/design_handoff_frontend_v2/design-references/
share-cards.html): C2 essay (lead frame + index/frame count in the bar),
C3 photographer (portrait, member number, body of work), C4 walk (jacaranda
plate, the date enormous - the launch-only state), C5 photocall (signal
plate while a call is open). Rendered on request by Nitro server routes
(`frontend/server/routes/share/`) with satori + resvg + sharp - fonts are
vendored TTF buffers in `frontend/server/assets/fonts/` (OFL), so no
system fonts are needed in the container. JPEG q82, quality steps down to
stay under the 300 KB WhatsApp ceiling; any missing entity or failed
render serves the static C1 default (`frontend/public/share/default.jpg`),
never an error. Pages append `?v=<updatedAt>` so crawler caches bust on
republish. Covered by `frontend/e2e/share-cards.spec.ts`.

## Access matrix

| Collection | Public | Member | Editor | Admin |
|---|---|---|---|---|
| users | - | R/U self | R | CRUD |
| people | R | R | CRU | CRUD |
| media | R public | R pub+own, C, U/D own restricted | CRU all | CRUD |
| frames | R | R | CRU | CRUD |
| essays/walks/exhibitions/photocalls | R published | R published | CRU + drafts | CRUD |
| submissions | - | C, R own, U own while submitted | R all, U status/notes | CRUD |
| orders | - | R own | - | CRUD |
| globals | R | R | U | U |
| /admin panel | - | - | yes | yes |

## Local development

- `docker compose -f docker-compose.dev.yml up -d` starts Postgres 16 on
  localhost:5432 (user/db `bathong`, password `bathong-dev`).
- Backend: copy `backend/.env.example` to `backend/.env` (set a real
  `PAYLOAD_SECRET`), then `npm run migrate`, `npm run seed` (idempotent;
  `SEED_DEMO=true` adds e2e state fixtures, `SEED_ADMIN_EMAIL`/`_PASSWORD`
  create the admin) and `npm run dev` on port 3001.
- Frontend: `npm run dev` on port 3000. Checks: `npm run lint`,
  `npm run tokens:check` (design-system drift), `npm run types:check`
  (payload-types drift), `npm test` (unit), `npm run test:e2e` (Playwright,
  needs the seeded stack).
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, both drift checks,
  unit tests, builds and the e2e smoke on every push and PR.

## Migrations (Postgres + Payload)

- Migrations are the source of truth everywhere; Drizzle push is dev-only and
  opt-in (`PAYLOAD_DB_PUSH=true`), never in production.
- Workflow: change collections -> `npm run migrate:create` -> review the
  generated SQL (hand-edit renames to `ALTER ... RENAME`, inspect any `DROP`)
  -> commit both files -> deploy; the container runs `payload migrate` before
  start.
- First migration is one consolidated `initial` after the full schema lands.
- Back up: `pg_dump` + the `./media` bind mount together - the photographs
  are the product.

## Payments (deferred by decision)

No gateway is integrated. When pricing is decided the shortlist is local
(Payfast for in-platform membership/recurring; Quicket links for event
ticketing). The `orders` collection, membership fields on `users` and
`bookingUrl` on walks are the prepared seams; integrating later is additive.

## Roadmap milestones

- **M1 Holding live** - holding page on bathong.africa (done)
- **M2 Platform scaffold** - backend boots, admin gated, initial migration
- **M3 v1 site headless** - Nuxt + content, cutover from holding page
- **M4 Members** - sign-in from the frontend, photocall submissions, SMTP
- **M5 Payments** - blocked on pricing + provider decision
- **M6 Archive** - the searchable open archive over frames
