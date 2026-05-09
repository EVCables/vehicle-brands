#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  assetRows,
  changedBrands,
  escapeMd,
  generatedAt,
  loadBrands,
  parseArgs,
  summarizeRows,
  writeJson,
  writeText,
} from "./report-lib.js";

const args = parseArgs();
const base = args.base || "origin/main";
let diff = "";
try {
  diff = execFileSync("git", ["diff", "--name-status", `${base}...HEAD`], {
    encoding: "utf8",
  });
} catch {}
const changedFiles = diff
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, file] = line.split(/\s+/, 2);
    return { status, path: file };
  });
const brands = changedBrands({ base });
const rows = brands.flatMap((slug) => assetRows({ brandSlug: slug }));
const data = {
  version: 1,
  generatedAt: generatedAt(args),
  base,
  changedFiles,
  changedBrands: brands,
  summary: summarizeRows(rows),
  reviewChecklist: [
    "No paid Motomarks image payloads committed.",
    "Vehicle Imagery references are reference-only unless current-brand approved.",
    "Approved assets have source checksum and reviewer sign-off.",
    "Missing mark types were not invented.",
  ],
  issues: rows.flatMap((row) =>
    row.confidence.warnings.map((warning) => `${row.assetKey}: ${warning}`),
  ),
};
writeJson("reports/pr-summary.json", data);
writeText("reports/pr-summary.md", toMarkdown(data));
console.log(
  `pr summary: ${brands.length} changed brand(s), ${changedFiles.length} changed file(s)`,
);

function toMarkdown(data) {
  const lines = [
    "## Vehicle brand asset PR summary",
    "",
    `Base: \`${data.base}\``,
    "",
    "### Changed brands",
    "",
  ];
  if (data.changedBrands.length)
    for (const brand of data.changedBrands) lines.push(`- ${brand}`);
  else lines.push("- No brand-specific source changes detected.");
  lines.push(
    "",
    "### Asset status for changed brands",
    "",
    `- Canonical present: ${data.summary.canonicalPresent}/${data.summary.expectedCanonical}`,
    `- Approved: ${data.summary.approvedAssets}`,
    `- Review fallback: ${data.summary.reviewFallbackAssets}`,
    `- Blocked: ${data.summary.blockedAssets}`,
    "",
    "### Review checklist",
    "",
  );
  for (const item of data.reviewChecklist) lines.push(`- [ ] ${item}`);
  if (data.issues.length) {
    lines.push("", "### Warnings", "");
    for (const issue of data.issues.slice(0, 50))
      lines.push(`- ${escapeMd(issue)}`);
  }
  return lines.join("\n");
}
