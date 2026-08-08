# Handoff: Bathong. website v2

## Overview

**Bathong.** is a street and documentary photography collective in Pretoria (Pitori), South Africa, registered as an NPC. `bathong.africa` is currently a single-page holding site. This package is the brief to build **v2: the real platform** — eleven templates that let the collective publish photo essays, represent photographers, run photowalks and open calls, and sell membership.

The collective's own repo is **[github.com/madsnorgaard/bathong](https://github.com/madsnorgaard/bathong)** (branch `main`). It holds the brand brief, guidelines, tokens and the v1 single-file site. Read it before you start — everything in this package was derived from it.

**The single most important sentence in this brief:** the photo essay is the product, the essay reader is the template that must be excellent, and everything else is packaging.

## About the design files

The HTML files in `design-references/` are **design references, not production code**. They are annotated wireframes and specimen sheets, made to communicate structure, reasoning and exact values. Do not copy their markup into the app.

Your job is to **implement these designs in the target codebase's own environment**, using its established patterns. If there is no environment yet, pick an appropriate one — this is a content site with a small editorial team, so a static-site generator or a React meta-framework with a headless CMS is the natural fit. Two hard requirements drive that choice:

1. **Server-rendered HTML with per-page meta tags.** Share previews are load-bearing for this project (see `share-cards.html`) and a client-only SPA cannot produce them.
2. **Image transformation at build or request time.** The site is photographs. You need `srcset` at 480/960/1440/1920 in AVIF and WebP, generated automatically.

The files in `design-system/` are different: those are **real, usable source**. `styles.css` and `tokens/` are the production stylesheet and token set — link or port them directly. `components/components.css` is the flat class layer for all fourteen primitives, ready to port.

## Fidelity

**Mixed. Read this carefully — it changes what you should invent versus follow.**

| Part | Fidelity | What it means for you |
|---|---|---|
| `design-system/` (tokens, type, colour, spacing, motion, components) | **Hi-fi, final** | Exact values. Use them verbatim. Do not round, re-scale or substitute. If a screen seems to need a value that is not here, the screen is wrong. |
| `design-references/website-v1-recreation/` | **Hi-fi** | Lives in the design-system project at `ui_kits/website/`, not in this package. A faithful recreation of the live v1 site — pixel reference for the visual language in practice: nav, hero, doors, ticker, dictionary card. |
| `design-references/share-cards.html` | **Hi-fi** | Real 1200×630 artboards with exact type sizes and the meta block to ship. Follow precisely. |
| `design-references/frontend-v2-direction.html` | **Lo-fi wireframes + hi-fi rules** | Structure, IA and reasoning are settled; visual layout is not. Build layout using the design system, not by tracing the grey boxes. The numbered annotations beside each frame are requirements, not suggestions. |

**Four visual decisions are still open** and are listed at the end of the direction document. The biggest is whether the essay reader runs on ink or paper. Confirm with the client before building the reader.

## Screens / views

Full annotated wireframes and per-frame requirements are in `design-references/frontend-v2-direction.html`, section 05. Summary of the eleven templates:

| Route | Template | Purpose | Priority |
|---|---|---|---|
| `/` | Home | Editorially assembled: one lead frame, one lead essay, three live blocks (walk / photocall / membership), three recent essays, a member feed | Phase 1 |
| `/walks` | Walks & sessions | The next walk with date, time, meeting point, route, capacity and RSVP | Phase 1 |
| `/about` | About | The word, the directors, the NPC registration | Phase 1 |
| `/stories/[slug]` | **Essay reader** | The hero template. 12–20 sequenced frames, interleaved text, credit, next essay | Phase 2 |
| `/stories` | Stories index | Asymmetric hero row for the newest essay, even grid below, five word-filters | Phase 2 |
| `/photocalls` | Photocall | Open brief, deadline, submission form on the same screen | Phase 2 |
| `/photographers/[name]` | Photographer page | Portrait, member number, bio, contact, essays, singles, copyright plate | Phase 2 |
| `/photographers` | Members index | The roster | Phase 2 |
| `/join` | Membership | Tiers, benefits, apply | Phase 3 |
| `/exhibitions` | Exhibitions | Upcoming and past, with venues | Phase 3 |
| `/archive` | Archive | Every frame, filterable | Phase 3 |

