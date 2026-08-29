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

## Deploy

Merging to `main` deploys: `.github/workflows/deploy.yml` waits for CI to
pass on `main`, then runs `ops/deploy.sh` on the server over SSH with a
dedicated key (GitHub environment `production`: `DEPLOY_SSH_KEY`,
`DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`; the public key sits in the
server user's `authorized_keys` with a forced command, so that key can run
the deploy script and nothing else). Deploys are serialised; re-run one from
the Actions tab (`workflow_dispatch`) if needed.

`ops/deploy.sh` is the whole deploy and can be run by hand on the server:
it dumps the database to `~/backups` (last 20 kept), fast-forwards the
checkout, rebuilds both images, restarts the platform profile, waits for
Payload (which applies pending migrations before serving) and checks the
site answers 200. It prints the rollback commit first.

```bash
# by hand, on the server
~/docker/bathong/ops/deploy.sh
```

Since the M3 cutover (#12), `bathong.africa` is served by `bathong_nuxt` and
the holding page is the unrouted fallback (re-point the primary router to
`bathong_holding` to take the platform down gracefully). Content in the
three globals goes through the admin or a guarded seed run
(`docker exec -e SEED_DEMO= <site>_payload npm run seed`), never the deploy.

`.env` for the live site needs `CORS_ORIGINS` to include
`https://bathong.africa` (plus `https://next.bathong.africa` if the preview
router is used).

Required `.env` next to the compose file (names only - values never live in
git):

| Key | Stage |
|---|---|
| `SITE_DOMAIN`, `ALT_DOMAIN` | holding (now) |
| `DB_PASSWORD`, `PAYLOAD_SECRET`, `CORS_ORIGINS` | platform |
| `SITE_URL` | optional; where password-reset links point (defaults to the first CORS origin) |
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
| `users` (auth) | Accounts | roles `admin`/`editor`/`member`; admin panel gated to admin+editor; members sign in via REST from the frontend (`/account`, #13). Membership fields (`plan` monthly/annual, `status`, `expires`) are admin-only, filled by future payments. |
| `people` | Public profiles | founding circle + members + guests; may exist without an account; optional `basedIn` city, shown only when the photographer names one |
| `media` (upload) | File library | `visibility` public/restricted + `uploadedBy`; member uploads stay restricted until published. Raster-only, sharp sizes, `./media` bind mount |
| `frames` | The atomic editorial unit | wraps one media item; `photographer` relationship **required** - the credit rule enforced structurally; reusable across essays, exhibitions and the archive; optional `walk` (single, past walks only) says which walk it was made on |
| `essays` | Photo stories | drafts on; ordered sequence of frame refs with optional caption override; 12-20 soft validation; sequence and lead frame edited visually (see below); `walks` (hasMany, past walks only) says which walk(s) it came out of |
| `albums` | The softer record of a walk | drafts on; plain `media` (hasMany upload), never frames, so nothing in an album enters the archive or the essay picker; `walks` (hasMany, past walks only); credit rule as on frames (`photographer` or `creditOverride`); caption on the site is each file's alt text |
| `walks` | Photowalks/events | pricing display fields + external `bookingUrl` until payments land; virtual `number` (position in the published programme, date order, rendered as № 001); the reverse side of the links above is three `join` fields (`essays`, `frames`, `albums`) - virtual, no columns, no sync hook, and they run the joined collection's read access so anonymous readers only see published work |
| `exhibitions` | Walls | frames + venue + dates; NPC partnership line |
| `photocalls` | Open calls | includes `terms` rich text (photographer keeps copyright, non-exclusive licence - the brief requires this in writing) |
| `submissions` | Member responses | status pipeline submitted -> shortlisted -> published/rejected; `reviewNotes` visible to the submitter ("here is why, frame by frame"), `internalNotes` editor-only; hooks keep attached media restricted until published |
| `orders` | Payments-shaped hole | hidden, empty until a provider is chosen; type/amount/status/provider/ref/raw - a future gateway webhook writes here and flips membership fields, nothing restructures |

Globals: `site-settings` (ticker, socials, newsletter URL), `manifesto`
(dictionary card + manifesto text), `membership` (benefits, `joiningFee`,
`priceMonthly`, `priceAnnual`, `priceNote`, `openDoorNote`, `joinUrl`; empty
prices render the honest `R -`).

Drafts/versions only on essays, albums, walks, exhibitions, photocalls and
the manifesto/membership globals.

## Walk links and albums

The walk closes its loop. Essays, frames and albums link to the walk that
produced them, and only to walks that have already happened: the admin
picker filters on `date < now` (`backend/src/fields/walkLinks.ts`,
`pastWalksOnly`, which Payload re-checks on save) and a `beforeValidate`
hook (`assertWalksInPast`) turns a future walk into a readable 400. Walks
carry the reverse side as join fields, so the admin shows a walk's essays,
frames and albums without any sync hook, and the frontend reads them in one
request: `/api/walks?where[slug][equals]=...&depth=3&joins[essays][limit]=24`
(joined docs populate to `min(maxDepth, depth)` counting the joined doc as
level one; the essays join has `maxDepth: 3` so essay -> lead frame -> image
resolves, frames and albums `maxDepth: 2`). List reads pass
`joins[frames]=false` and stay at depth 0, where the join ids are free.

The walk's `number` is virtual (an `afterRead` count of published walks
dated before it), the one source for "№ 001" on the pages and the cards.
`frontend/utils/walks.ts` holds the two walk predicates (a walk is current
until it wraps) and the number/path helpers.

Pages: `/walks/:slug` is the event while a walk is upcoming (plate, route,
RSVP) and the record once it has walked (facts, route, essays, frames with a
door to `/archive?walk=<slug>`, albums). `/albums` and `/albums/:slug`
show albums uncropped, every photograph credited. The essay reader's door
links back to the walk(s). Specs: `frontend/e2e/walk-detail.spec.ts`,
`albums.spec.ts`, `archive.spec.ts` (walk filter), `reader.spec.ts`, and
`admin-walk-links.spec.ts` (admin config: future walks rejected, join
respects drafts and access, album credit rule, picker hides future walks).

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

## Member accounts (#13, #40)

Anyone can make an account; an account is free, and membership (a plan, the
card, the number) comes after. `POST /api/account/sign-up`
(`backend/src/endpoints/accountSignUp.ts`) is the one door: it takes name,
email, password and the newsletter preference behind a honeypot, creates the
user with `roles: ['member']`, and sends the plain-text confirmation mail
itself (`templates.verifyEmail`, link to `/account/verify?token=`). A known
address gets the same `200 { ok: true }` and an "you already have an account"
email instead, so the form never says who is a member. `users.access.create`
stays admin-only. `POST /api/account/resend-verification` regenerates the
token; `POST /api/users/verify/:token` (stock) confirms; an unconfirmed
account cannot sign in (403) and the JWT strategy refuses it too.

Hardening that comes with an open door (`backend/src/collections/Users.ts`):
`email` and `_verified` are redeclared over Payload's base fields so a member
cannot change or self-verify them; `roles`, `profile` and the membership
fields are admin-only on create and update; `access.unlock` is admin-only
(Payload's default lets any signed-in user unlock any account by email);
the password rule (`backend/src/lib/password.ts`, mirrored in
`frontend/utils/password.ts`: ten characters, no spaces at the ends, not
the email) runs in `beforeValidate`; a member's stock `PATCH { password }`
is refused (403) because it checks nothing and revokes nothing, the security
page (PR4) is the path. `afterRead` shows an expired membership as lapsed
without a write. Every existing account was marked verified by the
`phase6_accounts_verify` migration, so nobody was locked out by the gate.

Test door: with `E2E_HOOKS=true` (ci.yml and a dev backend, never the
production compose) the admin-only `GET /api/e2e/verification-token?email=`
returns the tokens that otherwise travel by email; `frontend/e2e/sign-up.spec.ts`
walks sign-up, the refused sign-in, confirmation and the hardening cases.
Traefik's strict rate limit covers `/api/account/*` POSTs and
`/api/users/verify`. `/privacy` is the notice the sign-up form points at.

## Member sign-in (#13)

Members sign in on the site, never in `/admin`. The frontend talks to
Payload's stock REST auth (`/api/users/login`, `/me`, `/logout`,
`/forgot-password`, `/reset-password`) from `composables/useAuth.ts`; pages
under `/account` use the `auth` route middleware and bounce anonymous
visitors to `/account/sign-in?next=...` (same-site paths only,
`utils/auth.ts`). The session is read once per request in `app.vue`
(`callOnce`), with the incoming cookie forwarded during SSR, so the nav's
Sign in / Account link is right before hydration.

The cookie model:

- Production: site on `bathong.africa`, API on `api.bathong.africa`. The
  compose file sets `COOKIE_DOMAIN=.${SITE_DOMAIN}`, which makes Payload
  issue the `payload-token` cookie for the parent domain with
  `SameSite=None; Secure` (sibling subdomains count as cross-site for
  fetch). `CORS_ORIGINS` must list every site origin that signs in
  (`https://bathong.africa`, plus `https://next.bathong.africa` for the
  preview router); the same list feeds Payload's CSRF allowlist, which is
  what lets a cookie-bearing cross-origin request through.
- Local dev and CI: `localhost:3000` and `localhost:3001` are the same site
  (ports do not split a site), so `COOKIE_DOMAIN` stays unset and the
  default `SameSite=Lax` cookie rides along with `credentials: 'include'`.
- Public content fetches (`useCms`) never send credentials; only
  `useAuth().authed` does.

Password-reset emails link to `/account/reset?token=...` on the site
(`SITE_URL`, falling back to the first `CORS_ORIGINS` entry), not to the
admin panel. The strict Traefik rate limit covers login, forgot-password
and reset-password alongside the public POST endpoints.

`SEED_DEMO=true` seeds a member login for the e2e suite:
`member@bathong.local` / `SEED_MEMBER_PASSWORD` (default
`bathong-member-dev`), plan monthly, status active, linked to the
Mads Nørgaard profile. `frontend/e2e/account.spec.ts` covers the redirect,
sign-in, a wrong password and sign-out.

## Share cards (og:image per entity)

Sharing a URL shows a card generated for that entity, per the share-cards
spec (design-system/design_handoff_frontend_v2/design-references/
share-cards.html): C2 essay (lead frame + index/frame count in the bar),
C3 photographer (portrait, member number, body of work), C4 walk (jacaranda
plate, the date enormous; `/share/walks.jpg` for the next walk and
`/share/walk/<slug>.jpg` for any walk, "WALKED" in the top line once it
has), C5 photocall (signal plate while a call is open), C6 album (the C2
structure with the first photograph and count). Rendered on request by Nitro server routes
(`frontend/server/routes/share/`) with satori + resvg + sharp - fonts are
vendored TTF buffers in `frontend/server/assets/fonts/` (OFL), so no
system fonts are needed in the container. JPEG q82, quality steps down to
stay under the 300 KB WhatsApp ceiling; any missing entity or failed
render serves the static C1 default (`frontend/public/share/default.jpg`),
never an error. Pages append `?v=<updatedAt>` so crawler caches bust on
republish. Covered by `frontend/e2e/share-cards.spec.ts`.

The share row (`frontend/components/ShareRow.vue`) sits on essays, walks,
albums, photographer pages and an open photocall: a word and typographic
links, no icon set. WhatsApp (`wa.me`) and Email (`mailto:`) are plain
anchors carrying "Bathong! <title>" and the canonical URL built from
`NUXT_PUBLIC_SITE_URL` (never the request host, so a share from the preview
host still points home); "Copy link" renders only once the clipboard API is
known to exist. Anchors and a Vue-bound button only, so the CSP's
`script-src-attr 'none'` and `form-action 'self'` hold, and nothing loads
from a third party. `frontend/utils/share.ts`, covered by
`frontend/e2e/share-row.spec.ts` and `tests/unit/share.spec.ts`.

## The archive (#19)

`/archive` is the public, credited index of every frame whose media is
public - restricted media (photocall entries under judging) never appears.
It is served by one public endpoint, `GET /api/archive`
(`backend/src/endpoints/archive.ts`):

| Param | Meaning |
|---|---|
| `q` | free text, trimmed to 80 chars, matched with `like` (ILIKE on postgres) against caption, location and tags |
| `photographer` | a People slug; an unknown slug returns an empty result, not a 400 |
| `walk` | a published walk's slug; frames made on that walk; unknown slug returns an empty result |
| `year` | exact year |
| `tag` | exact tag |
| `page` | 1-based; the page size is fixed at 48 |

Response: `{ docs, page, totalPages, totalDocs, facets }`. `docs` is the
compact frame shape (thumb/full urls, alt, credit, photographer slug, walk
slug/title/number). `facets` (photographers, walks, years, tags with counts)
are computed over the
whole public archive, not the filtered set, so the filter rows never
disappear as you narrow down. Every parameter is clamped; bad input degrades
to defaults rather than erroring.

Search is plain Postgres by decision: at a few hundred frames ILIKE is
instant. If it outgrows that, the upgrade path is a generated `tsvector`
column with a GIN index behind the same endpoint contract; the frontend
keeps its URL-driven state (`frontend/utils/archive.ts`) untouched.

## Access matrix

| Collection | Public | Member | Editor | Admin |
|---|---|---|---|---|
| users | C via /api/account/sign-up | R/U self (name, newsletter, password via the security page) | R | CRUD |
| people | R | R | CRU | CRUD |
| media | R public | R pub+own, C, U/D own restricted | CRU all | CRUD |
| frames | R | R | CRU | CRUD |
| essays/albums/walks/exhibitions/photocalls | R published | R published | CRU + drafts | CRUD |
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
  create the admin) and `npm run dev` on port 3001. The demo walks carry
  dates relative to the seed run (a past walk three weeks back, the next
  walk two weeks out, both on the Walk 001 route) so the suite never ages
  out; rerunning the seed moves them. `demo-past-walk` is the link target
  for the demo essay, two frames and the demo album. Payload renames an
  upload whose file already sits in `./media`, so the seed keeps media ids
  in memory rather than looking files up twice by name.
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
- `migrate:create` diffs against the newest `.json` snapshot in the folder,
  so a hand-written migration without one makes the next generate re-emit
  its changes and ask rename questions interactively (`script -qec` gives it
  a terminal in a non-interactive shell). `20260829_121228_phase5_*`
  re-baselined the snapshot; keep committing the `.json` from now on.
