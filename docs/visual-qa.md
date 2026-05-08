# Visual QA Notes

This repository validates SVG safety/structure automatically, but brand fidelity still requires visual QA against official references.

## 2026-05-08 pilot QA correction

Triggered by review of the Audi wordmark and Peugeot black badge.

### Audi wordmark

- File(s) reviewed: previous `src/audi/wordmark/{colour,black,white}.svg` fallback.
- Result: **failed visual QA**.
- Reason: rendered as an inaccurate/cropped third-party text mark, not a reliable official Audi wordmark.
- Action taken: removed Audi wordmark canonical files and generated `dist/audi/wordmark/**` variants. `src/audi/manifest.json` now records `wordmark-blocked-by-qa`.
- Reference checked: `https://styleguide.audi.com`; usable public reference found in this pass supports the Audi rings/primary mark, not a standalone wordmark SVG.

### Peugeot black badge

- File reviewed: `src/peugeot/badge/black.svg`.
- Result: **corrected after visual QA**.
- Problem: the initial black badge variant rendered as outline-style black artwork on a transparent/white canvas, not a filled black Peugeot badge/icon.
- Action taken: generator now emits a filled black shield with white internal Peugeot fallback artwork for the black badge variant.
- Remaining caveat: still review-fallback artwork pending an official Peugeot vector/media-kit source.
- Reference checked: `https://www.peugeot.co.uk/about-us/brand/peugeot-magazine/the-peugeot-lion-history-of-a-symbol.html`; page provides official visual/raster references including Peugeot 2021 logo imagery, but no reusable SVG candidate was found in static HTML.

## Manual QA checklist for future batches

For each canonical SVG before marking it complete:

1. Render on both white and dark backgrounds.
2. Confirm the mark type is semantically correct:
   - `logo`: combined/primary full brand logo when one exists.
   - `badge`: icon/emblem/crest/symbol only.
   - `wordmark`: text-only brand name; do not invent one if the current brand system does not expose one.
3. Confirm colour modes are visually meaningful:
   - `colour`: official/default colour treatment.
   - `black`: black or black-background treatment appropriate to the mark.
   - `white`: white or reversed treatment appropriate to the mark.
4. Check for clipping, bad viewBox, excessive whitespace, poor centring, and illegible small details.
5. Compare against official brand/media-kit/reference pages, not only third-party repositories.
6. If any asset fails fidelity review, remove or block it rather than keeping a plausible-looking but wrong fallback.
