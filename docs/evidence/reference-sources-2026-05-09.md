# Reference source discovery — 2026-05-09

## Scope

This run incorporated the user's new reference-source instructions:

- Motomarks is validation/metadata only. Its paid PNG/WebP image payloads must not be committed.
- Vehicle Imagery coverage is an SVG reference source, but upstream `_logo.svg` files still need mark-type classification, current-brand review, cleanup, provenance, and visual QA before promotion to `src/`.
- Brand colour hex values belong in `data/brand-colours.json` with source metadata.

## Motomarks notes

Docs reviewed: `https://motomarks.io/docs`.

Relevant endpoints documented:

- CDN images: `https://motomarks.io/img/{slug}?type={full|badge|wordmark}&format={webp|png}&token={publishable_key}`
- Metadata API: `https://api.motomarks.io/brands` and `https://api.motomarks.io/brands/{id}` with colour field `color`.

Observed with the supplied `pk_` key: CDN image HEAD checks work; JSON metadata API returns `invalid_token`, so live colour import needs a metadata-capable key before populating `data/brand-colours.json`.

## Vehicle Imagery coverage

Source: `https://vehicleimagery.com/coverage`  
Retrieved: `2026-05-09`  
Records: 66

Classification from viewBox aspect ratio only; manual visual QA remains required.

### likely-badge

Abarth, Acura, Alfa Romeo, Aston Martin, BMW, Bugatti, Buick, Cadillac, Chevrolet, Citroën, CUPRA, Dodge, Ferrari, Fiat, Genesis, Honda, Hummer, Hyundai, Lamborghini, Land Rover, Lexus, Lincoln, Lotus, Mazda, Mercedes-Benz, Mercury, Mitsubishi, Nissan, Peugeot, Plymouth, Polestar, Pontiac, Porsche, RAM, Renault, Rolls-Royce, Saab, Saturn, Scion, SEAT, Škoda, smart, Subaru, Suzuki, Tesla, Toyota, Vauxhall, Volkswagen, Volvo

### likely-logo-lockup

Audi, Chrysler, Ford, Infiniti, Jeep, Maserati, MINI, Oldsmobile

### likely-wordmark

Bentley, GMC, INEOS, Isuzu, Jaguar, Kia, Koenigsegg, Lucid, McLaren

## Registry updates

Added 15 Vehicle Imagery brands that were missing from `data/brands.json` and scaffolded their `src/{brand}` folders:

- `bugatti`
- `buick`
- `hummer`
- `ineos`
- `infiniti`
- `isuzu`
- `koenigsegg`
- `mercury`
- `oldsmobile`
- `plymouth`
- `pontiac`
- `ram`
- `saab`
- `saturn`
- `scion`

These additions are registry/scaffold only. No Vehicle Imagery SVG payloads or Motomarks raster assets were committed.

## Follow-up

1. Use `npm run discover:references` to refresh `data/reference-sources/vehicleimagery-coverage.json`.
2. For each brand PR, compare current official brand pages, Motomarks raster reference, and Vehicle Imagery SVG reference before selecting/importing SVGs.
3. Fail closed on stale marks. Kia is explicitly flagged for current-brand checking.
4. Populate `data/brand-colours.json` only from an allowed metadata source, preferably Motomarks metadata API or official brand guidelines.
