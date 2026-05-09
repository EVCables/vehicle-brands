#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { MARK_TYPES, COLOUR_MODES } from './config.js';
import { canonicalPath, ensureDir, parseSvg, parseViewBox, readJson, sha256 } from './lib.js';
import { validateSvgText } from './validate-assets.js';

const TODAY = process.env.SOURCE_DATE || new Date().toISOString().slice(0, 10);
const CLASSIFICATION_TO_MARK = {
  'likely-badge': 'badge',
  'likely-logo-lockup': 'logo',
  'likely-wordmark': 'wordmark'
};
const REVIEW_RISK = new Set([
  'kia', 'jaguar', 'peugeot', 'renault', 'citroen', 'dacia', 'skoda', 'volkswagen', 'nissan',
  'buick', 'cadillac', 'lotus', 'mini', 'smart', 'vauxhall', 'land-rover', 'range-rover',
  'mercedes', 'kgm', 'gwm', 'ora', 'omoda', 'jaecoo', 'changan', 'deepal', 'hummer', 'ds',
  'cupra', 'seat', 'fisker', 'karma', 'mia', 'mercury', 'oldsmobile', 'plymouth', 'pontiac',
  'saab', 'saturn', 'scion'
]);

const brands = readJson('data/brands.json');
const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
const refs = readJson('data/reference-sources/vehicleimagery-coverage.json').brands || [];
const qaPath = 'qa/visual-approvals.json';
const qa = readJson(qaPath);
const qaByAsset = new Map((qa.records || []).map((record) => [record.asset, record]));
let imported = 0;
let blocked = 0;
let skipped = 0;
const evidenceLines = [
  '# Vehicle Imagery fallback import — 2026-05-09',
  '',
  'This batch used Vehicle Imagery SVGs as review-fallback candidate geometry only. Assets are **not** marked approved.',
  '',
  'Policy guardrails:',
  '- Motomarks image payloads were not used or committed.',
  '- Vehicle Imagery source SVGs are treated as third-party reference candidates, not official brand approval.',
  '- Only the most likely mark slot from aspect-ratio classification was populated; other mark types were blocked rather than invented.',
  '- Black/white variants are derived fallback treatments and require replacement by official monochrome/reversed assets before production approval.',
  '',
  '## Imported references',
  '',
  '| Brand | Classification | Populated mark | Source | Notes |',
  '|---|---|---|---|---|'
];

for (const ref of refs) {
  const slug = mapRefSlug(ref.slug);
  const brand = brandBySlug.get(slug);
  if (!brand) { skipped += 1; continue; }
  const mark = CLASSIFICATION_TO_MARK[ref.markClassification];
  if (!mark) { skipped += 1; continue; }
  const manifestPath = path.join('src', slug, 'manifest.json');
  const sourcesPath = path.join('src', slug, 'sources.json');
  const manifest = readJson(manifestPath);
  const sources = readJson(sourcesPath);
  const sourceId = `vehicleimagery-${slug}-${mark}-${TODAY}`;
  if (!sources.some((source) => source.id === sourceId)) {
    sources.push({
      id: sourceId,
      assetTypes: [mark],
      url: ref.sourceUrl,
      retrievedAt: TODAY,
      sourceKind: 'vehicleimagery-reference-svg-review-fallback',
      licenceNotes: 'Vehicle Imagery SVG used as review-fallback candidate geometry only; replace with official manufacturer SVG before marking approved.',
      checksumSha256: null,
      evidencePath: `docs/evidence/vehicleimagery-fallback-import-${TODAY}.md`,
      notes: `Reference classification ${ref.markClassification}; upstream filename does not prove mark semantics. Current-brand review required.`
    });
  }
  const sourceRecord = sources.find((source) => source.id === sourceId);
  const fetched = await fetchSvg(ref.sourceUrl);
  sourceRecord.checksumSha256 = sha256(fetched);
  const variants = {
    colour: canonicalizeSvg(fetched, brand.name, mark, 'colour', null),
    black: canonicalizeSvg(fetched, brand.name, mark, 'black', '#000000'),
    white: canonicalizeSvg(fetched, brand.name, mark, 'white', '#ffffff')
  };
  for (const mode of COLOUR_MODES) {
    const dest = canonicalPath(slug, mark, mode);
    if (fs.existsSync(dest)) { skipped += 1; continue; }
    ensureDir(path.dirname(dest));
    validateSvgText(variants[mode], dest);
    fs.writeFileSync(dest, variants[mode]);
    manifest.assets[mark][mode] = { path: dest, sourceId };
    if (mode !== 'colour') manifest.assets[mark][mode].derivedFrom = `${mark}/colour`;
    upsertQa({
      asset: `${slug}/${mark}/${mode}`,
      status: 'review-fallback',
      referenceUrl: ref.sourceUrl,
      notes: `${brand.name} ${mark} ${mode} imported from Vehicle Imagery as a review-fallback candidate; current-brand official-source QA required before approval.${mode === 'colour' ? '' : ' Monochrome/reversed treatment is derived fallback.'}`
    });
    imported += 1;
  }
  for (const otherMark of MARK_TYPES.filter((candidate) => candidate !== mark)) {
    for (const mode of COLOUR_MODES) {
      if (fs.existsSync(canonicalPath(slug, otherMark, mode))) continue;
      if (manifest.assets[otherMark][mode]?.status) continue;
      manifest.assets[otherMark][mode] = {
        status: 'blocked',
        note: `Vehicle Imagery supplied a ${ref.markClassification} candidate used for ${mark}; no verified current ${otherMark} ${mode} SVG source found in this bulk pass.`
      };
      upsertQa({
        asset: `${slug}/${otherMark}/${mode}`,
        status: 'blocked',
        referenceUrl: ref.sourceUrl,
        notes: `Blocked in bulk fallback pass: no verified standalone ${otherMark} ${mode} SVG source found; do not invent from ${mark} candidate.`
      });
      blocked += 1;
    }
  }
  manifest.status = 'partial';
  if (!manifest.exceptions.some((exception) => exception.type === 'vehicleimagery-review-fallback')) {
    manifest.exceptions.push({
      type: 'vehicleimagery-review-fallback',
      note: 'Vehicle Imagery candidate imported as review-fallback only; requires official/current-brand QA before production approval.'
    });
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
  evidenceLines.push(`| ${brand.name} | ${ref.markClassification} | ${mark} | ${ref.sourceUrl} | ${REVIEW_RISK.has(slug) ? 'High rebrand/currentness risk; fallback only.' : 'Fallback only; official current-brand review required.'} |`);
}
qa.records = [...qaByAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset));
fs.writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
evidenceLines.push('', '## Summary', '', `- Imported fallback SVG assets: ${imported}`, `- Blocked non-invented mark/mode slots: ${blocked}`, `- Skipped existing or unmatched records: ${skipped}`, '', '## Next step', '', 'Replace review-fallback assets brand-by-brand with official manufacturer SVG packages or verified current-brand sources before marking anything approved.');
fs.writeFileSync(`docs/evidence/vehicleimagery-fallback-import-${TODAY}.md`, `${evidenceLines.join('\n')}\n`);
console.log(`imported ${imported} fallback assets, blocked ${blocked} non-invented slots, skipped ${skipped}`);

