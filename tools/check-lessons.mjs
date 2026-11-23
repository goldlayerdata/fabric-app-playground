// Checks the course, outside the browser. `npm run check`. Writes nothing.
//
// First the course itself: every lesson in one module, links only to Microsoft Learn and rayfin.ai,
// glossary terms, knowledge-check questions and the steps they cite, no "lesson N" references, links to the
// Visuals page that name one of its pages.
//
// Then it builds the whole course from an empty folder, exactly as a reader with "Do it for me"
// would: terminal steps run through the simulated CLI (src/project.mjs), edit steps change the
// project's files. After every step it type-checks the whole project with TypeScript 6.0.3 (the
// version a Rayfin CLI 2.0.0 project installs), React 19 types, and the Rayfin package types the
// project has installed so far, in strict mode, and compares the number of errors with what the step
// says. It also checks that every DAX query the project can send has a saved answer from the model its
// connector names (or, where the step is about a failing query, is saved as that model's error). Query
// functions are called with every year and store country to find the queries they can make, and the
// runner each is sent through (runDax, runPareto…) says which connector sends it.
//
// Then the controls: slips whose effect a type check can't see, run on the projects the course builds
// (the silent runtime, the case of connector names, answers per connector, the data API's permissions).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { lessons } from '../src/lesson-list.mjs';
import { chapters, modules, parts } from '../src/course.mjs';
import { terms, help } from '../src/terms.mjs';
import { emptyProject, doStep, numberRuns, stepFile, stepIsDone, PAGE_FILE } from '../src/project.mjs';
import { createConnectorsApi, rawPayload } from '../src/connectors-sim.mjs';
import lakehouse from '../data/lakehouse.json' with { type: 'json' };
import * as C from '../src/course-code.mjs';
import { checkClaimsResult, claimsContract, entityFiles, handleRequest, parseEntity, planApply } from '../src/app-data.mjs';
import { STEPS_FROM, stepMoves } from '../src/step-moves.mjs';
import { lessonsAt, movesFor, stepKey } from './step-moves-lib.mjs';
import { VISUAL_IDS } from '../src/visuals/pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8'));
const { snapshots } = JSON.parse(readFileSync(join(root, 'data', 'snapshots.json'), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
// Saved answers are matched on connector + text: the same text can have an answer from each model.
const keyOf = (connector, query) => `${connector.toLowerCase()}|${norm(query)}`;
const known = new Map(catalog.queries.map((q) => [keyOf(q.connector, q.query), q]));
const answer = (connector, query) => {
  const e = known.get(keyOf(connector, query));
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
  // Parts: each has a title, level and goal, and together they hold every chapter once, in order.
  for (const p of parts) if (!p.id || !p.title || !p.level || !p.goal || !p.chapters?.length) fail(`part ${p.id}: id, title, level, goal and chapters needed`);
  if (parts.flatMap((p) => p.chapters).join('|') !== ids.join('|')) fail('course.mjs: the parts must hold every chapter once, in the order of `chapters`');
}
const byId = new Map(lessons.map((l) => [l.id, l]));
const placed = modules.flatMap((m) => m.lessons);
for (const l of lessons) {
  const n = placed.filter((id) => id === l.id).length;
  if (n !== 1) fail(`lesson ${l.id} is in ${n} modules (should be 1)`);
}
for (const id of placed) if (!byId.has(id)) fail(`course.mjs names a lesson that doesn't exist: ${id}`);
const order = placed.map((id) => byId.get(id)).filter(Boolean);
// Lessons are numbered within their chapter: "4.2" is the second lesson of the fourth chapter.
const chapterLessons = (c) => (c.modules ?? []).flatMap((id) => modules.find((m) => m.id === id)?.lessons ?? []);
const numOf = (l) => {
  const c = chapters.find((x) => chapterLessons(x).includes(l.id));
  return `${chapters.indexOf(c) + 1}.${chapterLessons(c).indexOf(l.id) + 1}`;
};

const LESSON_FIELDS = ['id', 'title', 'goal', 'builds', 'pbi', 'idea', 'steps', 'summary', 'fabric'];
const STEP_FIELDS = ['do', 'code', 'run', 'see', 'why', 'file', 'find', 'point', 'edits', 'errors', 'done', 'queryFails', 'commandFails', 'nth', 'copy', 'visual'];
const POINTS = ['editor', 'files', 'preview', 'status', 'terminal', 'log', 'queries', 'help', 'run', 'reset', 'data', 'signin'];
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
    if (s.visual !== undefined && !VISUAL_IDS.includes(s.visual)) fail(`${l.id}: unknown visual "${s.visual}" (not a page in src/visuals/pages.mjs)`);
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
const lessonNums = new Set(order.map(numOf));
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
  // Nor by its number on screen, as in "4.2 Model a sales target": numbers move when a lesson or chapter is added.
  for (const [, n] of text.matchAll(/(?<![\d.])(\d+\.\d+)\s+(?:\*\*)?[A-Z]/g)) {
    if (lessonNums.has(n)) fail(`${where}: refers to a lesson by its number ("${n}"); use its title`);
  }
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
  '@microsoft/fabric-user-data-functions': ['fabric-user-data-functions.d.ts', 'fabric-user-data-functions-claims.d.ts'],
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

// ---------------------------------------------------------------- running project files
// Runs a project's TypeScript files in Node, as CommonJS: project imports load project files, packages
// come from `packages` (by name or by relative path), anything else is an empty object.
function loader(project, packages = {}) {
  const cache = new Map();
  const resolve = (from, spec) => {
    const parts = from.split('/').slice(0, -1);
    for (const part of spec.split('/')) {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
    }
    const base = parts.join('/').replace(/\.js$/, '');
    return ['', '.ts', '.tsx', '/index.ts'].map((ext) => base + ext).find((f) => project.files[f] !== undefined);
  };
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports;
    const source = project.files[path].replace(/import\.meta\.env/g, '__env');
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const mod = { exports: {} };
    cache.set(path, mod);
    const require = (spec) => {
      if (spec in packages) return packages[spec];
      // A query file imported as text (`./queries/x.dax?raw`), as Vite does.
      if (spec.startsWith('.') && spec.endsWith('?raw')) {
        const parts = path.split('/').slice(0, -1);
        for (const part of spec.slice(0, -4).split('/')) {
          if (part === '..') parts.pop();
          else if (part !== '.') parts.push(part);
        }
        const text = project.files[parts.join('/')];
        if (text === undefined) throw new Error(`${path} imports ${spec}, which isn't in the project`);
        return { __esModule: true, default: text };
      }
      const file = spec.startsWith('.') ? resolve(path, spec) : undefined;
      return file ? load(file) : {};
    };
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require, __env: { VITE_RAYFIN_API_URL: 'x', VITE_RAYFIN_PUBLISHABLE_KEY: 'x' }, TextEncoder });
    return mod.exports;
  };
  return load;
}

