#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { COLOUR_MODES, MARK_TYPES } from './config.js';
import { readJson } from './lib.js';

const approvalsFile = 'qa/visual-approvals.json';
const approvals = readJson(approvalsFile);
const records = new Map();
const errors = [];

function fail(message) { errors.push(message); }
function exists(file) { return fs.existsSync(file); }

if (!Array.isArray(approvals.records)) fail(`${approvalsFile}: records must be an array`);
for (const record of approvals.records || []) {
  if (!record.asset || typeof record.asset !== 'string') fail(`${approvalsFile}: record missing asset`);
  if (records.has(record.asset)) fail(`${approvalsFile}: duplicate record ${record.asset}`);
  records.set(record.asset, record);
  if (!['approved', 'review-fallback', 'blocked'].includes(record.status)) fail(`${record.asset}: invalid visual QA status ${record.status}`);
  if (!record.referenceUrl) fail(`${record.asset}: missing referenceUrl`);
  if (!record.notes) fail(`${record.asset}: missing notes`);
  if (record.status === 'approved') {
    if (!record.reviewer) fail(`${record.asset}: approved assets require reviewer`);
    if (!record.approvedAt) fail(`${record.asset}: approved assets require approvedAt`);
    if (!record.referenceChecksumSha256) fail(`${record.asset}: approved assets require referenceChecksumSha256`);
    if (!record.pixelTolerance || Number(record.pixelTolerance) > 0) fail(`${record.asset}: approved assets require pixelTolerance of 0 for pixel-perfect approval`);
  }
}

const brands = readJson('data/brands.json');
for (const brand of brands) {
  const manifest = readJson(path.join('src', brand.slug, 'manifest.json'));
  for (const mark of MARK_TYPES) {
    for (const mode of COLOUR_MODES) {
      const assetKey = `${brand.slug}/${mark}/${mode}`;
      const canonicalPath = path.join('src', brand.slug, mark, `${mode}.svg`);
      const record = records.get(assetKey);
      const manifestEntry = manifest.assets?.[mark]?.[mode];
      if (exists(canonicalPath)) {
        if (!record) fail(`${assetKey}: present canonical SVG has no visual QA record`);
        else if (record.status === 'blocked') fail(`${assetKey}: canonical SVG exists but visual QA status is blocked`);
      } else if (record?.status === 'approved') {
        fail(`${assetKey}: visual QA approved but canonical SVG is missing`);
      }
      if (manifestEntry?.status === 'blocked' && record?.status !== 'blocked') {
        fail(`${assetKey}: manifest marks blocked but visual QA record is not blocked`);
      }
    }
  }
}

for (const file of collectDistSvgs('dist')) {
  const parts = file.split(path.sep);
  // dist/{brand}/{mark}/{mode}/{ratio}.svg must have matching src/{brand}/{mark}/{mode}.svg
  const [, brand, mark, mode] = parts;
  if (!exists(path.join('src', brand, mark, `${mode}.svg`))) fail(`${file}: generated dist SVG has no matching canonical source`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`visual QA metadata validated (${records.size} records)`);

function collectDistSvgs(dir) {
  if (!exists(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectDistSvgs(child));
    else if (entry.isFile() && child.endsWith('.svg')) files.push(child);
  }
  return files;
}