### The essay reader — build this one right

This is the template the whole site exists to serve. From section 05, frame W2:

- **Reader chrome, not site chrome.** Nav collapses to a wordmark, a frame counter, and a close control.
- **Frames are capped at `max-height: 82vh`, sized to fit the viewport height, not the width.** This is the most important single rule in the build. A landscape frame at 100% width on a wide monitor makes the viewer scroll through the middle of a photograph and never see the composition. Width follows from height and ratio.
- **Caption capsule below every frame**: index / place / time / credit, in mono, on an opaque bar with a hard edge. Never a gradient, never overlaid on the image.
- **Text is interleaved, not front-loaded.** Body copy blocks appear between frames where the edit calls for them. Max 62 characters per line.
- **The layout is modular.** Two frames sit side by side where the edit pairs them; a single frame runs alone where it should breathe. The essay's data defines the sequence of blocks; the template renders them.
- **The end is a door**: photographer credit linking to their page, then the next essay. Never a thumbnail grid.
- **Full bleed is a device, used at most twice per essay** — the opening frame and, optionally, one turn in the middle.

## Interactions & behaviour

- **Motion: two durations only.** `.18s ease` for hovers, fills and the 6px arrow nudge. `.6s ease` for scroll reveals (opacity plus a 26px rise). The ticker is a 26s linear loop. Nothing bounces, springs or scales.
- **`prefers-reduced-motion: reduce` collapses both to `0s` and stops the ticker.** Already implemented in `tokens/motion.css`.
- **Hovers are inversions, not tints.** Ink buttons flip to signal. Ghost buttons fill with ink. The signal CTA empties to transparent. Nav links go jacaranda-deep. Person cards and exhibition rows invert to ink; an exhibition row also shifts 14px right. Nothing lightens, darkens or shrinks on press.
- **Focus is a 3px jacaranda outline and is never removed.**
- **Reader navigation:** keyboard left/right and up/down, swipe on touch, click/tap to advance. The frame counter doubles as a 2px progress rule. Nothing autoplays, ever.
- **Sticky nav** at `color-mix(in srgb, var(--paper) 88%, transparent)` with a 10px backdrop blur. It is the only fixed element besides the membership card, which is `position: sticky` beside a scrolling list.
- **Responsive:** layouts are asymmetric two-column grids (`1.2fr .8fr`, `1.1fr .9fr`) that collapse to one column at **840px**. Full-width rows break the gutter with `margin: 0 -22px` so borders run edge to edge.
- **Mobile is the primary target, not a reduction.** Three doors become a sheet menu; the lead frame crops to 4/5 because 21/9 on a phone is a stripe; the two live blocks stack directly under the lead. Hit targets never below 44px.

## Performance budget — treat as a requirement, not a nice-to-have

The audience this collective most wants to reach is on a prepaid data bundle in Mamelodi. In South Africa a megabyte is a real cost to a real person, and a photography site is the heaviest thing on the web. This is a user-centricity requirement that happens to look like an engineering one.

| Metric | Budget |
|---|---|
| Homepage, first view | **under 1 MB total** |
| Lead frame | under 180 KB |
| Essay reader, time to first frame on 4G | under 2 seconds |
| Essay loading | frame 1 eager; frames 2–3 on idle; the rest on approach. **Never load 16 frames at once.** |
| Placeholder | flat `--paper-dim`. No blur-up, no shimmer, no skeleton animation. |
| Autoplay | none, ever |

## Image rules

