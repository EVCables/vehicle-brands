# Sourcing Policy

Source priority:

1. Official manufacturer media/press/brand pages.
2. Official website SVG assets referenced by HTML/CSS.
3. Official favicon/app icon only for badge fallback.
4. Official social profile imagery only if controlled by the manufacturer.
5. Third-party SVG catalogues as reference candidates only; they still require cleanup, provenance, and visual approval.
6. Raster/reference APIs only for validation and metadata; do not vendor paid imagery.
7. Third-party sources only as temporary review fallbacks, not final production sources without explicit approval.

Every reviewed asset should have an entry in `src/{brand}/sources.json` with:

- source URL
- retrieval date
- source kind
- checksum
- notes on licence/trademark restrictions
- local evidence file where useful

Do not silently invent missing mark types. If an official separate wordmark or badge cannot be found, mark the brand as `partial` and record the gap.

See `docs/reference-source-policy.md` for the Motomarks and Vehicle Imagery rules. In short: Motomarks PNG/WebP output is validation-only and must not be committed; Vehicle Imagery SVGs can be used as candidates/reference material only after current-brand review, source recording, cleanup, and visual approval. Brand colour hex metadata belongs in `data/brand-colours.json`, not inside SVG files or generated variants.
