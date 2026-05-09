#!/usr/bin/env node
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
if (!brandSlug && args.brand !== "all")
  throw new Error("use --brand <slug> or --brand all");
failUnknownBrand(brandSlug, brands);
const selected = brandSlug
  ? brands.filter((brand) => brand.slug === brandSlug)
  : brands;
const summaries = selected.map((brand) => summarizeBrand(brand));
const data = {
  version: 1,
  generatedAt: generatedAt(args),
  brands: summaries,
  summary: summarizeRows(
    summaries.flatMap((summary) => summary.assetsRaw || []),
  ),
};
for (const summary of summaries) delete summary.assetsRaw;
const jsonPath =
  args.out && args.out.endsWith(".json")
    ? args.out
    : brandSlug
      ? `reports/brands/${brandSlug}/summary.json`
      : "reports/brand-summary.json";
const mdPath =
  args.out && args.out.endsWith(".md")
    ? args.out
    : brandSlug
      ? `reports/brands/${brandSlug}/summary.md`
      : "reports/brand-summary.md";
if (args.format !== "md") writeJson(jsonPath, data);
if (args.format !== "json") writeText(mdPath, toMarkdown(data));
console.log(`brand summary: wrote ${summaries.length} brand summaries`);

function summarizeBrand(brand) {
  const rows = assetRows({ brandSlug: brand.slug });
  const s = summarizeRows(rows);
  const sourceKinds = new Map();
  for (const row of rows)
    if (row.sourceRecord?.sourceKind)
      sourceKinds.set(
        row.sourceRecord.sourceKind,
        (sourceKinds.get(row.sourceRecord.sourceKind) || 0) + 1,
      );
  const issues = rows.flatMap((row) =>
    row.confidence.warnings.map((warning) => `${row.assetKey}: ${warning}`),
  );
  return {
    brand: {
      slug: brand.slug,
      name: brand.name,
      aliases: brand.aliases || [],
      officialWebsite: brand.officialWebsite || null,
    },
    status: s,
    sourceKinds: Object.fromEntries(sourceKinds),
    referenceSummary: rows[0]?.referenceCandidate
      ? {
          vehicleImageryMatch: true,
          url: rows[0].referenceCandidate.sourceUrl,
          markClassification: rows[0].referenceCandidate.markClassification,
          policy: "reference-only",
        }
      : { vehicleImageryMatch: false },
    assetMatrix: rows.map((row) => ({
      assetKey: row.assetKey,
      mark: row.mark,
      mode: row.mode,
      canonicalExists: row.canonicalExists,
      manifestStatus: row.manifestStatus,
      sourceKind: row.sourceRecord?.sourceKind || null,
      qaStatus: row.qaRecord?.status || "missing",
      confidenceTier: row.confidence.tier,
      confidenceScore: row.confidence.score,
      warnings: row.confidence.warnings,
    })),
    recommendedNextActions: recommend(rows),
    issues,
    assetsRaw: rows,
  };
}

function recommend(rows) {
  const actions = [];
  if (rows.some((row) => row.confidence.tier === "missing"))
    actions.push(
      "Run official-source discovery before importing reference SVGs.",
    );
  if (rows.some((row) => row.qaRecord?.status === "review-fallback"))
    actions.push(
      "Replace review-fallback assets with official/current sources or keep non-production.",
    );
  if (rows.some((row) => row.confidence.tier === "blocked"))
    actions.push(
      "Keep blocked marks absent unless an official standalone source is found.",
    );
  if (rows[0]?.referenceCandidate)
    actions.push(
      "Use Vehicle Imagery only as a current-brand comparison candidate, not as automatic approval.",
    );
  return [...new Set(actions)];
}

function toMarkdown(data) {
  const lines = [
    "# Brand asset summary",
    "",
    `Generated: ${data.generatedAt}`,
    "",
  ];
  for (const item of data.brands) {
    lines.push(
      `## ${item.brand.name}`,
      "",
      `- Slug: \`${item.brand.slug}\``,
      `- Canonical: ${item.status.canonicalPresent}/${item.status.expectedCanonical}`,
      `- Approved: ${item.status.approvedAssets}`,
      `- Review fallback: ${item.status.reviewFallbackAssets}`,
      `- Blocked: ${item.status.blockedAssets}`,
      `- Missing: ${item.status.missingAssets}`,
      `- Vehicle Imagery reference: ${item.referenceSummary.vehicleImageryMatch ? item.referenceSummary.url : "none"}`,
      "",
      "| Asset | Exists | Manifest | Source kind | QA | Confidence |",
      "|---|---:|---|---|---|---:|",
    );
    for (const row of item.assetMatrix)
      lines.push(
        `| ${escapeMd(row.assetKey)} | ${row.canonicalExists ? "yes" : "no"} | ${escapeMd(row.manifestStatus)} | ${escapeMd(row.sourceKind || "")} | ${escapeMd(row.qaStatus)} | ${row.confidenceScore} |`,
      );
    if (item.recommendedNextActions.length) {
      lines.push("", "### Next actions");
      for (const action of item.recommendedNextActions)
        lines.push(`- ${escapeMd(action)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
