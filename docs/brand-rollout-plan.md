# Brand rollout plan

This document supersedes the pilot-only plan now that the repo has a fail-closed pixel-perfect QA gate.

## Execution model

- One GitHub issue per non-pilot brand.
- One GitHub PR per brand.
- Each brand PR must be small enough to review independently and must link/close its issue.
- Delegate agents may research and/or implement brand branches, but the controller must verify each pushed PR, CI run, and merge state before reporting it as ready.

## Brand PR acceptance standard

A brand PR may add canonical SVG files only when they are derived from official manufacturer, brand-portal, or media-kit vector sources.

For every `brand/mark/mode` tuple:

- `approved`: official vector/reference exists, checksum is recorded, named reviewer/date are recorded, and `pixelTolerance` is `0`.
- `blocked`: no official pixel-perfect vector/reference was found, or geometry/typography/border treatment cannot be verified.
- `review-fallback`: allowed only for existing pilot/demo assets; new brand rollout PRs should prefer `approved` or `blocked`.

No PR should invent badge borders, typography, wordmarks, or black/white treatments by hand.

## Required files per brand PR

- `docs/evidence/{brand}-YYYY-MM-DD.md`
- `src/{brand}/manifest.json`
- `src/{brand}/sources.json`
- `qa/visual-approvals.json`
- canonical `src/{brand}/.../*.svg` only for verified official/pixel-perfect assets
- generated `dist/{brand}/.../*.svg` only from present canonical files
- `docs/brand-status.md` and `docs/completeness-report.md` updated

## Verification before push

```bash
npm run build
npm run validate
npm run visual-qa
npm run preview
npm test
npm run report > docs/completeness-report.md
```

`npm run pilot` is not required for non-pilot brand PRs unless the branch changes pilot-generation logic.

## Current issue allocation

Issues #4-#46 track the remaining non-pilot brands. Pilot brands Audi, Peugeot, and Tesla are already tracked through the initial pipeline PRs and remain subject to the same pixel-perfect rules for any future replacement assets.

## Work order

Prioritise brands where official media-kit/styleguide vectors can be verified quickly, then brands with clear official web SVGs, then blocked/evidence-only PRs for brands where source access is gated or unavailable.

Initial delegated research batches:

1. Stellantis / related: Abarth, Citroen, DS, Fiat, Jeep, Maserati, Opel/Vauxhall, Peugeot follow-up if needed.
2. German / premium: BMW, Mercedes, Porsche, Mini, Rolls-Royce, Volkswagen, Skoda, Seat, CUPRA.
3. Asian mainstream: Honda, Hyundai, Genesis, Kia, Lexus, Mazda, Mitsubishi, Nissan, Subaru, Toyota.
4. EV / other: BYD, Chevrolet, Dacia, Fisker, Jaguar, KGM, Lotus, MG, Mia, ORA, Polestar, Range Rover, Renault, Smart, Tata, Volvo.

## Reporting checkpoint

Report back to the user when the first independently reviewable non-pilot brand PR has green CI, or earlier if official source access blocks all first-wave candidates.
