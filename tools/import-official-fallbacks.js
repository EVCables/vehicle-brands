#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { XMLSerializer } from '@xmldom/xmldom';
import { COLOUR_MODES, MARK_TYPES } from './config.js';
import { canonicalPath, ensureDir, parseSvg, parseViewBox, readJson, sha256 } from './lib.js';
import { validateSvgText } from './validate-assets.js';

const TODAY = process.env.SOURCE_DATE || new Date().toISOString().slice(0, 10);
const URL_SOURCES = [
  { slug: 'byd', mark: 'logo', url: 'https://www.byd.com/static_material/byd/overseas/public-icon/logo.svg', sourceKind: 'official-manufacturer-svg-review-fallback' },
  { slug: 'xpeng', mark: 'logo', url: 'https://a-cdn.xpeng.com//website/_next/static/media/logo-white.be6f83f5.svg', sourceKind: 'official-manufacturer-svg-review-fallback' }
];
const INLINE_SOURCES = [
  { slug: 'geely', mark: 'logo', pageUrl: 'https://global.geely.com/', match: /<svg width="1339" height="125"[\s\S]*?<\/svg>/i, sourceKind: 'official-manufacturer-inline-svg-review-fallback' }
];
const brands = readJson('data/brands.json');
const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
const qaPath = 'qa/visual-approvals.json';
const qa = readJson(qaPath);
const qaByAsset = new Map((qa.records || []).map((record) => [record.asset, record]));
const evidence = ['# Official-source fallback import — 2026-05-09', '', 'Official website/vector sources imported as review-fallback pending visual approval.', '', '| Brand | Mark | Source | Notes |', '|---|---|---|---|'];
let imported = 0;
let blocked = 0;
for (const item of URL_SOURCES) {
  const res = await fetch(item.url, { headers: { 'user-agent': 'vehicle-brands-svg-pipeline/1.0' } });
  if (!res.ok) throw new Error(`${item.url}: HTTP ${res.status}`);
  await importSvg({ ...item, svg: await res.text(), evidenceUrl: item.url });
}
for (const item of INLINE_SOURCES) {
  const res = await fetch(item.pageUrl, { headers: { 'user-agent': 'Mozilla/5.0 vehicle-brands-svg-pipeline/1.0' } });
  if (!res.ok) throw new Error(`${item.pageUrl}: HTTP ${res.status}`);
  const html = await res.text();
  const match = html.match(item.match);
  if (!match) throw new Error(`${item.slug}: inline SVG not found`);
  await importSvg({ ...item, url: `${item.pageUrl}#inline-logo-svg`, svg: match[0], evidenceUrl: item.pageUrl });
}
qa.records = [...qaByAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset));
fs.writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
evidence.push('', '## Summary', '', `- Imported fallback SVG assets: ${imported}`, `- Blocked non-invented mark/mode slots: ${blocked}`);
fs.writeFileSync(`docs/evidence/official-fallback-import-${TODAY}.md`, `${evidence.join('\n')}\n`);
console.log(`imported ${imported} official fallback assets, blocked ${blocked} slots`);

