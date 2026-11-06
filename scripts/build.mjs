// Builds dist/: the ATS-safe CV PDF and the portfolio site.
//   npm run build
// Then verifies the PDF text layer is clean, since that is what ATS parsers read.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const profile = JSON.parse(await readFile(path.join(root, 'profile.json'), 'utf8'));
const PDF_NAME = 'Alex_Bui_CV.pdf';

// Fill or drop every [data-optional="key"] element from profile.json.
function applyProfile(p) {
  for (const el of document.querySelectorAll('[data-optional]')) {
    const url = p[el.dataset.optional];
    if (!url) { el.remove(); continue; }
    const a = el.matches('a') ? el : el.querySelector('a');
    if (a) {
      a.href = url;
      if (a.dataset.showUrl !== undefined || el.closest('.contact')) a.textContent = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    }
    el.removeAttribute('data-optional');
  }
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const browser = await chromium.launch();
try {
  // 1. CV PDF
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, 'cv/cv.html')).href, { waitUntil: 'networkidle' });
  await page.evaluate(applyProfile, profile);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(dist, PDF_NAME),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,   // accessible structure tree (headings, lists) for parsers and screen readers
    outline: true,
  });

  // 2. Site: apply the profile with JS off, so the saved HTML is the clean source, not a post-animation DOM.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const sp = await ctx.newPage();
  await sp.goto(pathToFileURL(path.join(root, 'site/index.html')).href);
  // evaluate still works with page JS disabled
  await sp.evaluate(applyProfile, profile);
  const html = '<!doctype html>\n' + await sp.evaluate(() => document.documentElement.outerHTML);
  await writeFile(path.join(dist, 'index.html'), html);
  await cp(path.join(root, 'site/assets'), path.join(dist, 'assets'), { recursive: true });
  await cp(path.join(dist, PDF_NAME), path.join(dist, 'assets', PDF_NAME));
} finally {
  await browser.close();
}

// 3. Verify the PDF text layer.
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(path.join(dist, PDF_NAME))) }).promise;
let text = '';
for (let i = 1; i <= doc.numPages; i++) {
  const c = await (await doc.getPage(i)).getTextContent();
  text += c.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join('') + '\n\f';
}
await writeFile(path.join(dist, 'Alex_Bui_CV.extracted.txt'), text);

const must = ['Summary', 'Skills', 'Experience', 'Projects', 'Education', 'quocanh.job@gmail.com',
  'Angular', 'React Native', 'Flutter', 'Go (Golang)', 'TypeScript', 'CloudStorm Ventures', 'FPT Software'];
const lower = text.toLowerCase();
const missing = must.filter(k => !lower.includes(k.toLowerCase()));
const odd = [...new Set(text.match(/[^\x09-\x0d\x20-\x7e–·\f]/g) || [])];
console.log(`PDF: ${doc.numPages} page(s), ${text.length} chars extracted`);
console.log(missing.length ? `MISSING keywords: ${missing.join(', ')}` : 'All key sections and keywords extract as plain text.');
console.log(odd.length ? `Unusual characters in text layer: ${odd.join(' ')}` : 'No unusual characters in text layer.');
if (missing.length || doc.numPages > 2) process.exitCode = 1;