function mapRefSlug(slug) {
  if (slug === 'mercedes-benz') return 'mercedes';
  return slug;
}

async function fetchSvg(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'vehicle-brands-svg-pipeline/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.includes('<svg')) throw new Error(`${url}: response is not SVG`);
  return text;
}

function canonicalizeSvg(svg, brandName, mark, mode, monochrome) {
  const { doc, root } = parseSvg(svg, `${brandName}-${mark}-${mode}`);
  removeUnsafe(root);
  const vb = parseViewBox(root.getAttribute('viewBox'), `${brandName}-${mark}-${mode}`);
  const serializer = new XMLSerializer();
  let children = '';
  for (let i = 0; i < root.childNodes.length; i += 1) {
    const node = root.childNodes[i];
    if (node.nodeType === 1 && ['title', 'desc', 'metadata'].includes(node.tagName)) continue;
    if (monochrome && node.nodeType === 1) forceMonochrome(node, monochrome);
    children += serializer.serializeToString(node);
  }
  const safeName = escapeXml(brandName);
  const title = `${safeName} ${mark} ${mode}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.minX} ${vb.minY} ${vb.width} ${vb.height}" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${safeName} ${mark} ${mode} SVG imported as a Vehicle Imagery review-fallback candidate; current official brand QA required before approval.</desc>
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
        const attr = child.attributes.item(j);
        const name = attr.name.toLowerCase();
        const value = attr.value.toLowerCase();
        if (name.startsWith('on') || ((name === 'href' || name === 'xlink:href') && (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('data:image/')))) child.removeAttribute(attr.name);
      }
      removeUnsafe(child);
    }
  }
}

function forceMonochrome(node, colour) {
  if (node.nodeType !== 1) return;
  const tag = node.tagName.toLowerCase();
  if (!['svg', 'g', 'defs', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc'].includes(tag)) {
    if (node.getAttribute('fill') !== 'none') node.setAttribute('fill', colour);
    if (node.getAttribute('stroke') && node.getAttribute('stroke') !== 'none') node.setAttribute('stroke', colour);
    if (node.getAttribute('style')) {
      let style = node.getAttribute('style');
      style = style.replace(/fill\s*:\s*[^;]+/gi, `fill:${colour}`).replace(/stroke\s*:\s*[^;]+/gi, `stroke:${colour}`);
      node.setAttribute('style', style);
    }
  }
  for (let i = 0; i < node.childNodes.length; i += 1) forceMonochrome(node.childNodes[i], colour);
}

function upsertQa(record) {
  if (qaByAsset.has(record.asset)) {
    const existing = qaByAsset.get(record.asset);
    if (existing.status === 'approved') return;
  }
  qaByAsset.set(record.asset, record);
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
