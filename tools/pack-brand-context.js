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
const brandSlug = args.brand;
if (!brandSlug) throw new Error("use --brand <slug>");
failUnknownBrand(brandSlug, brands);
const brand = brands.find((item) => item.slug === brandSlug);
const rows = assetRows({ brandSlug });
const maxChars = Number(args.maxChars || 12000);
const packet = {
  version: 1,
  generatedAt: generatedAt(args),
  brand: {
    slug: brand.slug,
    name: brand.name,
    aliases: brand.aliases || [],
    officialWebsite: brand.officialWebsite || null,
  },
  included: {
    registry: true,
    manifest: true,
    sources: true,
    qa: true,
    referenceCandidates: true,
    svgMetadata: true,
    svgBodies: Boolean(args.includeSvg),
  },
  assetDigest: rows.map((row) => ({
    assetKey: row.assetKey,
    exists: row.canonicalExists,
    canonicalPath: row.canonicalPath,
    svg: row.canonical,
    manifestStatus: row.manifestStatus,
    sourceKind: row.sourceRecord?.sourceKind || null,
    sourceUrl: row.sourceRecord?.url || null,
    qaStatus: row.qaRecord?.status || "missing",
    confidence: row.confidence,
    svgBody:
      args.includeSvg && row.canonicalExists
        ? fs.readFileSync(row.canonicalPath, "utf8")
        : undefined,
  })),
  policyReminders: [
    "Do not commit Motomarks image payloads.",
    "Vehicle Imagery is reference-only until current-brand QA.",
    "Do not invent missing badge/wordmark/logo variants.",
  ],
};
let markdown = toMarkdown(packet);
if (markdown.length > maxChars)
  markdown = `${markdown.slice(0, maxChars - 120)}\n\n[TRUNCATED to ${maxChars} chars; rerun with --max-chars for more.]\n`;
packet.promptContext = markdown;
writeJson(`reports/context/${brandSlug}.json`, packet);
writeText(`reports/context/${brandSlug}.md`, markdown);
console.log(
  `context packet: wrote reports/context/${brandSlug}.md (${markdown.length} chars)`,
);

function toMarkdown(packet) {
  const lines = [
    `# Compact brand context — ${packet.brand.name}`,
    "",
    `Slug: ${packet.brand.slug}`,
    `Official website: ${packet.brand.officialWebsite || ""}`,
    "",
    "## Policy reminders",
    "",
  ];
  for (const item of packet.policyReminders) lines.push(`- ${item}`);
  lines.push(
    "",
    "## Asset digest",
    "",
    "| Asset | Exists | Manifest | Source | QA | Confidence | Warnings |",
    "|---|---:|---|---|---|---:|---|",
  );
  for (const row of packet.assetDigest)
    lines.push(
      `| ${escapeMd(row.assetKey)} | ${row.exists ? "yes" : "no"} | ${escapeMd(row.manifestStatus)} | ${escapeMd(row.sourceKind || "")} | ${escapeMd(row.qaStatus)} | ${row.confidence.score} | ${escapeMd(row.confidence.warnings.join("; "))} |`,
    );
  return lines.join("\n");
}
