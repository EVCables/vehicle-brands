# Vehicle Brands SVG Assets

Normalized SVG vehicle-brand assets for web use.

This repository is structured as an asset pipeline:

- `src/` contains canonical, reviewed SVG assets.
- `dist/` contains generated padded aspect-ratio variants.
- `data/` contains the brand registry and metadata schemas.
- `tools/` contains validation, discovery, and generation scripts.

## Asset matrix

Each completed brand should provide 9 canonical SVGs:

| Mark type | Colour modes |
|---|---|
| `logo` | `colour`, `black`, `white` |
| `badge` | `colour`, `black`, `white` |
| `wordmark` | `colour`, `black`, `white` |

Generated web ratios are produced from canonical SVGs:

- `1x1`
- `4x3`
- `3x2`
- `16x9`
- `21x9`

Current in-scope brand count: **46**.

## Commands

```bash
npm ci
npm test
npm run validate
npm run build
npm run report
```

Strict completeness mode, for later rollout gates:

```bash
npm run validate -- --strict
```

## Trademark notice

Vehicle logos, badges, wordmarks, names, and trademarks remain the property of their respective owners. This repository does not claim ownership of third-party brand assets. Assets are intended for nominative/identification use where legally permitted. Users are responsible for complying with each manufacturer's brand guidelines.
