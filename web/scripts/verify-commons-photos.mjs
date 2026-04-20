#!/usr/bin/env node
/**
 * Ensures every wmPhoto() filename in build-route.mjs exists on Wikimedia Commons
 * and returns image/* MIME (via MediaWiki API). Run after editing photos:
 *   npm run verify:photos
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(__dirname, 'build-route.mjs');
const UA = 'TripPlanCommonsVerify/1.0 (https://github.com/; photo filename check)';

const src = fs.readFileSync(BUILD, 'utf8');
const files = new Set();
for (const re of [/wmPhoto\(\s*'([^']+)'/g, /wmPhoto\(\s*"([^"]+)"/g]) {
  let m;
  while ((m = re.exec(src))) files.add(m[1]);
}

function api(params) {
  const q = new URLSearchParams({ format: 'json', ...params });
  return new Promise((resolve, reject) => {
    https
      .get('https://commons.wikimedia.org/w/api.php?' + q, { headers: { 'User-Agent': UA } }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error('Invalid JSON from Commons API'));
          }
        });
      })
      .on('error', reject);
  });
}

const titles = [...files].map((f) => 'File:' + f);
const bad = [];

for (let i = 0; i < titles.length; i += 45) {
  const chunk = titles.slice(i, i + 45);
  const data = await api({
    action: 'query',
    titles: chunk.join('|'),
    prop: 'imageinfo',
    iiprop: 'mime',
  });
  const pages = data.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const mime = page.imageinfo?.[0]?.mime;
    if (page.missing || !mime || !mime.startsWith('image/')) {
      bad.push(page.title?.replace(/^File:/, '') ?? JSON.stringify(page));
    }
  }
}

console.log(`Checked ${files.size} unique Commons filenames from build-route.mjs`);
if (bad.length) {
  console.error('Missing or not an image file on Commons:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('OK — all filenames resolve to images on Wikimedia Commons');