| Rule | Value |
|---|---|
| Ratios in use | 3/2 default · 21/9 lead · 4/5 portrait · 1/1 social only |
| Never | crop to square, crop to fill a grid, zoom on hover |
| Widths served | 480 / 960 / 1440 / 1920, `srcset`, AVIF then WebP |
| Treatment | `filter: contrast(1.05)` and nothing else. No brand filter, no duotone. |
| Grain | page-level overlay only, never baked into a frame. **Test at 0.3 opacity in the dark reader and be prepared to disable it over frames entirely** — real grain in the file beats fake grain on top of it. |
| Credit | `© Photographer Name` on every photograph, everywhere it appears, including demo frames |

## Share cards — ship this first

`design-references/share-cards.html` is the full spec. The headline: **the live site has no `og:image`, so every link ever shared has rendered as a bare grey text row.** This is an hour of work and the highest-impact fix in the package.

- `assets/share/default.jpg` is **already made** — 1200×630, 145 KB. Put it at `/share/default.jpg` and paste the meta block from section 04 of the share-cards document.
- **1200×630 JPEG at quality 82, under 300 KB.** WhatsApp silently drops anything over 600 KB and falls back to a tiny thumbnail; this is the number one cause of broken previews. Never PNG, never SVG, never WebP for `og:image`.
- **Absolute HTTPS URLs. Exactly one `og:image` tag per page.**
- Keep key content in the centre 80% — platforms centre-crop anything that is not 1.91:1.
- Six card templates: site default, essay, photographer, walk, photocall, single frame. Cards C2 and C3 should be **generated at publish time** from the lead frame plus CMS metadata once there are too many to hand-make.

## Content rules that are also code rules

These come from the brand guidelines and they constrain the implementation:

- **`Bathong.` with the full stop is the mark** — masthead, membership cards, exhibition walls, anything legal or financial. **`Bathong!` with the exclamation is the voice** — campaigns, captions, the ticker, merch. The exclamation must never appear in a masthead or on a document going to a bank, CIPC or SARS.
- **Display type is uppercase by CSS (`text-transform`), never by typing in caps.** Screen readers and copy-paste depend on it.
- **Mono carries every caption.** If a caption is not in Space Mono, it is wrong.
- **No emoji, ever.** The only decorative glyphs are `→ ● · № ✕ ©`.
- **Honest placeholders.** Prices render as `R -` with "Launch pricing announced soon". Dates render `TBC`. Image positions read `PHOTO SLOT`. **Never invent a number or a date** — this must hold in seed data and fixtures too.
- **Section numbering** is an archive index: `02 / The work comes first`. Lists carry mono prefixes: `B/01` benefits, `W/01` walks, `Essay 001`, frames `04 / 12`, members `Member № 0001`.
- **Sentence case in body copy.** *We* for the collective, *you* for the photographer.

## Design tokens

Do not re-derive these. `design-system/styles.css` imports them all; `design-system/tokens/` holds the source.

**Colour — four plates, no fifth.** Surface budget per page is roughly paper 60 / ink 30 / jacaranda 8 / signal 2. At most one full-bleed jacaranda section per page. Signal is never a background for long text.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#141313` | the darkroom |
| `--ink-lift` | `#1d1c1a` | hover on ink surfaces |
| `--paper` | `#F2EEE6` | the print |
| `--paper-dim` | `#E7E2D6` | recessed panels |
| `--jacaranda` | `#7B5CD6` | the identity colour |
| `--jacaranda-deep` | `#5636B8` | links, hover, small type on paper |
| `--signal` | `#E8FF38` | accent only, one per page |
| `--grey-warm` | `#8D887E` | metadata on paper |
| `--grey-ink` | `#4C493F` | body at reduced emphasis |
| `--grey-line` | `#3A3833` | hairlines, ink surfaces only |
| `--grey-ghost` | `#A09B90` | metadata on ink |
| `--grey-fog` | `#CFCABF` | body on ink |

