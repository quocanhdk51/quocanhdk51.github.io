// Renders the CV pages and the site (desktop + mobile, several scroll points) to PNGs for visual review.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'shots');
await mkdir(out, { recursive: true });
const b = await chromium.launch();
// CV pages: emulate print and screenshot each A4 page
const cv = await b.newPage({ viewport: { width: 794, height: 1123 } });
await cv.goto(pathToFileURL(path.join(root, 'cv/cv.html')).href, { waitUntil: 'networkidle' });
await cv.emulateMedia({ media: 'print' });
await cv.screenshot({ path: path.join(out, 'cv-full.png'), fullPage: true });
const site = pathToFileURL(path.join(root, 'dist/index.html')).href;
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(site, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4200);
  const ids = ['top', 'about', 'work', 'experience', 'process', 'stack', 'contact'];
  for (const id of ids) {
    await p.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (id === 'work' ? 300 : 0)); }, id);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: path.join(out, `${name}-${id}.png`) });
  }
  if (name === 'desktop') { // mid horizontal scroll
    const y = await p.evaluate(() => document.getElementById('work').getBoundingClientRect().top + scrollY + innerHeight * 1.8);
    await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(2200);
    await p.screenshot({ path: path.join(out, `${name}-work2.png`) });
    const y2 = await p.evaluate(() => document.getElementById('work').getBoundingClientRect().top + scrollY + innerHeight * 3.2);
    await p.evaluate(y => scrollTo(0, y), y2); await p.waitForTimeout(2200);
    await p.screenshot({ path: path.join(out, `${name}-work3.png`) });
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'errors:', errs.length ? errs : 'none', '| horizontal overflow px:', overflow);
}
await b.close();
