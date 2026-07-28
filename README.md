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

## Non-negotiables (short version)

- Every photograph is credited, everywhere it appears.
- Brand colour lives in the frame around the work, never on top of it.
- Photographs are shown as shot - no forced brand filters.
- Four colours, three typefaces, nothing rounded, no gradients on type,
  no camera iconography.

## Roadmap

- **Phase 1 (now):** static site on bathong.co.za, mailto forms, socials pointing at it.
- **Phase 2 (1-3 months):** walk booking + payment (Quicket/Payfast), newsletter, photocall upload flow.
- **Phase 3 (3-12 months):** member accounts, the searchable open archive, essay CMS.

Before launch, replace in `site/index.html`: real photographs in every
`PHOTO SLOT`, final membership price, confirmed email, live social handles,
walk booking link.

---

*Bathong! - among the people.*