async function importSvg(item) {
  const brand = brandBySlug.get(item.slug);
  if (!brand) return;
  const manifestPath = path.join('src', item.slug, 'manifest.json');
  const sourcesPath = path.join('src', item.slug, 'sources.json');
  const manifest = readJson(manifestPath);
  const sources = readJson(sourcesPath);
  const sourceId = `official-fallback-${item.slug}-${item.mark}-${TODAY}`;
  if (!sources.some((source) => source.id === sourceId)) sources.push({ id: sourceId, assetTypes: [item.mark], url: item.url, retrievedAt: TODAY, sourceKind: item.sourceKind, licenceNotes: 'Official manufacturer SVG/inline SVG used as review-fallback pending visual QA; vehicle trademarks remain property of their owners.', checksumSha256: sha256(item.svg), evidencePath: `docs/evidence/official-fallback-import-${TODAY}.md`, notes: 'Official-source candidate imported quickly for bulk coverage; requires visual/current-brand approval before production approved status.' });
  const variants = { colour: canonicalizeSvg(item.svg, brand.name, item.mark, 'colour', null), black: canonicalizeSvg(item.svg, brand.name, item.mark, 'black', '#000000'), white: canonicalizeSvg(item.svg, brand.name, item.mark, 'white', '#ffffff') };
  for (const mode of COLOUR_MODES) {
    const dest = canonicalPath(item.slug, item.mark, mode);
    if (fs.existsSync(dest)) continue;
    ensureDir(path.dirname(dest));
    validateSvgText(variants[mode], dest);
    fs.writeFileSync(dest, variants[mode]);
    manifest.assets[item.mark][mode] = { path: dest, sourceId };
    if (mode !== 'colour') manifest.assets[item.mark][mode].derivedFrom = `${item.mark}/colour`;
    upsertQa({ asset: `${item.slug}/${item.mark}/${mode}`, status: 'review-fallback', referenceUrl: item.evidenceUrl, notes: `${brand.name} ${item.mark} ${mode} imported from official source as review-fallback; named visual approval still required.` });
    imported += 1;
  }
  for (const otherMark of MARK_TYPES.filter((mark) => mark !== item.mark)) for (const mode of COLOUR_MODES) {
    if (fs.existsSync(canonicalPath(item.slug, otherMark, mode))) continue;
    if (manifest.assets[otherMark][mode]?.status) continue;
    manifest.assets[otherMark][mode] = { status: 'blocked', note: `Official fallback populated ${item.mark}; no verified standalone ${otherMark} ${mode} SVG source found in this bulk pass.` };
    upsertQa({ asset: `${item.slug}/${otherMark}/${mode}`, status: 'blocked', referenceUrl: item.evidenceUrl, notes: `Blocked in official-source fallback pass: no verified standalone ${otherMark} ${mode} SVG source found.` });
    blocked += 1;
  }
  manifest.status = 'partial';
  if (!manifest.exceptions.some((exception) => exception.type === 'official-source-review-fallback')) manifest.exceptions.push({ type: 'official-source-review-fallback', note: 'Official source candidate imported as review-fallback only; named visual QA required before approval.' });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
  evidence.push(`| ${brand.name} | ${item.mark} | ${item.evidenceUrl} | Review-fallback only pending visual approval. |`);
}
function canonicalizeSvg(svg, brandName, mark, mode, monochrome) {
  const { root } = parseSvg(svg, `${brandName}-${mark}-${mode}`);
  if (!root.getAttribute('viewBox')) {
    const width = parseFloat(String(root.getAttribute('width') || '').replace(/px$/, ''));
    const height = parseFloat(String(root.getAttribute('height') || '').replace(/px$/, ''));
    if (Number.isFinite(width) && Number.isFinite(height)) root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  const vb = parseViewBox(root.getAttribute('viewBox'), `${brandName}-${mark}-${mode}`);
  const serializer = new XMLSerializer();
  let children = '';
  for (let i = 0; i < root.childNodes.length; i += 1) {
    const node = root.childNodes[i];
    if (node.nodeType === 1 && ['title', 'desc', 'metadata'].includes(node.tagName)) continue;
    if (node.nodeType === 1 && monochrome) forceMonochrome(node, monochrome);
    children += serializer.serializeToString(node);
  }
  const safeName = escapeXml(brandName);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.minX} ${vb.minY} ${vb.width} ${vb.height}" role="img" aria-labelledby="title desc">
  <title id="title">${safeName} ${mark} ${mode}</title>
  <desc id="desc">${safeName} ${mark} ${mode} SVG imported from an official source as a review-fallback candidate pending visual approval.</desc>
  <g id="artwork">
    ${children.trim()}
  </g>
</svg>
`;
}
function forceMonochrome(node, colour) {
  if (node.nodeType !== 1) return;
  const tag = node.tagName.toLowerCase();
  if (!['svg', 'g', 'defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc'].includes(tag)) {
    if (node.getAttribute('fill') !== 'none') node.setAttribute('fill', colour);
    if (node.getAttribute('stroke') && node.getAttribute('stroke') !== 'none') node.setAttribute('stroke', colour);
    if (node.getAttribute('style')) node.setAttribute('style', node.getAttribute('style').replace(/fill\s*:\s*[^;]+/gi, `fill:${colour}`).replace(/stroke\s*:\s*[^;]+/gi, `stroke:${colour}`));
  }
  for (let i = 0; i < node.childNodes.length; i += 1) forceMonochrome(node.childNodes[i], colour);
}
function upsertQa(record) { if (!qaByAsset.has(record.asset) || qaByAsset.get(record.asset).status !== 'approved') qaByAsset.set(record.asset, record); }
function escapeXml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
