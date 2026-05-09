#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { ensureDir } from "./lib.js";
import {
  assetRows,
  changedBrands,
  generatedAt,
  loadBrands,
  parseArgs,
  summarizeRows,
  writeJson,
  writeText,
} from "./report-lib.js";

const args = parseArgs();
const brands = loadBrands();
let scopeBrands = brands.map((brand) => brand.slug);
let mode = "all";
if (args.brand && args.brand !== "all") {
  scopeBrands = [args.brand];
  mode = "brand";
}
if (args.changed) {
  scopeBrands = changedBrands({ base: args.base || "origin/main" });
  mode = "changed";
}
const steps = [];
function run(name, command) {
  const started = Date.now();
  try {
    const output = execFileSync(command[0], command.slice(1), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    steps.push({
      name,
      status: "pass",
      durationMs: Date.now() - started,
      output: output.trim().split("\n").slice(-5).join("\n"),
      errors: [],
    });
  } catch (error) {
    steps.push({
      name,
      status: "fail",
      durationMs: Date.now() - started,
      output: error.stdout?.toString() || "",
      errors: [error.stderr?.toString() || error.message],
    });
  }
}
ensureDir("reports/audit");
run("validate", ["node", "tools/validate-assets.js"]);
run("visual-qa", ["node", "tools/validate-visual-qa.js"]);
run("references-diff", [
  "node",
  "tools/diff-reference-sources.js",
  "--no-timestamp",
]);
run("source-confidence", [
  "node",
  "tools/report-source-confidence.js",
  "--no-timestamp",
]);
run("brand-summary", [
  "node",
  "tools/report-brand-summary.js",
  "--brand",
  "all",
  "--no-timestamp",
]);
if (scopeBrands.length && scopeBrands.length <= 20) {
  for (const slug of scopeBrands)
    run(`qa-sheet:${slug}`, [
      "node",
      "tools/generate-qa-sheet.js",
      "--brand",
      slug,
      "--no-timestamp",
    ]);
}
run("pr-summary", ["node", "tools/generate-pr-summary.js", "--no-timestamp"]);
const rows = scopeBrands.flatMap((slug) => assetRows({ brandSlug: slug }));
const data = {
  version: 1,
  generatedAt: generatedAt(args),
  scope: { mode, brands: scopeBrands },
  steps,
  summary: summarizeRows(rows),
  policyChecks: {
    noMotomarksImagesCommitted: "enforced-by-policy-and-review",
    vehicleImageryReferenceOnly: "enforced-by-reference-reports",
    currentBrandQaForApprovedAssets:
      steps.find((step) => step.name === "visual-qa")?.status || "unknown",
  },
  issues: steps
    .filter((step) => step.status !== "pass")
    .flatMap((step) => step.errors.map((error) => `${step.name}: ${error}`)),
};
writeJson("reports/audit/index.json", data);
writeText("reports/audit/index.md", toMarkdown(data));
console.log(
  `audit: ${steps.filter((step) => step.status === "pass").length}/${steps.length} steps passed; wrote reports/audit/index.md`,
);
if (data.issues.length) process.exit(1);

function toMarkdown(data) {
  const lines = [
    "# Asset audit",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    `Scope: ${data.scope.mode} (${data.scope.brands.length} brand(s))`,
    "",
    "## Summary",
    "",
    `- Canonical: ${data.summary.canonicalPresent}/${data.summary.expectedCanonical}`,
    `- Approved: ${data.summary.approvedAssets}`,
    `- Review fallback: ${data.summary.reviewFallbackAssets}`,
    `- Blocked: ${data.summary.blockedAssets}`,
    "",
    "## Steps",
    "",
    "| Step | Status | Duration |",
    "|---|---|---:|",
  ];
  for (const step of data.steps)
    lines.push(`| ${step.name} | ${step.status} | ${step.durationMs}ms |`);
  if (data.issues.length) {
    lines.push("", "## Issues", "");
    for (const issue of data.issues) lines.push(`- ${issue}`);
  }
  return lines.join("\n");
}