// ---------------------------------------------------------------- the queries a project can send
// A query written into code: a string that starts with EVALUATE or DEFINE.
const QUERY_STRING = /`(\s*(?:EVALUATE|DEFINE)\b[^`]*)`/g;
// A runner: `const runDax: RunDax = (query) => rayfinClient.connectors.contoso.executeQuery({ query })`.
const RUNNER = /const (\w+)(?::\s*RunDax)?\s*=\s*\(query(?::\s*string)?\)\s*=>\s*rayfinClient\.connectors\.(\w+)\.executeQuery/g;

function queriesOf(project) {
  const found = [];
  const code = Object.entries(project.files).filter(([path]) => /\.tsx?$/.test(path));
  // Which connector each runner sends to (names ignore case at run time), and each file's own runner.
  const runners = new Map();
  const ownConnector = {};
  for (const [path, text] of code) {
    for (const m of text.matchAll(RUNNER)) {
      runners.set(m[1], m[2].toLowerCase());
      ownConnector[path] ??= m[2].toLowerCase();
    }
  }
  // Which runners send each query function: `useDax(runPareto, paretoQuery(year))`, `runDax(totalsQuery(…))`.
  const sentBy = new Map();
  for (const [, text] of code) {
    for (const m of text.matchAll(/\b(\w+)\(\s*(\w+)\s*,\s*(\w+)\(/g)) if (m[1] === 'useDax' && runners.has(m[2])) sentBy.set(m[3], new Set([...(sentBy.get(m[3]) ?? []), runners.get(m[2])]));
    for (const m of text.matchAll(/\b(\w+)\(\s*(\w+)\(/g)) if (runners.has(m[1])) sentBy.set(m[2], new Set([...(sentBy.get(m[2]) ?? []), runners.get(m[1])]));
  }
  for (const [path, text] of code) {
    for (const m of text.matchAll(QUERY_STRING)) if (!m[1].includes('${')) found.push({ connector: ownConnector[path] ?? 'contoso', query: m[1], from: path });
  }
  // Query files (.dax), sent as they are by the file that imports them. One with a `/* filters */` marker
  // is only ever sent through its query function, with the marker replaced (found below).
  for (const [path, text] of code) {
    for (const m of text.matchAll(/^import \w+ from '(\.[^']+\.dax)\?raw';$/gm)) {
      const parts = path.split('/').slice(0, -1);
      for (const part of m[1].split('/')) {
        if (part === '..') parts.pop();
        else if (part !== '.') parts.push(part);
      }
      const dax = parts.join('/');
      const query = project.files[dax];
      if (query?.trim() && !query.includes('/* filters */')) found.push({ connector: ownConnector[path] ?? 'contoso', query, from: dax });
    }
  }
  // Query functions (exported, named …Query): run the file and call them with every choice. One that
  // no page sends yet goes to its own file's runner.
  const load = loader(project, { react: { useState() {}, useEffect() {} }, './services/rayfinClient': { rayfinClient: {} } });
  for (const [path, text] of code) {
    if (!/export function \w+Query\(/.test(text)) continue;
    for (const [name, fn] of Object.entries(load(path))) {
      if (typeof fn !== 'function' || !/Query$/.test(name)) continue;
      const years = [undefined, ...catalog.years];
      const countries = [undefined, ...catalog.countries];
      const calls = fn.length === 0 ? [[]] : fn.length === 1 ? years.map((y) => [y]) : years.flatMap((y) => countries.map((c) => [y, c]));
      for (const connector of sentBy.get(name) ?? [ownConnector[path] ?? 'contoso']) {
        for (const args of calls) found.push({ connector, query: fn(...args), from: `${connector}: ${name}(${args.map(String).join(', ')})` });
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------- building the course from empty
numberRuns(order); // a command the course runs again is done once it is in the history that many times
const errorsOk = (expected = 0, n) => (expected === '1+' ? n >= 1 : n === expected);
let project = emptyProject();
const after = {}; // project after each lesson, by id (for the controls below)

for (const lesson of order) {
  console.log(`\n${numOf(lesson)} ${lesson.title}  (${lesson.steps.length} steps)`);
  lesson.steps.forEach((step, si) => {
    const label = `${lesson.id} step ${si + 1}`;
    // The step's file opens in the editor and is marked in the file list: it must be
    // in the project when the card opens, unless the step itself creates it.
    const file = stepFile(step);
    if (file !== undefined && project.files[file] === undefined && !step.edits?.some((e) => (e.file ?? PAGE_FILE) === file && e.from === '')) {
      fail(`${label}: names ${file}, which isn't in the project at this step`);
    }
    // The pink mark: in the project before the step, or, for a step that writes a new file, after it.
    const checkFind = (when) => {
      if (!step.find) return;
      const text = project.files[file];
      if (text === undefined) fail(`${label}: "${file}" doesn't exist ${when} this step`);
      else if (!text.includes(step.find)) fail(`${label}: "Show me" text not found in ${file}: ${step.find}`);
    };
    const writesFile = step.edits?.some((e) => e.from === '' && !(project.files[e.file ?? PAGE_FILE] ?? '').trim());
    if (!writesFile) checkFind('at');
    // The red lines a step says are there: counted after every step that changes the project (an edit
    // or a command), and on a step that only looks when it names a count.
    const checkErrors = (what) => {
      const d = typeCheck(project);
      const ok = errorsOk(step.errors, d.length);
      console.log(`   step ${si + 1}: ${what}${d.length} type error(s)${step.errors ? ` (expected ${step.errors})` : ''}${ok ? '' : '  <-- '}`);
      if (!ok) {
        fail(`${label}: expected ${step.errors ?? 0} type error(s), got ${d.length}`);
        d.forEach((x) => console.log(`     ${x}`));
      }
      // A red line is drawn in a file: every expected error must be in one of the project's, so the file
      // list can turn it red and "Show the red line" can open it.
      for (const x of step.errors ? d : []) {
        if (project.files[x.split(':')[0]] === undefined) fail(`${label}: an expected error is in no file of the project: ${x}`);
      }
    };
    if (!step.run && !step.edits) {
      if (step.errors) checkErrors('(a look) ');
      return;
    }
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
      checkErrors(`$ ${step.run.slice(0, 50)}: `);
      return;
    }
    checkErrors('');
    let sent = [];
    try {
      sent = queriesOf(project);
    } catch (e) {
      fail(`${label}: could not run the query files to list their queries: ${e.message}`);
    }
    let anyError = false;
    for (const q of sent) {
      const entry = known.get(keyOf(q.connector, q.query));
      if (!entry) {
        fail(`${label}: query not in the catalog for ${q.connector} (${q.from}):\n${q.query}`);
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

// ---------------------------------------------------------------- two semantic models
// Add a second model: a name that differs only by case is the existing connector; the CLI cancels.
{
  const lesson = byId.get('second-model');
  const r = doStep(after['to-fabric'], lesson.steps[0], answer);
  const said = (line) => r.lines?.includes(line);
  const ok =
    !r.error &&
    said('Using existing connector name "contoso" (from "Contoso").') &&
    said('Connector "Contoso" already exists as "contoso".') &&
    said('Cancelled.') &&
    r.project.files['rayfin/rayfin.yml'] === after['to-fabric'].files['rayfin/rayfin.yml'];
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${numOf(lesson)} --name Contoso: the existing connector, cancelled, rayfin.yml unchanged`);
  if (!ok) fail(`${numOf(lesson)}: --name Contoso does not report the existing connector and cancel`);
  const fresh = doStep(r.project, lesson.steps[1], answer);
  const normalized = doStep(r.project, { run: lesson.steps[1].run.replace('--name pareto', '--name Pareto') }, answer);
  const ok2 = normalized.lines?.includes('Using normalized connector name "pareto" (from "Pareto").') && normalized.project.files['rayfin/rayfin.yml'] === fresh.project.files['rayfin/rayfin.yml'];
  console.log(`   ${ok2 ? 'ok  ' : 'FAIL'} ${numOf(lesson)} --name Pareto: stored as pareto`);
  if (!ok2) fail(`${numOf(lesson)}: a new mixed-case name is not stored in lower case`);
}

// The client, run as the preview runs it: `connectorsService` follows Rayfin 2.0's rules (src/connectors-sim.mjs),
// and a semantic model connector answers from its own model's saved results, or with the raw payload
// when it has no runtime under its exact name. Returns the project's src/pareto.ts and src/data.ts.
const RUNTIME = Symbol('fabricSemanticModel');
function runApp(project) {
  const asked = [];
  const make = (name, config, runtime) => ({
    async executeQuery({ query }) {
      const entry = known.get(keyOf(name, query));
      asked.push({ connector: name, id: entry?.id, decoded: !!runtime?.[RUNTIME] });
      if (!runtime?.[RUNTIME]) return rawPayload(name);
      return entry ? { ...snapshots[entry.id], requestId: 'check' } : { status: 'error', error: { category: 'query', message: 'not saved' }, requestId: 'check' };
    },
  });
  const load = loader(project, {
    react: { useState() {}, useEffect() {} },
    '@microsoft/rayfin-client': { RayfinClient: { create: (config) => Object.fromEntries(Object.entries(config.services ?? {}).map(([k, f]) => [k, f()])) } },
    '@microsoft/rayfin-auth': { browserSession: () => () => ({}) },
    '@microsoft/rayfin-connectors': { connectorsService: (options) => () => createConnectorsApi(options.configs, options.runtime, make) },
    '@microsoft/rayfin-connector-fabric-semanticmodel': { fabricSemanticModel: () => ({ [RUNTIME]: true }) },
  });
  return { pareto: load('src/pareto.ts'), data: load('src/data.ts'), asked };
}
{
  const lesson = byId.get('second-client');
  const upTo = (test) => {
    const last = lesson.steps.findIndex(test);
    let p = after['second-model'];
    for (const s of lesson.steps.slice(0, last + 1)) p = doStep(p, s, answer).project;
    return p;
  };
  const headline = async (project) => {
    const app = runApp(project);
    const r = await app.pareto.runPareto(app.pareto.headlineQuery());
    return { r, text: app.pareto.toHeadline(r).text, asked: app.asked };
  };
  const SENTENCE = snapshots['pareto-headline'].table.rows[0][1];
  const check = (ok, label) => {
    console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${numOf(lesson)} ${label}`);
    if (!ok) fail(`${numOf(lesson)}: ${label}`);
  };
  // No runtime for pareto: 0 type errors, no status, an empty headline.
  const noRuntime = upTo((s) => s.edits?.some((e) => e.file === 'src/ParetoPage.tsx'));
  const a = await headline(noRuntime);
  check(!/pareto: fabricSemanticModel|Pareto: fabricSemanticModel/.test(noRuntime.files['src/services/rayfinClient.ts']) && typeCheck(noRuntime).length === 0 && a.r instanceof ArrayBuffer && a.r.status === undefined && a.text === '',
    'no runtime entry: no red line, the raw payload (no status), an empty headline');
  // A runtime under `Pareto`: still found by nobody.
  const caseRuntime = upTo((s) => s.edits?.some((e) => e.to.includes('Pareto: fabricSemanticModel()')));
  const b = await headline(caseRuntime);
  check(typeCheck(caseRuntime).length === 0 && b.r instanceof ArrayBuffer && b.text === '', 'runtime key `Pareto`: no red line, still an empty headline');
  // The fix: the model's own sentence.
  const fixed = await headline(after['second-client']);
  check(fixed.text === SENTENCE && fixed.asked[0].id === 'pareto-headline', `runtime key \`pareto\`: "${fixed.text}"`);
  // connectors.Pareto: a red line naming pareto, and at run time the same connector.
  const caseAccess = upTo((s) => s.edits?.some((e) => e.to.includes('connectors.Pareto')));
  const d = typeCheck(caseAccess);
  const c = await headline(caseAccess);
  check(d.length === 1 && d[0].includes("Did you mean 'pareto'?") && c.text === SENTENCE, `connectors.Pareto: "${(d[0] ?? 'no error').split(': ').slice(1).join(': ').slice(0, 90)}…", and the headline still shows`);
  // Two keys that differ only by case: access by a third spelling is ambiguous.
  let code;
  try {
    void createConnectorsApi({ pareto: {}, Pareto: {} }, {}, () => ({})).PARETO;
  } catch (e) {
    code = e.code;
  }
  check(code === 'AMBIGUOUS_CONNECTOR', 'two keys differing only by case: AMBIGUOUS_CONNECTOR');
}
// Two models, one page: the same text, answered by each connector's own model.
{
  const lesson = byId.get('two-models-page');
  const app = runApp(after['two-models-page']);
  const fromContoso = await app.data.runDax(app.pareto.revenueQuery(2024));
  const fromPareto = await app.pareto.runPareto(app.pareto.revenueQuery(2024));
  const slip = await app.data.runDax(app.pareto.paretoQuery(2024));
  const [x, y, z] = app.asked;
  const ok =
    x.connector === 'contoso' && x.id === 'contoso-revenue-2024' && y.connector === 'pareto' && y.id === 'pareto-revenue-2024' &&
    app.pareto.toRevenue(fromContoso) === app.pareto.toRevenue(fromPareto) && z.id === 'contoso-pareto-by-category-2024' && slip.status === 'error';
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${numOf(lesson)} per connector: ${x.id} and ${y.id} (${app.pareto.toRevenue(fromPareto)}); the Pareto query through runDax: ${z.id}`);
  if (!ok) fail(`${numOf(lesson)}: saved answers are not looked up per connector`);
  // The numbers the steps show.
  const pct = (n) => n.toLocaleString('en-US', { style: 'percent', maximumFractionDigits: 1 });
  const compact = (n) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const text = JSON.stringify(lesson.steps);
  const shown = [];
  for (const y2 of [undefined, 2024]) {
    const rows = app.pareto.toPareto(await app.pareto.runPareto(app.pareto.paretoQuery(y2)));
    const count = app.pareto.toHeadline(await app.pareto.runPareto(app.pareto.headlineQuery(y2))).count;
    shown.push(...rows.slice(0, count).map((r) => (y2 ? pct(r.cumulative) : `★ ${r.label} (${pct(r.cumulative)})`)));
  }
  for (const y2 of [undefined, ...catalog.years]) shown.push(compact(app.pareto.toRevenue(await app.pareto.runPareto(app.pareto.revenueQuery(y2)))));
  const missing = shown.filter((v) => !text.includes(v));
  console.log(`   ${missing.length ? 'FAIL' : 'ok  '} ${numOf(lesson)} the steps show the saved numbers: ${shown.join(', ')}`);
  if (missing.length) fail(`${numOf(lesson)}: the steps don't show ${missing.join(', ')}`);
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

// ---------------------------------------------------------------- the app's own data: apply, permissions, claims
// The simulated data API, run on the projects the course builds, against what the lessons say happens.
{
  const person = (name, extra = {}) => ({
    signedIn: true,
    claims: { sub: `${name}-0000-0000-0000-000000000000`, email: `${name}@contoso.example`, role: 'authenticated', ...extra },
  });
  const expect = (ok, label) => {
    console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);
    if (!ok) fail(label);
  };
  const create = (db, who, fields) =>
    handleRequest(db, { entity: 'SalesTarget', op: 'create', input: { year: 2026, updatedAt: new Date(), ...fields } }, who);
  const readAll = (db, who) => handleRequest(db, { entity: 'SalesTarget', op: 'read', state: { select: ['id', 'country', 'amount'] } }, who);

  // Register and apply: text without max applies, then every read fails; the fix needs --force.
  {
    const lesson = byId.get('register-apply');
    let p = after['sales-target'];
    const slipApplied = lesson.steps.findIndex((s, i) => s.run === 'npx rayfin up db apply' && i > 2);
    for (const s of lesson.steps.slice(0, slipApplied + 1)) p = doStep(p, s, answer).project;
    const r = readAll(p.db, person('alice'));
    expect(!r.ok && r.error === 'Internal server error', `${numOf(lesson)} @text() without max: reads say "Internal server error"`);
    const fixed = readAll(after['register-apply'].db, person('alice'));
    expect(fixed.ok && fixed.result.length === 0, `${numOf(lesson)} after --force: the read returns an empty list`);
  }

  // Read and write targets: create returns the key plus the fields sent; update patches by id.
  {
    const lesson = byId.get('read-write');
    const alice = person('alice');
    const c = create(after['read-write'].db, alice, { country: 'Germany', amount: 3000000 });
    expect(c.ok && Object.keys(c.result).sort().join() === 'amount,country,id,updatedAt,year', `${numOf(lesson)} create returns the id plus the fields sent`);
    const u = handleRequest(c.db, { entity: 'SalesTarget', op: 'update', id: c.result.id, input: { amount: 3200000 } }, alice);
    expect(u.ok && u.db.rows.SalesTarget[0].amount === 3200000 && u.db.rows.SalesTarget[0].country === 'Germany', `${numOf(lesson)} update patches only the fields sent`);
  }

  // Change the model: `?` alone leaves the column required; a rename is blocked as destructive.
  {
    const lesson = byId.get('change-model');
    let p = after['read-write'];
    p = doStep(p, lesson.steps[0], answer).project;
    const note = parseEntity(p.files['rayfin/data/SalesTarget.ts']).fields.find((f) => f.name === 'note');
    expect(note && !note.optional, `${numOf(lesson)} \`note?\` without optional: true is a required column`);
    // The fabric note's way out: rename only the property, and keep the column with `column: 'amount'`.
    const end = after['change-model'];
    const added = create(end.db, person('alice'), { country: 'Germany', amount: 3000000 });
    const target = 'rayfin/data/SalesTarget.ts';
    const field = '  @decimal({ precision: 18, scale: 2 }) amount!: number;\n';
    const kept = "  @decimal({ precision: 18, scale: 2, column: 'amount' }) targetAmount!: number;\n";
    const renamed = { ...end, db: added.db, files: { ...end.files, [target]: end.files[target].replace(field, kept) } };
    const plan = planApply(renamed);
    expect(
      renamed.files[target].includes(kept) && !plan.blocked && plan.db.rows.SalesTarget[0].targetAmount === 3000000,
      `${numOf(lesson)} a rename that keeps the column (column: 'amount') applies, and the amounts stay`,
    );
    const lost = planApply({ ...renamed, files: { ...end.files, [target]: end.files[target].replace(field, field.replace('amount!', 'targetAmount!')) } });
    expect(!!lost.blocked && lost.destructive.some((op) => op.includes('drop column SalesTarget.amount')), `${numOf(lesson)} a plain rename is blocked: drop column amount`);
  }

  // My rows only: Alice changes her row, Carol can't; the email slip locks Alice out of her own row.
  {
    const lesson = byId.get('my-rows');
    const alice = person('alice');
    const carol = person('carol');
    const db = after['my-rows'].db;
    const c = create(db, alice, { country: 'Germany', amount: 3000000, owner_id: alice.claims.sub });
    expect(c.ok, `${numOf(lesson)} Alice adds Germany`);
    const asCarol = handleRequest(c.db, { entity: 'SalesTarget', op: 'update', id: c.result.id, input: { amount: 3100000 } }, carol);
    expect(!asCarol.ok && /refused/.test(asCarol.error), `${numOf(lesson)} Carol's update is refused`);
    const carolReads = readAll(c.db, carol);
    expect(carolReads.ok && carolReads.result.length === 1, `${numOf(lesson)} Carol still reads the row`);
    const asAlice = handleRequest(c.db, { entity: 'SalesTarget', op: 'update', id: c.result.id, input: { amount: 3100000 } }, alice);
    expect(asAlice.ok, `${numOf(lesson)} Alice's update passes`);
    const slip = create(c.db, alice, { country: 'France', amount: 1000000, owner_id: alice.claims.email });
    const locked = handleRequest(slip.db, { entity: 'SalesTarget', op: 'update', id: slip.result.id, input: { amount: 1 } }, alice);
    expect(slip.ok && !locked.ok, `${numOf(lesson)} the email in owner_id: Alice can't change her own row`);
  }

  // Roles the business knows: run the project's own claims function, as the preview does at each switch.
  const final = after['country-targets'];
  const fnText = final.files['rayfin/functions/src/function_app.ts'];
  const runClaims = async (email) => {
    const js = ts.transpileModule(fnText, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    let handler;
    const udf = { UserDataFunctions: class { func() {} authClaims(h) { handler = h; } } };
    const mod = { exports: {} };
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: () => udf });
    const denied = Symbol('denied');
    try {
      return await handler({ auth: { userId: 'x', email }, getSecret: () => undefined, denySignIn: (reason) => { throw { [denied]: reason }; } });
    } catch (e) {
      if (e && e[denied]) return { denied: e[denied] };
      throw e;
    }
  };
  const contract = claimsContract(fnText);
  expect(contract.found && !contract.problems.length && contract.claims.map((c) => c.name).join() === 'salesRole,country', `${numOf(byId.get('business-roles'))} the claims function declares salesRole and country`);
  const claimsOf = {};
  for (const name of ['alice', 'carol', 'bob', 'dan']) claimsOf[name] = await runClaims(`${name}@contoso.example`);
  expect(claimsOf.alice.salesRole === 'countryManager' && claimsOf.alice.country === 'Germany', `${numOf(byId.get('business-roles'))} Alice is a country manager for Germany`);
  expect(claimsOf.bob.salesRole === 'director', `${numOf(byId.get('business-roles'))} Bob is the director`);
  expect(typeof claimsOf.dan.denied === 'string', `${numOf(byId.get('business-roles'))} Dan is refused sign-in`);
  expect(!checkClaimsResult(claimsOf.alice, contract.claims), `${numOf(byId.get('business-roles'))} Alice's claims pass the claim rules`);
  expect(!!checkClaimsResult({ role: 'director', country: 'All' }), `${numOf(byId.get('business-roles'))} a claim named role is refused`);

  // Each country, its own targets.
  {
    const lesson = byId.get('country-targets');
    const as = (name) => person(name, claimsOf[name]);
    let db = final.db;
    let r = create(db, as('bob'), { country: 'France', amount: 1000000, owner_id: as('bob').claims.sub });
    expect(r.ok, `${numOf(lesson)} Bob adds France`);
    r = create(r.db, as('bob'), { country: 'Germany', amount: 3000000, owner_id: as('bob').claims.sub });
    db = r.db;
    const countries = (name) => (readAll(db, as(name)).result ?? []).map((x) => x.country).sort().join();
    expect(countries('alice') === 'Germany', `${numOf(lesson)} Alice reads Germany only`);
    expect(countries('carol') === 'France', `${numOf(lesson)} Carol reads France only`);
    expect(countries('bob') === 'France,Germany', `${numOf(lesson)} Bob reads both`);
    const sent = create(db, as('alice'), { country: 'Germany', year: 2027, amount: 1000000, owner_id: as('alice').claims.sub });
    expect(!sent.ok, `${numOf(lesson)} Alice's create, sent directly, is refused`);
    const noClaims = readAll(db, person('alice'));
    expect(!noClaims.ok && /403/.test(noClaims.error), `${numOf(lesson)} without dynamic claims, a policy that names claims.salesRole is refused (403)`);
    // The slip: without the director's .or, Bob reads nothing.
    const slipStep = lesson.steps.find((s) => s.edits?.[0]?.to === C.COUNTRY_READ_RULE_SLIP);
    const slipped = { ...final, db, files: { ...final.files } };
    const withSlip = doStep(slipped, slipStep, answer).project;
    const plan = planApply(withSlip);
    expect(!plan.blocked && (readAll(plan.db, as('bob')).result ?? []).length === 0, `${numOf(lesson)} without the director's rule, Bob reads no targets`);
  }

  // Every entity the course writes is read without problems.
  for (const e of entityFiles(final)) expect(!e.problems.length && e.explicitRules, `${e.file}: decorators read, permissions explicit`);
}

