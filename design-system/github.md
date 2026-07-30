repo: madsnorgaard/bathong
branch: main

## Last sync
date: 2026-07-28T22:22:33Z

### Updated in this project
- Imported tokens, component CSS, brand rules and demo photographs from the repo.
- Split `tokens/tokens.css` into per-concern token files behind `styles.css`.
- Rebuilt `site/index.html` as the `ui_kits/website` recreation on real components.
- Added foundation specimen cards for colour, type, spacing, structure and brand rules.

## Screen map
| Project file | Built from |
|---|---|
| `tokens/*.css` | `tokens/tokens.css`, `tokens/tokens.json` |
| `components/components.css` | `css/bathong.css` |
| `components/**/*.jsx` | `css/bathong.css` component classes (.b-mark, .b-btn, .b-tag, .b-frame, .b-dict, .b-ticker, .b-card, .b-field, .b-ruled) |
| `ui_kits/website/*` | `site/index.html` |
| `guidelines/*.html` | `brand/GUIDELINES.md`, `brand/BRIEF.md`, `styleguide/index.html` |
| `assets/logo/*`, `assets/photos/*`, `assets/dictionary-card.html` | same paths upstream |
| `readme.md` | `README.md`, `brand/BRIEF.md`, `brand/GUIDELINES.md` |