Semantic aliases (`--surface-page`, `--text-primary`, `--text-on-dark`, `--border-color`, `--focus-ring`, …) are defined in `tokens/colors.css`. **Reference the semantic alias in components, not the raw plate.**

**Type — three faces, three jobs.** All three are Google Fonts, loaded in `tokens/fonts.css`. No font binaries and no substitutions.

| Token | Stack | Job |
|---|---|---|
| `--font-display` | `'Archivo Black', Impact, 'Arial Black', sans-serif` | Display. Always uppercase, tracking `-.03em`, leading `.9`. The wordmark is set in nothing else, ever. |
| `--font-body` | `'Space Grotesk', 'Helvetica Neue', Arial, sans-serif` | Body, leading 1.5 |
| `--font-mono` | `'Space Mono', 'Courier New', monospace` | All editorial furniture: captions, labels, metadata, frame numbers, tickers, form fields |

Size tokens are in `tokens/typography.css` — `--text-mark`, `--text-display-1`, `--text-display-2` and the body/mono scale. **No gradients on type, ever.**

**Spacing — a 6-step scale:** `4 / 8 / 14 / 22 / 44 / 90`. `22px` is the page gutter (sections run `90px 22px`), `44px` clears a section head, `14–18px` is the grid gap.

**Structure.** `--radius: 0` — nothing is rounded; prints have corners. The **2px ink frame** (`--border-frame`) is the most-used object in the system: it wraps every photograph, card, field and button. On ink surfaces only, rules drop to a 1px `--grey-line` hairline. **Shadows are hard offsets with no blur:** `10px 10px 0 var(--ink)`, or `10px 10px 0 var(--jacaranda)` on the membership card. No soft shadows, no elevation scale, no glow.

**Texture.** A fine film-grain overlay (140px SVG turbulence tile, `opacity .5`) via `.grain` on `<body>` or `.grain-inset` on a single element. See the caveat in the image rules above.

## Components

`design-system/components/` documents fourteen React primitives. **The `.jsx` and `.d.ts` source is not bundled in this package** — it lives in the Bathong design-system project at `components/`, and each primitive's `.prompt.md` (what it is, when to use it, a usage example, its variants) *is* included here. Download the design-system project alongside this package if you want the JSX, or work from `components/components.css`, which is the portable layer and the one you actually need if you are not building in React.

The primitives are deliberately plain: React only, styling by CSS custom property, no CSS-in-JS, no npm dependencies.

`Wordmark` · `PunchDot` · `DictionaryCard` · `Ticker` · `Button` · `Tag` · `Kicker` · `SectionHead` · `Card` · `MemberCard` · `RuledList` · `Frame` · `EssayStrip` · `Field`

`components/components.css` holds the flat class layer (`.b-mark`, `.b-btn`, `.b-frame`, `.b-dict`, …) lifted from the upstream stylesheet. **This is the file to port** if you are not building in React — it carries the full visual definition of every primitive with no framework attached.

**Six new components v2 requires** (spec in section 08 of the direction document):

| Component | Responsibility |
|---|---|
| `EssayReader` | The sequencer. Owns the 82vh cap, the counter rule, keyboard and swipe advance, the streaming loader. |
| `FrameCaption` | Index / place / time / credit capsule, standalone so it works under full-bleed frames. |
| `PhotographerHeader` | Portrait, name, member number, bio, contact row, count row. |
| `EventBlock` | Walk block: date, time, meeting point, capacity, price, one CTA. Reused on home, walks and the member area. |
| `SubmitForm` | Multi-file drop built from `Field`. Upload state, progress rule, written confirmation. |
| `FeedGrid` | Six recent single frames with credit. |

Everything else in the eleven templates composes from what already exists.

## Assets

