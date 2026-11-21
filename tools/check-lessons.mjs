// Checks the course, outside the browser. `npm run check`. Writes nothing.
//
// First the course itself: every lesson in one module, links only to Microsoft Learn and rayfin.ai,
// glossary terms, knowledge-check questions and the steps they cite, no "lesson N" references.
//
// Then it builds the whole course from an empty folder, exactly as a reader with "Do it for me"
// would: terminal steps run through the simulated CLI (src/project.mjs), edit steps change the
// project's files. After every step it type-checks the whole project with TypeScript 6.0.3 (the
// version a Rayfin CLI 2.0.0 project installs), React 19 types, and the Rayfin package types the
// project has installed so far, in strict mode, and compares the number of errors with what the step
// says. It also checks that every DAX query the project can send has a saved answer (or, where the
// step is about a failing query, is saved as the model's error). Query functions are called with
// every year and store country to find the queries they can make.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { lessons } from '../src/lesson-list.mjs';
import { chapters, modules } from '../src/course.mjs';
import { terms, help } from '../src/terms.mjs';
import { emptyProject, doStep, stepIsDone, PAGE_FILE } from '../src/project.mjs';
import lakehouse from '../data/lakehouse.json' with { type: 'json' };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8'));
const { snapshots } = JSON.parse(readFileSync(join(root, 'data', 'snapshots.json'), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const known = new Map(catalog.queries.map((q) => [norm(q.query), q]));
const answer = (query) => {
  const e = known.get(norm(query));
  return e ? snapshots[e.id] : undefined;
};

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

// ---------------------------------------------------------------- the course
// Chapters: a live one lists modules, a coming one lists planned titles; every module is in exactly
// one live chapter, and the chapters hold the modules in course order.
{
  const ids = chapters.map((c) => c.id);
  if (new Set(ids).size !== ids.length) fail('course.mjs: duplicate chapter id');
  for (const [ci, c] of chapters.entries()) {
    if (!c.title || !c.goal) fail(`chapter ${c.id}: title and goal needed`);
    if (!!c.modules === !!c.coming) fail(`chapter ${c.id}: needs exactly one of modules or coming`);
    for (const b of c.builds ?? []) if (!(ids.indexOf(b) >= 0 && ids.indexOf(b) < ci)) fail(`chapter ${c.id}: builds on ${b}, which is not an earlier chapter`);
  }
  const live = chapters.filter((c) => c.modules);
  if (live.some((c, i) => chapters.indexOf(c) !== i)) fail('course.mjs: live chapters come first, then the coming ones');
  const inChapters = live.flatMap((c) => c.modules);
  if (inChapters.join('|') !== modules.map((m) => m.id).join('|')) fail('course.mjs: the chapters must hold every module once, in the order of `modules`');
}
const byId = new Map(lessons.map((l) => [l.id, l]));
const placed = modules.flatMap((m) => m.lessons);
for (const l of lessons) {
  const n = placed.filter((id) => id === l.id).length;
  if (n !== 1) fail(`lesson ${l.id} is in ${n} modules (should be 1)`);
}
for (const id of placed) if (!byId.has(id)) fail(`course.mjs names a lesson that doesn't exist: ${id}`);
const order = placed.map((id) => byId.get(id)).filter(Boolean);
const numOf = (l) => {
  const m = modules.find((x) => x.lessons.includes(l.id));
  return `${modules.indexOf(m)}.${m.lessons.indexOf(l.id) + 1}`;
};

const LESSON_FIELDS = ['id', 'title', 'goal', 'builds', 'pbi', 'idea', 'steps', 'summary', 'fabric'];
const STEP_FIELDS = ['do', 'code', 'run', 'see', 'why', 'file', 'find', 'point', 'edits', 'errors', 'done', 'queryFails', 'commandFails'];
const POINTS = ['editor', 'files', 'preview', 'status', 'terminal', 'log', 'queries', 'terms', 'run', 'reset'];
const LINK_HOSTS = ['learn.microsoft.com', 'rayfin.ai'];

for (const l of order) {
  for (const k of Object.keys(l)) if (!LESSON_FIELDS.includes(k)) fail(`${l.id}: unknown lesson field "${k}"`);
  for (const k of ['goal', 'pbi', 'idea']) if (typeof l[k] !== 'string' || !l[k]) fail(`${l.id}: "${k}" missing`);
  if (/[.]$/.test(l.goal) || /^[A-Z]/.test(l.goal)) fail(`${l.id}: goal should start lower case and have no full stop`);
  if (!Array.isArray(l.summary) || l.summary.length < 2 || l.summary.length > 3) fail(`${l.id}: summary needs 2 or 3 bullets`);
  if (!l.fabric?.text || !l.fabric.links?.length) fail(`${l.id}: fabric note needs text and at least one link`);
  for (const link of l.fabric?.links ?? []) {
    const host = new URL(link.href).host;
    if (!link.href.startsWith('https://') || !LINK_HOSTS.includes(host)) fail(`${l.id}: link outside Microsoft Learn and rayfin.ai: ${link.href}`);
  }
  for (const b of l.builds ?? []) {
    if (!byId.has(b)) fail(`${l.id}: builds on unknown lesson ${b}`);
    else if (order.indexOf(byId.get(b)) >= order.indexOf(l)) fail(`${l.id}: builds on ${b}, which comes later`);
  }
  for (const s of l.steps) {
    for (const k of Object.keys(s)) if (!STEP_FIELDS.includes(k)) fail(`${l.id}: unknown step field "${k}"`);
    if (s.point && !POINTS.includes(s.point)) fail(`${l.id}: unknown point "${s.point}"`);
    if (s.run && s.edits) fail(`${l.id}: a step either runs a command or edits files, not both`);
    // One action per card: a step with several edits must say Do it for me makes them.
    if ((s.edits?.length ?? 0) > 1 && !/Do it for me/.test(s.do) && !/^Replace the typed-in numbers/.test(s.do)) {
      fail(`${l.id}: "${s.do.slice(0, 50)}…" makes ${s.edits.length} edits without saying Do it for me does them`);
    }
  }
}

for (const m of modules) {
  if (m.check && (m.check.length < 2 || m.check.length > 4)) fail(`check ${m.id}: needs 2 to 4 questions`);
  for (const [qi, q] of (m.check ?? []).entries()) {
    const label = `check ${m.id} question ${qi + 1}`;
    if (q.options.length < 2 || q.options.length > 4) fail(`${label}: needs 2 to 4 options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) fail(`${label}: answer out of range`);
    const taught = byId.get(q.lesson);
    if (!taught) fail(`${label}: unknown lesson ${q.lesson}`);
    else if (!(q.step >= 1 && q.step <= taught.steps.length)) fail(`${label}: ${q.lesson} has no step ${q.step}`);
    else if (modules.indexOf(modules.find((x) => x.lessons.includes(q.lesson))) > modules.indexOf(m)) fail(`${label}: taught in a later module`);
  }
}

// Every [[term]] in any text must be in the glossary; every term's lesson must exist.
const termIds = new Set(terms.map((t) => t.id));
if (termIds.size !== terms.length) fail('terms.mjs: duplicate term id');
for (const t of terms) if (!byId.has(t.lesson)) fail(`term ${t.id}: unknown lesson ${t.lesson}`);
const texts = [];
const collect = (v, where) => {
  if (typeof v === 'string') texts.push([v, where]);
  else if (Array.isArray(v)) v.forEach((x) => collect(x, where));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => !['edits', 'code', 'run', 'find'].includes(k) && collect(x, where));
};
lessons.forEach((l) => collect(l, l.id));
modules.forEach((m) => collect(m, `module ${m.id}`));
chapters.forEach((c) => collect(c, `chapter ${c.id}`));
terms.forEach((t) => collect(t, `term ${t.id}`));
help.forEach((r, i) => collect(r, `help row ${i + 1}`));
for (const [text, where] of texts) {
  for (const [, inner] of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const [shown, id = shown.toLowerCase()] = inner.split('|');
    if (!termIds.has(id)) fail(`${where}: [[${inner}]] is not in the glossary`);
  }
  if (/\blesson \d/i.test(text)) fail(`${where}: refers to a lesson by number ("${text.match(/\blesson \d+/i)[0]}"); use its title`);
  if (/\b(chapter|module) \d/i.test(text)) fail(`${where}: refers to a chapter or module by number ("${text.match(/\b(chapter|module) \d+/i)[0]}"); use its title`);
}

// ---------------------------------------------------------------- type-checking a project
const options = {
  strict: true,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noEmit: true,
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  types: [],
  typeRoots: [join(root, 'node_modules', '@types')],
};

// The Rayfin package types the editor gets once a package is installed (src/editor-types/packages).
const PACKAGE_TYPES = {
  '@microsoft/rayfin-client': ['rayfin-client.d.ts'],
  '@microsoft/rayfin-auth': ['rayfin-auth.d.ts'],
  '@microsoft/rayfin-connectors': ['rayfin-connectors.d.ts'],
  '@microsoft/rayfin-connector-fabric-semanticmodel': ['rayfin-connector-fabric-semanticmodel.d.ts'],
  '@microsoft/rayfin-core': ['rayfin-core.d.ts'],
  '@microsoft/rayfin-data': ['rayfin-data.d.ts'],
  '@microsoft/rayfin-connector-fabric-graphql': ['rayfin-connector-fabric-graphql.d.ts'],
  vite: ['vite-client.d.ts'],
};
const vroot = join(root, '.virtual-project').replace(/\\/g, '/');

function typeCheck(project) {
  const files = new Map();
  for (const [path, text] of Object.entries(project.files)) {
    if (/\.(tsx?|d\.ts)$/.test(path)) files.set(`${vroot}/${path}`, text);
  }
  const libs = [];
  for (const [pkg, dts] of Object.entries(PACKAGE_TYPES)) {
    if (project.packages.includes(pkg)) libs.push(...dts.map((f) => join(root, 'src', 'editor-types', 'packages', f).replace(/\\/g, '/')));
  }
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile;
  host.getSourceFile = (n, lang, ...rest) => {
    const key = n.replace(/\\/g, '/');
    if (files.has(key)) return ts.createSourceFile(n, files.get(key), lang, true, key.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    return original(n, lang, ...rest);
  };
  const originalExists = host.fileExists;
  host.fileExists = (n) => files.has(n.replace(/\\/g, '/')) || (!n.replace(/\\/g, '/').startsWith(vroot) && originalExists(n));
  const originalRead = host.readFile;
  host.readFile = (n) => files.get(n.replace(/\\/g, '/')) ?? originalRead(n);
  const originalDirExists = host.directoryExists?.bind(host);
  host.directoryExists = (d) => {
    const key = d.replace(/\\/g, '/').replace(/\/$/, '');
    if (key === vroot || key.startsWith(`${vroot}/`)) return [...files.keys()].some((f) => f.startsWith(`${key}/`));
    return originalDirExists ? originalDirExists(d) : true;
  };
  const prog = ts.createProgram([...files.keys(), ...libs], options, host);
  return ts.getPreEmitDiagnostics(prog).map((d) => {
    const where = d.file ? `${d.file.fileName.replace(`${vroot}/`, '')}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}` : '';
    return `${where}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
  });
}

// ---------------------------------------------------------------- the queries a project can send
const QUERY_STRING = /`([^`]*\bEVALUATE\b[^`]*)`/g;

function queriesOf(project) {
  const found = [];
  for (const [path, text] of Object.entries(project.files)) {
    if (!/\.tsx?$/.test(path)) continue;
    for (const m of text.matchAll(QUERY_STRING)) if (!m[1].includes('${')) found.push({ query: m[1], from: path });
  }
  // Query functions (exported, named …Query): run the file and call them with every choice.
  const data = project.files['src/data.ts'];
  if (data && /export function \w+Query\(/.test(data)) {
    const js = ts.transpileModule(data, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = { exports: {} };
    const require = (name) => (name === 'react' ? { useState() {}, useEffect() {} } : { rayfinClient: {} });
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require });
    for (const [name, fn] of Object.entries(mod.exports)) {
      if (typeof fn !== 'function' || !/Query$/.test(name)) continue;
      const years = [undefined, ...catalog.years];
      const countries = [undefined, ...catalog.countries];
      const calls = fn.length === 0 ? [[]] : fn.length === 1 ? years.map((y) => [y]) : years.flatMap((y) => countries.map((c) => [y, c]));
      for (const args of calls) found.push({ query: fn(...args), from: `${name}(${args.map(String).join(', ')})` });
    }
  }
  return found;
}

// ---------------------------------------------------------------- building the course from empty
const errorsOk = (expected = 0, n) => (expected === '1+' ? n >= 1 : n === expected);
let project = emptyProject();
const after = {}; // project after each lesson, by id (for the controls below)

for (const lesson of order) {
  console.log(`\n${numOf(lesson)} ${lesson.title}  (${lesson.steps.length} steps)`);
  lesson.steps.forEach((step, si) => {
    const label = `${lesson.id} step ${si + 1}`;
    const file = step.file ?? step.edits?.[0]?.file ?? (step.edits ? PAGE_FILE : undefined);
    // The gold mark: in the project before the step, or, for a step that writes a new file, after it.
    const checkFind = (when) => {
      if (!step.find) return;
      const text = project.files[file ?? PAGE_FILE];
      if (text === undefined) fail(`${label}: "${file}" doesn't exist ${when} this step`);
      else if (!text.includes(step.find)) fail(`${label}: "Show me" text not found in ${file ?? PAGE_FILE}: ${step.find}`);
    };
    const writesFile = step.edits?.some((e) => e.from === '' && !(project.files[e.file ?? PAGE_FILE] ?? '').trim());
    if (!writesFile) checkFind('at');
    if (!step.run && !step.edits) return;
    if (stepIsDone(project, step) && !/^Undo/.test(step.do)) fail(`${label}: looks done before it is applied`);
    const r = doStep(project, step, answer);
    if (r.error) {
      fail(`${label}: ${r.error}`);
      if (r.project) project = r.project;
      return;
    }
    project = r.project;
    if (writesFile) checkFind('after');
    if (!stepIsDone(project, step)) fail(`${label}: not detected as done after applying it`);
    if (step.run) {
      console.log(`   step ${si + 1}: $ ${step.run.slice(0, 70)}`);
      return;
    }
    const d = typeCheck(project);
    const ok = errorsOk(step.errors, d.length);
    console.log(`   step ${si + 1}: ${d.length} type error(s)${step.errors ? ` (expected ${step.errors})` : ''}${ok ? '' : '  <-- '}`);
    if (!ok) {
      fail(`${label}: expected ${step.errors ?? 0} type error(s), got ${d.length}`);
      d.forEach((x) => console.log(`     ${x}`));
    }
    let sent = [];
    try {
      sent = queriesOf(project);
    } catch (e) {
      fail(`${label}: could not run src/data.ts to list its queries: ${e.message}`);
    }
    let anyError = false;
    for (const q of sent) {
      const entry = known.get(norm(q.query));
      if (!entry) {
        fail(`${label}: query not in the catalog (${q.from}):\n${q.query}`);
        continue;
      }
      const isError = snapshots[entry.id]?.status === 'error';
      anyError ||= isError;
      if (isError && !step.queryFails) fail(`${label}: ${entry.id} (${q.from}) is a saved error, but data is expected here`);
    }
    if (step.queryFails && !anyError) fail(`${label}: expected a query saved as the model's error`);
  });
  after[lesson.id] = project;
}

const finalErrors = typeCheck(project);
if (finalErrors.length) {
  fail(`the finished course has ${finalErrors.length} type error(s)`);
  finalErrors.forEach((x) => console.log(`     ${x}`));
}

// ---------------------------------------------------------------- controls
console.log('\ncontrols');

// The redraw trap: the useCallback line shown in its last step must compile in place of the slip.
{
  const lesson = byId.get('redraw-trap');
  const step = lesson.steps.find((s) => s.code?.includes('useCallback'));
  let p = after.slicer;
  for (const s of lesson.steps.slice(0, 2)) p = doStep(p, s, answer).project; // the slip, in two parts
  const app = p.files[PAGE_FILE]
    .replace("import { useState } from 'react';", "import { useCallback, useState } from 'react';")
    .replace('  const runDax = (query: string) => rayfinClient.connectors.contoso.executeQuery({ query });', `  ${step.code}`);
  const d = typeCheck({ ...p, files: { ...p.files, [PAGE_FILE]: app } });
  console.log(`   ${numOf(lesson)} useCallback line: ${d.length} type error(s)`);
  if (!app.includes(step.code) || d.length) fail(`${numOf(lesson)}: the useCallback line does not compile as shown`);
}

// Two pages, step 2: the red line must name the missing page.
{
  const lesson = byId.get('pages');
  let p = after['cross-filter'];
  for (const s of lesson.steps.slice(0, 2)) p = doStep(p, s, answer).project;
  const d = typeCheck(p);
  console.log(`   ${numOf(lesson)} missing page: ${d[0] ?? 'no error'}`.slice(0, 140));
  if (!d.some((x) => x.includes("'years'"))) fail(`${numOf(lesson)}: the error does not name 'years'`);
}

// Wire the client: a mistyped connector name in configs must get a red line.
{
  const p = after.client;
  const file = 'src/services/rayfinClient.ts';
  const bad = p.files[file].replace('configs: { contoso: contosoConfig }', 'configs: { contosso: contosoConfig }');
  const d = typeCheck({ ...p, files: { ...p.files, [file]: bad } });
  console.log(`   ${numOf(byId.get('client'))} mistyped connector name: ${d[0] ?? 'no error'}`.slice(0, 140));
  if (bad === p.files[file] || !d.some((x) => x.includes('contosso'))) fail('client: a mistyped connector name gets no red line');
}

// Lakehouse: the configs map is exhaustive, so a missing `lake` entry gets a red line naming it.
{
  const lesson = byId.get('lakehouse-rows');
  let p = after['lakehouse-entities'];
  for (const s of lesson.steps.slice(0, 2)) p = doStep(p, s, answer).project;
  const d = typeCheck(p);
  console.log(`   ${numOf(lesson)} missing configs entry: ${d[0] ?? 'no error'}`.slice(0, 140));
  if (!d.some((x) => x.includes("'lake'"))) fail(`${numOf(lesson)}: the error does not name 'lake'`);
}

// Who runs this query: the write is a red line on `create`.
{
  const lesson = byId.get('who-runs-it');
  const step = lesson.steps.findIndex((s) => s.code?.includes('.create('));
  let p = after['rows-or-measures'];
  for (const s of lesson.steps.slice(0, step + 1)) p = doStep(p, s, answer).project;
  const d = typeCheck(p);
  console.log(`   ${numOf(lesson)} create: ${d[0] ?? 'no error'}`.slice(0, 140));
  if (!d.some((x) => x.includes("'create'"))) fail(`${numOf(lesson)}: the error does not name 'create'`);
}

// Rows or measures: the numbers the cards show. All of France's 2023 lines add up to the model's
// [Revenue] for that slice; the first page of 100 does not.
{
  const lesson = byId.get('rows-or-measures');
  const { columns, rows } = lakehouse.rows.sales;
  const at = (c) => columns.indexOf(c);
  const sum = (rs) => rs.reduce((t, r) => t + r[at('Quantity')] * r[at('NetPrice')], 0);
  const model = snapshots['totals-2023-france'].table.rows[0][0];
  const compact = (v) => v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const all = sum(rows);
  const first = sum(rows.slice(0, 100));
  console.log(`   ${numOf(lesson)} all lines ${all.toFixed(4)} (${compact(all)}), first 100 ${first.toFixed(2)} (${compact(first)}), model ${model} (${compact(model)})`);
  if (Math.abs(all - model) > 0.01) fail(`${numOf(lesson)}: the lakehouse lines don't add up to the model's [Revenue]`);
  const text = JSON.stringify(lesson.steps);
  for (const shown of [compact(first), compact(model)]) if (!text.includes(shown)) fail(`${numOf(lesson)}: the steps don't show ${shown}`);
}

console.log(failures ? `\n${failures} failure(s)` : `\nall checks passed (TypeScript ${ts.version})`);
process.exit(failures ? 1 : 0);
