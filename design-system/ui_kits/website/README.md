# UI kit - bathong.co.za (v1 site)

A recreation of the live v1 website from `site/index.html` in
[madsnorgaard/bathong](https://github.com/madsnorgaard/bathong), rebuilt on this
design system's components instead of the original inlined styles.

**Open `index.html`.**

## Structure

| File | Surface |
|---|---|
| `WebNav.jsx` | Sticky blurred nav, mono links, ink Join chip, mobile burger |
| `WebHero.jsx` | Kicker, hero wordmark, lede + translation, the three equal doors, ticker |
| `WebStories.jsx` | Manifesto (ink, dictionary card) and the Photo Stories grid |
| `WebProgramme.jsx` | Walks &amp; Workshops (jacaranda, featured walk card) and Membership |
| `WebArchive.jsx` | Exhibitions (ink rows), The Collective, Submit photocall, footer |
| `WebApp.jsx` | Composition, smooth-scroll nav, the essay overlay |
| `kit.css` | Layout-only CSS lifted from the source page (grids, nav, footer) |

## What is interactive

- Nav and footer links smooth-scroll to sections; burger menu opens on narrow widths.
- Clicking any photo story opens an **essay overlay** - a sequenced, numbered contact-sheet strip. The source site links stories to anchors only; the overlay is the essay unit the brief specifies, rendered here so the pattern exists.
- The featured walk button holds a place ("Place held ✓").
- The photocall form submits to an inline confirmation instead of `mailto:` (cosmetic; the source uses `mailto:hello@bathong.co.za`).

## Faithful to the source

Type scale, section indices (01-07), colour distribution, 2px frames, hard shadows and copy are taken from `site/index.html` verbatim. Photographs are the repo's Johannesburg demo frames by Mads Nørgaard - the source marks every image as a **PHOTO SLOT** to be replaced with Pretoria lead frames chosen by group edit. Membership price still reads `R -` because it is unresolved upstream.
