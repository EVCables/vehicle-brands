import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { COLOUR_MODES, MARK_TYPES, RATIOS } from "./config.js";
import {
  canonicalPath,
  ensureDir,
  parseSvg,
  parseViewBox,
  readJson,
  sha256,
} from "./lib.js";

export const REPORTS_DIR = "reports";

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) args[key] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--"))
      args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

export function generatedAt(args = {}) {
  if (args.noTimestamp) return "1970-01-01T00:00:00.000Z";
  if (process.env.SOURCE_DATE_EPOCH)
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString();
  return new Date().toISOString();
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
}

export function loadBrands() {
  return readJson("data/brands.json");
}

export function brandMap(brands = loadBrands()) {
  return new Map(brands.map((brand) => [brand.slug, brand]));
}

export function loadManifest(slug) {
  const file = path.join("src", slug, "manifest.json");
  return fs.existsSync(file) ? readJson(file) : null;
}

export function loadSources(slug) {
  const file = path.join("src", slug, "sources.json");
  return fs.existsSync(file) ? readJson(file) : [];
}

export function loadQaRecords() {
  if (!fs.existsSync("qa/visual-approvals.json")) return new Map();
  const approvals = readJson("qa/visual-approvals.json");
  return new Map(
    (approvals.records || []).map((record) => [record.asset, record]),
  );
}

export function loadReferenceRecords() {
  const file = "data/reference-sources/vehicleimagery-coverage.json";
  if (!fs.existsSync(file))
    return { source: null, retrievedAt: null, brands: [] };
  return readJson(file);
}

export function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function referenceMap(
  referenceData = loadReferenceRecords(),
  brands = loadBrands(),
) {
  const refs = referenceData.brands || [];
  const bySlug = new Map(refs.map((ref) => [ref.slug, ref]));
  const byNormalized = new Map(
    refs.map((ref) => [normalizeSlug(ref.name || ref.slug), ref]),
  );
  const out = new Map();
  for (const brand of brands) {
    let match =
      bySlug.get(brand.slug) || byNormalized.get(normalizeSlug(brand.name));
    if (!match) {
      for (const alias of brand.aliases || []) {
        match = byNormalized.get(normalizeSlug(alias));
        if (match) break;
      }
    }
    if (match) out.set(brand.slug, match);
  }
  return out;
}

export function sourceMapForBrand(slug) {
  return new Map(loadSources(slug).map((source) => [source.id, source]));
}

export function manifestEntry(manifest, mark, mode) {
  return manifest?.assets?.[mark]?.[mode] || null;
}

export function svgMetadata(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  const meta = { sha256: sha256(text), bytes: Buffer.byteLength(text) };
  try {
    const { root } = parseSvg(text, file);
    meta.viewBox = parseViewBox(root.getAttribute("viewBox"), file);
    const title = root.getElementsByTagName("title")[0];
    const desc = root.getElementsByTagName("desc")[0];
    meta.title = title?.textContent || null;
    meta.desc = desc?.textContent || null;
  } catch (error) {
    meta.error = error.message;
  }
  return meta;
}

export function assetRows({ brands = loadBrands(), brandSlug = null } = {}) {
  const qa = loadQaRecords();
  const refs = referenceMap(loadReferenceRecords(), brands);
  const selected = brandSlug
    ? brands.filter((brand) => brand.slug === brandSlug)
    : brands;
  const rows = [];
  for (const brand of selected) {
    const manifest = loadManifest(brand.slug);
    const sources = sourceMapForBrand(brand.slug);
    const reference = refs.get(brand.slug) || null;
    for (const mark of MARK_TYPES)
      for (const mode of COLOUR_MODES) {
        const key = `${brand.slug}/${mark}/${mode}`;
        const file = canonicalPath(brand.slug, mark, mode);
        const entry = manifestEntry(manifest, mark, mode);
        const qaRecord = qa.get(key) || null;
        const sourceRecord = entry?.sourceId
          ? sources.get(entry.sourceId) || null
          : null;
        const canonicalExists = fs.existsSync(file);
        const row = {
          brandSlug: brand.slug,
          brandName: brand.name,
          mark,
          mode,
          assetKey: key,
          canonicalPath: file,
          canonicalExists,
          canonical: canonicalExists ? svgMetadata(file) : null,
          manifestStatus:
            entry?.status || (canonicalExists ? "present" : "missing"),
          manifestEntry: entry,
          sourceRecord,
          qaRecord,
          referenceCandidate: reference,
          issues: [],
        };
        row.confidence = computeConfidence(row);
        rows.push(row);
      }
  }
  return rows;
}

