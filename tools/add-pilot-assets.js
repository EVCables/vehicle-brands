#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { siAudi, siTesla, siPeugeot } from 'simple-icons';
import { ensureDir, parseSvg, parseViewBox, serializeChildren, sha256 } from './lib.js';

const PILOT_SOURCES = {
  audi: {
    badge: { kind: 'simple-icon', icon: siAudi, sourceUrl: siAudi.source, note: 'Simple Icons Audi mark, source points to Audi CI rings page.' },
    logo: { kind: 'simple-icon', icon: siAudi, sourceUrl: 'https://styleguide.audi.com', note: 'Audi official styleguide identifies the rings as the primary brand mark; duplicated as logo and badge pending official separated full-logo guidance.' }
  },
  tesla: {
    logo: { kind: 'file-part', file: 'tmp/source/Tesla Motors.svg', part: 'all', sourceUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tesla%20Motors.svg', note: 'Wikimedia Commons fallback full Tesla logo containing badge and wordmark.' },
    badge: { kind: 'file-part', file: 'tmp/source/Tesla Motors.svg', part: 'badge', sourceUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tesla%20Motors.svg', note: 'Badge extracted from the same fallback SVG.' },
    wordmark: { kind: 'file-part', file: 'tmp/source/Tesla Motors.svg', part: 'wordmark', sourceUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Tesla%20Motors.svg', note: 'Wordmark extracted from the same fallback SVG.' }
  },
  peugeot: {
    badge: { kind: 'simple-icon', icon: siPeugeot, sourceUrl: siPeugeot.source, note: 'Simple Icons Peugeot mark, source points to Peugeot official site.', blockedModes: { black: 'Blocked during pixel-perfect QA: generated black shield/border was not official/pixel-perfect. Requires official Peugeot vector reference before emitting black badge.' } },
    wordmark: { kind: 'file', file: 'tmp/source/Peugeot logo.svg', sourceUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot%20logo.svg', note: 'Wikimedia Commons fallback Peugeot wordmark.' },
    logo: { kind: 'composite-peugeot', sourceUrl: 'composite from Simple Icons Peugeot and Commons Peugeot wordmark', note: 'Generated pilot composite to exercise full-logo path; replace with official combined logo when sourced.' }
  }
};

const MODES = {
  colour: null,
  black: '#000000',
  white: '#ffffff'
};

const BRAND_NAMES = { audi: 'Audi', tesla: 'Tesla', peugeot: 'Peugeot' };
const COLOUR_HEX = { audi: '#BB0A30', tesla: '#E82127', peugeot: '#000000' };

for (const marks of Object.values(PILOT_SOURCES)) {
  for (const source of Object.values(marks)) {
    if (source.file) await ensureSourceFile(source.file, source.sourceUrl);
  }
}

for (const [brand, marks] of Object.entries(PILOT_SOURCES)) {
  const manifest = JSON.parse(fs.readFileSync(`src/${brand}/manifest.json`, 'utf8'));
  manifest.status = 'partial';
  manifest.assets = { logo: {}, badge: {}, wordmark: {} };
  cleanGeneratedCanonicalSvgs(brand);
  manifest.exceptions = [
    {
      type: 'pilot-fallback-assets',
      note: 'Pilot assets are review fallbacks to validate the pipeline. Replace with official manufacturer media-kit/brand-portal SVGs before production use.'
    }
  ];
  if (brand === 'audi') {
    manifest.exceptions.push({
      type: 'wordmark-blocked-by-qa',
      note: 'Removed the previous Audi wordmark fallback during QA: it rendered as an inaccurate/cropped third-party text mark. Audi styleguide source reviewed on 2026-05-08 points to the rings as the primary brand mark; keep wordmark empty until an official Audi wordmark/vector source is identified.'
    });
  }
  if (brand === 'peugeot') {
    manifest.exceptions.push({
      type: 'badge-black-blocked-by-pixel-qa',
      note: 'Removed the generated Peugeot black badge during pixel-perfect QA: the border/crest geometry was not official/pixel-perfect. Keep black badge absent until an official Peugeot vector reference is sourced.'
    });
  }
  const sources = [];

  for (const [mark, source] of Object.entries(marks)) {
    const sourceId = `${brand}-${mark}-pilot-fallback-2026-05-08`;
    for (const [mode, overrideFill] of Object.entries(MODES)) {
      if (source.blockedModes?.[mode]) {
        manifest.assets[mark][mode] = { status: 'blocked', reason: source.blockedModes[mode] };
        continue;
      }
      const svg = buildSvg({ brand, brandName: BRAND_NAMES[brand], mark, mode, source, overrideFill });
      const out = `src/${brand}/${mark}/${mode}.svg`;
      ensureDir(path.dirname(out));
      fs.writeFileSync(out, svg);
      manifest.assets[mark][mode] = mode === 'colour'
        ? { path: out, sourceId }
        : { path: out, derivedFrom: `src/${brand}/${mark}/colour.svg` };
    }
    sources.push({
      id: sourceId,
      assetTypes: [mark],
      url: source.sourceUrl,
      retrievedAt: '2026-05-08',
      sourceKind: source.sourceUrl.includes('commons.wikimedia.org') ? 'third-party-review-fallback' : source.kind === 'composite-peugeot' ? 'generated-review-fallback' : 'third-party-with-official-source-reference',
      licenceNotes: 'Vehicle trademarks remain property of their owners. Pilot fallback pending official review.',
      checksumSha256: sha256(JSON.stringify(source)),
      notes: source.note
    });
  }
  fs.writeFileSync(`src/${brand}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(`src/${brand}/sources.json`, JSON.stringify(sources, null, 2) + '\n');
}

function cleanGeneratedCanonicalSvgs(brand) {
  for (const mark of ['logo', 'badge', 'wordmark']) {
    for (const mode of Object.keys(MODES)) {
      const file = `src/${brand}/${mark}/${mode}.svg`;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
  }
}

async function ensureSourceFile(file, url) {
  if (fs.existsSync(file)) return;
  ensureDir(path.dirname(file));
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'vehicle-brands-pilot-assets/0.1 (+https://github.com/EVCables/vehicle-brands)' }
  });
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
  fs.writeFileSync(file, await response.text());
}

function buildSvg({ brand, brandName, mark, mode, source, overrideFill }) {
  let viewBox = '0 0 24 24';
  let body = '';
  const colour = overrideFill || COLOUR_HEX[brand] || '#000000';
  if (source.kind === 'simple-icon') {
    viewBox = '0 0 24 24';
    body = `<path fill="${colour}" d="${source.icon.path}"/>`;
  } else if (source.kind === 'file') {
    const raw = fs.readFileSync(source.file, 'utf8');
    const { root } = parseSvg(raw, source.file);
    viewBox = normalizeViewBox(root.getAttribute('viewBox') || root.getAttribute('viewbox') || '0 0 100 100');
    body = recolour(serializeChildren(root), colour);
  } else if (source.kind === 'file-part') {
    const raw = fs.readFileSync(source.file, 'utf8');
    if (source.part === 'all') {
      const { root } = parseSvg(raw, source.file);
      viewBox = normalizeViewBox(root.getAttribute('viewBox'));
      body = recolour(serializeChildren(root), colour);
    } else if (source.part === 'wordmark') {
      viewBox = '0 320 278.672 45';
      body = recolour(raw.match(/<g fill="#e82127">[\s\S]*?<\/g>/)?.[0] || '', colour);
    } else if (source.part === 'badge') {
      viewBox = '0 0 278.672 320';
      const groups = raw.match(/<g fill="#e82127">[\s\S]*?<\/g>/g) || [];
      body = recolour(groups[1] || groups[0] || '', colour);
    }
  } else if (source.kind === 'composite-peugeot') {
    const wordRaw = fs.readFileSync('tmp/source/Peugeot logo.svg', 'utf8');
    const { root } = parseSvg(wordRaw, 'tmp/source/Peugeot logo.svg');
    const wordBody = recolour(serializeChildren(root), colour);
    body = `<g transform="translate(0 2) scale(3.2)"><path fill="${colour}" d="${siPeugeot.path}"/></g><g transform="translate(92 11) scale(1.8)">${wordBody}</g>`;
    viewBox = '0 0 430 90';
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title desc">\n  <title id="title">${brandName} ${mark} ${mode}</title>\n  <desc id="desc">Pilot normalized ${mode} ${mark} SVG for ${brandName}; review fallback pending official source confirmation.</desc>\n  <g id="artwork">\n    ${body}\n  </g>\n</svg>\n`;
}

function recolour(svg, fill) {
  return svg
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/\sfill="[^"]*"/gi, ` fill="${fill}"`)
    .replace(/\sstyle="[^"]*fill:[^;"]*;?([^"]*)"/gi, ` fill="${fill}"`)
    .replace(/<g(?![^>]*fill=)/gi, `<g fill="${fill}"`)
    .replace(/<path(?![^>]*fill=)/gi, `<path fill="${fill}"`);
}

function normalizeViewBox(viewBox) {
  parseViewBox(viewBox);
  return viewBox.trim().replace(/,/g, ' ');
}


