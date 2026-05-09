#!/usr/bin/env node
import { MARK_TYPES, COLOUR_MODES } from "./config.js";
import {
  assetRows,
  escapeMd,
  failUnknownBrand,
  generatedAt,
  loadBrands,
  summarizeRows,
  parseArgs,
  writeJson,
  writeText,
} from "./report-lib.js";

const args = parseArgs();
const brands = loadBrands();
const brandSlug = args.brand && args.brand !== "all" ? args.brand : null;
failUnknownBrand(brandSlug, brands);
const rows = assetRows({ brands, brandSlug });
const grouped = new Map();
for (const row of rows) {
  if (!grouped.has(row.brandSlug))
    grouped.set(row.brandSlug, {
      slug: row.brandSlug,
      name: row.brandName,
      assets: [],
    });
  grouped.get(row.brandSlug).assets.push(row);
}
const data = {
  version: 1,
  generatedAt: generatedAt(args),
  policy: {
    motomarksUse:
      "metadata-and-validation-only; paid PNG/WebP payloads must not be committed",
    vehicleImageryUse:
      "reference-only until current-brand review, cleanup, provenance, and visual QA approval",
  },
  summary: { brandCount: grouped.size, ...summarizeRows(rows) },
  brands: [...grouped.values()].map((brand) => {
    const summary = summarizeRows(brand.assets);
    const issueSet = new Set(
      brand.assets.flatMap((row) =>
        row.confidence.warnings.map((warning) => `${row.assetKey}: ${warning}`),
      ),
    );
    return {
      slug: brand.slug,
      name: brand.name,
      summary,
      assets: brand.assets.map((row) => ({
        assetKey: row.assetKey,
        mark: row.mark,
        mode: row.mode,
        canonicalExists: row.canonicalExists,
        manifestStatus: row.manifestStatus,
        sourceKind: row.sourceRecord?.sourceKind || null,
        sourceId: row.sourceRecord?.id || row.manifestEntry?.sourceId || null,
        qaStatus: row.qaRecord?.status || "missing",
        confidence: row.confidence,
      })),
      issues: [...issueSet],
    };
  }),
};

const jsonPath =
  args.out && args.out.endsWith(".json")
    ? args.out
    : brandSlug
      ? `reports/brands/${brandSlug}/source-confidence.json`
      : "reports/source-confidence.json";
const mdPath =
  args.out && args.out.endsWith(".md")
    ? args.out
    : brandSlug
      ? `reports/brands/${brandSlug}/source-confidence.md`
      : "reports/source-confidence.md";
if (args.format !== "md") writeJson(jsonPath, data);
if (args.format !== "json") writeText(mdPath, toMarkdown(data));
console.log(
  `source confidence: ${data.summary.canonicalPresent}/${data.summary.expectedCanonical} canonical, ${data.summary.approvedAssets} approved, wrote reports`,
);

function toMarkdown(data) {
  const lines = [
    "# Source confidence report",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Brands: ${data.summary.brandCount}`,
    `- Canonical SVGs: ${data.summary.canonicalPresent}/${data.summary.expectedCanonical}`,
    `- Approved assets: ${data.summary.approvedAssets}`,
    `- Review fallback assets: ${data.summary.reviewFallbackAssets}`,
    `- Blocked assets: ${data.summary.blockedAssets}`,
    `- Missing/untriaged assets: ${data.summary.missingAssets}`,
    "",
    "| Brand | Canonical | Approved | Fallback | Blocked | Missing | Confidence tiers |",
    "|---|---:|---:|---:|---:|---:|---|",
  ];
  for (const brand of data.brands) {
    const s = brand.summary;
    const tiers = Object.entries(s.confidence)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    lines.push(
      `| ${escapeMd(brand.name)} | ${s.canonicalPresent}/${s.expectedCanonical} | ${s.approvedAssets} | ${s.reviewFallbackAssets} | ${s.blockedAssets} | ${s.missingAssets} | ${escapeMd(tiers)} |`,
    );
  }
  lines.push("", "## Top issues", "");
  for (const brand of data.brands
    .filter((brand) => brand.issues.length)
    .slice(0, 30)) {
    lines.push(`### ${brand.name}`, "");
    for (const issue of brand.issues.slice(0, 12))
      lines.push(`- ${escapeMd(issue)}`);
    lines.push("");
  }
  lines.push(
    "## Policy notes",
    "",
    "- Motomarks remains validation/metadata-only; do not commit Motomarks image payloads.",
    "- Vehicle Imagery records are candidates/reference only until current-brand QA approval.",
    "- Present SVG count is not the same as production-approved count.",
  );
  return lines.join("\n");
}
