#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import fg from 'fast-glob';
import { COLOUR_MODES, MARK_TYPES, RATIOS } from './config.js';
import { canonicalPath, parseSvg, parseViewBox, readJson } from './lib.js';

function exists(file) {
  return fs.existsSync(file);
}

export function validateSvgText(svg, file = 'svg') {
  const lowered = svg.toLowerCase();
  const forbidden = [
    /<script\b/,
    /on[a-z]+\s*=/,
    /<foreignobject\b/,
    /<image\b/,
    /xlink:href\s*=\s*["']https?:/,
    /href\s*=\s*["']https?:/,
    /data:image\//
  ];
  for (const pattern of forbidden) {
    if (pattern.test(lowered)) throw new Error(`${file}: forbidden SVG content: ${pattern}`);
  }
  const { root } = parseSvg(svg, file);
  if (root.getAttribute('xmlns') !== 'http://www.w3.org/2000/svg') throw new Error(`${file}: missing SVG xmlns`);
  parseViewBox(root.getAttribute('viewBox'), file);
  if (root.getAttribute('role') !== 'img') throw new Error(`${file}: missing role=img`);
  if (!root.getElementsByTagName('title').length) throw new Error(`${file}: missing title`);
  if (!root.getElementsByTagName('desc').length) throw new Error(`${file}: missing desc`);
}

export function validateRepository({ strict = false } = {}) {
  const ajv = new Ajv2020({ allErrors: true });
  const validateManifestSchema = ajv.compile(readJson('data/manifest.schema.json'));
  const validateSourcesSchema = ajv.compile(readJson('data/sources.schema.json'));
  const errors = [];
  const fail = (message) => errors.push(message);

  const brands = readJson('data/brands.json');
  const slugs = new Set();
  for (const brand of brands) {
    if (slugs.has(brand.slug)) fail(`duplicate brand slug: ${brand.slug}`);
    slugs.add(brand.slug);
    const brandDir = path.join('src', brand.slug);
    if (!exists(brandDir)) fail(`${brand.slug}: missing src folder`);
    for (const mark of MARK_TYPES) if (!exists(path.join(brandDir, mark))) fail(`${brand.slug}: missing ${mark} folder`);

    const manifestFile = path.join(brandDir, 'manifest.json');
    const sourcesFile = path.join(brandDir, 'sources.json');
    if (!exists(manifestFile)) fail(`${brand.slug}: missing manifest.json`);
    else {
      const manifest = readJson(manifestFile);
      if (!validateManifestSchema(manifest)) fail(`${brand.slug}: manifest schema ${ajv.errorsText(validateManifestSchema.errors)}`);
      if (manifest.slug !== brand.slug) fail(`${brand.slug}: manifest slug mismatch`);
    }
    if (!exists(sourcesFile)) fail(`${brand.slug}: missing sources.json`);
    else if (!validateSourcesSchema(readJson(sourcesFile))) fail(`${brand.slug}: sources schema ${ajv.errorsText(validateSourcesSchema.errors)}`);

    for (const mark of MARK_TYPES) for (const mode of COLOUR_MODES) {
      const file = canonicalPath(brand.slug, mark, mode);
      if (exists(file)) {
        try { validateSvgText(fs.readFileSync(file, 'utf8'), file); }
        catch (error) { fail(error.message); }
      } else if (strict) fail(`${brand.slug}: missing ${mark}/${mode}.svg`);
    }
  }

  for (const file of fg.sync('dist/**/*.svg')) {
    try {
      const svg = fs.readFileSync(file, 'utf8');
      validateSvgText(svg, file);
      const ratio = path.basename(file, '.svg');
      if (RATIOS[ratio]) {
        const { root } = parseSvg(svg, file);
        const vb = parseViewBox(root.getAttribute('viewBox'), file);
        if (vb.width !== RATIOS[ratio].width || vb.height !== RATIOS[ratio].height) {
          fail(`${file}: expected ${RATIOS[ratio].width}x${RATIOS[ratio].height} viewBox`);
        }
      }
    } catch (error) { fail(error.message); }
  }
  return { errors, brandCount: brands.length };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const strict = process.argv.includes('--strict');
  const result = validateRepository({ strict });
  if (result.errors.length) {
    console.error(result.errors.map((e) => `- ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`validated ${result.brandCount} brands${strict ? ' in strict mode' : ''}`);
}
