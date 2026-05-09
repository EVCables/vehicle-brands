#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { XMLSerializer } from '@xmldom/xmldom';
import { COLOUR_MODES, MARK_TYPES } from './config.js';
import { canonicalPath, ensureDir, parseSvg, parseViewBox, readJson, sha256 } from './lib.js';
import { validateSvgText } from './validate-assets.js';

const TODAY = process.env.SOURCE_DATE || new Date().toISOString().slice(0, 10);
const ENTRIES = [
  { slug: 'alpine', mark: 'logo', url: 'https://cdn.worldvectorlogo.com/logos/alpine-4.svg', sourceKind: 'worldvectorlogo-svg-review-fallback', note: 'Alpine fallback SVG from public logo catalogue; current-brand visual review required.' },
  { slug: 'changan', mark: 'badge', url: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Changan_icon.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Changan icon fallback from Wikimedia Commons.' },
  { slug: 'deepal', mark: 'logo', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Deepal_global_logo.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Deepal global logo fallback from Wikimedia Commons.' },
  { slug: 'gwm', mark: 'logo', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/GWM_2025_logo.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'GWM 2025 logo fallback from Wikimedia Commons.' },
  { slug: 'jaecoo', mark: 'wordmark', url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Jaecoo_wordmark.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Jaecoo wordmark fallback from Wikimedia Commons.' },
  { slug: 'karma', mark: 'logo', url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Karma_Automomotive_logo_2021.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Karma full logo fallback; filename has upstream typo Automomotive.' },
  { slug: 'karma', mark: 'wordmark', url: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Karma_Automomotive_textlogo_2D_2021.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Karma text logo fallback; filename has upstream typo Automomotive.' },
  { slug: 'kgm', mark: 'wordmark', url: 'https://www.kg-mobility.com/images/cm/icons/icon-logo.svg', sourceKind: 'official-manufacturer-svg-review-fallback', note: 'Official KGM website header/footer logo SVG.' },
  { slug: 'leapmotor', mark: 'wordmark', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Leapmotor_logo_en.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Standalone fallback; official site uses inline symbols in JS bundle.' },
  { slug: 'maxus', mark: 'wordmark', url: 'https://bluesky.sirv.com/Websites/Maxus/images/maxus-logo-black.svg', sourceKind: 'official-regional-site-svg-review-fallback', note: 'Referenced from SAIC Maxus UK official site via Sirv CDN.' },
  { slug: 'mia', mark: 'logo', url: 'https://cdn.worldvectorlogo.com/logos/mia.svg', sourceKind: 'worldvectorlogo-svg-review-fallback-low-confidence', note: 'Low-confidence Mia fallback; identity requires manual confirmation against Mia electric.' },
  { slug: 'omoda', mark: 'wordmark', url: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Omoda_wordmark.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Fallback because official Omoda/Jaecoo sources expose raster logos.' },
  { slug: 'ora', mark: 'wordmark', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Ora_logo.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Fallback because no official ORA SVG was found in this pass.' },
  { slug: 'range-rover', mark: 'wordmark', url: 'https://www.landrover.com/content/dam/lrdx/logo/Range_Rover_Black.svg.res/JLRHASH31FEE0248617BC78033AC5AB6FF581B72AC89F7E/Range_Rover_Black.svg', sourceKind: 'official-manufacturer-svg-review-fallback', note: 'Official Land Rover/JLR Range Rover wordmark SVG.' },
  { slug: 'rivian', mark: 'logo', url: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Rivian_logo.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Fallback standalone SVG; official legal brand page uses inline SVG.' },
  { slug: 'skywell', mark: 'logo', url: 'https://en.skywellev.com/static/img/logo_black.svg?v=v1', sourceKind: 'official-manufacturer-svg-review-fallback', note: 'Official Skywell EV global site logo SVG.' },
  { slug: 'vinfast', mark: 'logo', url: 'https://upload.wikimedia.org/wikipedia/commons/4/43/VinFast_logo_%28simple_variant%29.svg', sourceKind: 'wikimedia-commons-svg-review-fallback', note: 'Fallback simple variant because official VinFast press assets exposed raster logos in this pass.' }
];
const brands = readJson('data/brands.json');
const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
const qaPath = 'qa/visual-approvals.json';
const qa = readJson(qaPath);
const qaByAsset = new Map((qa.records || []).map((record) => [record.asset, record]));
const importedMarks = new Map();
let imported = 0;
let blocked = 0;
let skipped = 0;
const evidence = ['# Additional fallback import — 2026-05-09', '', 'This batch adds official/public SVG fallbacks for brands that remained at zero canonical coverage after the initial bulk import. Assets are review-fallback only.', '', '| Brand | Mark | Source | Source kind | Notes |', '|---|---|---|---|---|'];

for (const entry of ENTRIES) {
  const brand = brandBySlug.get(entry.slug);
  if (!brand) { skipped += 1; continue; }
  const allModesExist = COLOUR_MODES.every((mode) => fs.existsSync(canonicalPath(entry.slug, entry.mark, mode)));
  if (allModesExist) {
    for (const mode of COLOUR_MODES) upsertQa({ asset: `${entry.slug}/${entry.mark}/${mode}`, status: 'review-fallback', referenceUrl: entry.url, notes: `${brand.name} ${entry.mark} ${mode} imported as review-fallback from ${entry.sourceKind}; approval requires current-brand visual review.` });
    if (!importedMarks.has(entry.slug)) importedMarks.set(entry.slug, new Set());
    importedMarks.get(entry.slug).add(entry.mark);
    skipped += COLOUR_MODES.length;
    continue;
  }
  let svg;
  try { svg = await fetchSvg(entry.url); }
  catch (error) { console.warn(`skip ${entry.slug}: ${error.message}`); skipped += 1; continue; }
  const sourceId = `${entry.sourceKind.replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-${entry.slug}-${entry.mark}-${TODAY}`;
  const manifestPath = path.join('src', entry.slug, 'manifest.json');
  const sourcesPath = path.join('src', entry.slug, 'sources.json');
  const manifest = readJson(manifestPath);
  const sources = readJson(sourcesPath);
  if (!sources.some((source) => source.id === sourceId)) sources.push({ id: sourceId, assetTypes: [entry.mark], url: entry.url, retrievedAt: TODAY, sourceKind: entry.sourceKind, licenceNotes: 'SVG used as review-fallback candidate only; vehicle trademarks remain property of their owners.', checksumSha256: sha256(svg), evidencePath: `docs/evidence/additional-fallback-import-${TODAY}.md`, notes: entry.note });
  const variants = { colour: canonicalizeSvg(svg, brand.name, entry.mark, 'colour', null), black: canonicalizeSvg(svg, brand.name, entry.mark, 'black', '#000000'), white: canonicalizeSvg(svg, brand.name, entry.mark, 'white', '#ffffff') };
  for (const mode of COLOUR_MODES) {
    const dest = canonicalPath(entry.slug, entry.mark, mode);
    if (fs.existsSync(dest)) {
      upsertQa({ asset: `${entry.slug}/${entry.mark}/${mode}`, status: 'review-fallback', referenceUrl: entry.url, notes: `${brand.name} ${entry.mark} ${mode} imported as review-fallback from ${entry.sourceKind}; approval requires current-brand visual review.` });
      skipped += 1;
      continue;
    }
    ensureDir(path.dirname(dest));
    validateSvgText(variants[mode], dest);
    fs.writeFileSync(dest, variants[mode]);
    manifest.assets[entry.mark][mode] = { path: dest, sourceId };
    if (mode !== 'colour') manifest.assets[entry.mark][mode].derivedFrom = `${entry.mark}/colour`;
    upsertQa({ asset: `${entry.slug}/${entry.mark}/${mode}`, status: 'review-fallback', referenceUrl: entry.url, notes: `${brand.name} ${entry.mark} ${mode} imported as review-fallback from ${entry.sourceKind}; approval requires current-brand visual review.` });
    imported += 1;
  }
  if (!importedMarks.has(entry.slug)) importedMarks.set(entry.slug, new Set());
  importedMarks.get(entry.slug).add(entry.mark);
  manifest.status = 'partial';
  if (!manifest.exceptions.some((exception) => exception.type === 'additional-review-fallback')) manifest.exceptions.push({ type: 'additional-review-fallback', note: 'Additional official/public SVG fallback imported; requires current-brand QA before approval.' });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
  evidence.push(`| ${brand.name} | ${entry.mark} | ${entry.url} | ${entry.sourceKind} | ${entry.note} |`);
}
for (const [slug, marks] of importedMarks.entries()) {
  const brand = brandBySlug.get(slug);
  const manifestPath = path.join('src', slug, 'manifest.json');
  const manifest = readJson(manifestPath);
  const refUrl = ENTRIES.find((entry) => entry.slug === slug)?.url;
  for (const mark of MARK_TYPES.filter((candidate) => !marks.has(candidate))) for (const mode of COLOUR_MODES) {
    if (fs.existsSync(canonicalPath(slug, mark, mode))) continue;
    if (manifest.assets[mark][mode]?.status) continue;
    manifest.assets[mark][mode] = { status: 'blocked', note: `Additional fallback pass populated ${[...marks].join(', ')}; no verified standalone ${mark} ${mode} SVG source found.` };
    upsertQa({ asset: `${slug}/${mark}/${mode}`, status: 'blocked', referenceUrl: refUrl, notes: `Blocked in additional fallback pass: no verified standalone ${mark} ${mode} SVG source found; do not invent from available mark candidate.` });
    blocked += 1;
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
qa.records = [...qaByAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset));
fs.writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
evidence.push('', '## Summary', '', `- Imported fallback SVG assets: ${imported}`, `- Blocked non-invented mark/mode slots: ${blocked}`, `- Skipped existing assets/records: ${skipped}`);
fs.writeFileSync(`docs/evidence/additional-fallback-import-${TODAY}.md`, `${evidence.join('\n')}\n`);
console.log(`imported ${imported} additional fallback assets, blocked ${blocked}, skipped ${skipped}`);

async function fetchSvg(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 vehicle-brands-svg-pipeline/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.includes('<svg')) throw new Error(`${url}: not SVG`);
  return text;
}
function canonicalizeSvg(svg, brandName, mark, mode, monochrome) {
  const { root } = parseSvg(svg, `${brandName}-${mark}-${mode}`);
  if (!root.getAttribute('viewBox')) {
    const width = parseFloat(String(root.getAttribute('width') || '').replace(/px$/, ''));
    const height = parseFloat(String(root.getAttribute('height') || '').replace(/px$/, ''));
    if (Number.isFinite(width) && Number.isFinite(height)) root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  removeUnsafe(root);
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
  <desc id="desc">${safeName} ${mark} ${mode} SVG imported as a review-fallback candidate pending current-brand visual approval.</desc>
  <g id="artwork">
    ${children.trim()}
  </g>
</svg>
`;
}
function removeUnsafe(node) {
  for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
    const child = node.childNodes[i];
    if (child.nodeType === 1) {
      const tag = child.tagName.toLowerCase();
      if (['script', 'foreignobject', 'image'].includes(tag)) { node.removeChild(child); continue; }
      for (let j = child.attributes.length - 1; j >= 0; j -= 1) {
        const attr = child.attributes.item(j); const name = attr.name.toLowerCase(); const value = attr.value.toLowerCase();
        if (name.startsWith('on') || ((name === 'href' || name === 'xlink:href') && (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('data:image/')))) child.removeAttribute(attr.name);
      }
      removeUnsafe(child);
    }
  }
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
