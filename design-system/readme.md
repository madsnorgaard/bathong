# Bathong. - design system

**Bathong.** is a street & documentary photography collective in Pretoria (Pitori), South Africa. This project is the design system for the collective's brand and its platform: tokens, components, foundation specimens and a recreation of the v1 website.

> **ba·thong** *excl. / loc.* - Sepedi / Setswana, from *batho*: people.
> 1. what you say when you can't believe what you're seeing.
> 2. among the people - where this work is made.

**The one rule everyone must know:** **Bathong.** with the full stop is the *mark* (masthead, membership cards, exhibition walls, legal and financial documents). **Bathong!** with the exclamation is the *voice* (campaigns, photocall posters, captions, the ticker, stickers, merch). The mark states; the street shouts. The exclamation never appears in a masthead or on anything going to a bank, CIPC or SARS.

## Sources

Everything here was built from **[github.com/madsnorgaard/bathong](https://github.com/madsnorgaard/bathong)** (branch `main`) - the collective's own brand-and-website repo. Explore it directly for anything this system abbreviates:

| Upstream file | What it gave us |
|---|---|
| [`brand/BRIEF.md`](https://github.com/madsnorgaard/bathong/blob/main/brand/BRIEF.md) | Full brand & platform brief v1.0 (28 Jul 2026) - name, positioning, audiences, offer, launch plan |
| [`brand/GUIDELINES.md`](https://github.com/madsnorgaard/bathong/blob/main/brand/GUIDELINES.md) | The condensed one-page rules - plates, faces, the dot, photography treatment, never-dos |
| [`tokens/tokens.css`](https://github.com/madsnorgaard/bathong/blob/main/tokens/tokens.css) / `tokens.json` | Token source of truth, split here into `tokens/*.css` |
| [`css/bathong.css`](https://github.com/madsnorgaard/bathong/blob/main/css/bathong.css) | The component stylesheet - the component inventory of this system |
| [`site/index.html`](https://github.com/madsnorgaard/bathong/blob/main/site/index.html) | The live v1 single-file site - recreated in `ui_kits/website/` |
| `styleguide/index.html` | The upstream living brand manual (superseded here by the Design System tab cards) |
| `assets/logo/`, `assets/photos/johannesburg/`, `assets/dictionary-card.html` | Copied in verbatim |

No Figma file and no other codebase were provided. Photographs are the repo's own demo frames (Johannesburg 2018, © Mads Nørgaard) - upstream marks every image position as a **PHOTO SLOT** to be replaced with Pretoria lead frames chosen by group edit.

**Fonts:** Archivo Black, Space Grotesk and Space Mono are all Google Fonts and are loaded from the Google CSS endpoint in `tokens/fonts.css` - no substitutions were needed and no font binaries exist upstream.

## Index

| Path | What it is |
|---|---|
| `styles.css` | The one stylesheet consumers link. `@import` list only. |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `structure.css`, `motion.css` (reduced-motion reset), `fonts.css`, `base.css`, `texture.css` |
| `components/components.css` | Flat component classes (`.b-mark`, `.b-btn`, `.b-frame`, `.b-dict`, …), lifted from upstream |
| `components/brand/` | Wordmark, PunchDot, DictionaryCard, Ticker |
| `components/core/` | Button, Tag, Kicker, SectionHead, Card, MemberCard, RuledList |
| `components/media/` | Frame, EssayStrip |
| `components/forms/` | Field |
| `ui_kits/website/` | Recreation of bathong.co.za v1 - open `index.html` |
| `guidelines/` | Foundation specimen cards (Colors, Type, Spacing, Brand) |
| `assets/logo/` | `punch-dot.svg`, `avatar.svg` |
| `assets/photos/johannesburg/` | 11 demo frames, © Mads Nørgaard |
| `assets/dictionary-card.html` | The 1080×1080 definition card, ready to screenshot |
| `SKILL.md` | Agent-Skills wrapper so this system works inside Claude Code |
| `github.md` | Upstream association and sync record |

### Components

`Wordmark` · `PunchDot` · `DictionaryCard` · `Ticker` · `Button` · `Tag` · `Kicker` · `SectionHead` · `Card` · `MemberCard` · `RuledList` · `Frame` · `EssayStrip` · `Field`

The inventory is the upstream stylesheet's inventory - one component per `.b-*` family in `css/bathong.css`.

**Intentional additions** (not in the source stylesheet, flagged deliberately):

- `EssayStrip` - the brief names the photo essay (12-20 sequenced frames) as the platform's core unit, but the v1 site had no essay view yet. `EssayStrip` renders that unit as a numbered contact-sheet run so the pattern exists before Phase 3.
- `Kicker`, `SectionHead`, `Field` labels are thin wrappers around classes that already existed (`.b-kicker`, `.b-sechead`, `.b-label`), not new design.

## Content fundamentals

**Voice: confident, warm, streetwise, precise.** Short sentences. Statements, not slogans. The brand teaches without lecturing - every caption is a chance to make someone a better photographer.

- **Person.** *We* for the collective, *you* for the photographer. "We build photographers who are there when it happens." "You keep your copyright. Always."
- **Casing.** Sentence case in body copy. Display type is uppercase *by CSS*, never by typing in caps. Mono furniture (labels, captions, tags, tickers) is uppercase and wide-tracked.
- **Local words, unitalicised.** Pitori, 012, bathong, Sepitori, Marabastad, Salvokop. English is the base so the world can read it; Afrikaans and Sepitori appear the way they appear on the street - unforced, never explained in brackets.
- **Punctuation is meaning.** `Bathong.` states. `Bathong!` shouts. Em-dashes and arrows (`→`) do the work that decorative punctuation would do elsewhere.
- **Numbering.** Sections carry an archive index - `02 / The work comes first`. Lists carry mono prefixes: `B/01` benefits, `W/01` walks, essays `Essay 001`, frames `04 / 12`, members `Member № 0001`. Walks use `№`.
- **No emoji. Ever.** The only glyphs used decoratively are `→`, `●`, `·`, `№`, `©` and the full stop.
- **Honest placeholders.** Where a decision is open, say so in the copy: price reads `R -` with "Launch pricing announced soon"; dates read `TBC`; image positions read `PHOTO SLOT`. Never invent a number.
- **Credit is copy.** Every photograph carries `© Photographer Name` wherever it appears - including demo frames.

Examples, verbatim in register:
Event post - "Saturday, first light, three layers of the capital. Bring one lens. Bathong!"
Rejection note - "Not this time - and here is why, frame by frame. Shoot the next call."
Exhibition wall text - calm, factual, in the mark's register, no exclamation.
CTA labels - "Reserve a place →", "Become a member →", "Send it - Bathong! →".

## Visual foundations

**Colour - four plates, no fifth.** Ink `#141313` (the darkroom), Paper `#F2EEE6` (the print), Jacaranda `#7B5CD6` / deep `#5636B8` (Pretoria in October - the identity), Signal `#E8FF38` (highveld flash). Surface budget per page is roughly **paper 60 / ink 30 / jacaranda 8 / signal 2**. At most one full-bleed jacaranda section per page. Signal is never a background for long text - tags, one CTA, a highlight mark. Greys are warm and derived (`--grey-warm` metadata on paper, `--grey-fog` body on ink, `--grey-line` hairlines on ink only).

**Type - three faces, three jobs.** Archivo Black for display, always uppercase, tracking `-.03em`, leading `.9`; the wordmark is set in nothing else, ever. Space Grotesk for body at leading 1.5. Space Mono for all editorial furniture - captions, labels, metadata, frame numbers, dictionary entries, tickers, form fields and placeholders. *If a caption is not in mono, it is wrong.* No gradients on type, ever.

**Spacing & layout.** A 6-step scale: 4 / 8 / 14 / 22 / 44 / 90. `22px` is the page gutter (sections run `90px 22px`), `44px` clears a section head, `14-18px` is the grid gap. Layouts are asymmetric two-column grids (1.2fr .8fr, 1.1fr .9fr) collapsing to one column at 840px. Full-width rows break the gutter with `margin: 0 -22px` so borders run edge to edge. The nav is sticky; the membership card is `position: sticky` beside a scrolling list. Nothing else is fixed.

**Backgrounds.** Flat colour plates - no gradients anywhere, no patterns, no illustration. Photography is the imagery; there is no illustration system and no stock texture beyond grain. Sections alternate paper → ink → paper → jacaranda → paper → ink, so colour marks structure rather than decorating it.

**Texture.** A fine film-grain overlay (140px SVG turbulence tile, `opacity .5`) sits on everything digital via `.grain` on `<body>`, or `.grain-inset` on a single element. It carries the analog/darkroom heritage and quietly unifies mixed member imagery.

**Borders, corners, shadows.** `--radius: 0` - nothing is rounded; prints have corners. The 2px ink frame (`--border-frame`) is the system's most-used object: it wraps every photograph, every card, every field, every button. On ink surfaces only, rules drop to a 1px `--grey-line` hairline. Shadows are hard offsets with no blur - `10px 10px 0 var(--ink)`, or `10px 10px 0 var(--jacaranda)` on the membership card. No soft shadows, no elevation scale, no glow.

**Cards.** A card is paper (or ink), a 2px ink border, square corners, `22px` padding and a hard offset shadow - used when a panel sits on a colour ground so the shadow reads as a stacked print. On paper grounds, drop the shadow and keep the border.

**Transparency & blur.** Used twice, deliberately: the sticky nav is `color-mix(paper 88%, transparent)` with a 10px backdrop blur; caption bars over photographs are `color-mix(paper 92%, transparent)` with a 2px top border. There are no protection gradients - the caption bar is a *capsule*, an opaque bar with a hard edge, never a fade. Colour is never laid over the work.

**Animation.** Two durations only: `.18s ease` for hovers, fills and the 6px arrow nudge; `.6s ease` for scroll reveals (opacity plus a 26px rise). The ticker is a 26s linear loop. Nothing bounces, nothing springs, nothing scales. `prefers-reduced-motion` collapses both to `0s` and stops the ticker.

**Hover & press states.** Hovers are *inversions*, not tints: ink buttons flip to signal; ghost buttons fill with ink; the signal CTA empties to transparent; nav links go jacaranda-deep; person cards and exhibition rows invert to ink (an exhibition row also shifts `14px` right); the three hero doors fill ink, jacaranda-deep and jacaranda respectively, with the arrow sliding right and turning signal. Nothing lightens, darkens or shrinks on press. Focus is a 3px jacaranda outline, never removed.

**Imagery.** Warm, high-contrast, street-lit, colour and black-and-white side by side - Johannesburg and Pretoria as shot, with real grain. Frames get `filter: contrast(1.05)` and nothing else: no brand filter, no duotone, no crop-to-square. Ratios are 3/2 default, 21/9 for leads, 4/5 for portraits, 1/1 for social. Colour lives in the frame - borders, tags, caption bars - never on the photograph.

## Iconography

**There is deliberately almost no iconography, and camera iconography is banned.** No apertures, lenses, focus brackets or shutter glyphs in the logo or graphics - the work is the imagery. There is no icon font, no SVG sprite and no PNG icon set upstream, and none has been invented here.

What carries icon duty instead:

- **The punch-dot** - the wordmark's full stop, cut loose. `assets/logo/punch-dot.svg` (bare jacaranda square) and `assets/logo/avatar.svg` (dot on an ink tile). It is the avatar, the watermark and the punctuation of every section title. Square, not round.
- **Unicode as iconography** - `→` for every forward action, `●` as ticker separators, `·` as a metadata separator, `№` for walk numbers, `✕` to close, `©` before credits. Set in mono, at text weight.
- **Mono chips instead of icons** - status is words in a `Tag`, not a symbol: "Photocall open", "NPC funded", "In development".
- **No emoji**, in product or in copy.

If a future surface genuinely needs UI icons (an archive with filters, a member dashboard), the closest CDN match to this system is **Lucide** at 2px stroke, square caps - it matches the 2px frame weight. That would be a substitution to confirm with the collective, not an established choice.

## Non-negotiables

- Every photograph is credited, everywhere it appears.
- Brand colour lives in the frame around the work, never on top of it.
- Photographs are shown as shot - no forced brand filters.
- Four colours, three typefaces, nothing rounded, no gradients on type, no camera iconography.
- The exclamation never appears in the masthead or on legal/financial documents.
