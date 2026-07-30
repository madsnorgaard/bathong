# Bathong. - platform architecture

The platform behind bathong.africa. Status: holding page live; backend and
frontend scaffolding in progress. This document is the reference for how the
pieces fit, how data is modelled and how deploys happen.

## Stack

- **Backend:** Payload CMS 3.x on Next, `@payloadcms/db-postgres`
  (postgres:16-alpine). Admin UI + REST/GraphQL API on `api.bathong.africa`.
- **Frontend:** Nuxt 3, server-rendered, consuming the design system
  (`design-system/styles.css`) and the Payload API.
- **Holding page:** `holding/index.html` served by nginx:alpine - the public
  face until the v1 site content is in Payload (cutover at M3).
- **Hosting:** docker compose behind Traefik (external `web` network,
  per-project `internal` network, lets-encrypt resolver), same pattern as the
  other production sites.

Domains: **bathong.africa** primary; `www.` and `bathong.org` variants 301 to
it; `api.bathong.africa` reserved for Payload.

## Deploy (manual for now)

Deploys are git + SSH; no CI pipeline yet.

```bash
# on the server, in the compose directory (a clone of this repo)
git pull
docker compose up -d            # holding page: that's all
# once platform services exist:
docker compose build && docker compose up -d
```

Required `.env` next to the compose file (names only - values never live in
git):

| Key | Stage |
|---|---|
| `SITE_DOMAIN`, `ALT_DOMAIN` | holding (now) |
| `DB_PASSWORD`, `PAYLOAD_SECRET`, `CORS_ORIGINS` | platform |

## Data model (Payload collections)

The photo essay (12-20 sequenced, credited frames) is the platform's core
unit; everything else feeds it or shows it.

| Collection | Purpose | Notes |
|---|---|---|
| `users` (auth) | Accounts | roles `admin`/`editor`/`member`; admin panel gated to admin+editor; members sign in via REST from the frontend. Membership fields (`tier`, `status`, `expires`) exist now, admin-only, filled by future payments. |
| `people` | Public profiles | founding circle + members + guests; may exist without an account |
| `media` (upload) | File library | `visibility` public/restricted + `uploadedBy`; member uploads stay restricted until published. Raster-only, sharp sizes, `./media` bind mount |
| `frames` | The atomic editorial unit | wraps one media item; `photographer` relationship **required** - the credit rule enforced structurally; reusable across essays, exhibitions and the future archive |
| `essays` | Photo stories | drafts on; ordered sequence of frame refs with optional caption override; 12-20 soft validation |
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
