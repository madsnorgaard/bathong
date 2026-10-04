# Bathong.

Street & documentary photography collective, from Pretoria (Pitori) outward. South Africa.
This repo is the brand and design system, and the home of the website.

> **ba·thong** *excl. / loc.* - Sepedi / Setswana, from *batho*: people.
> 1. what you say when you can't believe what you're seeing.
> 2. among the people - where this work is made.

**The one rule everyone must know:** **Bathong.** with the full stop is the
mark (masthead, cards, walls, legal documents). **Bathong!** with the
exclamation is the voice (campaigns, posters, captions, stickers). The mark
states; the street shouts. Full rules in
[brand/GUIDELINES.md](brand/GUIDELINES.md).

## What's live

**bathong.africa** is a server-rendered Nuxt 3 site (`frontend/`) reading a
Payload CMS 3 backend (`backend/`: the admin and the REST API, on
`api.bathong.africa`). Merging to `main` deploys it. On it today:

- **Stories** - sequenced, credited photo essays - and **the archive**, the
  searchable index of every public frame.
- **Walks** and **workshops**, each with RSVPs, and **albums**, the softer
  record of what was walked or taught.
- **Photocalls** and **photographers** (the roster, and a page per
  photographer).
- **Member accounts** - sign-up with a confirmed email, joining by EFT (an
  editor marks the payment, the membership activates), the desk at
  `/account`, and the profile and security pages.
- **Share cards** - an og:image generated per essay, walk, workshop, album
  and photographer.

How the pieces fit, the data model, and how to run it locally:
[docs/PLATFORM.md](docs/PLATFORM.md) ("Local development").

## What's here

| Path | What it is |
|---|---|
| `frontend/` | The website - Nuxt 3, server-rendered |
| `backend/` | Payload CMS 3 on Postgres - the admin panel and the REST API |
| `docs/PLATFORM.md` | **Start here for the platform.** Architecture, data model, access, deploy, local development, accepted limits, roadmap |
| `docs/ROUTES.md` | How a walk's route gets onto the map (`scripts/route-from-gpx.mjs` converts a GPX) |
| `docker-compose.yml`, `ops/` | The production compose file, the deploy script (`ops/deploy.sh`) and the image cache config. `docker-compose.dev.yml` is Postgres for local work |
| `styleguide/index.html` | **Start here for the brand.** The living brand manual - colour, type, the dot, photography treatment, components, voice, don'ts. Open it in a browser. |
| `design-system/` | The full design system, synced with the "Bathong. Design System" Claude Design project - split tokens (`design-system/styles.css` is the one import), 14 components (JSX + specs), guideline specimen cards, and a rebuild of the first one-file site on real components (`design-system/ui_kits/website/index.html`). New surfaces build on this. |
| `holding/index.html` | The holding page that answered on bathong.africa before the site. Retired at the cutover (#12), kept as the unrouted fallback |
| `tokens/tokens.json` | Design tokens, source of truth |
| `tokens/tokens.css` | The tokens as CSS custom properties (+ the grain overlay) |
| `css/bathong.css` | Component stylesheet - frames, tags, buttons, the dictionary card, ticker, member card, forms |
| `brand/BRIEF.md` | The full brand & platform brief, v1.0 (28 Jul 2026) |
| `brand/GUIDELINES.md` | The condensed one-page rules |
| `assets/logo/` | The punch-dot and avatar SVGs, the 512px favicon, wordmark PNGs, LinkedIn exports, and `exports.html` (the artboards behind them) |
| `assets/share/` | `default.jpg`, the default og:image (1200×630 JPEG; the site serves its copy in `frontend/public/share/`), and `exports.html` (its artboard) |
| `assets/dictionary-card.html` | The definition card at 1080×1080, ready to screenshot for Instagram |
| `site/index.html` | The first one-file site, retired when the Nuxt site took over the domain (#12). Nothing in the compose file serves it; it stays as the source the design system's website kit was rebuilt from |

## Using the system

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens/tokens.css">
<link rel="stylesheet" href="css/bathong.css">
<body class="grain">
```

These two stylesheets are plain HTML/CSS - no build step, no dependencies.
The website does not link them: the Nuxt app carries a copy of the
design-system tokens and components in `frontend/assets/css/`, and
`npm run tokens:check` (in `frontend/`, and in CI) fails when the copy drifts.

**Source-of-truth flow:** `brand/` + `tokens/tokens.json` define the brand;
`tokens/tokens.css` + `css/bathong.css` are the hand-maintained upstream
stylesheets; `design-system/` mirrors and extends them (mapping recorded in
`design-system/github.md`) and is kept in sync with the Claude Design project
via /design-sync. The site mirrors `design-system/` in turn (rules in
`design-system/SYNC.md`).

## Non-negotiables (short version)

- Every photograph is credited, everywhere it appears.
- Brand colour lives in the frame around the work, never on top of it.
- Photographs are shown as shot - no forced brand filters.
- Four colours, three typefaces, nothing rounded, no gradients on type,
  no camera iconography.

## Roadmap

Domains: **bathong.africa** (primary) and **bathong.org** (redirects). DNS is
live; bathong.co.za remains a want (owner contacted).

The work is tracked as GitHub issues under milestones. Done: the holding
page (M1), the platform (M2), the Nuxt site and the cutover (M3), member
accounts (M4) and the open archive (M6). Open:

- **M5 Payments:** joining is by EFT today; choosing a payment provider and
  integrating it is the one issue left (#18).
- **M7 Open the door:** what has to be true before joining is announced -
  the entity and its bank account, the real bank details on the platform,
  the photocall terms signed off, the docs telling the truth.
- **M8 Keep it running:** the platform as an operated service - off-host
  backups, uptime alerts, renewal mails, the newsletter, dependency
  upgrades, and the speed and accessibility of the image pages.
- **M9 Worth joining:** what makes a photographer want their work here and
  pay for it - a page they would send to a curator, their own selection and
  submissions, benefits the site actually delivers, and a membership page
  that says so truthfully.

A paragraph on each in `docs/PLATFORM.md` ("Roadmap milestones").

---

*Bathong! - among the people.*