- When a single relationship becomes hasMany, move the values into the
  `_rels` table (and `_<slug>_v_rels` with path `version.<field>`) before
  dropping the column - see the phase5 migration for the pattern.
- Back up: `pg_dump` + the `./media` bind mount together - the photographs
  are the product.

## Membership and payments

Pricing was decided on 29 August 2026 (#17): one membership, no tiers.
R250 to join, then R100 a month or R1000 a year. The card and the member
number are the kicker and belong to subscribing (monthly or annual)
members only, not to a once-off joiner. The numbers live in the `membership` global and render on
`/` and `/about`; `Join` goes to `joinUrl` or the contact mailbox. The open
door stays without a tier: `openDoorNote` invites anyone the fee would keep
out to write anyway.

No gateway is integrated yet (#18): the shortlist is local (Payfast for
in-platform membership/recurring; Quicket links for event ticketing). The
`orders` collection, `membershipPlan`/`membershipStatus`/`membershipExpires`
on `users` and `bookingUrl` on walks are the prepared seams; integrating
later is additive.

## Roadmap milestones

- **M1 Holding live** - holding page on bathong.africa (done)
- **M2 Platform scaffold** - backend boots, admin gated, initial migration
- **M3 v1 site headless** - Nuxt + content, cutover from holding page
- **M4 Members** - sign-in from the frontend (done, #13), photocall submissions, SMTP (done)
- **M5 Payments** - pricing decided (#17), provider decision open (#18)
- **M6 Archive** - the searchable open archive over frames (v1 shipped, #19)