export function computeConfidence(row) {
  const signals = [];
  const warnings = [];
  if (row.manifestStatus === "blocked" || row.qaRecord?.status === "blocked") {
    return { score: 0, tier: "blocked", signals: ["blocked"], warnings };
  }
  if (!row.canonicalExists) {
    if (row.qaRecord?.status === "approved")
      warnings.push("qa-approved-but-canonical-missing");
    return { score: 0, tier: "missing", signals, warnings };
  }
  let score = 10;
  signals.push("canonical-present");
  if (row.manifestEntry?.sourceId) {
    score += 10;
    signals.push("manifest-source-id");
  } else warnings.push("missing-manifest-source-id");
  if (row.sourceRecord?.checksumSha256) {
    score += 10;
    signals.push("checksum-recorded");
  } else warnings.push("missing-source-checksum");
  if (row.sourceRecord?.evidencePath) {
    score += 5;
    signals.push("evidence-recorded");
  }
  const kind = row.sourceRecord?.sourceKind || "";
  if (kind.includes("official") || kind.includes("manufacturer")) {
    score += 35;
    signals.push("official-source");
  } else if (kind.includes("vehicleimagery")) {
    score += 10;
    warnings.push("vehicleimagery-reference-source-needs-current-brand-review");
  } else if (kind) {
    score += 5;
    warnings.push(`non-official-source:${kind}`);
  } else warnings.push("missing-source-record");
  if (row.qaRecord?.status === "approved") {
    score += 30;
    signals.push("qa-approved");
    if (!row.qaRecord.referenceChecksumSha256)
      warnings.push("approved-qa-missing-reference-checksum");
    if (!row.qaRecord.reviewer) warnings.push("approved-qa-missing-reviewer");
    if (!row.qaRecord.approvedAt)
      warnings.push("approved-qa-missing-approvedAt");
    if (row.qaRecord.pixelTolerance !== 0)
      warnings.push("approved-qa-pixelTolerance-not-zero");
  } else if (row.qaRecord?.status === "review-fallback") {
    score += 5;
    signals.push("qa-review-fallback");
    warnings.push("not-production-approved");
  } else warnings.push("missing-qa-record");
  if (row.manifestEntry?.derivedFrom) {
    score -= 5;
    warnings.push("derived-asset");
  }
  const tier =
    score >= 90
      ? "approved"
      : score >= 70
        ? "high"
        : score >= 40
          ? "medium"
          : "low";
  return { score: Math.max(0, score), tier, signals, warnings };
}

export function summarizeRows(rows) {
  const summary = {
    expectedCanonical: rows.length,
    canonicalPresent: rows.filter((row) => row.canonicalExists).length,
    approvedAssets: rows.filter((row) => row.qaRecord?.status === "approved")
      .length,
    reviewFallbackAssets: rows.filter(
      (row) => row.qaRecord?.status === "review-fallback",
    ).length,
    blockedAssets: rows.filter(
      (row) =>
        row.manifestStatus === "blocked" || row.qaRecord?.status === "blocked",
    ).length,
    missingAssets: rows.filter(
      (row) =>
        !row.canonicalExists &&
        row.manifestStatus !== "blocked" &&
        row.qaRecord?.status !== "blocked",
    ).length,
    confidence: {},
  };
  for (const row of rows)
    summary.confidence[row.confidence.tier] =
      (summary.confidence[row.confidence.tier] || 0) + 1;
  summary.generatedExpected =
    summary.canonicalPresent * Object.keys(RATIOS).length;
  return summary;
}

export function changedBrands({ base = "origin/main" } = {}) {
  let output = "";
  try {
    output = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      encoding: "utf8",
    });
  } catch {
    return [];
  }
  const brands = new Set();
  for (const file of output.split("\n").filter(Boolean)) {
    const match = file.match(/^src\/([^/]+)\//);
    if (match) brands.add(match[1]);
    if (file === "qa/visual-approvals.json")
      return loadBrands()
        .map((brand) => brand.slug)
        .filter((slug) =>
          assetRows({ brandSlug: slug }).some((row) => row.qaRecord),
        );
  }
  return [...brands].sort();
}

export function failUnknownBrand(slug, brands = loadBrands()) {
  if (!slug || slug === "all") return;
  if (!brands.some((brand) => brand.slug === slug)) {
    throw new Error(`unknown brand slug: ${slug}`);
  }
}

export function escapeMd(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}
