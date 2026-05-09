#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { MARK_TYPES, COLOUR_MODES } from './config.js';
import { canonicalPath, ensureDir, parseSvg, parseViewBox, readJson, sha256 } from './lib.js';
import { validateSvgText } from './validate-assets.js';

const TODAY = process.env.SOURCE_DATE || new Date().toISOString().slice(0, 10);
const CANDIDATES = [
  { slug: 'dacia', simpleSlug: 'dacia', mark: 'logo' },
  { slug: 'ds', simpleSlug: 'dsautomobiles', mark: 'logo' },
  { slug: 'mg', simpleSlug: 'mg', mark: 'logo' },
  { slug: 'tata', simpleSlug: 'tata', mark: 'logo' }
];
const brands = readJson('data/brands.json');
const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
const qaPath = 'qa/visual-approvals.json';
const qa = readJson(qaPath);
const qaByAsset = new Map((qa.records || []).map((record) => [record.asset, record]));
let imported = 0;
let blocked = 0;
const evidenceLines = [
  '# Simple Icons fallback import — 2026-05-09',
  '',
  'This batch used Simple Icons SVGs as review-fallback candidate geometry for brands not covered by Vehicle Imagery. Assets are **not** approved.',
  '',
  '| Brand | Populated mark | Source | Notes |',
  '|---|---|---|---|'
];

for (const item of CANDIDATES) {
  const brand = brandBySlug.get(item.slug);
  if (!brand) continue;
  const url = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${item.simpleSlug}.svg`;
  const fetched = await fetchSvg(url);
  const manifestPath = path.join('src', item.slug, 'manifest.json');
  const sourcesPath = path.join('src', item.slug, 'sources.json');
  const manifest = readJson(manifestPath);
  const sources = readJson(sourcesPath);
  const sourceId = `simpleicons-${item.slug}-${item.mark}-${TODAY}`;
  if (!sources.some((source) => source.id === sourceId)) {
    sources.push({
      id: sourceId,
      assetTypes: [item.mark],
      url,
      retrievedAt: TODAY,
      sourceKind: 'simple-icons-svg-review-fallback',
      licenceNotes: 'Simple Icons SVG used as review-fallback candidate geometry under its published licence; replace with official manufacturer SVG before approval.',
      checksumSha256: sha256(fetched),
      evidencePath: `docs/evidence/simpleicons-fallback-import-${TODAY}.md`,
      notes: 'Fallback for brands without Vehicle Imagery reference coverage; current-brand and mark-type review required.'
    });
  }
  const variants = {
    colour: canonicalizeSvg(fetched, brand.name, item.mark, 'colour', null),
    black: canonicalizeSvg(fetched, brand.name, item.mark, 'black', '#000000'),
    white: canonicalizeSvg(fetched, brand.name, item.mark, 'white', '#ffffff')
  };
  for (const mode of COLOUR_MODES) {
    const dest = canonicalPath(item.slug, item.mark, mode);
    if (fs.existsSync(dest)) continue;
    ensureDir(path.dirname(dest));
    validateSvgText(variants[mode], dest);
    fs.writeFileSync(dest, variants[mode]);
    manifest.assets[item.mark][mode] = { path: dest, sourceId };
    if (mode !== 'colour') manifest.assets[item.mark][mode].derivedFrom = `${item.mark}/colour`;
    upsertQa({ asset: `${item.slug}/${item.mark}/${mode}`, status: 'review-fallback', referenceUrl: url, notes: `${brand.name} ${item.mark} ${mode} imported from Simple Icons as review-fallback candidate; official-source QA required before approval.` });
    imported += 1;
  }
  for (const otherMark of MARK_TYPES.filter((mark) => mark !== item.mark)) {
    for (const mode of COLOUR_MODES) {
      if (fs.existsSync(canonicalPath(item.slug, otherMark, mode))) continue;
      if (manifest.assets[otherMark][mode]?.status) continue;
      manifest.assets[otherMark][mode] = { status: 'blocked', note: `Simple Icons fallback populated ${item.mark}; no verified standalone ${otherMark} ${mode} SVG source found in this bulk pass.` };
      upsertQa({ asset: `${item.slug}/${otherMark}/${mode}`, status: 'blocked', referenceUrl: url, notes: `Blocked in Simple Icons fallback pass: no verified standalone ${otherMark} ${mode} SVG source found; do not invent from ${item.mark} candidate.` });
      blocked += 1;
    }
  }
  manifest.status = 'partial';
  if (!manifest.exceptions.some((exception) => exception.type === 'simple-icons-review-fallback')) manifest.exceptions.push({ type: 'simple-icons-review-fallback', note: 'Simple Icons candidate imported as review-fallback only; requires official/current-brand QA before production approval.' });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
  evidenceLines.push(`| ${brand.name} | ${item.mark} | ${url} | Review-fallback only; official manufacturer source required for approval. |`);
}
qa.records = [...qaByAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset));
fs.writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
evidenceLines.push('', '## Summary', '', `- Imported fallback SVG assets: ${imported}`, `- Blocked non-invented mark/mode slots: ${blocked}`);
fs.writeFileSync(`docs/evidence/simpleicons-fallback-import-${TODAY}.md`, `${evidenceLines.join('\n')}\n`);
console.log(`imported ${imported} Simple Icons fallback assets, blocked ${blocked} slots`);

async function fetchSvg(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'vehicle-brands-svg-pipeline/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}
function canonicalizeSvg(svg, brandName, mark, mode, monochrome) {
  const { root } = parseSvg(svg, `${brandName}-${mark}-${mode}`);
  const vb = parseViewBox(root.getAttribute('viewBox'), `${brandName}-${mark}-${mode}`);
  const serializer = new XMLSerializer();
  let children = '';
  for (let i = 0; i < root.childNodes.length; i += 1) {
    const node = root.childNodes[i];
    if (node.nodeType === 1 && ['title', 'desc', 'metadata'].includes(node.tagName)) continue;
    if (node.nodeType === 1) forceMonochrome(node, monochrome || '#000000');
    children += serializer.serializeToString(node);
  }
  const safeName = escapeXml(brandName);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.minX} ${vb.minY} ${vb.width} ${vb.height}" role="img" aria-labelledby="title desc">
  <title id="title">${safeName} ${mark} ${mode}</title>
  <desc id="desc">${safeName} ${mark} ${mode} SVG imported as a Simple Icons review-fallback candidate; official brand QA required before approval.</desc>
  <g id="artwork">
    ${children.trim()}
  </g>
</svg>
`;
}
function forceMonochrome(node, colour) {
  if (node.nodeType !== 1) return;
  const tag = node.tagName.toLowerCase();
  if (!['svg', 'g', 'defs', 'clipPath', 'mask', 'title', 'desc'].includes(tag)) {
    if (node.getAttribute('fill') !== 'none') node.setAttribute('fill', colour);
    if (node.getAttribute('stroke') && node.getAttribute('stroke') !== 'none') node.setAttribute('stroke', colour);
  }
  for (let i = 0; i < node.childNodes.length; i += 1) forceMonochrome(node.childNodes[i], colour);
}
function upsertQa(record) { if (!qaByAsset.has(record.asset) || qaByAsset.get(record.asset).status !== 'approved') qaByAsset.set(record.asset, record); }
function escapeXml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
