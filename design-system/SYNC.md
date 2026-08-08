# Design system sync

`design-system/` mirrors the Claude Design project **Bathong. Design System** (project id `45a193d9-651c-4dc5-9351-110151148822`). The remote project is the source of truth for tokens, component CSS, guidelines and the `design_handoff_frontend_v2/` package.

## Last sync

2026-08-08. Pulled: `design_handoff_frontend_v2/` (README, DESIGN-SYSTEM.md, both design references), `assets/share/` (exports.html), `assets/logo/exports.html`, and re-verified `tokens/*.css`, `styles.css`, `components/components.css` and one `*.prompt.md` sample against remote (all identical to the July sync).

Notes from this sync:

- The logo asset layout was reconciled to the remote layout: LinkedIn exports, favicon and wordmark PNGs all live under `assets/logo/` next to `exports.html`. The former `assets/social/` and `assets/logo-exports.html` are gone.
- The PNG exports in `assets/logo/` and `assets/share/default.jpg` were regenerated locally on 2026-08-08 with headless Chrome from the artboards in `exports.html`, at the exact sizes the artboards specify. They were not byte-copied from the remote project (same artboards, same output within JPEG/PNG encoding variance).
- The remote `guidelines/*.html` specimen cards added since July (frontend-v2-direction, share-cards, logo-v1) were not pulled; they are card-wrapped duplicates of the design references in `design_handoff_frontend_v2/design-references/`, which were pulled. View them in the Design System pane if needed.
- `_ds_manifest.json`, `_ds_bundle.js` and `thumbnail.html` are app-generated and left as-is.

## The mirror into frontend/

`frontend/assets/css/*.css` is a verbatim copy of `design-system/tokens/*.css` plus `design-system/components/components.css`. Exceptions:

- `frontend/assets/css/fonts.css` drops the Google Fonts `@import` (fonts load through the app; see `frontend/nuxt.config.ts`).
- `frontend/assets/css/main.css` mirrors `design-system/styles.css` with `./` relative imports.

Run `npm run tokens:check` in `frontend/` to verify nothing has drifted. CI runs the same check.

## How to re-sync

1. In a Claude Code session, use the DesignSync tool (`list_files`, then `get_file` per changed path) against the project id above. Remote wins.
2. Copy changed token/component files into `frontend/assets/css/` (respecting the two exceptions above).
3. Regenerate raster exports only if an artboard in an `exports.html` changed.
4. Update the Last sync section here.
