# Bathong. - platform architecture

The platform behind bathong.africa. Status: v1 site live (M3 cutover done);
member accounts, joining by EFT and the archive are live, a payment gateway
is still ahead. This document is the reference for how the pieces fit, how
data is modelled and how deploys happen.

## Stack

- **Backend:** Payload CMS 3.x on Next, `@payloadcms/db-postgres`
  (postgres:16-alpine). Admin UI + REST API on `api.bathong.africa`;
  GraphQL is disabled (`backend/src/payload.config.ts`).
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
Payload (which applies pending migrations before serving), checks the
site answers 200, then tests and reloads the image cache config. It prints
the rollback commit first.

### Image cache

Every photograph is requested through `/_ipx/` and Traefik sends that
prefix to a small nginx container (`bathong_ipx_cache`) in front of Nuxt,
because ipx has no result cache of its own and an AVIF encode costs
seconds. The config is `ops/nginx/ipx-cache.conf`; the directory is mounted
as `/etc/nginx/conf.d` so the running container sees a pulled change.

- Each variant is encoded once and kept on the `ipx_cache` volume. Only 200
  responses are cached, and upstream cache headers are ignored.
- After 30 days an entry is stale, not gone: the visitor gets the stale copy
  at once and nginx refreshes it in the background
  (`proxy_cache_background_update`). Before this, the first visitor after
  expiry waited for the re-encode, 5 to 13 seconds per image on the essay
  reader. The 30 days only bound how long a file replaced under the same
  name can stay stale.
- Entries nobody requests for a year are dropped; `max_size=5g` evicts the
  least recently used first.
- `X-Cache-Status` on the response says what happened: `HIT`, `STALE`,
  `UPDATING`, `MISS` (a first encode, about 2 seconds) or `EXPIRED`.
- CI runs `nginx -t` on the config (job `ops`): an invalid config would take
  every photograph down. The deploy script runs the same test inside the
  container before it reloads.
