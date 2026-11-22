// Checks the Visuals page, outside the browser. Run by `npm run check`, after tools/check-lessons.mjs. Writes nothing.
//
// - The answer book (tools/visuals-answers.mjs) builds: every .dax file of the page's app code sends exactly the
//   text a saved answer in data/catalog.json was captured with, and the four years add up to all years.
// - Every query the app code can send has an answer: each .dax file, and the slicer's query for every set of years.
// - Every number the page's text quotes from the data (such as "$60,466,772" or "55.9%") is in a saved answer,
//   so a new snapshot that changes a number fails here instead of leaving the old one on the page.
// - The page list (src/visuals/pages.mjs) and the page definitions agree, and its course links name real lessons.
// - The page's code type-checks (src/visuals/tsconfig.json).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildAnswers } from './visuals-answers.mjs';
import { COURSE_LINKS, VISUAL_IDS } from '../src/visuals/pages.mjs';
import { lessons } from '../src/lesson-list.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const visuals = join(root, 'src/visuals');
const sales = join(visuals, 'app/queries/sales');
const shell = join(visuals, 'shell');
const norm = (s) => s.replace(/\r\n/g, '\n').trim();

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

console.log('visuals page');

// ---------------------------------------------------------------- the answer book
let book;
try {
  book = buildAnswers(root);
} catch (e) {
  fail(`answers: ${e.message}`);
}
if (book) {
  if (!book.check.yearsSumToAllYears) fail(`answers: the four years don't add up to all years (largest difference ${book.check.largestDifference})`);
  const answered = new Set(book.entries.map((e) => e.query));
  const daxFiles = readdirSync(sales).filter((f) => f.endsWith('.dax'));
  for (const f of daxFiles) {
    const text = norm(readFileSync(join(sales, f), 'utf8'));
    if (!text.includes('__YEARS__')) {
      if (!answered.has(text)) fail(`answers: no saved answer for ${f}`);
      continue;
    }
    // The slicer's query: every set of years it can send.
    const years = [2023, 2024, 2025, 2026];
    for (let mask = 1; mask < 1 << years.length; mask++) {
      const ys = years.filter((_, i) => mask & (1 << i));
      if (!answered.has(text.replace('__YEARS__', ys.join(', ')))) fail(`answers: no answer for ${f} with ${ys.join(', ')}`);
    }
  }
  console.log(`   ${book.entries.length} answers (${book.entries.filter((e) => e.source.kind === 'saved').length} saved), ${daxFiles.length} .dax files`);

  // ---------------------------------------------------------------- numbers quoted in the text
  const values = book.entries.flatMap((e) => e.table.rows.flat()).filter((v) => typeof v === 'number');
  const has = (test) => values.some(test);
  const quoted = [];
  for (const f of readdirSync(shell).filter((x) => x.endsWith('.tsx'))) {
    // Code spans hold formats and code (`$#,0`, `0.0%`), not data.
    const text = readFileSync(join(shell, f), 'utf8').replace(/<code>[^<]*<\/code>/g, '');
    for (const [m] of text.matchAll(/\$\d{1,3}(?:,\d{3}){2,}/g)) {
      quoted.push(m);
      const n = Number(m.slice(1).replace(/,/g, ''));
      if (!has((v) => Math.round(v) === n)) fail(`${f}: ${m} is not in any saved answer`);
    }
    for (const [m, n] of text.matchAll(/\$(\d+\.\d\d)M\b/g)) {
      quoted.push(m);
      if (!has((v) => (v / 1e6).toFixed(2) === n)) fail(`${f}: ${m} is not in any saved answer`);
    }
    for (const [m, n] of text.matchAll(/\b(\d+\.\d)%/g)) {
      quoted.push(m);
      if (!has((v) => Math.abs(v) <= 1 && (v * 100).toFixed(1) === n)) fail(`${f}: ${m} is not in any saved answer`);
    }
    for (const [m] of text.matchAll(/\b0\.\d{6,}\b/g)) {
      quoted.push(m);
      // as the chart's tooltip shows it, rounded
      if (!has((v) => v.toFixed(m.length - 2) === m)) fail(`${f}: ${m} is not in any saved answer`);
    }
  }
  console.log(`   ${quoted.length} numbers quoted from the data`);
}

// ---------------------------------------------------------------- pages and course links
{
  if (new Set(VISUAL_IDS).size !== VISUAL_IDS.length) fail('pages.mjs: duplicate visual id');
  const defs = ['visuals.tsx', 'visuals-gallery.tsx'].flatMap((f) =>
    [...readFileSync(join(shell, f), 'utf8').matchAll(/^ {4}id: '([\w-]+)',$/gm)].map((m) => m[1]),
  );
  for (const id of VISUAL_IDS) if (defs.filter((d) => d === id).length !== 1) fail(`pages.mjs: ${id} has ${defs.filter((d) => d === id).length} page definitions (should be 1)`);
  for (const d of defs) if (!VISUAL_IDS.includes(d)) fail(`page ${d} is not in pages.mjs`);
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const [id, c] of Object.entries(COURSE_LINKS)) {
    if (!VISUAL_IDS.includes(id)) fail(`pages.mjs: course link for unknown visual ${id}`);
    const l = byId.get(c.lesson);
    if (!l) fail(`pages.mjs: ${id} links to unknown lesson ${c.lesson}`);
    else if (l.title !== c.title) fail(`pages.mjs: ${id} links to "${c.title}", but lesson ${c.lesson} is called "${l.title}"`);
  }
}

// ---------------------------------------------------------------- types
{
  const configPath = join(visuals, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, visuals);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diags = ts.getPreEmitDiagnostics(program);
  for (const d of diags) {
    const where = d.file ? `${d.file.fileName.replace(/^.*src\/visuals\//, 'src/visuals/')}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}` : 'tsconfig';
    fail(`types: ${where}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
  }
  console.log(`   ${parsed.fileNames.length} files type-checked`);
}

console.log(failures ? `\nvisuals page: ${failures} failure(s)` : '\nvisuals page: all checks passed');
process.exit(failures ? 1 : 0);
