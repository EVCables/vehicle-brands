# Reference source policy

This repository outputs **clean SVG assets only**. Raster image APIs and third-party catalogues may be used to validate mark semantics, colour, and coverage, but paid/reference imagery must not be vendored into the repository.

## Motomarks

Motomarks may be used as a validation/reference source for:

- whether a brand exposes a `full`, `badge`, or `wordmark` presentation;
- PNG/WebP visual comparison during manual QA;
- the brand colour hex returned by the API.

Rules:

1. Do **not** commit Motomarks PNG/WebP image files or downloaded API image payloads.
2. Do **not** bulk mirror Motomarks images into `src/`, `dist/`, `docs/`, `qa/`, or any other tracked path.
3. Do not derive final SVG geometry from Motomarks raster output. Use it only as a visual/reference check.
4. Record colour hex values in `data/brand-colours.json` with `sourceKind: "motomarks-api"` when the metadata API is available.
5. Treat Motomarks mark availability as advisory, not authoritative. A reference can be stale; Kia is a known example where old-brand/new-brand checks matter.
6. Use a secret/server-side key for metadata endpoints when required. Publishable `pk_` keys are acceptable for CDN URL validation but should not be used to vendor paid imagery.

## Vehicle Imagery

`https://vehicleimagery.com/coverage` may be used as an SVG reference and coverage discovery source.

Rules:

1. The coverage page can be parsed for brand names and SVG source URLs.
2. Candidate SVGs still require classification as `logo`, `badge`, or `wordmark`; the upstream `_logo.svg` filename is not enough.
3. Candidate SVGs must be reviewed for current-brand correctness before promotion. Do not import stale marks.
4. SVGs copied into `src/` must be cleaned, normalized, source-recorded, and visually approved before generated `dist/` variants are shipped.
5. If Vehicle Imagery lists a brand missing from `data/brands.json`, add it to the registry only if it is relevant to current UK/US EV/PHEV scope or explicitly accepted for wider coverage.

## Brand colour metadata

Brand-level colours live in `data/brand-colours.json`. They are metadata, separate from canonical SVG artwork and separate from generated ratio variants.

Each colour entry must include:

- brand `slug` and `name`;
- one or more `{ role, hex, sourceKind, retrievedAt }` records;
- a `sourceUrl` or notes explaining where the colour came from.

Do not infer colours from unofficial SVGs when an official brand system or Motomarks metadata value is available.
