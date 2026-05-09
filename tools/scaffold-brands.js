#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { MARK_TYPES } from './config.js';
import { ensureDir, readJson } from './lib.js';

for (const brand of readJson('data/brands.json')) {
  const dir = path.join('src', brand.slug);
  for (const mark of MARK_TYPES) {
    const markDir = path.join(dir, mark);
    ensureDir(markDir);
    const keepFile = path.join(markDir, '.gitkeep');
    if (!fs.existsSync(keepFile)) fs.writeFileSync(keepFile, '');
  }
  const manifest = path.join(dir, 'manifest.json');
  const sources = path.join(dir, 'sources.json');
  if (!fs.existsSync(manifest)) {
    fs.writeFileSync(manifest, JSON.stringify({
      slug: brand.slug,
      name: brand.name,
      status: 'scaffolded',
      assets: { logo: {}, badge: {}, wordmark: {} },
      exceptions: []
    }, null, 2) + '\n');
  }
  if (!fs.existsSync(sources)) fs.writeFileSync(sources, '[]\n');
}
console.log('scaffold complete');
