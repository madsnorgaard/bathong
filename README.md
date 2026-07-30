# Bathong.

Street & documentary photography collective - Pretoria (Pitori), South Africa.
This repo is the brand and design system, and the home of the website.

> **ba·thong** *excl. / loc.* - Sepedi / Setswana, from *batho*: people.
> 1. what you say when you can't believe what you're seeing.
> 2. among the people - where this work is made.

**The one rule everyone must know:** **Bathong.** with the full stop is the
mark (masthead, cards, walls, legal documents). **Bathong!** with the
exclamation is the voice (campaigns, posters, captions, stickers). The mark
states; the street shouts. Full rules in
[brand/GUIDELINES.md](brand/GUIDELINES.md).

## What's here

| Path | What it is |
|---|---|
| `styleguide/index.html` | **Start here.** The living brand manual - colour, type, the dot, photography treatment, components, voice, don'ts. Open it in a browser. |
| `design-system/` | The full design system, synced with the "Bathong. Design System" Claude Design project - split tokens (`design-system/styles.css` is the one import), 14 components (JSX + specs), guideline specimen cards, and a rebuild of the v1 site on real components (`design-system/ui_kits/website/index.html`). New surfaces build on this. |
| `holding/index.html` | The public holding page - what answers on bathong.africa until the full site launches |
| `tokens/tokens.json` | Design tokens, source of truth |
| `tokens/tokens.css` | The tokens as CSS custom properties (+ the grain overlay) |
| `css/bathong.css` | Component stylesheet - frames, tags, buttons, the dictionary card, ticker, member card, forms |
| `brand/BRIEF.md` | The full brand & platform brief, v1.0 (28 Jul 2026) |
| `brand/GUIDELINES.md` | The condensed one-page rules |
| `assets/logo/` | The punch-dot and avatar SVGs |
| `assets/dictionary-card.html` | The definition card at 1080×1080, ready to screenshot for Instagram |
| `site/index.html` | The live v1 website - single self-contained file, deploys anywhere |

## Using the system

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens/tokens.css">
<link rel="stylesheet" href="css/bathong.css">
<body class="grain">
```

Everything is plain HTML/CSS - no build step, no dependencies. The v1 site is
deliberately self-contained (inlined styles) so it can be dropped on any host
as one file; when the site grows past one page, refactor it onto these
stylesheets.

**Source-of-truth flow:** `brand/` + `tokens/tokens.json` define the brand;
`tokens/tokens.css` + `css/bathong.css` are the hand-maintained upstream
stylesheets; `design-system/` mirrors and extends them (mapping recorded in
`design-system/github.md`) and is kept in sync with the Claude Design project
via /design-sync. New pages consume `design-system/styles.css`.

## Non-negotiables (short version)

- Every photograph is credited, everywhere it appears.
- Brand colour lives in the frame around the work, never on top of it.
- Photographs are shown as shot - no forced brand filters.
- Four colours, three typefaces, nothing rounded, no gradients on type,
  no camera iconography.

## Roadmap

Domains: **bathong.africa** (primary) and **bathong.org** (redirects). DNS is
live; bathong.co.za remains a want (owner contacted).

- **Phase 1 (now):** holding page live on bathong.africa; brand assets final.
- **Phase 2:** full site headless on the platform (Payload CMS + Nuxt, docker
  compose) - essays, walks, exhibitions, photocalls. See `docs/PLATFORM.md`.
- **Phase 3:** member accounts + photocall submissions; payments (provider TBC
  with pricing); the searchable open archive.

Before launch, replace in `site/index.html`: real photographs in every
`PHOTO SLOT`, final membership price, confirmed email, live social handles,
walk booking link.

---

*Bathong! - among the people.*
