#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COVERAGE_URL = "https://vehicleimagery.com/coverage";
const OUT_DIR = path.join(ROOT, "data", "reference-sources");
const OUT_FILE = path.join(OUT_DIR, "vehicleimagery-coverage.json");

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function classifyByAspect(width, height) {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (ratio >= 3) return "likely-wordmark";
  if (ratio >= 1.7) return "likely-logo-lockup";
  return "likely-badge";
}

function parseViewBox(svg) {
  const match = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  const parts = match[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "@evcables/vehicle-brands reference discovery" },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const html = await fetchText(COVERAGE_URL);
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map(
    (match) => match[0],
  );
  const seen = new Set();
  const brands = [];

  for (const tag of imageTags) {
    const altMatch = tag.match(/\balt=["']([^"']+)["']/i);
    const srcMatch = tag.match(/\bsrc=["'](\/manufactures\/[^"']+\.svg)["']/i);
    if (!altMatch || !srcMatch) continue;
    const alt = altMatch[1];
    const src = srcMatch[1];
    const sourceUrl = new URL(src, COVERAGE_URL).href;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);

    let svgStatus = "not-fetched";
    let viewBox = null;
    let classification = "unknown";
    try {
      const svg = await fetchText(sourceUrl);
      svgStatus = "ok";
      viewBox = parseViewBox(svg);
      classification = viewBox
        ? classifyByAspect(viewBox.width, viewBox.height)
        : "unknown";
    } catch (error) {
      svgStatus = error.message;
    }

    brands.push({
      name: alt,
      slug: slugify(alt),
      sourceUrl,
      sourceKind: "vehicleimagery-coverage-svg-reference",
      markClassification: classification,
      svgStatus,
      viewBox,
      notes:
        "Reference only. Upstream filename does not prove logo/badge/wordmark semantics; review current-brand correctness before importing SVG geometry.",
    });
  }

  brands.sort((a, b) => a.slug.localeCompare(b.slug));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    `${JSON.stringify(
      {
        source: COVERAGE_URL,
        retrievedAt: new Date().toISOString().slice(0, 10),
        policy:
          "Reference URLs and metadata only; no SVG payloads or raster assets are stored in this file.",
        brands,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `wrote ${brands.length} Vehicle Imagery reference records to ${path.relative(ROOT, OUT_FILE)}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
