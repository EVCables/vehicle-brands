#!/usr/bin/env node
import fs from 'node:fs';
import { COLOUR_MODES, MARK_TYPES, RATIOS } from './config.js';
import { canonicalPath, readJson } from './lib.js';

const brands = readJson('data/brands.json');
let canonical = 0;
for (const brand of brands) for (const mark of MARK_TYPES) for (const mode of COLOUR_MODES) {
  if (fs.existsSync(canonicalPath(brand.slug, mark, mode))) canonical += 1;
}
const expectedCanonical = brands.length * MARK_TYPES.length * COLOUR_MODES.length;
const expectedGenerated = canonical * Object.keys(RATIOS).length;
console.log(`# Completeness Report
`);
console.log(`- Brands: ${brands.length}`);
console.log(`- Canonical SVGs present: ${canonical}/${expectedCanonical}`);
console.log(`- Generated SVGs expected from present canonical assets: ${expectedGenerated}`);
console.log(`
| Brand | Status | Canonical SVGs |`);
console.log(`|---|---:|---:|`);
for (const brand of brands) {
  let count = 0;
  for (const mark of MARK_TYPES) for (const mode of COLOUR_MODES) if (fs.existsSync(canonicalPath(brand.slug, mark, mode))) count += 1;
  const status = count === 9 ? 'complete' : count ? 'partial' : 'scaffolded';
  console.log(`| ${brand.name} | ${status} | ${count}/9 |`);
}
