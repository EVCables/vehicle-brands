#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson } from './lib.js';

const [slugArg, urlArg] = process.argv.slice(2);
if (!slugArg) {
  console.error('Usage: npm run discover -- <brand-slug> [url]');
  process.exit(1);
}
const brand = readJson('data/brands.json').find((b) => b.slug === slugArg);
if (!brand) throw new Error(`Unknown brand slug: ${slugArg}`);
const startUrl = urlArg || brand.officialWebsite;
const response = await fetch(startUrl, {
  redirect: 'follow',
  headers: {
    'user-agent': 'Mozilla/5.0 vehicle-brands-source-discovery/0.1 (+https://github.com/EVCables/vehicle-brands)'
  }
});
const html = await response.text();
const candidates = new Set();
const patterns = [/["'()]([^"'()]*?(?:logo|brand|badge|icon|symbol|wordmark|emblem)[^"'()]*?\.svg(?:\?[^"'()]*)?)/gi, /["'()]([^"'()]*?\.svg(?:\?[^"'()]*)?)/gi];
for (const pattern of patterns) {
  for (const match of html.matchAll(pattern)) {
    try { candidates.add(new URL(match[1], response.url).toString()); } catch {}
  }
}
const date = new Date().toISOString().slice(0, 10);
ensureDir('docs/evidence');
const out = path.join('docs', 'evidence', `${brand.slug}-${date}.md`);
fs.writeFileSync(out, `# ${brand.name} source discovery - ${date}

- Start URL: ${startUrl}
- Final URL: ${response.url}
- HTTP status: ${response.status}
- Candidate SVG count: ${candidates.size}

## Candidates

${[...candidates].sort().map((u) => `- ${u}`).join('\\n')}\n`);
console.log(out);
