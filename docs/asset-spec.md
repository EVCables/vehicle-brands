# Vehicle Brand Asset Specification

## Canonical assets

Canonical assets live under:

```text
src/{brand}/{mark}/{mode}.svg
```

Where:

- `{brand}` is the lowercase slug from `data/brands.json`.
- `{mark}` is one of `logo`, `badge`, `wordmark`.
- `{mode}` is one of `colour`, `black`, `white`.

## Generated assets

Generated ratio variants live under:

```text
dist/{brand}/{mark}/{mode}/{ratio}.svg
```

Supported ratios:

| Ratio | ViewBox |
|---|---|
| `1x1` | `0 0 1000 1000` |
| `4x3` | `0 0 1200 900` |
| `3x2` | `0 0 1500 1000` |
| `16x9` | `0 0 1600 900` |
| `21x9` | `0 0 2100 900` |

## SVG rules

Canonical SVGs must:

1. Include `xmlns`, `viewBox`, `role="img"`, `title`, and `desc`.
2. Use path/vector artwork only.
3. Avoid scripts, event handlers, `foreignObject`, external references, raster images, and embedded base64 payloads.
4. Use tight artwork bounds. Padding is added only by generated `dist/` files.
5. Use outlined paths rather than live text/font dependencies for final reviewed assets.

## Padding policy

The generator scales canonical artwork into a deterministic safe area:

- Default: 80% of artboard width and height.
- Badge/icon: 76% to avoid oversized icons in square cards.
- Wordmark: 84% width and 70% height to preserve horizontal breathing room.

Any per-brand exception must be recorded in `src/{brand}/manifest.json`.
