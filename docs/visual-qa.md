# Visual QA and Pixel-Perfect Approval

This repository validates SVG safety/structure automatically, but brand fidelity requires an explicit pixel-perfect approval process against official references.

## Approval rule

An asset is **not production-ready** unless all of the following are true:

1. The source is official manufacturer/media-kit/brand-portal material, or a manufacturer-owned page that explicitly exposes the exact asset.
2. The canonical SVG is derived from that official vector source without hand-recreated geometry.
3. The rendered canonical SVG has been compared with the official reference at the same artboard/aspect treatment.
4. `qa/visual-approvals.json` marks the exact `brand/mark/mode` asset as `approved` with:
   - `reviewer`
   - `approvedAt`
   - `referenceUrl`
   - `referenceChecksumSha256`
   - `pixelTolerance: 0`
5. `npm run visual-qa` passes in CI.

Fallbacks may remain in the repo only as `review-fallback` pilot assets. If a fallback has visibly wrong geometry, border treatment, typography, centring, clipping, or mark semantics, it must be removed/blocked rather than approximated.

## Tooling now in place

- `qa/visual-approvals.json` records the approval state for each pilot asset.
- `npm run visual-qa` validates that every present canonical SVG has a QA record and that blocked assets do not have canonical/generated files.
- `npm run preview` writes `qa/previews/index.html`, a white/dark background review gallery for manual inspection.
- `npm run build` now clears `dist/` before regeneration, preventing stale generated files from surviving after a canonical asset is blocked.
- GitHub Actions now runs `npm run visual-qa` after structural validation.

## 2026-05-08 pilot QA corrections

Triggered by review of the Audi wordmark and Peugeot black badge.

### Audi wordmark

- File(s) reviewed: previous `src/audi/wordmark/{colour,black,white}.svg` fallback.
- Result: **failed visual QA**.
- Reason: rendered as an inaccurate/cropped third-party text mark, not a reliable official Audi wordmark.
- Action taken: removed Audi wordmark canonical files and generated `dist/audi/wordmark/**` variants. `src/audi/manifest.json` now records `wordmark-blocked-by-qa`.
- Reference checked: `https://styleguide.audi.com`; usable public reference found in this pass supports the Audi rings/primary mark, not a standalone wordmark SVG.

### Peugeot black badge

- File reviewed: `src/peugeot/badge/black.svg`.
- Result: **failed pixel-perfect QA**.
- Problem: even after converting the fallback to a filled badge treatment, the shield border/crest geometry was not official/pixel-perfect.
- Action taken: removed `src/peugeot/badge/black.svg` and generated `dist/peugeot/badge/black/**` variants. `src/peugeot/manifest.json` records `badge-black-blocked-by-pixel-qa`.
- Remaining requirement: source an official Peugeot vector/media-kit asset before emitting the black badge. Do not recreate the border manually.
- Reference checked: `https://www.peugeot.co.uk/about-us/brand/peugeot-magazine/the-peugeot-lion-history-of-a-symbol.html`; page provides official visual/raster references including Peugeot 2021 logo imagery, but no reusable SVG candidate was found in static HTML.

## Manual QA checklist for future batches

For each canonical SVG before marking it complete:

1. Render on both white and dark backgrounds via `npm run preview`.
2. Confirm the mark type is semantically correct:
   - `logo`: combined/primary full brand logo when one exists.
   - `badge`: symbol, icon, crest, rings, or emblem only.
   - `wordmark`: text-only brand name; do not invent one if the current brand system does not expose one.
3. Confirm colour modes are official presentation variants, not blind recolours:
   - `colour`: official/default colour treatment.
   - `black`: official black or black-background treatment appropriate to the mark.
   - `white`: official reversed treatment appropriate to the mark.
4. Check for clipping, bad viewBox, excessive whitespace, poor centring, distorted aspect ratio, wrong border treatment, and small-size legibility.
5. Compare against official brand/media-kit/reference pages, not only third-party repositories.
6. If any asset fails fidelity review, remove or block it rather than keeping a plausible-looking but wrong SVG.
