# Asset automation and acceleration

This repository should scale via **bounded automation plus explicit QA gates**, not by bulk-importing every plausible SVG. The goal is to increase throughput while preserving current-brand correctness, provenance, and the rule that final outputs are clean SVGs only.

## New accelerator commands

| Command                                   | Purpose                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run confidence`                      | Generate `reports/source-confidence.{json,md}` with present/approved/fallback/blocked/missing counts and per-asset warnings. |
| `npm run references:diff`                 | Compare `data/brands.json` with Vehicle Imagery reference coverage. Vehicle Imagery remains reference-only.                  |
| `npm run brand:summary -- --brand <slug>` | Produce a compact per-brand matrix, source summary, QA status, and next actions. Use `--brand all` for aggregate output.     |
| `npm run qa:sheet -- --brand <slug>`      | Generate a per-brand reviewer sheet under `qa/sheets/` with policy checklist and decisions.                                  |
| `npm run context:brand -- --brand <slug>` | Produce a token-efficient context packet for a subagent. Includes SVG metadata/checksums by default, not full path bodies.   |
| `npm run pr:summary`                      | Produce a PR-ready summary/checklist for changed brands.                                                                     |
| `npm run audit`                           | Run validation, visual QA, reference diff, confidence, brand summary, QA sheets for small scopes, and PR summary.            |

Most reports are generated into `reports/`; QA sheets are generated into `qa/sheets/`.

## Recommended high-throughput workflow

1. Refresh references:
   ```bash
   npm run discover:references
   npm run references:diff
   ```
2. Build the source-confidence map:
   ```bash
   npm run confidence
   ```
3. Assign work by confidence category:
   - **A — official SVG/current source found:** ready for extraction/normalization.
   - **B — official page/media source found but no SVG:** manual source decision.
   - **C — Vehicle Imagery/reference SVG only:** current-brand review before any promotion.
   - **D — rebrand/staleness risk:** senior/manual review first.
   - **E — scope uncertain:** defer until scope accepted.
   - **F — blocked/no acceptable source:** record blocked or leave scaffolded.
4. For each brand in progress:
   ```bash
   npm run context:brand -- --brand <slug>
   npm run brand:summary -- --brand <slug>
   npm run qa:sheet -- --brand <slug>
   ```
5. After canonical SVG updates:
   ```bash
   npm run build
   npm run validate
   npm run visual-qa
   npm run audit -- --changed
   npm run pr:summary
   ```

## Context management and token efficiency

The major context risk is asking agents to reread the full repository, full SVG bodies, and every historical evidence file for each brand. That wastes tokens and increases mistakes.

Use `npm run context:brand -- --brand <slug>` for subagents. It gives them:

- the brand registry row;
- asset matrix status;
- manifest/source/QA state summarized;
- reference-candidate metadata;
- local SVG checksums/viewBoxes/titles/descriptions;
- policy reminders.

It intentionally omits full SVG path bodies unless `--include-svg` is passed. For most research, QA, and PR review tasks, metadata/checksums are enough. Only extraction/cleanup agents need full SVG content.

Recommended delegation pattern:

- Discovery agents receive only `context:brand` packets plus official website/reference URLs.
- Extraction agents receive the compact packet plus the specific accepted source/candidate SVG.
- QA agents receive the compact packet plus rendered/contact-sheet output.
- Coordinator receives `confidence`, `brand:summary`, and `pr:summary`, not every raw file.

## Running automatically against the full set

Fully automatic source discovery and status reporting is safe. Fully automatic promotion of SVGs into `src/` is not safe without QA, because common failure modes include stale marks, wrong mark type, unofficial geometry, and invented black/white/wordmark variants.

Safe to automate continuously:

- `npm run discover:references`
- `npm run references:diff`
- `npm run confidence`
- `npm run audit`
- generation of context packets and QA sheets
- progress reporting against approved/fallback/blocked/missing totals

Require explicit review before merge:

- importing any third-party/reference SVG as canonical;
- marking an asset `approved`;
- turning a blocked/missing mark into a generated derivative;
- accepting Vehicle Imagery geometry as more than a reference candidate;
- using Motomarks beyond metadata/validation.

Recommended autonomous cadence:

1. A recurring audit job can refresh reports and post progress.
2. A coordinator agent can open small batch issues from `confidence` output.
3. Subagents can work one brand or one low-risk batch at a time.
4. Each brand PR must include `pr:summary`, `qa:sheet`, validation output, and explicit blocked/missing rationale.

## Quality-preserving speed improvements

- Prioritize high-confidence official SVG brands first to increase approved coverage quickly.
- Treat partial completion as success when the missing mark type is not officially available.
- Track **approved count** separately from **present SVG count**.
- Use Vehicle Imagery to accelerate discovery, not as automatic source authority.
- Use Motomarks for semantic validation and colour metadata only; do not commit paid image payloads.
- Keep one-brand or small-batch PRs so reviewers can inspect mark semantics and currentness.
- Use `SOURCE_DATE_EPOCH` or `--no-timestamp` when stable generated report diffs matter.

## Overall goal metrics

Use these metrics for progress updates:

- total brands in registry;
- canonical SVGs present / expected;
- approved assets;
- review-fallback assets;
- blocked assets;
- missing/untriaged assets;
- brands with Vehicle Imagery reference coverage;
- brands with official-source evidence;
- brands ready for extraction;
- brands requiring current-brand review.

Do not report “complete” using file presence alone. A brand is production-ready only when required/valid assets are either approved or explicitly blocked with evidence.
