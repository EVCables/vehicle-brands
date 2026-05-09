#!/usr/bin/env node
import fs from "node:fs";
import {
  assetRows,
  escapeMd,
  failUnknownBrand,
  generatedAt,
  loadBrands,
  loadReferenceRecords,
  normalizeSlug,
  parseArgs,
  referenceMap,
  writeJson,
  writeText,
} from "./report-lib.js";

const args = parseArgs();
const brands = loadBrands();
const brandSlug = args.brand && args.brand !== "all" ? args.brand : null;
failUnknownBrand(brandSlug, brands);
const selectedBrands = brandSlug
  ? brands.filter((brand) => brand.slug === brandSlug)
  : brands;
const refsData = loadReferenceRecords();
const refs = refsData.brands || [];
const matchedMap = referenceMap(refsData, brands);
const matched = [];
const registryOnly = [];
const matchedRefSlugs = new Set();
for (const brand of selectedBrands) {
  const ref = matchedMap.get(brand.slug);
  const rows = assetRows({ brandSlug: brand.slug });
  const localCanonicalPresent = Object.fromEntries(
    ["logo", "badge", "wordmark"].map((mark) => [
      mark,
      rows.some((row) => row.mark === mark && row.canonicalExists),
    ]),
  );
  if (ref) {
    matchedRefSlugs.add(ref.slug);
    matched.push({
      brandSlug: brand.slug,
      brandName: brand.name,
      referenceName: ref.name,
      referenceUrl: ref.sourceUrl,
      markClassification: ref.markClassification,
      svgStatus: ref.svgStatus,
      viewBox: ref.viewBox,
      localCanonicalPresent,
      policy: "reference-only",
      recommendedAction: rows.some((row) => row.canonicalExists)
        ? "manual-review-only"
        : "candidate-for-current-brand-review",
    });
  } else
    registryOnly.push({
      brandSlug: brand.slug,
      brandName: brand.name,
      officialWebsite: brand.officialWebsite,
      recommendedAction: "discover-official-source",
    });
}
const brandSlugs = new Set(brands.map((brand) => brand.slug));
const normalizedBrands = new Set(
  brands.flatMap((brand) => [
    normalizeSlug(brand.slug),
    normalizeSlug(brand.name),
    ...(brand.aliases || []).map(normalizeSlug),
  ]),
);
const referenceOnly = refs
  .filter(
    (ref) =>
      !brandSlugs.has(ref.slug) &&
      !normalizedBrands.has(normalizeSlug(ref.name)),
  )
  .map((ref) => ({
    referenceSlug: ref.slug,
    referenceName: ref.name,
    referenceUrl: ref.sourceUrl,
    markClassification: ref.markClassification,
    recommendedAction: "ignore-unless-in-scope",
  }));
const data = {
  version: 1,
  generatedAt: generatedAt(args),
  referenceSource: {
    name: "Vehicle Imagery",
    url: refsData.source,
    retrievedAt: refsData.retrievedAt,
    policy: "reference-only",
  },
  summary: {
    registryBrands: selectedBrands.length,
    referenceBrands: refs.length,
    matched: matched.length,
    registryOnly: registryOnly.length,
    referenceOnly: referenceOnly.length,
  },
  matched,
  registryOnly,
  referenceOnly,
  issues: [],
};
const jsonPath =
  args.out && args.out.endsWith(".json")
    ? args.out
    : "reports/reference-diff.json";
const mdPath =
  args.out && args.out.endsWith(".md") ? args.out : "reports/reference-diff.md";
if (args.format !== "md") writeJson(jsonPath, data);
if (args.format !== "json") writeText(mdPath, toMarkdown(data));
console.log(
  `reference diff: ${matched.length} matched, ${registryOnly.length} registry-only, ${referenceOnly.length} reference-only`,
);

function toMarkdown(data) {
  const lines = [
    "# Reference source diff",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    `Source: ${data.referenceSource.url}`,
    "",
    "## Summary",
    "",
    `- Registry brands: ${data.summary.registryBrands}`,
    `- Reference brands: ${data.summary.referenceBrands}`,
    `- Matched: ${data.summary.matched}`,
    `- Registry-only: ${data.summary.registryOnly}`,
    `- Reference-only: ${data.summary.referenceOnly}`,
    "",
    "## Matched Vehicle Imagery references",
    "",
    "| Brand | Classification | Local canonical | Action | URL |",
    "|---|---|---|---|---|",
  ];
  for (const row of data.matched) {
    const present =
      Object.entries(row.localCanonicalPresent)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ") || "none";
    lines.push(
      `| ${escapeMd(row.brandName)} | ${escapeMd(row.markClassification)} | ${escapeMd(present)} | ${escapeMd(row.recommendedAction)} | ${escapeMd(row.referenceUrl)} |`,
    );
  }
  lines.push("", "## Registry brands without Vehicle Imagery reference", "");
  for (const row of data.registryOnly)
    lines.push(
      `- ${escapeMd(row.brandName)} (${row.brandSlug}) — ${escapeMd(row.recommendedAction)}`,
    );
  if (data.referenceOnly.length) {
    lines.push("", "## Reference-only brands not in registry", "");
    for (const row of data.referenceOnly)
      lines.push(
        `- ${escapeMd(row.referenceName)} (${row.referenceSlug}) — ${escapeMd(row.recommendedAction)}`,
      );
  }
  lines.push(
    "",
    "## Policy",
    "",
    "Vehicle Imagery is a reference/candidate source only; upstream `_logo.svg` names do not establish logo/badge/wordmark semantics.",
  );
  return lines.join("\n");
}
