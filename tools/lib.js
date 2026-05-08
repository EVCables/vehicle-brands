import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function parseSvg(svg, file = 'svg') {
  const doc = new DOMParser({ errorHandler: { warning: null, error: null } }).parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.tagName !== 'svg') throw new Error(`${file}: root element must be <svg>`);
  return { doc, root };
}

export function parseViewBox(viewBox, file = 'svg') {
  if (!viewBox) throw new Error(`${file}: missing viewBox`);
  const parts = viewBox.trim().split(/[ ,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`${file}: invalid viewBox ${viewBox}`);
  }
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

export function serializeChildren(root) {
  const serializer = new XMLSerializer();
  let out = '';
  for (let i = 0; i < root.childNodes.length; i += 1) {
    const node = root.childNodes[i];
    if (node.nodeType === 1 && ['title', 'desc'].includes(node.tagName)) continue;
    out += serializer.serializeToString(node);
  }
  return out.trim();
}

export function canonicalPath(brand, mark, mode) {
  return path.join('src', brand, mark, `${mode}.svg`);
}