// ---------------------------------------------------------------- saved step positions
// Steps split since STEPS_FROM move the positions saved in a browser: src/step-moves.mjs says where each old
// one goes. It must be what tools/make-step-moves.mjs makes from the two lesson lists today, and every old
// position must land on the same step, on the first part of the step that was split, or on the summary.
console.log(`\nsaved step positions (lessons as at ${STEPS_FROM})`);
{
  let old;
  try {
    old = await lessonsAt(STEPS_FROM);
  } catch (e) {
    console.log(`   skipped: no git history to compare with (${e.message.split('\n')[0]})`);
  }
  if (old) {
    const fresh = movesFor(old, lessons);
    if (JSON.stringify(fresh) !== JSON.stringify(stepMoves)) fail('src/step-moves.mjs is out of date: run node tools/make-step-moves.mjs');
    let moved = 0;
    for (const [id, moves] of Object.entries(stepMoves)) {
      const before = old.find((l) => l.id === id)?.steps;
      const now = byId.get(id)?.steps;
      if (!before || !now) {
        fail(`step-moves: ${id} is not a lesson in both lists`);
        continue;
      }
      const label = `step-moves ${id}`;
      if (moves.length !== before.length + 2) fail(`${label}: ${moves.length} positions for ${before.length} old steps`);
      if (moves[0] !== 0) fail(`${label}: the idea card moves`);
      if (moves.at(-1) !== now.length + 1) fail(`${label}: a saved summary is no longer the summary`);
      if (moves.some((m, i) => i && m <= moves[i - 1])) fail(`${label}: positions out of order`);
      const keysNow = now.map(stepKey);
      for (let i = 1; i <= before.length; i++) {
        const key = stepKey(before[i - 1]);
        const to = moves[i];
        const range = keysNow.slice(to - 1, (moves[i + 1] ?? now.length + 1) - 1);
        // the same step; or the first part of the steps it became (its content is in them, or it was rewritten into them)
        const ok = keysNow[to - 1] === key || range.includes(key) || (!keysNow.includes(key) && range.length >= 1);
        if (!ok) fail(`${label}: old step ${i} lands on step ${to}, which is not that step or its first part`);
        if (to !== i) moved++;
      }
    }
    console.log(`   ${Object.keys(stepMoves).length} lessons, ${moved} old step positions moved`);
  }
}

console.log(failures ? `\n${failures} failure(s)` : `\nall checks passed (TypeScript ${ts.version})`);
process.exit(failures ? 1 : 0);
