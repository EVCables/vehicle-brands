# Pilot Rollout Notes

Pilot brands selected from the plan:

- Audi
- Tesla
- Peugeot

## Current status

The first rollout PR establishes the repository structure, schemas, validator, generator, CI, source-discovery evidence files, and **review-fallback pilot assets** for the three pilot brands.

Automated official-site discovery has been attempted for the pilot brands:

| Brand | Discovery file | Result | Pilot asset status | Next action |
|---|---|---|---|---|
| Audi | `docs/evidence/audi-2026-05-08.md` | Official homepage returned HTTP 403 to automated fetch; no candidate SVGs recorded. | 9 canonical SVGs added from Simple Icons / Wikimedia Commons fallback sources. | Replace fallback sources with official manufacturer CI/media-kit assets where available. |
| Tesla | `docs/evidence/tesla-2026-05-08.md` | Official homepage returned HTTP 403 to automated fetch; no candidate SVGs recorded. | 9 canonical SVGs added from Wikimedia Commons fallback source, split into logo/badge/wordmark. | Replace fallback source with official Tesla gallery/media assets where available. |
| Peugeot | `docs/evidence/peugeot-2026-05-08.md` | Homepage fetched in one run but no obvious SVG candidates matched crawler patterns; later direct fetch returned 403. | 9 canonical SVGs added from Simple Icons / Wikimedia Commons fallback sources, including a generated pilot composite for full logo. | Replace generated composite with official combined logo when sourced. |

## Pilot fallback caution

The repository should avoid treating weakly sourced vehicle trademarks as final production assets. The committed pilot SVGs are marked as review fallbacks in each pilot brand's `manifest.json` and `sources.json`.

Before production use, replace fallback sources with:

1. official media/press/brand pages;
2. official website SVG assets referenced by HTML/CSS/JS;
3. documented fallback sources only if explicitly approved.

Current pilot coverage:

```text
src/{brand}/logo/{colour,black,white}.svg
src/{brand}/badge/{colour,black,white}.svg
src/{brand}/wordmark/{colour,black,white}.svg
dist/{brand}/{logo,badge,wordmark}/{colour,black,white}/{1x1,4x3,3x2,16x9,21x9}.svg
```

Validation commands:

```bash
npm run build
npm run validate
npm run report > docs/completeness-report.md
```