- The deploy ends with `ops/warm-images.sh` (#167), so a visitor does not
  pay for the first encode: it reads the entry pages (home, the index
  pages, every essay listed on `/stories`, the newest album and walk, every
  photographer), picks from each AVIF `srcset` the one candidate a phone
  (390 by 844px, ratio 2) and a desktop (1440 by 900px, ratio 1) would
  take, and requests those two at a time. The choice follows `sizes` as a
  browser does: media conditions, `vw`, `px`, and the essay reader's
  `min()` and `vh` (#183), which is why each device has a height. The home
  page rotates its photographs per visit, so it is read up to 80 times to
  collect them. The last line is the result, for example
  `309 variants requested from 16 pages: 0 MISS, 309 HIT, 0 STALE, 0 failed`;
  it cannot fail the deploy, and `ops/warm-images.sh https://bathong.africa`
  runs it by hand (`--list` prints the choices and requests no image).

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
| `SITE_DOMAIN`, `ALT_DOMAIN` | always (container names, Traefik routers) |
| `DB_PASSWORD`, `PAYLOAD_SECRET`, `CORS_ORIGINS` | platform |
| `SITE_URL` | optional override; the compose file passes `https://$SITE_DOMAIN` to Payload by default. The origin for links in mail (verify, reset, membership) |
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
  bathong_payload npm run seed
```

`SEED_ADMIN_*` creates the first admin login for `api.bathong.africa/admin`.
Do not pass `SEED_DEMO=true` on the server: it is for local development and
CI. It adds demo essays, walks and albums, and a demo member account whose
password falls back to a development default unless `SEED_MEMBER_PASSWORD`
is set. The seed is idempotent - rerunning updates rather than duplicates.

Verify after a deploy: `https://bathong.africa` serves the site (walks page
shows the route map, an RSVP submits, the devtools console shows no CSP
violations, admin reachable at `api.bathong.africa/admin`), `www.` and `bathong.org` 301 to the primary
host, and `next.bathong.africa` (if DNS exists) challenges for the password.

## Data model (Payload collections)

The photo essay (12-20 sequenced, credited frames) is the platform's core
unit; everything else feeds it or shows it.

| Collection | Purpose | Notes |
|---|---|---|
| `users` (auth) | Accounts | roles `admin`/`editor`/`member`; admin panel gated to admin+editor; members sign in via REST from the frontend (`/account`, #13). Membership fields (`membershipPlan` none/monthly/annual, `membershipStatus`, `membershipExpires`, `memberSince`) are admin-only, set by the Orders hooks when an order is marked paid. |
| `people` | Public profiles | founding circle + members + guests; may exist without an account; optional `basedIn` city, shown only when the photographer names one |
| `media` (upload) | File library | `visibility` public/restricted + `uploadedBy`; member uploads stay restricted until published. Raster-only, sharp sizes, `./media` bind mount |
| `frames` | The atomic editorial unit | wraps one media item; `photographer` (a People profile) or `creditOverride` is **required** - the credit rule, enforced by a `beforeValidate` hook on the merged state, so a partial update cannot clear it; reusable across essays, exhibitions and the archive; optional `walk` (single, past walks only) says which walk it was made on |
| `essays` | Photo stories | drafts on; ordered sequence of frame refs with optional caption override; 12-20 soft validation; sequence and lead frame edited visually (see below); `walks` (hasMany, past walks only) says which walk(s) it came out of |
| `albums` | The softer record of a walk | drafts on; plain `media` (hasMany upload), never frames, so nothing in an album enters the archive or the essay picker; `walks` and `workshops` (both hasMany, past events only); credit rule as on frames (`photographer` or `creditOverride`); caption on the site is each file's alt text; a file's own `credit`, when set, is shown on that photograph on the album page, the rest carry the album credit |
| `walks` | Photowalks/events | pricing display fields + external `bookingUrl` until payments land; virtual `number` (position in the published programme, date order, rendered as № 001); the reverse side of the links above is three `join` fields (`essays`, `frames`, `albums`) - virtual, no columns, no sync hook, and they run the joined collection's read access so anonymous readers only see published work |
| `workshops` | Taught sessions | drafts on; venue, `facilitators`, `partners`, one flat `price` per person + external `bookingUrl`; booked through the same RSVPs as walks; virtual `number` in its own series; an `albums` join (virtual, published albums only for anonymous readers); no route, no frames or essays |
| `exhibitions` | Walls | frames + venue + dates; NPC partnership line |
| `photocalls` | Open calls | includes `terms` rich text (photographer keeps copyright, non-exclusive licence - the brief requires this in writing) |
| `submissions` | Member responses | status pipeline submitted -> shortlisted -> published/rejected; `reviewNotes` visible to the submitter ("here is why, frame by frame"), `internalNotes` editor-only; hooks keep attached media restricted until published |
| `orders` | Membership payments | live for the EFT join flow (see Joining and orders); shown to editors and admins in the admin, hidden from everyone else; collection create is closed, rows come from `POST /api/account/join`; type/plan/amount/joiningFee/reference/status/provider/providerRef/raw - an editor marking an order `paid` activates the membership through hooks, and a later gateway webhook flips the same status, nothing restructures |
| `rsvps` | Places on a walk or workshop | exactly one of `walk`/`workshop` per row (hook); public create behind a honeypot, no account needed; a full event puts new rows on the waitlist; `user` is set when a signed-in member reserves; read is editors plus the member's own rows |

Globals: `site-settings` (ticker, socials, newsletter URL), `manifesto`
(dictionary card + manifesto text), `membership` (benefits, `joiningFee`,
`priceMonthly`, `priceAnnual`, `priceNote`, `openDoorNote`, `joinUrl`; empty
prices render the honest `R -`).

Drafts/versions only on essays, albums, walks, workshops, exhibitions,
photocalls and the manifesto/membership globals.

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

## Exhibitions

Exhibitions have a public index (`/exhibitions`) and a detail page
(`/exhibitions/[slug]`), linked from the footer and from each photographer
page whose frames hang there (#163). An exhibition's phase (on now, coming
up, past) comes from its dates in SAST, on through its last day; the
`status` field only decides when a date is missing. With no hero image the
first frame leads the page. Share cards `/share/exhibition/[slug].jpg` and
`/share/exhibitions.jpg` lead with the hero image, else the first frame.
`SEED_DEMO` seeds one, `demo-first-hang`, for the e2e suite
(`frontend/e2e/exhibitions.spec.ts`).

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
the email) runs in `beforeValidate` on create and update and in
`beforeOperation` for reset-password (which hashes before validation); a
member's stock `PATCH { password }`
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

## Joining and orders

A signed-in account joins from `/account/join`: it picks monthly or annual,
`POST /api/account/join` (`backend/src/endpoints/accountJoin.ts`) creates an
`orders` row (`type: membership`, `plan`, `amount` frozen at order time,
`joiningFee` when `memberSince` is empty, a unique `reference` such as
`BTG-7K3M2Q` from an unambiguous alphabet, `status: pending`,
`provider: manual`) and emails the bank details and the reference. One open
order per account, held by a partial unique index (`orders_one_pending_idx`):
asking again with the same plan returns it, asking with the other plan moves
the open order over (same reference, new amount, instructions sent again),
and two joins in the same instant answer with the same order. A running
membership can renew in its last 30 days. There is no "I have paid" button.

The bank details live on the `membership` global (`bank` group, readable by
signed-in accounts only; `referencePrefix`). An editor marks the order
`paid` in the admin (Orders is visible to editors; status, paidAt, provider,
providerRef and note are editable, the money fields and `raw` are
admin-only). The
Orders hooks then set `paidAt`, `coveredFrom` (the current expiry when the
membership still runs, else the payment day) and `coveredUntil` (a month or
a year on, clamped to month ends), find or create the member's People
profile (`owner` = the account; a slug from the name), assign a member
number from the Postgres sequence `people_member_number_seq` (atomic, never
reused; a number typed by hand moves the sequence past it), set the
account's plan, status, expiry, `profile` and `memberSince`, and send
`membershipActivated`. A refund or cancellation after payment does not
revoke membership by itself; an admin edits the account. Two limits are
accepted at collective scale rather than engineered away (both are in
Accepted limits below): the welcome mail leaves inside the request
transaction (Payload has no post-commit hook; checked against 3.90.2, the
version pinned in `backend/package.json`), and two orders for one account
marked paid in the same instant would compute the same expiry base. The
activation hook reads the paid transition
off the saved order (`doc`/`previousDoc`), never off a flag passed through
the hook context: a local API call made with `req` replaces `req.context`,
so a flag set after such a call in `beforeChange` never reaches
`afterChange`.

PayFast (#18) later: its webhook finds the order by `reference` (sent as
`m_payment_id`), sets `provider`, `providerRef`, `raw` and `status: paid`;
the same hooks activate. Nothing restructures.

Members reach their desk at `/account`: the card (`MemberCard.vue`, three
honest states), the next walk, their RSVPs (RSVPs made while signed in
carry `user`, readable by that member), their photocall entries with the
written response, their published work, their payments. The public roster
lists only profiles with `onRoster` on. A member needs a portrait to switch
it on (an explicit `portrait: null` counts as none); editors, and the seed,
may list a founder before the portrait arrives, so the founders are on the
roster from the seed and, on an existing database, from the migration.
`instagram` and `website` on a profile are validated as parsed http(s)
links (a bare handle becomes the Instagram profile link) and rendered
through `safeHref()` on the site, so a member cannot publish a
`javascript:` href. `people.owner` never populates (`maxDepth: 0`): the
profile is public, the account is not.

## Profile self-service

`/account/profile` is the member's own page, edited by the member through
`PATCH /api/people/:id` (People `update` access: editors, or
`owner = user`). Their fields: portrait, `basedIn`, `bio` (a textarea; the
site turns blank-line paragraphs into a Lexical document with
`utils/lexical.ts`, the seed's shape), `instagram`, `website`,
`contactEmail`, `showContact`, `onRoster`. The editorial fields (name, slug,
member number, role, founding circle, order) carry `access.update:
isEditorField`, so a member's PATCH of them is silently dropped. The
portrait is uploaded as a public media file (`POST /api/media`, XHR for
progress, `_payload` carrying alt and visibility) and then set on the
profile; a member may only set a public portrait they uploaded themselves,
and a replaced portrait that was their own upload is deleted when nothing
else (a frame, another profile) shows it, since members cannot delete
public media. The roster switch stays disabled on the page (and out of the
patch, so an editor's listing survives a save), and refused by the API,
until a portrait exists. `contactEmail` is readable by editors, by the
owner, and publicly only when `showContact` is on. The bio is capped at
2000 characters of text on the API. Without a profile (no membership yet)
the page is the door to joining.

## The security page

`/account/security` (`backend/src/endpoints/accountSecurity.ts`, all under
the rate-limited `POST /api/account/*`):

- **Password.** `POST /api/account/change-password { current, password }`
  checks the current password (`lib/sessions.ts` mirrors Payload's pbkdf2
  check and its lockout, neither of which the package exports: five wrong
  answers lock the account for ten minutes, as at sign-in), applies the
  policy, updates through the local API with `context.passwordChange` (the
  only way past the Users hook that refuses a stock self `PATCH
  { password }`), clears any pending email change, keeps only the session
  making the change (`req.user._sid`) and mails `passwordChanged`. A
  password reset clears a pending email change too (Users `afterOperation`
  on `resetPassword`, the only hook that path runs).
- **Email.** `POST /api/account/change-email { password, email }` checks the
  password, refuses the current address, and writes the same pending state
  (`pendingEmail`, a token, a one-hour expiry; fields not writable through
  the collection) whether or not the address has an account, so nothing
  the asker can read says which. A free address gets `emailChangeVerify`
  with the link; a taken one gets `accountExists` and its token is never
  sent; the old address gets `emailChangeNotice` either way.
  `POST /api/account/cancel-email-change` clears it. `POST
  /api/account/confirm-email { token }` (anonymous, from
  `/account/verify?kind=email`) refuses a taken or expired change, moves the
  address, clears the pending fields and revokes every session.
- **Devices.** `GET /api/account/sessions` lists live sessions with the
  current id; `POST /api/account/sessions/revoke { id }` drops one; the stock
  `POST /api/users/logout?allSessions=true` drops all. Payload's JWT
  strategy checks the session id on every request, so a dropped session
  is out at once.
- **Close account.** `POST /api/account/delete { password }`: editors and
  admins are refused (an admin removes them); in one transaction RSVPs by
  the account or its address become `Former member` at
  `deleted-{id}@example.invalid` (`lib/anonymise.ts`), entries still under
  judging are deleted with their files, published entries lose the account
  link and email but keep the credit name (`context.closingAccount` lets the
  immutable `submitter` go), restricted media by the account is deleted,
  the People profile keeps its number and work but loses its owner, roster
  place and contact, pending orders are cancelled (note appended), and the
  user row goes. A bulk step that fails on any row fails the whole closing
  (Payload's bulk operations collect errors instead of throwing). The
  response clears the session cookie; `accountDeleted` is mailed.

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

`SEED_DEMO=true` seeds a member login for the e2e suite: plan monthly,
status active, linked to the Mads Nørgaard profile. Its password comes from
`SEED_MEMBER_PASSWORD`; when that is unset the seed falls back to a
development default (`backend/src/seed/seed.ts`), so set the variable on
any stack that can be reached from outside. CI sets its own throwaway value
(`ci.yml`). `frontend/e2e/account.spec.ts` covers the redirect, sign-in, a
wrong password and sign-out.

## Share cards (og:image per entity)

Sharing a URL shows a card generated for that entity, per the share-cards
spec (design-system/design_handoff_frontend_v2/design-references/
share-cards.html): C2 essay (lead frame + index/frame count in the bar),
C3 photographer (portrait, member number, body of work), C4 walk (jacaranda
plate, the date enormous; `/share/walks.jpg` for the next walk and
`/share/walk/<slug>.jpg` for any walk, "WALKED" in the top line once it
has, and a photograph from the walk in place of the plate as soon as it
has produced one: newest essay's lead frame, else newest frame, else newest
album cover), C5 photocall (signal plate while a call is open), C6 album
(the C2 structure with the first photograph and count; the chip names that
file's own credit when it has one). A workshop shares its invite poster
beside the plate, or a photograph from its albums once held without one.
The index pages share the C1 structure led by their newest work:
`/share/stories.jpg` (newest essay's lead frame), `/share/albums.jpg`
(newest album's cover), `/share/archive.jpg` (the homepage lead frame
rule: newest top pick, else newest frame), `/share/photographers.jpg`
(newest frame by the first roster member who has one); `/walks` and
`/workshops` fall back to the last one walked or held between events.
Home, About, Privacy and the account pages keep the C1 default, as the
spec asks. Rendered on request by Nitro server routes
(`frontend/server/routes/share/`) with satori + resvg + sharp - fonts are
vendored TTF buffers in `frontend/server/assets/fonts/` (OFL), so no
system fonts are needed in the container. JPEG q82, quality steps down to
stay under the 300 KB WhatsApp ceiling; any missing entity or failed
render serves the static C1 default (`frontend/public/share/default.jpg`),
never an error. Pages append `?v=<updatedAt>` so crawler caches bust on
republish, and `useShareMeta` adds `&c=<CARD_REVISION>` (`frontend/utils/
share.ts`) to every generated card URL. Platforms cache a card by its URL
(Facebook documents it: a changed image needs a new URL), so bump the
revision when the cards change how they look or after an outage served the
wrong image; every `og:image` then moves at once. The routes answer GET and
HEAD (crawlers and validators probe with HEAD) and refuse other methods. satori shapes type with harfbuzzjs, which reads `hb.wasm` from
disk; the Nitro tracer does not follow that read, so `nuxt.config.ts`
lists the file under `nitro.externals.traceInclude`. Without it every card
silently falls back to the default (production did after the satori 0.33
bump of 16 Sep 2026).
Covered by `frontend/e2e/share-cards.spec.ts`, which fails a generated
card that is byte-identical to the default, and
`tests/unit/share-cards.spec.ts`.

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
| people | R | R, U own profile (portrait, bio, city, links, contact, roster) | CRU | CRUD |
| media | R public | R pub+own, C, U/D own restricted | CRU all | CRUD |
| frames | R | R | CRU | CRUD |
| essays/albums/walks/workshops/exhibitions/photocalls | R published | R published | CRU + drafts | CRUD |
| submissions | C via /api/photocall-entries | C, R own, U own while submitted | R all, U status/notes | CRUD |
| orders | - | R own (created via /api/account/join) | R all, U status/paidAt/note | RUD (no create outside the join endpoint) |
| rsvps | C | C, R own | R all, U | CRUD |
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
  `npm run typecheck` (`nuxt typecheck` with `vue-tsc`),
  `npm run tokens:check` (design-system drift), `npm run types:check`
  (payload-types drift), `npm test` (unit), `npm run test:e2e` (Playwright,
  needs the seeded stack).
- CI (`.github/workflows/ci.yml`) runs on every PR and on pushes to `main`:
  frontend lint, typecheck, both drift checks, unit tests and the build;
  backend `npx tsc --noEmit` and unit tests; `ops`, an `nginx -t` of the
  image cache config in the official image; then the Playwright suite
  against a seeded stack.

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
`/` and `/about`; `Join` goes to sign-up on the site (`/account/sign-up`,
or the desk at `/account` when signed in, and from the desk to
`/account/join`). `joinUrl` is meant to stay empty; when set, the Join
button on `/about` goes there instead. The open
door stays without a tier: `openDoorNote` invites anyone the fee would keep
out to write anyway.

No gateway is integrated yet (#18): the shortlist is local (Payfast for
in-platform membership/recurring; Quicket links for event ticketing). Until
then membership is paid by EFT and an editor marks the order paid (see
Joining and orders). The `orders` collection (a webhook would find the order
by its `reference`) and `bookingUrl` on walks and workshops are the seams;
integrating later is additive.

## Accepted limits

Known, and left as they are: at the collective's size each costs less than
its fix. One list, so nobody has to find them in the sections above. Each
names the file that shows it; the Payload behaviour was read in 3.90.2,
the pinned version.

- **The welcome mail leaves inside the transaction.** The Orders
  `afterChange` hook sends `membershipActivated` before the request
  commits, and Payload has no post-commit hook. A commit that failed after
  that point would leave a welcome mail for an activation that rolled
  back; the `membership: activated` log line is the audit trail.
  `backend/src/collections/Orders.ts`
- **Two orders for one account marked paid in the same instant** compute
  the same expiry base: `beforeChange` reads the account's expiry
  (`activationBase`), `afterChange` writes the new one, and nothing locks
  the account in between. `backend/src/collections/Orders.ts`,
  `backend/src/lib/membership.ts`
- **The hook context does not carry a flag from one hook to the next.** A
  local API call made with `req` puts a new object on `req.context`
  (Payload's `createLocalReq`), so a flag set on the destructured `context`
  after such a call in `beforeChange` never reaches `afterChange`. Hooks
  read the transition from `doc`, `previousDoc` and `operation` instead. A
  guard passed into a nested call (`context: { syncingOwner: true }`) does
  arrive. `backend/src/collections/Orders.ts`
- **A refund or cancellation does not revoke a membership.** The Orders
  hooks act only when an order becomes `paid`; an admin edits the account.
  `backend/src/collections/Orders.ts`
- **An event can end up over capacity.** RSVP capacity is a count query in
  `beforeChange`, so two submits in the same instant can both pass it.
  `backend/src/collections/Rsvps.ts`
- **Mail is sent once and never retried.** The platform's own mail goes
  through `sendSafe`, which is not awaited and never throws, so a slow or
  dead SMTP hop cannot fail a request that has committed. A failed send is
  an `email send failed` line in the Payload log and nothing else.
  `backend/src/email/send.ts`
- **Archive search is plain `ILIKE` and nothing is cached**, facets
  included: sized for a few hundred frames (the upgrade path is under The
  archive). `backend/src/endpoints/archive.ts`
- **Styles keep `'unsafe-inline'` in the CSP.** Vue SSR emits style
  attributes, which a nonce cannot cover; scripts carry no such allowance.
  `frontend/nuxt.config.ts`
- **The security page mirrors Payload internals.** Payload exports neither
  its local password check nor its session write, so the hashing and the
  lockout count are copied; a Payload upgrade that changes either has to
  be followed there. `backend/src/lib/sessions.ts`
- **A photograph replaced under the same file name can stay stale for up
  to 30 days** in the image cache, which is what the 30-day validity
  bounds. `ops/nginx/ipx-cache.conf`

## Roadmap milestones

Tracked as GitHub milestones; read against the tracker on 4 October 2026.

Done:

- **M1 Holding live** - holding page on bathong.africa
- **M2 Platform scaffold** - backend boots, admin gated, initial migration
- **M3 v1 site headless** - Nuxt + content, cutover from holding page (#12)
- **M4 Members** - sign-in from the frontend (#13), open sign-up (#75),
  photocall submissions (v1 shipped), SMTP
- **M6 Archive** - the searchable open archive over frames (v1 shipped, #19)

Open:

- **M5 Payments** - pricing is decided (#17) and joining by EFT is live (an
  editor confirms each payment). One issue is left, #18: choose the payment
  provider and integrate it.
- **M7 Open the door** - what has to be true before joining is announced:
  the entity registered and its bank account, the real bank details on the
  `membership` global, the photocall licence text signed off, the open
  door decided (a form or the mailto), the site copy following the
  three-capitals repositioning, and these docs telling the truth.
- **M8 Keep it running** - the platform as an operated service: scheduled
  off-host backups, uptime checks and alerts, renewal reminders and a lapse
  notice, a reader for the newsletter preference, and the dependency
  advisories. Also here: image performance (new sizes warmed after a
  deploy, the essay reader, phone budgets, large screens), an
  accessibility pass on the image pages, and the gaps between what the
  repo configures and what runs.
- **M9 Worth joining** - what makes a photographer want their work here
  and pay for it: members choosing the frames that lead their page and
  submitting work to it, benefits enforced in code with the lapse defined,
  a public page for exhibitions, bookable member sessions, and a
  membership page that says truthfully what paying gets.
