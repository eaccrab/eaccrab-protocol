// Zero-dependency static build. Output: dist/ (this is the folder that gets dragged to Cloudflare).
import { cp, rm, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// empty dist/ without removing the folder itself (a running static server may hold it open on Windows)
await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist)) await rm(path.join(dist, entry), { recursive: true, force: true });
await cp(path.join(root, 'src'), dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });

// ---- verification: fail the build on anything the brief forbids ----
const fail = (m) => { console.error('BUILD CHECK FAILED: ' + m); process.exit(1); };
for (const f of ['index.html', 'favicon.svg', 'css/styles.css', 'js/main.js', 'brand/crab-512.png', '_headers']) {
  if (!existsSync(path.join(dist, f))) fail('missing dist/' + f);
}
const fav = await readFile(path.join(dist, 'favicon.svg'), 'utf8');
if (fav.includes('--')) fail('favicon.svg contains a double hyphen');
if (/<!--/.test(fav)) fail('favicon.svg contains an XML comment');

async function* walk(d) {
  for (const e of await readdir(d)) {
    const p = path.join(d, e);
    if ((await stat(p)).isDirectory()) yield* walk(p); else yield p;
  }
}
// no visible dates or timestamps in markup shipped to the page
const dateRe = /\b(19|20)\d{2}[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/;
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
if (dateRe.test(html)) fail('index.html contains a date');
let files = 0;
for await (const p of walk(dist)) {
  files++;
  if (/CLAUDE\.md$/i.test(p)) fail('repo hygiene: ' + p);
}
console.log('dist/ ready: ' + files + ' files');
