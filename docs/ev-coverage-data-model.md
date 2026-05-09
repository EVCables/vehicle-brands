# EV coverage data model

The SVG asset registry remains brand-identity data. EV/PHEV model, trim, battery, and charging-inlet data should live in a separate namespace so asset approval and vehicle-spec coverage can evolve independently.

Requested hierarchy:

```text
Brand > Model > Market [United Kingdom | United States] > Year > Trim
- battery size
- outlet / vehicle charging inlet
```

Recommended file layout:

```text
data/
  brands.json
  ev-coverage/
    ev-coverage.schema.json
    brands/
      {brand-slug}.json
```

Each EV coverage file references an existing `brandSlug` from `data/brands.json`.

## Connector terminology

Use `inlet` for the vehicle-side connector and keep `outlet` as a user-facing synonym where needed.

Recommended connector enum values:

- `SAE J1772`
- `Type 1`
- `Type 2`
- `CCS1`
- `CCS2`
- `CHAdeMO`
- `NACS`
- `SAE J3400`
- `Tesla proprietary`
- `unknown`

US vehicles qualify for the present scope when they have SAE J1772-compatible AC charging or NACS/SAE J3400. CCS1 vehicles qualify because the AC portion is SAE J1772.

## Example record shape

```json
{
  "$schema": "../ev-coverage.schema.json",
  "schemaVersion": "1.0.0",
  "brandSlug": "tesla",
  "brandName": "Tesla",
  "coverageStatus": "partial",
  "updatedAt": "2026-05-09",
  "models": [
    {
      "modelSlug": "model-3",
      "modelName": "Model 3",
      "vehicleTypes": ["BEV"],
      "markets": {
        "United States": {
          "marketCode": "US",
          "modelYears": [
            {
              "year": 2025,
              "yearKind": "model-year",
              "availability": "available",
              "trims": [
                {
                  "trimSlug": "long-range-awd",
                  "trimName": "Long Range AWD",
                  "powertrain": "BEV",
                  "battery": {
                    "capacityKwh": {
                      "value": null,
                      "kind": "unknown",
                      "precision": "unknown"
                    },
                    "chemistry": "unknown"
                  },
                  "charging": {
                    "inlets": [
                      {
                        "standard": "NACS",
                        "standardizedAs": "SAE J3400",
                        "regionRole": "primary",
                        "supportsAc": true,
                        "supportsDc": true
                      }
                    ]
                  },
                  "sourceRefs": ["example-source"]
                }
              ]
            }
          ]
        }
      }
    }
  ],
  "sources": [
    {
      "id": "example-source",
      "url": "https://example.invalid/",
      "title": "Example manufacturer specification page",
      "publisher": "Example",
      "sourceKind": "manufacturer-spec-page",
      "marketCode": "US",
      "retrievedAt": "2026-05-09"
    }
  ]
}
```

## Source priority

1. Manufacturer specification/configurator page for the exact market.
2. Manufacturer brochure/spec PDF.
3. Owner manual for connector/charging details.
4. Government/regulatory data such as FuelEconomy.gov for the US.
5. Third-party EV databases as discovery/supporting evidence, not final truth where official data is available.

Use explicit `unknown`/`null` for unresolved values; do not infer battery size or connector details without source support.