| Path | What it is |
|---|---|
| `assets/logo/wordmark-on-paper.png`, `wordmark-on-ink.png` | 1600×420 raster wordmark, for contexts that cannot set live type |
| `assets/logo/linkedin-avatar.png` | 300×300, ink plate, paper B, jacaranda stop |
| `assets/logo/linkedin-banner.png` | 4200×700 company cover |
| `assets/logo/favicon-512.png` | 512×512 |
| `assets/logo/punch-dot.svg`, `avatar.svg` | The full stop as a standalone mark |
| `assets/share/default.jpg` | **The site's `og:image`. 1200×630, 145 KB. Ship this.** |
| `assets/dictionary-card.html` | The 1080×1080 definition card, ready to screenshot |

**On the wordmark:** it is live type (Archivo Black, uppercase, tracking `-.035em`, jacaranda full stop), not an image. Render it with the `Wordmark` component or the `.b-mark` class. The PNGs are fallbacks only. **An outlined vector wordmark does not exist yet** — it is needed for signage, embroidery and print, and is outstanding.

**On iconography:** there is deliberately almost none, and **camera iconography is banned** — no apertures, lenses, focus brackets or shutter glyphs. There is no icon font and no SVG sprite. Unicode glyphs in mono carry icon duty (`→ ● · № ✕ ©`), and status is a word in a `Tag`, not a symbol. If a future surface genuinely needs UI icons, **Lucide at 2px stroke with square caps** is the closest match to the 2px frame weight — but that is a substitution to confirm with the collective, not an established choice.

**Photographs:** the demo frames in the upstream repo (`assets/photos/johannesburg/`, © Mads Nørgaard) are placeholders. Every image position in production is a **PHOTO SLOT** to be filled with a Pretoria lead frame chosen by group edit.

## Files in this package

```
design-system/
  styles.css               the one stylesheet to link - @import list only
  tokens/                  colors, typography, spacing, structure, motion, fonts, base, texture
  components/
    components.css         the flat class layer for all 14 primitives - port this
    */*.prompt.md          what each primitive is, when to use it, usage example, variants
  DESIGN-SYSTEM.md         the full design guide: voice, visual foundations, iconography, non-negotiables
  SKILL.md                 Agent-Skills wrapper - drop this folder into .claude/skills/ and invoke it

design-references/
  frontend-v2-direction.html   THE BRIEF. IA, 7 annotated wireframes, image rules, phasing, open decisions
  share-cards.html             6 share card templates, in-situ mocks, the meta block

assets/
  logo/  share/  dictionary-card.html
```

**Not in this package, get it from the design-system project:** the React `.jsx` / `.d.ts` component source (`components/`) and the v1 site recreation (`ui_kits/website/`). Both are duplicates of files that live there, and shipping a second copy here would fork them.

**Start here:** open `design-references/frontend-v2-direction.html` in a browser and read it end to end. It is the brief; this README is the index to it.

## Order of work

**Phase 1 — before 29 August 2026.** Home, Walks with RSVP, About. One job: get twenty-five people to Church Square at half past five. Ship the `og:image` and meta block in the same push.

**Phase 2 — September.** The essay reader, built properly. Stories index. Photocall page and submission. Photographer pages for founding members. Walk 001 produces the frames, the group edit produces Essay 001, and the reader has to be ready for it.

**Phase 3 — Q4.** Join with real pricing, member area and digital card, Exhibitions, Archive with filters. Pricing stays `R -` on the site until the board sets it.

## Open questions — get answers before building the reader

1. **Does the essay reader run on ink or on paper?** The biggest visual call in the build.
2. **Is membership paid at launch, or free for a founding cohort?** Changes the homepage's third block entirely.
3. **Do photographer pages carry direct contact details, or does licensing route through the collective?** Magnum and NOOR route through the agency; this collective has said photographers keep everything.
4. **Who edits?** The modular homepage assumes someone composes it weekly.
5. **Which photograph is the site default share card?** It will be the most-seen image the collective owns.
