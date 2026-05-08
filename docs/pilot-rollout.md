# Pilot Rollout Notes

Pilot brands selected from the plan:

- Audi
- Tesla
- Peugeot

## Current status

The first rollout PR establishes the repository structure, schemas, validator, generator, CI, source-discovery evidence files, and **review-fallback pilot assets** for the pilot brands.

A QA correction was added after visual review: fallback assets must fail closed when they are visibly wrong, even if that means a pilot brand temporarily has fewer than 9 canonical files.

| Brand | Discovery file | Result | Pilot asset status | Next action |
|---|---|---|---|---|
| Audi | `docs/evidence/audi-2026-05-08.md` | `https://styleguide.audi.com` reachable; official public reference supports the Audi rings/primary mark. No accepted standalone wordmark SVG found. | 6 canonical SVGs retained for `logo` and `badge`; previous fallback `wordmark` files removed after QA failure. | Source an official Audi wordmark/vector if one is genuinely current and allowed, otherwise keep wordmark explicitly blocked. |
| Tesla | `docs/evidence/tesla-2026-05-08.md` | Official homepage returned HTTP 403 to automated fetch; no candidate SVGs recorded. | 9 canonical SVGs added from Wikimedia Commons fallback source, split into logo/badge/wordmark. | Replace fallback source with official Tesla gallery/media assets where available and visually QA all variants. |
| Peugeot | `docs/evidence/peugeot-2026-05-08.md` | Official Peugeot UK Lion-history page fetched with a curl-style UA and supplied raster references, but no reusable SVG candidate was found. | 8 canonical SVGs retained. The generated black badge was removed after pixel-perfect QA found the border/crest geometry was not official. | Source an official Peugeot vector/media-kit badge before emitting `badge/black.svg`; do not recreate the border manually. |

## Pilot fallback caution

The repository should avoid treating weakly sourced vehicle trademarks as final production assets. The committed pilot SVGs are marked as review fallbacks in each pilot brand's `manifest.json` and `sources.json`.

Before production use, replace fallback sources with:

1. official media/press/brand pages;
2. official website SVG assets referenced by HTML/CSS/JS;
3. documented fallback sources only if explicitly approved.

Current pilot coverage:

```text
src/tesla/{logo,badge,wordmark}/{colour,black,white}.svg
src/peugeot/logo/{colour,black,white}.svg
src/peugeot/badge/{colour,white}.svg
src/peugeot/wordmark/{colour,black,white}.svg
# Peugeot badge/black intentionally absent after pixel-perfect QA found the generated border/crest wrong.
src/audi/{logo,badge}/{colour,black,white}.svg
# Audi wordmark intentionally absent after QA rejection of the previous fallback.

dist/{brand}/{mark}/{colour,black,white}/{1x1,4x3,3x2,16x9,21x9}.svg
# dist is regenerated from existing canonical SVGs only; stale generated files are removed by npm run build.
```

Validation commands:

```bash
npm run pilot
npm run build
npm run validate
npm run visual-qa
npm run preview
npm test
npm run report > docs/completeness-report.md
```
