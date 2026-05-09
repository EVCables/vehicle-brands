#!/usr/bin/env node
import fs from "node:fs";
import {
  assetRows,
  escapeMd,
  failUnknownBrand,
  generatedAt,
  loadBrands,
  parseArgs,
  writeJson,
  writeText,
} from "./report-lib.js";

const args = parseArgs();
const brands = loadBrands();
const brandSlug = args.brand && args.brand !== "all" ? args.brand : null;
if (!brandSlug && args.brand !== "all")
  throw new Error("use --brand <slug> or --brand all");
failUnknownBrand(brandSlug, brands);
const selected = brandSlug
  ? brands.filter((brand) => brand.slug === brandSlug)
  : brands;
const sheets = selected.map((brand) => sheetForBrand(brand));
if (brandSlug) {
  if (args.format !== "md") writeJson(`qa/sheets/${brandSlug}.json`, sheets[0]);
  if (args.format !== "json")
    writeText(`qa/sheets/${brandSlug}.md`, toMarkdown(sheets[0]));
} else {
  for (const sheet of sheets) {
    if (args.format !== "md")
      writeJson(`qa/sheets/${sheet.brand.slug}.json`, sheet);
    if (args.format !== "json")
      writeText(`qa/sheets/${sheet.brand.slug}.md`, toMarkdown(sheet));
  }
}
console.log(`qa sheet: wrote ${sheets.length} sheet(s)`);

function sheetForBrand(brand) {
  const rows = assetRows({ brandSlug: brand.slug });
  return {
    version: 1,
    generatedAt: generatedAt(args),
    brand: { slug: brand.slug, name: brand.name },
    policyChecklist: {
      noMotomarksImagesCommitted: true,
      vehicleImageryReferenceOnly: true,
      currentBrandReviewRequired: true,
      noInventedMarks: true,
    },
    reviewerInstructions: [
      "Compare canonical SVG to official manufacturer reference.",
      "Do not approve Vehicle Imagery-only candidates without current-brand verification.",
      "Do not approve Motomarks image-derived geometry.",
      "Approve only current-brand SVGs with source checksum and reviewer sign-off.",
    ],
    assets: rows.map((row) => ({
      assetKey: row.assetKey,
      mark: row.mark,
      mode: row.mode,
      canonicalPath: row.canonicalPath,
      canonicalExists: row.canonicalExists,
      svgDigest: row.canonical,
      sourceId: row.sourceRecord?.id || row.manifestEntry?.sourceId || null,
      sourceUrl: row.sourceRecord?.url || null,
      sourceKind: row.sourceRecord?.sourceKind || null,
      qaStatus: row.qaRecord?.status || "missing",
      referenceUrl:
        row.qaRecord?.referenceUrl || row.referenceCandidate?.sourceUrl || null,
      referenceChecksumSha256: row.qaRecord?.referenceChecksumSha256 || null,
      reviewer: row.qaRecord?.reviewer || null,
      approvedAt: row.qaRecord?.approvedAt || null,
      pixelTolerance: row.qaRecord?.pixelTolerance ?? null,
      decisionOptions: [
        "approve",
        "keep-review-fallback",
        "block",
        "needs-official-source",
        "remove-canonical",
      ],
      blockingQuestions: [
        "Is this the current brand mark?",
        "Is the mark type classified correctly?",
        "Is source provenance acceptable?",
        "Is this free of paid-raster-derived geometry?",
      ],
      warnings: row.confidence.warnings,
    })),
    openQuestions: rows.flatMap((row) =>
      row.confidence.warnings.map((warning) => `${row.assetKey}: ${warning}`),
    ),
  };
}

function toMarkdown(sheet) {
  const lines = [
    `# QA sheet — ${sheet.brand.name}`,
    "",
    `Generated: ${sheet.generatedAt}`,
    "",
    "## Reviewer instructions",
    "",
  ];
  for (const instruction of sheet.reviewerInstructions)
    lines.push(`- ${instruction}`);
  lines.push(
    "",
    "## Asset review table",
    "",
    "| Asset | Exists | Source kind | QA | Reference | Decision | Notes |",
    "|---|---:|---|---|---|---|---|",
  );
  for (const asset of sheet.assets)
    lines.push(
      `| ${escapeMd(asset.assetKey)} | ${asset.canonicalExists ? "yes" : "no"} | ${escapeMd(asset.sourceKind || "")} | ${escapeMd(asset.qaStatus)} | ${escapeMd(asset.referenceUrl || "")} |  | ${escapeMd(asset.warnings.join("; "))} |`,
    );
  lines.push(
    "",
    "## Policy checklist",
    "",
    "- [ ] No Motomarks PNG/WebP payloads committed.",
    "- [ ] Vehicle Imagery references are candidate/reference only unless current-brand approved.",
    "- [ ] Missing standalone mark types are blocked rather than invented.",
    "- [ ] Approved assets have reviewer/date/reference checksum/pixelTolerance 0.",
    "",
  );
  if (sheet.openQuestions.length) {
    lines.push("## Open questions / warnings", "");
    for (const question of sheet.openQuestions)
      lines.push(`- ${escapeMd(question)}`);
  }
  return lines.join("\n");
}
