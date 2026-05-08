# Pilot Rollout Notes

Pilot brands selected from the plan:

- Audi
- Tesla
- Peugeot

## Current status

The first rollout PR establishes the repository structure, schemas, validator, generator, CI, and source-discovery evidence files. It intentionally does **not** commit unverified third-party SVG logo artwork as production assets.

Automated official-site discovery has been attempted for the pilot brands:

| Brand | Discovery file | Result | Next action |
|---|---|---|---|
| Audi | `docs/evidence/audi-2026-05-08.md` | Official homepage returned HTTP 403 to automated fetch; no candidate SVGs recorded. | Use browser/manual official media-kit discovery or manufacturer brand portal. |
| Tesla | `docs/evidence/tesla-2026-05-08.md` | Official homepage returned HTTP 403 to automated fetch; no candidate SVGs recorded. | Use browser/manual official media-kit discovery or official assets in site bundles. |
| Peugeot | `docs/evidence/peugeot-2026-05-08.md` | Homepage fetched successfully but no obvious SVG candidates matched the current crawler patterns. | Extend crawler to parse JS/CSS bundles and review official brand/media pages. |

## Why no pilot SVGs are committed yet

The repository should avoid seeding itself with unofficial or weakly sourced vehicle trademarks. For the pilot assets, use only:

1. official media/press/brand pages;
2. official website SVG assets referenced by HTML/CSS/JS;
3. documented fallback sources only if explicitly approved.

Once reviewed source SVGs are obtained, each pilot brand should be completed by adding:

```text
src/{brand}/logo/{colour,black,white}.svg
src/{brand}/badge/{colour,black,white}.svg
src/{brand}/wordmark/{colour,black,white}.svg
```

Then run:

```bash
npm run build
npm run validate
npm run report > docs/completeness-report.md
```
