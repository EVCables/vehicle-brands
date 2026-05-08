#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { COLOUR_MODES, MARK_TYPES, RATIOS, SAFE_AREA } from './config.js';
import { canonicalPath, ensureDir, parseSvg, parseViewBox, readJson, serializeChildren } from './lib.js';

const brands = readJson('data/brands.json');
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
let generated = 0;

for (const brand of brands) {
  for (const mark of MARK_TYPES) {
    for (const mode of COLOUR_MODES) {
      const source = canonicalPath(brand.slug, mark, mode);
      if (!fs.existsSync(source)) continue;
      const svg = fs.readFileSync(source, 'utf8');
      const { root } = parseSvg(svg, source);
      const sourceBox = parseViewBox(root.getAttribute('viewBox'), source);
      const artwork = serializeChildren(root);
      for (const [ratio, artboard] of Object.entries(RATIOS)) {
        const safe = SAFE_AREA[mark] ?? SAFE_AREA.logo;
        const maxW = artboard.width * safe.width;
        const maxH = artboard.height * safe.height;
        const scale = Math.min(maxW / sourceBox.width, maxH / sourceBox.height);
        const scaledW = sourceBox.width * scale;
        const scaledH = sourceBox.height * scale;
        const x = (artboard.width - scaledW) / 2 - sourceBox.minX * scale;
        const y = (artboard.height - scaledH) / 2 - sourceBox.minY * scale;
        const title = `${brand.name} ${mark} ${mode} ${ratio}`;
        const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${artboard.width} ${artboard.height}" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">Generated padded ${ratio} web variant from canonical ${brand.name} ${mark} ${mode} SVG.</desc>
  <g id="artboard" transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})">
    <g id="artwork">
      ${artwork}
    </g>
  </g>
</svg>
`;
        const dest = path.join('dist', brand.slug, mark, mode, `${ratio}.svg`);
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, out);
        generated += 1;
      }
    }
  }
}
console.log(`generated ${generated} ratio SVGs`);
function round(n) { return Number.parseFloat(n.toFixed(6)); }
