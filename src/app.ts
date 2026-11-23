import './app.css';
import * as monaco from './monaco.js';
import { lessons } from './lesson-list.mjs';
import { chapters, modules, parts } from './course.mjs';
import { terms, help } from './terms.mjs';
import editorLibs from 'virtual:editor-libs';
import { answer, entries, readLakehouse, savedResult, snapshotsTakenAt, type Answer, type Mode, type ReadAnswer, type ReadRequest } from './stand-in';
import { rawPayload } from './connectors-sim.mjs';
import { STEPS_VERSION, stepMoves } from './step-moves.mjs';
import { VISUAL_IDS } from './visuals/pages.mjs';
import { DISCLAIMER_FOOTER, DISCLAIMER_SHORT, DISCLAIMER_TEXT, DISCLAIMER_TITLE, REPORT_MISTAKE_LABEL, REPORT_MISTAKE_URL, disclaimerParts } from './disclaimer.mjs';
import {
  CLAIMS_TYPES,
  FUNCTION_APP,
  FOLDED_AT_START,
  PAGE_FILE,
  WORKSPACE_MODULES,
  SIMULATED_ENV,
  applyFileEdits,
  checkpoint,
  connectorAuth,
  connectorNames,
  dynamicClaims,
  emptyProject,
  functionsEnabled,
  isGenerated,
  isPlaceholder,
  numberRuns,
  runCommand,
  stepFile,
  stepIsDone,
} from './project.mjs';
import {
  claimsContract,
  columnOf,
  dataService,
  describeRule,
  effectiveRules,
  emptyDb,
  entityFiles,
  inAppSchema,
  handleRequest,
  sqlType,
  unlimitedText,
} from './app-data.mjs';

type Edit = { file?: string; from: string; to: string; all?: boolean };
type Point = 'editor' | 'files' | 'preview' | 'status' | 'terminal' | 'log' | 'queries' | 'help' | 'run' | 'reset' | 'data' | 'signin';
type Step = {
  do: string;
  code?: string;
  run?: string;
  see?: string;
  why?: string;
  file?: string;
  find?: string;
  point?: Point;
  edits?: Edit[];
  errors?: number | '1+';
  done?: { file?: string; before?: [string, string]; absent?: string };
  copy?: false;
  visual?: string;
};
type Link = { href: string; label: string };
type Lesson = {
  id: string;
  title: string;
  goal: string;
  builds: string[];
  pbi: string;
  idea: string;
  steps: Step[];
  summary: string[];
  fabric: { text: string; links: Link[] };
};
type Question = { q: string; options: string[]; answer: number; why: string; lesson: string; step: number };
type Module = { id: string; title: string; goal: string; lessons: string[]; check?: Question[] };
type Chapter = { id: string; title: string; goal: string; builds: string[]; modules?: string[]; coming?: string[] };
type Part = { id: string; title: string; level: string; goal: string; chapters: string[] };
// The app's own database, as src/app-data.mjs keeps it (simulated, in this browser).
type AppColumn = { kind: string; optional: boolean; max?: number | 'MAX'; min?: number; maxValue?: number; precision?: number; scale?: number; values?: string[] };
type AppRule = { role: string; actions: string[]; source: string };
type AppTable = { columns: Record<string, AppColumn>; rules: AppRule[] };
type AppDb = { tables: Record<string, AppTable>; rows: Record<string, Record<string, unknown>[]> };
type Project = { cwd: string | null; appDir: string | null; files: Record<string, string>; packages: string[]; dev: boolean; history: string[]; db: AppDb };

// ---------------------------------------------------------------- settings
const RUN_DELAY_MS = 700; // compile and run after a pause in typing
const QUERY_DELAY_MS: [number, number] = [250, 600]; // simulated round trip
// Stop a page that keeps querying. A redraw loop sends every one of the page's queries again on each
// simulated round trip (about 7 a second for a page with three), so it trips this in about 6 seconds.
// Normal use stays under it: a slicer click on a four-query page sends 4, ten clicks in 10 seconds 40.
const CUTOFF = { queries: 40, withinMs: 10_000 };

// ---------------------------------------------------------------- the course
const course = modules as Module[]; // in course order: the live chapters' modules, one chapter after another
const byId = new Map((lessons as Lesson[]).map((l) => [l.id, l]));
/** Every lesson, in course order. */
const order: Lesson[] = course.flatMap((m) => m.lessons.map((id) => byId.get(id)!));
numberRuns(order); // a command the course runs again is done once it is in the history that many times
const moduleOf = (l: Lesson) => course.find((m) => m.lessons.includes(l.id))!;
/** "4.2": the chapter's number, then the lesson's place in that chapter. Modules have no number on screen. */
function num(l: Lesson) {
  const c = chapterOf(l);
  return `${chapterNum(c)}.${lessonsOf(c).indexOf(l) + 1}`;
}
const termById = new Map(terms.map((t) => [t.id, t]));

// Chapters group the modules (see course.mjs); lessons are numbered within their chapter.
const chapterList = chapters as Chapter[];
const chapterOf = (l: Lesson) => chapterList.find((c) => c.modules?.includes(moduleOf(l).id))!;
const chapterNum = (c: Chapter) => chapterList.indexOf(c) + 1;
const modulesOf = (c: Chapter) => (c.modules ?? []).map((id) => course.find((m) => m.id === id)!);
const lessonsOf = (c: Chapter) => modulesOf(c).flatMap((m) => m.lessons.map((id) => byId.get(id)!));
// Parts group the chapters (see course.mjs); every chapter is in exactly one.
const partList = parts as Part[];
const partNum = (p: Part) => partList.indexOf(p) + 1;
const chaptersOf = (p: Part) => p.chapters.map((id) => chapterList.find((c) => c.id === id)!);

// ---------------------------------------------------------------- small helpers
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Inline `code`, **bold** and [[glossary terms]], nothing else. Text is never parsed as HTML. */
function rich(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)) {
    if (!part) continue;
    if (part.startsWith('`')) frag.append(h('code', {}, part.slice(1, -1)));
    else if (part.startsWith('**')) frag.append(h('b', {}, part.slice(2, -2)));
    else if (part.startsWith('[[')) frag.append(termLink(part.slice(2, -2)));
    else frag.append(part);
  }
  return frag;
}

/** Text without its `code` and **bold** marks, for tooltips. */
const plain = (s: string) => s.replace(/`|\*\*/g, '');

/** [[props]] or [[shown text|term-id]]: a word that opens its explanation in the Help tab. */
function termLink(inner: string): Node {
  const [shown, id = shown.toLowerCase()] = inner.split('|');
  const t = termById.get(id);
  if (!t) return document.createTextNode(shown);
  const b = h('button', { type: 'button', class: 'term', title: `${t.term}: ${plain(t.means)} (click for more, in the Help tab)` }, shown);
  b.addEventListener('click', () => showTerm(t.id));
  return b;
}

/** Items joined with a separator, for short inline lists of links. */
function joined(items: Node[], sep = ' · '): (Node | string)[] {
  return items.flatMap((x, i) => (i ? [sep, x] : [x]));
}

const lessonLink = (l: Lesson, step?: number) =>
  h('a', { href: `#${l.id}${step ? `/${step}` : ''}` }, `${num(l)} ${l.title}${step ? `, step ${step}` : ''}`);
const extLink = (l: Link) => h('a', { href: l.href, target: '_blank', rel: 'noopener' }, l.label);

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`page-playground:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(`page-playground:${key}`);
      else localStorage.setItem(`page-playground:${key}`, value);
    } catch {
      /* private window or blocked storage: the project and progress just aren't kept */
    }
  },
};

// Edits saved per lesson by earlier versions of the playground: the course is one project now.
try {
  for (const k of Object.keys(localStorage)) if (/^page-playground:code:/.test(k)) localStorage.removeItem(k);
} catch {
  /* storage blocked */
}

// Step positions saved before some steps were split (one action per card) point too early: move them once,
// through the table in src/step-moves.mjs (a finished lesson's summary stays its summary). Links such as
// #client/3 can't tell an old position from a new one, so they are left as they are.
if (store.get('steps-v') !== STEPS_VERSION) {
  for (const [id, moves] of Object.entries(stepMoves)) {
    const saved = store.get(`step:${id}`);
    const to = saved === null ? undefined : moves[Number(saved)];
    if (to !== undefined) store.set(`step:${id}`, String(to));
  }
  store.set('steps-v', STEPS_VERSION);
}

/** Progress, kept in this browser. A lesson is done once its summary card has been shown. */
const progress = {
  done: (l: Lesson) => store.get(`done:${l.id}`) === '1',
  started: (l: Lesson) => progress.done(l) || Number(store.get(`step:${l.id}`) ?? 0) > 0,
  right: (m: Module, i: number) => store.get(`check:${m.id}:${i}`) === '1',
  checkDone: (m: Module) => !!m.check?.every((_, i) => progress.right(m, i)),
};

const fmtTime = (d: Date) => d.toTimeString().slice(0, 8);
const terminalAnswer = (connector: string, query: string) => answer(connector, query, undefined, 'normal').result;

// ---------------------------------------------------------------- the project
function loadProject(): Project {
  try {
    const p = JSON.parse(store.get('project') ?? 'null') as Project | null;
    if (p && typeof p.files === 'object' && Array.isArray(p.packages)) {
      for (const f of Object.keys(p.files)) p.files[f] = p.files[f].replace(/\r\n/g, '\n');
      p.db ??= emptyDb() as AppDb;
      return p;
    }
  } catch {
    /* unreadable: start empty */
  }
  return emptyProject() as Project;
}

let project: Project = loadProject();
let saveTimer: number | undefined;
function saveProject() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => store.set('project', JSON.stringify(project)), 200);
}

/** Replace the whole project (a checkpoint, reset, undo), keeping the old one for one undo. */
function replaceProject(next: Project, note: string, open?: string, alsoUndo?: () => void) {
  const previous = project;
  const wasOpen = activeFile;
  project = JSON.parse(JSON.stringify(next));
  saveProject();
  syncModels();
  const first =
    open && open in project.files ? open : Object.keys(project.files).includes(PAGE_FILE) ? PAGE_FILE : Object.keys(project.files)[0];
  if (first) openFile(first);
  else showNoFiles();
  renderPrompt();
  updateDoneTick();
  renderSignIn();
  renderData();
  runNow();
  // Undo goes back to the file that was open, too.
  showUndo(note, () => {
    replaceProject(previous, 'Undone.', wasOpen);
    alsoUndo?.();
  });
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
function sameProject(a: Project, b: Project) {
  const fa = Object.keys(a.files).sort();
  const fb = Object.keys(b.files).sort();
  if (fa.join('|') !== fb.join('|')) return false;
  if (fa.some((f) => squash(a.files[f]) !== squash(b.files[f]))) return false;
  return [...a.packages].sort().join('|') === [...b.packages].sort().join('|') && a.appDir === b.appDir && a.dev === b.dev;
}

const checkpointOf = (l: Lesson) => checkpoint(order, order.indexOf(l), terminalAnswer) as Project;
const projectAfter = (l: Lesson) => checkpoint(order, order.indexOf(l) + 1, terminalAnswer) as Project;

// ---------------------------------------------------------------- where we are
// The panel shows a lesson (position 0 is the idea card, 1..n the steps, n + 1 the summary), or,
// when `check` is set, a module's knowledge check (one question per position, then the result).
let lesson: Lesson = order[0];
let check: Module | undefined;
let position = 0;
let doneTick: HTMLElement | undefined;
/** On a step card: the line that names the step's file, and the button that goes to its red line. */
let fileNote: HTMLElement | undefined;
let redLine: HTMLElement | undefined;
/** The lesson whose start didn't match the project, until the reader chooses. */
let mismatch: Lesson | undefined;

const lastPosition = () => (check ? check.check!.length : lesson.steps.length + 1);
const currentStep = (): Step | undefined => (check ? undefined : lesson.steps[position - 1]);

type Route = { lesson: Lesson; check?: Module; position?: number };

/** #lesson-id, #lesson-id/3 (a step), #check/module-id, #check/module-id/1 (a question). */
function parseHash(): Route | undefined {
  const [a, b, c] = decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
  const at = (s?: string) => (s !== undefined && Number.isFinite(Number(s)) ? Number(s) : undefined);
  if (a === 'check') {
    const m = course.find((x) => x.id === b && x.check);
    return m ? { lesson: byId.get(m.lessons.at(-1)!)!, check: m, position: at(c) } : undefined;
  }
  const l = byId.get(a);
  return l ? { lesson: l, position: at(b) } : undefined;
}

function writeHash() {
  const where = check ? `check/${check.id}` : lesson.id;
  const hash = `#${where}${position ? `/${position}` : ''}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function openRoute(r: Route) {
  const changed = r.lesson !== lesson || !opened;
  check = r.check;
  lesson = r.lesson;
  opened = true;
  store.set('lesson', lesson.id);
  const saved = check ? 0 : Number(store.get(`step:${lesson.id}`) ?? 0) || 0;
  const pos = r.position ?? saved;
  // A lesson opened at its start, on a project that isn't where the lesson begins: offer the course's.
  mismatch =
    changed && !check && pos === 0 && order.indexOf(lesson) > 0 && store.get(`keep:${lesson.id}`) !== '1' && !sameProject(project, checkpointOf(lesson))
      ? lesson
      : undefined;
  goTo(pos);
  closeCourse();
}
let opened = false;

function goTo(p: number) {
  position = Math.max(0, Math.min(lastPosition(), p));
  if (!check) {
    store.set(`step:${lesson.id}`, String(position));
    if (position === lastPosition()) store.set(`done:${lesson.id}`, '1');
  }
  writeHash();
  renderPanel();
  // One part under the other (a narrow or zoomed window): a new card starts in view, wherever the page was scrolled to.
  if (stacked.matches) {
    const top = $('lesson').getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight - 80) $('lesson').scrollIntoView({ block: 'start' });
  }
}
const stacked = window.matchMedia('(max-width: 1000px)');

// ---------------------------------------------------------------- lesson panel, one card at a time
function copyButton(text: string, label = 'Copy') {
  const b = h('button', { type: 'button', class: 'copy' }, label);
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = 'Copied';
    } catch {
      b.textContent = 'Select the text to copy';
    }
    setTimeout(() => (b.textContent = label), 1500);
  });
  return b;
}

/** Above the card: the lesson's title, then a thin bar with where we are ("Step 2 of 15"). The module is named, without a number. */
function panelHead(m: Module, title: (Node | string)[], where: string) {
  const share = lastPosition() ? position / lastPosition() : 0;
  return h(
    'div',
    { class: 'lesson-head' },
    h('h1', {}, ...title),
    h(
      'div',
      { class: 'step-bar' },
      h('span', { class: 'module-line' }, m.title),
      h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width: ${(share * 100).toFixed(1)}%` })),
      h('span', { class: 'where' }, where),
    ),
  );
}

// ---------------------------------------------------------------- pop-outs and resizable sections
/** Show a section large, over the page, for comfortable reading. One at a time; Esc or a click outside docks it.
 *  The About box (the Simulated chip opens it) is shown the same way, and hidden again when docked. */
function setPopped(el: HTMLElement | null) {
  for (const x of document.querySelectorAll('.popped')) x.classList.remove('popped');
  $('about').hidden = el?.id !== 'about';
  el?.classList.add('popped');
  $('pop-backdrop').hidden = !el;
  for (const b of document.querySelectorAll<HTMLElement>('.pop-btn')) {
    const on = !!b.closest('.popped');
    b.textContent = on ? 'Dock' : 'Pop out';
    b.setAttribute('aria-pressed', String(on));
  }
  if (el?.id === 'panel') termOut.scrollTop = termOut.scrollHeight;
  // The code shown large is easier to read in a larger font, too.
  const big = el?.id === 'editor-wrap';
  editor.updateOptions({ fontSize: big ? 16 : 13.5, lineHeight: big ? 25 : 21 });
}

/** A divider that sets a CSS size variable while dragged. The size is remembered; double-click resets it.
 *  `unit`: '%' for the panes, 'px' for the file list. */
function initSplit(id: string, cssVar: string, sizedClass: string, compute: (e: PointerEvent) => number, min: number, max: number, unit = '%') {
  const el = $(id);
  const root = document.documentElement;
  const apply = (value: string | null) => {
    if (value) root.style.setProperty(cssVar, value);
    else root.style.removeProperty(cssVar);
    root.classList.toggle(sizedClass, !!value);
  };
  apply(store.get(`size:${cssVar}`));
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.classList.add('dragging');
    // While dragging, the preview iframe must not swallow the pointer (see body.resizing in the CSS).
    document.body.classList.add('resizing');
    const move = (ev: PointerEvent) => apply(`${Math.max(min, Math.min(max, compute(ev))).toFixed(unit === 'px' ? 0 : 1)}${unit}`);
    const up = () => {
      el.classList.remove('dragging');
      document.body.classList.remove('resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      store.set(`size:${cssVar}`, root.style.getPropertyValue(cssVar) || null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  el.addEventListener('dblclick', () => {
    apply(null);
    store.set(`size:${cssVar}`, null);
  });
}

/** Where "Next" goes after a lesson's summary: its module's check, or the next lesson. */
function afterLesson(l: Lesson): { href: string; label: string; upNext: (Node | string)[] } | undefined {
  const m = moduleOf(l);
  if (m.lessons.at(-1) === l.id && m.check) {
    return {
      href: `#check/${m.id}`,
      label: 'Check your knowledge →',
      upNext: ['Up next: a few questions on ', h('b', {}, m.title), '.'],
    };
  }
  const next = order[order.indexOf(l) + 1];
  if (!next) return undefined;
  return {
    href: `#${next.id}`,
    label: `Next: ${num(next)} ${next.title} →`,
    upNext: ['Up next: ', h('b', {}, `${num(next)} ${next.title}`), `. You'll be able to ${next.goal}.`],
  };
}

function renderPanel() {
  if (check) renderCheck();
  else renderLesson();
  const step = currentStep();
  const file = stepFile(step);
  newFiles.clear(); // "new" in the file list lasts for the card that made the files
  treeReveal = file ?? activeFile; // the file list scrolls to the step's file
  // The file list opens for a card that points at it or creates a file, and only for that card.
  treeForStep = !!step && (step.point === 'files' || !!step.edits?.some((e) => e.from === '' && project.files[e.file ?? PAGE_FILE] === undefined));
  treeToggled = false;
  applyTree();
  if (file && project.files[file] !== undefined && file !== activeFile) openFile(file);
  else renderFiles(); // the step's file is marked in the file list
  updateRedLine();
  pointAt(step?.point);
  markFind(step);
  renderCourseButton();
  showRunning();
  ($('btn-answer') as HTMLButtonElement).hidden = !!check || !lesson.steps.some((s) => s.edits || s.run);
}

/** The "your project isn't at this lesson's start" banner. */
function mismatchBanner() {
  if (mismatch !== lesson) return null;
  const use = h('button', { type: 'button' }, "Use the playground's version");
  use.addEventListener('click', () => {
    mismatch = undefined;
    replaceProject(checkpointOf(lesson), `Switched to the start of ${num(lesson)} ${lesson.title}.`);
    renderPanel();
  });
  const keep = h('button', { type: 'button' }, 'Keep mine');
  keep.addEventListener('click', () => {
    mismatch = undefined;
    store.set(`keep:${lesson.id}`, '1');
    renderPanel();
  });
  return h(
    'div',
    { class: 'banner' },
    h('p', {}, 'Your project is not where this lesson starts (you may have skipped ahead, or written something differently). The steps expect the playground\'s version.'),
    h('div', { class: 'actions' }, use, keep),
  );
}

function renderLesson() {
  const n = lesson.steps.length;
  const last = lastPosition();
  const el = $('lesson');
  doneTick = undefined;
  fileNote = undefined;
  redLine = undefined;

  const card = h('div', { class: 'card' });
  const banner = mismatchBanner();
  if (banner) card.append(banner);
  if (position === 0) {
    card.append(
      h('p', { class: 'kicker' }, 'In Power BI terms'),
      h('p', { class: 'pbi' }, rich(lesson.pbi)),
      h('p', {}, rich(lesson.idea)),
      h('p', { class: 'goal' }, h('b', {}, "You'll be able to: "), `${lesson.goal}.`),
    );
    if (lesson.builds.length) {
      card.append(h('p', { class: 'builds' }, 'Builds on: ', ...joined(lesson.builds.map((id) => lessonLink(byId.get(id)!)))));
    }
  } else if (position === last) {
    card.append(
      h('p', { class: 'kicker' }, 'Summary'),
      h('ul', { class: 'summary' }, ...lesson.summary.map((s) => h('li', {}, rich(s)))),
      h(
        'div',
        { class: 'fabric' },
        h('p', { class: 'kicker' }, 'In a real Fabric app'),
        h('p', {}, rich(lesson.fabric.text)),
        h('p', { class: 'links' }, ...joined(lesson.fabric.links.map(extLink))),
      ),
    );
    const after = afterLesson(lesson);
    if (after) card.append(h('p', { class: 'up-next' }, ...after.upNext));
  } else {
    const step = currentStep()!;
    // A steady card: the instruction, then its buttons, then the code to paste (a few lines, scrolling inside
    // itself), then what you should see. Why is folded. The buttons and "You should see" stay in view.
    card.append(h('p', { class: 'do' }, rich(step.do)));
    const actions = h('div', { class: 'actions' });
    // The step's file: nothing while it is the open one; "Open …" when another file is open; "Creates …" for a new one.
    fileNote = stepFile(step) ? h('span', { class: 'step-file' }) : undefined;
    if (fileNote) actions.append(fileNote);
    const findText = findTextOf(step);
    if (findText) {
      const show = h('button', { type: 'button', title: 'Shows where this step\'s code goes: selects what to replace, or puts the cursor where to add' }, 'Show me in the code');
      show.addEventListener('click', () => showInCode(findText, step));
      actions.append(show);
    }
    if (step.edits || step.run) {
      const doIt = h('button', { type: 'button' }, 'Do it for me');
      doIt.addEventListener('click', () => doStepNow(step, doIt));
      actions.append(doIt);
      doneTick = h('span', { class: 'done', hidden: '' }, '✓ Done');
      actions.append(doneTick);
    }
    if (step.errors) {
      // The red line a step promises can be in another file, or further down: one click goes to it.
      redLine = h('button', { type: 'button', class: 'red-line', hidden: '', title: 'Opens the file with the red line and scrolls to it' }, '✕ Show the red line');
      redLine.addEventListener('click', () => showProblem());
      actions.append(redLine);
    }
    if (actions.childElementCount) card.append(actions);
    const snippet = step.run ?? step.code;
    // `copy: false`: the code is only to read (Do it for me writes it), so there is nothing to paste.
    const long = !!snippet && snippet.split('\n').length > 3; // may give way to the lines under it, down to 3 lines
    if (snippet) card.append(h('div', { class: `snippet${step.run ? ' command' : ''}${long ? ' long' : ''}` }, h('pre', {}, step.run ? `$ ${step.run}` : snippet), step.copy === false ? null : copyButton(snippet)));
    if (step.see) card.append(h('p', { class: 'see' }, h('b', {}, 'You should see: '), rich(step.see)));
    if (step.why) {
      const why = h('details', { class: 'why' }, h('summary', {}, 'Why?'), h('p', {}, rich(step.why)));
      why.addEventListener('toggle', () => (why as HTMLDetailsElement).open && why.scrollIntoView({ block: 'nearest' }));
      card.append(why);
    }
    // Optional, and only a link: the same kind of visual on the Visuals page, drawn with Microsoft's visuals packages.
    if (step.visual) {
      card.append(
        h(
          'p',
          { class: 'visual-link' },
          h('a', { href: `visuals/#/${step.visual}`, target: '_blank', rel: 'noopener', title: 'Opens the Visuals page in a new tab' }, 'The same kind of visual with Microsoft\'s visuals packages →'),
        ),
      );
    }
  }

  const back = h('button', { type: 'button', class: 'back' }, '← Back');
  back.addEventListener('click', () => goTo(position - 1));
  (back as HTMLButtonElement).disabled = position === 0;
  let next: HTMLElement;
  if (position === last) {
    const after = afterLesson(lesson);
    next = after
      ? h('a', { class: 'next', href: after.href }, after.label)
      : h('span', { class: 'muted' }, 'That was the last lesson.');
  } else {
    next = h('button', { type: 'button', class: 'next' }, position === 0 ? 'Start →' : position === n ? 'Summary →' : 'Next →');
    next.addEventListener('click', () => goTo(position + 1));
  }

  el.replaceChildren(
    panelHead(moduleOf(lesson), [h('span', { class: 'num' }, num(lesson)), lesson.title], position === 0 ? 'The idea' : position === last ? 'Summary' : `Step ${position} of ${n}`),
    card,
    h('div', { class: 'lesson-nav' }, back, next),
  );
  el.scrollTop = 0;
  updateDoneTick();
}

// ---------------------------------------------------------------- knowledge check
function renderCheck() {
  const m = check!;
  const qs = m.check!;
  const el = $('lesson');
  doneTick = undefined;
  fileNote = undefined;
  redLine = undefined;

  const card = h('div', { class: 'card' });
  if (position < qs.length) {
    const qi = position;
    const q = qs[qi];
    card.append(h('p', { class: 'do' }, rich(q.q)));
    const list = h('div', { class: 'options', role: 'group', 'aria-label': 'Answers' });
    const feedback = h('div', { class: 'feedback', hidden: '' });
    q.options.forEach((text, i) => {
      const b = h('button', { type: 'button', class: 'option' }, rich(text));
      b.addEventListener('click', () => {
        const ok = i === q.answer;
        store.set(`check:${m.id}:${qi}`, ok ? '1' : '0');
        [...list.children].forEach((o, j) => {
          o.classList.toggle('right', j === q.answer);
          o.classList.toggle('wrong', j === i && !ok);
          (o as HTMLButtonElement).disabled = true;
        });
        const taught = byId.get(q.lesson)!;
        feedback.replaceChildren(
          h('p', { class: ok ? 'ok' : 'bad' }, ok ? '✓ Right.' : '✕ Not quite.'),
          h('p', {}, rich(q.why)),
          h('p', { class: 'muted' }, 'Taught in ', lessonLink(taught, q.step), '.'),
        );
        feedback.hidden = false;
        renderCourseButton();
      });
      list.append(b);
    });
    card.append(list, feedback);
  } else {
    const right = qs.filter((_, i) => progress.right(m, i)).length;
    card.append(
      h('p', { class: 'kicker' }, 'Result'),
      h('p', { class: 'pbi' }, `${right} of ${qs.length} right.`),
      h(
        'p',
        {},
        right === qs.length
          ? `That is ${m.title} done: ${m.goal.charAt(0).toLowerCase()}${m.goal.slice(1)}`
          : 'Go back to any question to try again. Each answer links to the step that teaches it.',
      ),
    );
  }

  const back = h('button', { type: 'button', class: 'back' }, '← Back');
  back.addEventListener('click', () => goTo(position - 1));
  (back as HTMLButtonElement).disabled = position === 0;
  let next: HTMLElement;
  if (position === qs.length) {
    const nextModule = course[course.indexOf(m) + 1];
    const first = nextModule && byId.get(nextModule.lessons[0])!;
    next = first
      ? h('a', { class: 'next', href: `#${first.id}` }, `Next: ${num(first)} ${first.title} →`)
      : h('span', { class: 'muted' }, 'That was the last lesson.');
  } else {
    next = h('button', { type: 'button', class: 'next' }, position === qs.length - 1 ? 'Result →' : 'Next question →');
    next.addEventListener('click', () => goTo(position + 1));
  }

  el.replaceChildren(
    panelHead(m, ['Check your knowledge'], position === qs.length ? 'Result' : `Question ${position + 1} of ${qs.length}`),
    card,
    h('div', { class: 'lesson-nav' }, back, next),
  );
  el.scrollTop = 0;
}

// ---------------------------------------------------------------- course drawer
function renderCourseButton() {
  const chapter = chapterOf(lesson);
  const list = lessonsOf(chapter);
  const done = list.filter(progress.done).length;
  $('course-where').textContent = check ? `Check your knowledge: ${check.title}` : `${num(lesson)} ${lesson.title}`;
  $('course-count').textContent = `Chapter ${chapterNum(chapter)} · ${done} of ${list.length} lessons`;
  ($('course-bar').firstElementChild as HTMLElement).style.width = `${(done / list.length) * 100}%`;
}

/** A chapter's state, computed from progress: never stored. */
function chapterState(c: Chapter): { key: 'done' | 'progress' | 'new' | 'coming'; label: string } {
  if (!c.modules) return { key: 'coming', label: 'Coming soon' };
  const list = lessonsOf(c);
  const done = list.filter(progress.done).length;
  if (done === list.length) return { key: 'done', label: 'Done ✓' };
  // Opening a lesson elsewhere leaves a step position behind; that alone doesn't make a chapter started.
  const here = c === chapterOf(lesson) && (!!project.appDir || list.some(progress.started));
  if (done > 0 || here) return { key: 'progress', label: `In progress · ${done} of ${list.length}` };
  return { key: 'new', label: 'Not started' };
}

/** Open a chapter: the first lesson not done. A chapter not started yet starts from its checkpoint (Undo is offered). */
function openChapter(c: Chapter) {
  const list = lessonsOf(c);
  const target = list.find((l) => !progress.done(l)) ?? list[0];
  closeCourse();
  if (chapterState(c).key === 'new') {
    // A clean terminal: output from another chapter would only confuse. Undo brings it back with the project.
    const lines = saveTerminal();
    termOut.replaceChildren();
    termPrint([`Playground: Chapter ${chapterNum(c)}, ${c.title}. The project is as the chapter begins: every earlier step done.`]);
    replaceProject(checkpointOf(list[0]), `Started ${c.title}: the project as the chapter begins.`, undefined, () => restoreTerminal(lines));
    store.set(`keep:${list[0].id}`, null);
  }
  location.hash = `#${target.id}`;
  hideSplash();
}

/** A chapter's open/start button, for the splash and the drawer. */
function chapterButton(c: Chapter) {
  const state = chapterState(c).key;
  const b = h(
    'button',
    { type: 'button', class: 'link-btn', title: state === 'new' ? 'Builds the project as this chapter begins (every earlier step done). Undo is offered.' : undefined },
    state === 'new' ? 'Start this chapter →' : 'Continue this chapter →',
  );
  b.addEventListener('click', () => openChapter(c));
  return b;
}

function renderCourse() {
  const resume = order.find((l) => !progress.done(l));
  const body = $('course-body');
  const startOver = h(
    'button',
    { type: 'button', class: 'link-btn', title: 'Empties the project and clears progress and quiz answers. Undo is offered.' },
    'Restart the playground',
  );
  startOver.addEventListener('click', () => {
    closeCourse();
    restartCourse();
  });
  const live = chapterList.filter((c) => c.modules);
  body.replaceChildren(
    h(
      'p',
      { class: 'muted' },
      `${order.length} lessons in ${live.length} chapters so far, one step at a time, building one app. Progress and the project are kept in this browser only.`,
    ),
    resume
      ? h('a', { class: 'next resume', href: `#${resume.id}` }, `${progress.started(resume) ? 'Continue' : 'Start'}: ${num(resume)} ${resume.title} →`)
      : h('p', { class: 'ok' }, 'Every lesson done.'),
  );
  for (const c of chapterList) {
    const p = partList.find((x) => x.chapters[0] === c.id);
    if (p) body.append(h('div', { class: 'part-head' }, h('h2', {}, `Part ${partNum(p)} · ${p.title}`), h('span', { class: 'level' }, p.level)));
    const state = chapterState(c);
    const head = h(
      'div',
      { class: `chapter-head${state.key === 'coming' ? ' coming' : ''}` },
      h('h3', {}, h('span', { class: 'num' }, `Chapter ${chapterNum(c)}`), c.title),
      h('span', { class: `chip ${state.key}` }, state.label),
    );
    // Each chapter folds open and shut; the one you are working in starts open.
    const fold = h('details', { class: `chapter${c.modules ? '' : ' coming'}` }, h('summary', {}, head)) as HTMLDetailsElement;
    fold.open = c === chapterOf(lesson);
    fold.append(h('p', { class: 'muted' }, c.goal));
    body.append(fold);
    if (!c.modules) continue;
    if (c !== chapterOf(lesson)) fold.append(h('p', {}, chapterButton(c)));
    for (const m of modulesOf(c)) renderModule(fold, m);
  }
  body.append(h('p', { class: 'start-over' }, startOver));
}

/** One module in the course drawer: its lessons and its knowledge check. */
function renderModule(body: HTMLElement, m: Module) {
  {
    const list = h('ul', {});
    for (const id of m.lessons) {
      const l = byId.get(id)!;
      const state = progress.done(l) ? 'done' : progress.started(l) ? 'started' : 'new';
      list.append(
        h(
          'li',
          {},
          h(
            'a',
            { href: `#${l.id}`, 'aria-current': !check && l === lesson ? 'page' : undefined, title: `You'll be able to ${l.goal}.` },
            h('span', { class: `st ${state}`, 'aria-label': state === 'done' ? 'done' : state === 'started' ? 'started' : 'not started' }),
            h('span', { class: 'num' }, num(l)),
            l.title,
          ),
          !check && l === lesson ? copyLinkButton() : null,
        ),
      );
    }
    if (m.check) {
      const state = progress.checkDone(m) ? 'done' : m.check.some((_, i) => store.get(`check:${m.id}:${i}`) !== null) ? 'started' : 'new';
      list.append(
        h(
          'li',
          { class: 'check-row' },
          h(
            'a',
            { href: `#check/${m.id}`, 'aria-current': check === m ? 'page' : undefined },
            h('span', { class: `st ${state}`, 'aria-label': state }),
            h('span', { class: 'num' }, '?'),
            'Check your knowledge',
          ),
          check === m ? copyLinkButton() : null,
        ),
      );
    }
    body.append(
      h('section', { class: 'mod' }, h('h3', {}, m.title), h('p', { class: 'muted' }, m.goal), list),
    );
  }
}

/** Copy a link to the card on screen, for a trainer or a note: beside the current lesson in the course drawer. */
function copyLinkButton() {
  const b = h('button', { type: 'button', class: 'link-btn copy-link', title: 'Copy a link to the card on screen' }, 'Copy link');
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      b.textContent = 'Link copied';
    } catch {
      b.textContent = 'Copy it from the address bar';
    }
    setTimeout(() => (b.textContent = 'Copy link'), 1500);
  });
  return b;
}

function openCourse() {
  renderCourse();
  $('course').hidden = false;
  $('course-backdrop').hidden = false;
  $('btn-course').setAttribute('aria-expanded', 'true');
  ($('course').querySelector('a') as HTMLElement | null)?.focus();
}

function closeCourse() {
  if ($('course').hidden) return;
  $('course').hidden = true;
  $('course-backdrop').hidden = true;
  $('btn-course').setAttribute('aria-expanded', 'false');
}

// ---------------------------------------------------------------- pointing at the playground
function tabButton(name: string) {
  return document.querySelector<HTMLElement>(`.panel-tabs button[data-tab="${name}"]`);
}

/** Outline the part of the playground a step is about (it blinks three times). A step about a tab of the bottom
 *  panel also opens that tab, the way Power BI opens Performance analyzer when you start recording. */
function pointAt(p?: Point) {
  document.querySelectorAll('.pointed').forEach((e) => e.classList.remove('pointed'));
  if (!p) return;
  const tabs: Point[] = ['terminal', 'log', 'queries', 'data', 'help'];
  if (tabs.includes(p) && !tabButton(p)?.hidden) selectTab(p, false);
  // Help, for a step about an underlined word: open at that word's row, as clicking the word does.
  const word = p === 'help' ? currentStep()?.do.match(/\[\[([^\]]+)\]\]/)?.[1] : undefined;
  if (word) {
    const [shown, id = shown.toLowerCase()] = word.split('|');
    showTerm(id);
  }
  const target = {
    editor: $('editor'),
    files: $('files'),
    preview: $('preview'),
    status: $('run-state'),
    terminal: tabButton('terminal'),
    log: tabButton('log'),
    queries: tabButton('queries'),
    help: tabButton('help'),
    run: $('btn-run'),
    reset: $('btn-reset'),
    data: tabButton('data'),
    signin: $('signin'),
  }[p];
  target?.classList.add('pointed');
}

function updateDoneTick() {
  const step = currentStep();
  if (!doneTick || !step || (!step.edits && !step.run)) return;
  doneTick.hidden = !stepIsDone(project, step);
}

/** The text a step is about: its `find`, or what its first edit changes. */
const findTextOf = (step?: Step) => step?.find ?? (step?.edits?.[0]?.from ? step.edits[0].from.trim() : undefined);

/** When a step card opens, mark its spot in the code (without taking the cursor) and scroll to it.
 *  The mark is a Monaco decoration: Monaco places it, at any browser zoom. It is drawn in the step's file only. */
let findMarks: monaco.editor.IEditorDecorationsCollection | undefined;
/** Is the mark where the reader can see it (they have not scrolled away from it)? Then it stays in view when the editor changes size. */
let markInView = false;
function markFind(step?: Step) {
  findMarks?.clear();
  findMarks = undefined;
  markInView = false;
  const model = editor.getModel();
  const text = findTextOf(step);
  if (!text || !model || activeFile !== stepFile(step)) return;
  const matches = model.findMatches(text, false, false, true, null, false);
  if (!matches.length) return;
  const range = matches[0].range;
  findMarks = editor.createDecorationsCollection([
    { range, options: { className: 'find-mark', overviewRuler: { color: '#ff7fb5', position: monaco.editor.OverviewRulerLane.Center } } },
    // A pink bar beside the marked lines, in the margin: easy to spot even when the mark itself is short.
    { range, options: { isWholeLine: true, linesDecorationsClassName: 'find-line' } },
  ]);
  revealMark(range);
}

/** Scroll so the marked lines are in view, at the editor's size right now (a new card may just have changed it). */
function revealMark(range: monaco.Range, layoutFirst = true) {
  if (layoutFirst) editor.layout();
  editor.revealLinesInCenterIfOutsideViewport(range.startLineNumber, range.endLineNumber);
  revealSideways(range);
  markInView = true;
}

/** Sideways, stay at the start of the lines whenever the range begins in view there (a long line then runs off
 *  to the right, as any long line does). Only a range that begins past the right edge scrolls the code, and
 *  no further than it takes to show it. */
function revealSideways(range: monaco.Range) {
  const line = range.startLineNumber;
  const begins = editor.getOffsetForColumn(line, range.startColumn);
  const ends = editor.getOffsetForColumn(line, range.endLineNumber === line ? range.endColumn : (editor.getModel()?.getLineMaxColumn(line) ?? range.startColumn));
  const room = editor.getLayoutInfo().contentWidth - editor.getLayoutInfo().verticalScrollbarWidth;
  const margin = 24;
  editor.setScrollLeft(begins + margin <= room ? 0 : Math.max(0, Math.min(begins - margin, ends + margin - room)));
}

/** After a scroll to somewhere else (the reader's, a red line, Show me in the code): is the mark still in view? */
function noteMarkInView() {
  const mark = findMarks?.getRange(0);
  markInView = !!mark && rangeInView(mark);
}

const rangeInView = (range: monaco.Range) =>
  editor.getVisibleRanges().some((v) => v.startLineNumber <= range.startLineNumber && v.endLineNumber >= Math.min(range.endLineNumber, range.startLineNumber + 2));

/** Select the step's spot in the editor and scroll to it. */
function showInCode(text: string, step?: Step) {
  const file = stepFile(step);
  if (file && project.files[file] !== undefined && file !== activeFile) openFile(file);
  const model = editor.getModel();
  if (!model) return;
  let matches = model.findMatches(text, false, false, true, null, false);
  // After the step is done, the old text may be gone: show the new text instead.
  if (!matches.length && step?.edits?.[0]?.to) {
    const firstLine = step.edits[0].to.trim().split('\n')[0];
    matches = model.findMatches(firstLine, false, false, true, null, false);
  }
  if (!matches.length) {
    flash('Not found in the code: it may already be changed. Reset brings back the lesson\'s start.');
    return;
  }
  const range = matches[0].range;
  // A step that adds code next to a line (its edit keeps the line) puts the cursor beside it,
  // ready for Enter and paste, instead of selecting the line a paste would then replace.
  const e = !step?.find ? step?.edits?.[0] : undefined;
  if (e && e.from && e.to.startsWith(e.from)) {
    editor.setPosition({ lineNumber: range.endLineNumber, column: range.endColumn });
    flash('The cursor is at the end of the marked line: press Enter, then paste.');
  } else if (e && e.from && e.to.endsWith(e.from)) {
    editor.setPosition({ lineNumber: range.startLineNumber, column: range.startColumn });
    flash('The cursor is at the start of the marked line: paste, then press Enter.');
  } else {
    editor.setSelection(range);
  }
  editor.layout();
  editor.revealLinesInCenter(range.startLineNumber, range.endLineNumber);
  revealSideways(range);
  noteMarkInView();
  editor.focus();
}

/** "Do it for me": run the step's command, or make its edits (each file's change undoable). */
function doStepNow(step: Step, button: HTMLElement) {
  if (step.run) {
    selectTab('terminal');
    submitCommand(step.run);
    return;
  }
  const r = applyFileEdits(project, step.edits);
  if ('error' in r && r.error) {
    button.textContent = project.appDir
      ? 'Your code differs here: do it by hand, or Reset'
      : 'No project yet: Reset loads the start of this lesson';
    return;
  }
  const next = r.project as Project;
  const changed = Object.keys(next.files).filter((f) => next.files[f] !== project.files[f]);
  for (const f of changed) {
    const model = models.get(f);
    if (model) replaceModelText(model, next.files[f]);
    else project.files[f] = next.files[f];
  }
  project = { ...project, files: { ...project.files, ...Object.fromEntries(changed.map((f) => [f, next.files[f]])) } };
  saveProject();
  syncModels();
  const target = changed[0];
  if (target) openFile(target);
  // The step's marked text, when it is (still) there, is already in view. Otherwise select the first new line the step added.
  const e = step.edits?.find((x) => x.to);
  if (e && !(step.find && findMarks?.getRange(0))) {
    const fromLines = new Set(e.from.split('\n').map((l) => l.trim()));
    const added = e.to.split('\n').map((l) => l.trim()).find((l) => l && !fromLines.has(l));
    if (added) showInCode(added, { do: step.do, file: e.file ?? PAGE_FILE });
  }
  updateDoneTick();
}

/** A short message under the editor, on the right: the type errors on the left stay. Gone after 3 seconds. */
const statusHint = $('status-hint').textContent;
let flashTimer: number | undefined;
function flash(message: string) {
  const el = $('status-hint');
  el.textContent = message;
  el.classList.add('flash');
  clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => {
    el.textContent = statusHint;
    el.classList.remove('flash');
  }, 3000);
}

/** A short note with an Undo button, above the editor. */
function showUndo(note: string, undo: () => void) {
  const el = $('undo-bar');
  const b = h('button', { type: 'button' }, 'Undo');
  b.addEventListener('click', () => {
    el.hidden = true;
    undo();
  });
  el.replaceChildren(h('span', {}, note), b);
  el.hidden = false;
  window.setTimeout(() => (el.hidden = true), 12000);
}

// ---------------------------------------------------------------- editor
type TsMessage = string | { messageText: string; next?: TsMessage[] };
type TsDiagnostic = {
  category: number;
  code: number;
  start?: number;
  length?: number;
  messageText: TsMessage;
  reportsUnnecessary?: boolean;
  reportsDeprecated?: boolean;
};
type TsWorker = {
  getEmitOutput(fileName: string): Promise<{ outputFiles: { name: string; text: string }[] }>;
  getSyntacticDiagnostics(fileName: string): Promise<TsDiagnostic[]>;
  getSemanticDiagnostics(fileName: string): Promise<TsDiagnostic[]>;
  getSuggestionDiagnostics(fileName: string): Promise<TsDiagnostic[]>;
};

const ts = monaco.typescript;
ts.typescriptDefaults.setCompilerOptions({
  target: ts.ScriptTarget.ES2020,
  // System modules keep `import.meta` (it becomes the module context's meta) and let the preview
  // link the project's files itself.
  module: ts.ModuleKind.System,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  allowNonTsExtensions: true,
  lib: ['es2022', 'dom'],
  // npm workspaces link @rayfin-app/* by name: map each to its package's src.
  baseUrl: 'file:///',
  paths: Object.fromEntries(Object.entries(WORKSPACE_MODULES).map(([name, file]) => [name, [file]])),
});
// The red lines come from the playground's own check (checkTypes, below), which asks the TypeScript
// worker about every file after every change. Monaco's built-in check is off: it re-checks only the
// file that changed, and a change in a query file can break App.tsx.
ts.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true, noSuggestionDiagnostics: true });
ts.typescriptDefaults.setEagerModelSync(true);
for (const [path, text] of Object.entries(editorLibs.always)) ts.typescriptDefaults.addExtraLib(text, `file:///${path}`);

// Package types appear once the package is installed in the project, as in a real project.
const packageLibs = new Map<string, { dispose(): void }[]>();
function updateLibs() {
  let changed = false;
  for (const [pkg, files] of Object.entries(editorLibs.packages)) {
    const installed = project.packages.includes(pkg);
    changed ||= installed !== packageLibs.has(pkg);
    if (installed && !packageLibs.has(pkg)) {
      packageLibs.set(
        pkg,
        Object.entries(files).map(([path, text]) => ts.typescriptDefaults.addExtraLib(text, `file:///${path}`)),
      );
    } else if (!installed && packageLibs.has(pkg)) {
      packageLibs.get(pkg)!.forEach((d) => d.dispose());
      packageLibs.delete(pkg);
    }
  }
  return changed;
}

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    const file = label === 'typescript' || label === 'javascript' ? 'ts.worker.js' : 'editor.worker.js';
    return new Worker(new URL(`assets/${file}`, document.baseURI), { name: label });
  },
};

monaco.editor.defineTheme('gold-layer', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '7d89a8' },
    { token: 'string', foreground: 'ffe27a' },
    { token: 'keyword', foreground: 'b9a8ff' }, // not pink: pink in the code is the step's mark
    { token: 'number', foreground: '9fe0c0' },
  ],
  colors: {
    'editor.background': '#0a1328',
    'editor.lineHighlightBackground': '#111c38',
    'editorLineNumber.foreground': '#4a5a82',
    'editorLineNumber.activeForeground': '#e8ecf5',
    'editorCursor.foreground': '#e8ecf5',
    'editor.selectionBackground': '#2b3d6b',
    'editorWidget.background': '#111c38',
  },
});

$('editor').replaceChildren();
const noFiles = monaco.editor.createModel('', 'plaintext', monaco.Uri.parse('inmemory://no-files'));
const editor = monaco.editor.create($('editor'), {
  model: noFiles,
  theme: 'gold-layer',
  fontFamily: "'IBM Plex Mono', Consolas, monospace",
  fontSize: 13.5,
  lineHeight: 21,
  minimap: { enabled: false },
  lineNumbersMinChars: 3,
  // No lines pinned to the top while scrolling: in a small editor they cover the code a step marks.
  stickyScroll: { enabled: false },
  // Long lines wrap: a narrow editor never cuts a line, and a mark never needs a sideways scroll.
  wordWrap: 'on',
  wrappingIndent: 'same',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  padding: { top: 8 },
  fixedOverflowWidgets: true,
  readOnly: true,
});

// Monaco measures the width of a character once, when the editor is made, and places marks, selections
// and red lines by it. The code font is a web font that arrives later, so that first measure is of the
// fallback font, which is narrower: everything Monaco draws would sit left of its text, more so further
// along a line, until something makes Monaco measure again (a change of browser zoom does). So: measure
// again whenever a font has loaded.
function remeasureFonts() {
  monaco.editor.remeasureFonts();
  const mark = findMarks?.getRange(0);
  if (mark && markInView) revealMark(mark);
}
if (document.fonts) {
  document.fonts.load("13.5px 'IBM Plex Mono'").then(remeasureFonts, () => undefined);
  document.fonts.ready.then(remeasureFonts, () => undefined);
  document.fonts.addEventListener('loadingdone', remeasureFonts);
}

// The marked code stays in view when the editor changes size (a taller card, a dragged divider, Pop out),
// unless the reader scrolled away from it. Only a scroll that follows the reader's own wheel, key or
// pointer counts: the editor also scrolls by itself while its size or font changes.
let readerActedAt = 0;
for (const type of ['wheel', 'keydown', 'pointerdown', 'pointermove', 'touchmove'] as const) {
  $('editor').addEventListener(
    type,
    (e) => {
      if (type !== 'pointermove' || (e as PointerEvent).buttons) readerActedAt = Date.now();
    },
    { capture: true, passive: true },
  );
}
editor.onDidScrollChange((e) => {
  if ((e.scrollTopChanged || e.scrollLeftChanged) && Date.now() - readerActedAt < 1500) noteMarkInView();
});
editor.onDidLayoutChange(() => {
  // Once the editor has taken its new size in (its visible lines are not up to date inside this event).
  queueMicrotask(() => {
    const mark = findMarks?.getRange(0);
    if (mark && markInView && !rangeInView(mark)) revealMark(mark, false);
  });
});

const models = new Map<string, monaco.editor.ITextModel>();
let activeFile: string | undefined;
/** Where each file was scrolled to, and its cursor: going back to a file goes back to that place. */
const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>();
const uriOf = (path: string) => monaco.Uri.parse(`file:///${path}`);
const isCode = (path: string) => /\.tsx?$/.test(path);

function replaceModelText(model: monaco.editor.ITextModel, text: string) {
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
}

let runTimer: number | undefined;
/** Make the editor's models match the project's files. */
function syncModels() {
  for (const [path, text] of Object.entries(project.files)) {
    let model = models.get(path);
    if (!model) {
      model = monaco.editor.createModel(text, isCode(path) ? 'typescript' : 'plaintext', uriOf(path));
      if (isCode(path)) typesChecked = false; // until the check has answered about this file too
      // An empty model on Windows defaults to CRLF; the steps' exact edits are written with \n.
      model.setEOL(monaco.editor.EndOfLineSequence.LF);
      models.set(path, model);
      model.onDidChangeContent(() => {
        project.files[path] = model!.getValue(monaco.editor.EndOfLinePreference.LF);
        scheduleTypeCheck();
        saveProject();
        scheduleDataRender();
        updateDoneTick();
        clearTimeout(runTimer);
        runTimer = window.setTimeout(runNow, RUN_DELAY_MS);
      });
    } else if (model.getValue(monaco.editor.EndOfLinePreference.LF) !== text) {
      replaceModelText(model, text);
    }
  }
  for (const [path, model] of [...models]) {
    if (!(path in project.files)) {
      monaco.editor.setModelMarkers(model, TYPE_CHECK, []);
      model.dispose();
      models.delete(path);
      viewStates.delete(path);
      if (activeFile === path) activeFile = undefined;
    }
  }
  const libsChanged = updateLibs();
  renderFiles();
  // The red lines a step promises come from this check: at once after a change the playground made,
  // or as soon as the worker has the package types that changed with it.
  scheduleTypeCheck(libsChanged ? TYPE_CHECK_LIBS_MS : 0);
  scheduleDataRender();
}

/** The Data tab reads the decorators: draw it again shortly after the code changes. */
let dataRenderTimer: number | undefined;
function scheduleDataRender() {
  clearTimeout(dataRenderTimer);
  dataRenderTimer = window.setTimeout(() => {
    renderSignIn();
    renderData();
  }, 300);
}

function openFile(path: string) {
  const model = models.get(path);
  if (!model) return;
  const switching = editor.getModel() !== model;
  if (switching && activeFile) viewStates.set(activeFile, editor.saveViewState());
  activeFile = path;
  if (switching) {
    editor.setModel(model);
    editor.restoreViewState(viewStates.get(path) ?? null);
  }
  editor.updateOptions({ readOnly: isGenerated(path, model.getValue()) });
  unfold(path);
  treeReveal = path;
  renderFiles();
  markFind(currentStep());
}

function showNoFiles() {
  activeFile = undefined;
  editor.setModel(noFiles);
  editor.updateOptions({ readOnly: true });
  renderFiles();
}

// ---------------------------------------------------------------- the file list: a folder tree
/** Folders the reader folded. A folder opens again when a file in it is opened, or a step creates one. */
const folded = new Set<string>();
try {
  // The template's folders of placeholders start folded; after that, the reader's choice is kept.
  for (const p of JSON.parse(store.get('folded') ?? JSON.stringify(FOLDED_AT_START)) as string[]) folded.add(p);
} catch {
  /* unreadable: every folder open */
}
/** Files that appeared while this card was open: marked "new" in the list. */
const newFiles = new Set<string>();
/** The files the list showed last time, to tell which are new. */
let listed: Set<string> | undefined;
/** The file whose row the list keeps in view: the step's, or the one opened last. */
let treeReveal: string | undefined;
/** The row the list last scrolled to: it scrolls again for another file, or when its own size changes, and leaves the reader's scrolling alone otherwise. */
let treeRevealed: string | undefined;
/** What the list last drew, as text. */
let treeShows = '';

/** Open the folders a file is in. */
function unfold(path: string) {
  const parts = path.split('/').slice(0, -1);
  let changed = false;
  for (let i = 1; i <= parts.length; i++) changed = folded.delete(parts.slice(0, i).join('/')) || changed;
  if (changed) store.set('folded', JSON.stringify([...folded]));
}

// The file list. Until the reader chooses with **Files**, it shows only in a window at least TREE_FROM_PX wide:
// below that, the code needs the room (the path above the code says where we are). A card that points at the
// list, or creates a file, opens it for that card only; the next card goes back to the reader's own choice.
// **Files** always wins, on any card, and is remembered.
const TREE_FROM_PX = 1500;
/** The card on screen opens the file list. */
let treeForStep = false;
/** The reader pressed Files on the card on screen: the list stays as they left it. */
let treeToggled = false;
const treeChoice = () => {
  const kept = store.get('size:tree');
  return kept ? kept === '1' : window.innerWidth >= TREE_FROM_PX;
};

function showTree(on: boolean) {
  $('editor-wrap').classList.toggle('no-tree', !on);
  $('btn-tree').setAttribute('aria-pressed', String(on));
}

/** Show the file list as the card and the reader's choice say. */
function applyTree() {
  if (!treeToggled) showTree(treeForStep || treeChoice());
}

type Folder = { path: string; folders: Map<string, Folder>; files: string[] };

/** The file list, the path above the editor, and the step card's file note: all follow the project and the open file. */
function renderFiles() {
  const nav = $('files');
  const paths = Object.keys(project.files);
  const stepPath = stepFile(currentStep());
  const errors = errorsByFile();
  if (listed) {
    for (const p of paths) {
      if (listed.has(p)) continue;
      // The template's placeholders arrive in bulk: they don't open their folders or get the "new" dot.
      if (isPlaceholder(project.files[p])) continue;
      newFiles.add(p);
      unfold(p);
    }
  }
  for (const p of [...newFiles]) if (!(p in project.files)) newFiles.delete(p);
  listed = new Set(paths);

  // Draw again only when what the list shows has changed: a button replaced under the pointer loses its click.
  const shows = JSON.stringify([project.appDir, paths.map((p) => [p, isGenerated(p, project.files[p])]), activeFile, stepPath, [...errors], [...folded], [...newFiles]]);
  if (shows !== treeShows) {
    treeShows = shows;
    drawTree(nav, paths, stepPath, errors);
  }
  renderCrumbs();
  updateFileNote();
  // Last: the card's file note can change the card's layout, and with it the list's.
  if (treeReveal !== treeRevealed) revealTreeRow();
}

/** Scroll the file list so the row it should show (the step's file, or the one just opened) is whole. */
function revealTreeRow() {
  const nav = $('files');
  const row = treeReveal ? [...nav.querySelectorAll<HTMLElement>('[data-path]')].find((x) => x.dataset.path === treeReveal) : undefined;
  if (!row) return;
  treeRevealed = treeReveal;
  // Scroll the list only (scrollIntoView could move the page as well).
  const box = nav.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  const head = nav.firstElementChild!.getBoundingClientRect().height;
  if (r.top < box.top + head) nav.scrollTop -= box.top + head - r.top;
  else if (r.bottom > box.bottom) nav.scrollTop += r.bottom - box.bottom + 2;
}
new ResizeObserver(revealTreeRow).observe($('files'));

function drawTree(nav: HTMLElement, paths: string[], stepPath: string | undefined, errors: Map<string, number>) {
  const root: Folder = { path: '', folders: new Map(), files: [] };
  for (const p of paths) {
    const parts = p.split('/');
    let at = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let next = at.folders.get(parts[i]);
      if (!next) {
        next = { path: parts.slice(0, i + 1).join('/'), folders: new Map(), files: [] };
        at.folders.set(parts[i], next);
      }
      at = next;
    }
    at.files.push(p);
  }

  // A dot, not a word: the file's name keeps the room.
  const pill = (kind: 'step' | 'new', title: string) => h('span', { class: `dot-mark ${kind}`, title, role: 'img', 'aria-label': title });
  const fileRow = (p: string, depth: number) => {
    const generated = isGenerated(p, project.files[p]);
    const n = errors.get(p) ?? 0;
    const on = p === activeFile;
    const full = project.appDir ? `${project.appDir}/${p}` : p;
    const title = [full, generated && 'generated: read-only here', p === stepPath && 'this step is about this file', n && 'red lines']
      .filter(Boolean)
      .join(' · ');
    const b = h(
      'button',
      { type: 'button', class: 'tree-item tree-file', 'data-path': p, 'aria-current': on ? 'true' : undefined, title, style: `--depth: ${depth}` },
      h('span', { class: 'name' }, p.split('/').pop()!),
      n ? h('span', { class: 'err-mark', 'aria-hidden': 'true' }, '✕') : null,
      generated ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null,
      p === stepPath ? pill('step', 'This step is about this file') : newFiles.has(p) ? pill('new', 'Just created') : null,
    );
    b.addEventListener('click', () => openFile(p));
    const row = h('li', { class: `file${on ? ' on' : ''}${n ? ' bad' : ''}` }, b);
    if (on && !generated) {
      // The open file can be deleted (a slip like a mistyped name); Undo brings it back.
      const del = h('button', { type: 'button', class: 'file-del', title: `Delete ${p}`, 'aria-label': `Delete ${p}` }, '×');
      del.addEventListener('click', () => deleteFile(p));
      row.append(del);
    }
    return row;
  };
  const byName = (a: string, b: string) => a.localeCompare(b);
  const rows = (folder: Folder, depth: number): HTMLElement[] => [
    ...[...folder.folders.entries()]
      .sort(([a], [b]) => byName(a, b))
      .map(([name, sub]) => {
        const open = !folded.has(sub.path);
        const holds = (p?: string) => !!p && p.startsWith(`${sub.path}/`);
        // A folded folder still says what is inside it: the step's file, a red line.
        const bad = !open && [...errors.keys()].some(holds);
        const b = h(
          'button',
          { type: 'button', class: `tree-item tree-folder${bad ? ' bad' : ''}`, 'data-path': `${sub.path}/`, 'aria-expanded': String(open), title: `${project.appDir ? `${project.appDir}/` : ''}${sub.path}/`, style: `--depth: ${depth}` },
          h('span', { class: 'caret', 'aria-hidden': 'true' }),
          h('span', { class: 'name' }, name),
          bad ? h('span', { class: 'err-mark', 'aria-hidden': 'true' }, '✕') : null,
          !open && holds(stepPath) ? pill('step', 'This step is about a file in this folder') : null,
        );
        b.addEventListener('click', () => {
          if (open) folded.add(sub.path);
          else folded.delete(sub.path);
          store.set('folded', JSON.stringify([...folded]));
          renderFiles();
        });
        return h('li', {}, b, open ? h('ul', { role: 'group' }, ...rows(sub, depth + 1)) : null);
      }),
    ...[...folder.files].sort((a, b) => byName(a.split('/').pop()!, b.split('/').pop()!)).map((p) => fileRow(p, depth)),
  ];

  const add = h('button', { type: 'button', class: 'add', title: 'Create a file in the project' }, '+ New file');
  add.addEventListener('click', newFile);
  if (!project.appDir) add.setAttribute('disabled', '');
  // Drawing again must not take the keyboard's place in the list.
  const focused = nav.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.path : undefined;
  nav.replaceChildren(
    h('div', { class: 'tree-head' }, project.appDir ? h('span', { class: 'folder', title: 'The app folder' }, `${project.appDir}/`) : h('span', { class: 'muted' }, 'No project yet'), add),
    h('ul', {}, ...rows(root, 0)),
  );
  if (focused) [...nav.querySelectorAll<HTMLElement>('[data-path]')].find((x) => x.dataset.path === focused)?.focus({ preventScroll: true });
}

/** The open file's full path above the editor: the app folder, then each folder down to the file. */
function renderCrumbs() {
  const el = $('crumbs');
  $('editor-wrap').dataset.file = activeFile ?? '';
  if (!activeFile) {
    el.replaceChildren(h('span', {}, project.appDir ? 'No file open' : 'No project yet'));
    el.title = '';
    return;
  }
  const parts = [...(project.appDir ? [project.appDir] : []), ...activeFile.split('/')];
  el.replaceChildren(
    ...parts.flatMap((part, i) => [...(i ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, '›')] : []), h('span', { class: i === parts.length - 1 ? 'here' : undefined }, part)]),
    ...(isGenerated(activeFile, project.files[activeFile]) ? [h('span', { class: 'lock' }, '🔒 generated: read-only here')] : []),
  );
  el.title = activeFile;
}

/** The step card's file note: "Creates …" for a new file, or an "Open …" button when another file is open. */
function updateFileNote() {
  const step = currentStep();
  const file = stepFile(step);
  if (!fileNote || !file) return;
  const shows = JSON.stringify([file, activeFile, project.files[file] !== undefined]);
  if (fileNote.dataset.shows === shows) return;
  fileNote.dataset.shows = shows;
  const code = (p: string) => h('code', {}, p);
  fileNote.className = 'step-file';
  if (project.files[file] === undefined) {
    const creates = step?.edits?.some((e) => (e.file ?? PAGE_FILE) === file && e.from === '');
    fileNote.title = creates ? `This step creates ${file}` : `This step is in ${file}, which is not in your project yet`;
    fileNote.replaceChildren(creates ? 'Creates ' : 'Not in your project yet: ', code(file));
  } else if (file === activeFile) {
    // Open already: the path above the code says so. Nothing to add here.
    fileNote.title = '';
    fileNote.replaceChildren();
  } else {
    // Another file is open: a button back to the step's file, like the card's other buttons.
    const open = h('button', { type: 'button', title: `This step is in ${file}${activeFile ? `, and ${activeFile} is open` : ''}` }, 'Open ', code(shortName(file)));
    open.addEventListener('click', () => openFile(file));
    fileNote.classList.add('away');
    fileNote.title = '';
    fileNote.replaceChildren(open);
  }
  fileNote.hidden = !fileNote.childNodes.length;
}

function deleteFile(path: string) {
  const next: Project = JSON.parse(JSON.stringify(project));
  delete next.files[path];
  replaceProject(next, `Deleted ${path}.`);
}

function newFile() {
  const path = window.prompt('New file, relative to the app folder (for example packages/frontend/src/components/kpi-card.tsx):', 'packages/frontend/src/');
  if (!path) return;
  const clean = path.trim().replace(/^\.?\//, '');
  if (!/^[\w./-]+\.(tsx?|css|json|dax)$/.test(clean) || clean.includes('..')) {
    flash('Use a path like packages/frontend/src/components/kpi-card.tsx.');
    return;
  }
  if (project.files[clean] === undefined) project.files[clean] = '';
  saveProject();
  syncModels();
  openFile(clean);
  updateDoneTick(); // a step that only creates the file is done now
}

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => runNow());

// ---------------------------------------------------------------- red lines: the type check
const TYPE_CHECK = 'playground-types'; // the owner of the markers the check sets
const TYPE_CHECK_DELAY_MS = 300; // after typing; a step's own edit is checked at once
let checkTimer: number | undefined;
let checkRun = 0;
let typesChecked = false;

/** Check every code file again, shortly: a change in one file can break another. */
function scheduleTypeCheck(delay = TYPE_CHECK_DELAY_MS) {
  clearTimeout(checkTimer);
  checkTimer = window.setTimeout(checkTypes, delay);
}
// Package types reach the worker a moment after a package is installed: check once they have.
const TYPE_CHECK_LIBS_MS = 60;
ts.typescriptDefaults.onDidExtraLibsChange(() => scheduleTypeCheck(TYPE_CHECK_LIBS_MS));

async function checkTypes() {
  const run = ++checkRun;
  const files = [...models].filter(([path]) => isCode(path));
  let answered = false;
  for (let attempt = 0; files.length && attempt < 3; attempt++) {
    // No answer in time (the worker is still starting, or was replaced): ask again.
    const found = await Promise.race([diagnose(files), new Promise<undefined>((r) => setTimeout(() => r(undefined), 4000))]).catch(() => undefined);
    if (run !== checkRun) return; // a newer check has started: its answer is the one to show
    if (!found) continue;
    for (const { model, version, diagnostics } of found) {
      // Typed in since: the check that edit scheduled marks this file.
      if (model.isDisposed() || model.getVersionId() !== version) continue;
      monaco.editor.setModelMarkers(model, TYPE_CHECK, diagnostics.map((d) => toMarker(model, d)));
    }
    answered = true;
    break;
  }
  // Only a real answer about real code files counts: without one, the status keeps saying "Checking types…",
  // never "No type errors". A project with no code files yet has nothing to check, and says nothing.
  if (answered) typesChecked = true;
  showProblems();
}

async function diagnose(files: [string, monaco.editor.ITextModel][]) {
  const getWorker = await tsWorkerGetter();
  const worker = await getWorker(...files.map(([, model]) => model.uri));
  return Promise.all(
    files.map(async ([, model]) => {
      const version = model.getVersionId();
      const uri = model.uri.toString();
      const all = await Promise.all([worker.getSyntacticDiagnostics(uri), worker.getSemanticDiagnostics(uri), worker.getSuggestionDiagnostics(uri)]);
      return { model, version, diagnostics: all.flat() };
    }),
  );
}

const flatMessage = (m: TsMessage | undefined, indent = 0): string =>
  m === undefined ? '' : typeof m === 'string' ? m : `${indent ? `\n${'  '.repeat(indent)}` : ''}${m.messageText}${(m.next ?? []).map((x) => flatMessage(x, indent + 1)).join('')}`;

function toMarker(model: monaco.editor.ITextModel, d: TsDiagnostic): monaco.editor.IMarkerData {
  const start = model.getPositionAt(d.start ?? 0);
  const end = model.getPositionAt((d.start ?? 0) + (d.length || 1));
  // TypeScript's categories: 0 warning, 1 error, 2 suggestion, 3 message.
  const severity = [monaco.MarkerSeverity.Warning, monaco.MarkerSeverity.Error, monaco.MarkerSeverity.Hint, monaco.MarkerSeverity.Info][d.category] ?? monaco.MarkerSeverity.Info;
  return {
    severity,
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
    message: flatMessage(d.messageText),
    code: String(d.code),
    tags: [...(d.reportsUnnecessary ? [monaco.MarkerTag.Unnecessary] : []), ...(d.reportsDeprecated ? [monaco.MarkerTag.Deprecated] : [])],
  };
}

/** The red lines of one file, top to bottom. */
const errorsIn = (model: monaco.editor.ITextModel) =>
  monaco.editor
    .getModelMarkers({ resource: model.uri })
    .filter((m) => m.severity === monaco.MarkerSeverity.Error)
    .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn);

/** How many type errors each code file has (files without any are left out). */
function errorsByFile() {
  const byFile = new Map<string, number>();
  for (const [path, model] of models) {
    const n = isCode(path) ? errorsIn(model).length : 0;
    if (n) byFile.set(path, n);
  }
  return byFile;
}

/** A file's name, with its folder when another file has the same name (two schema.ts). */
function shortName(path: string) {
  const base = (p: string) => p.split('/').pop()!;
  return [...models.keys()].filter((q) => base(q) === base(path)).length > 1 ? path.split('/').slice(-2).join('/') : base(path);
}

function showTypeStatus() {
  const byFile = errorsByFile();
  const total = [...byFile.values()].reduce((a, b) => a + b, 0);
  const el = $('type-status');
  el.className = total ? 'bad' : 'ok';
  $('status').classList.toggle('has-errors', total > 0); // the errors get the whole line: the hint steps aside
  if (!total) {
    const anyCode = [...models.keys()].some(isCode);
    el.textContent = !anyCode ? '' : typesChecked ? 'No type errors' : 'Checking types…';
    return;
  }
  // Each file name goes to that file's first red line.
  const links = [...byFile.keys()].map((path) => {
    const b = h('button', { type: 'button', class: 'status-file', title: `Show the red line in ${path}` }, shortName(path));
    b.addEventListener('click', () => showProblem(path));
    return b;
  });
  el.replaceChildren(
    h('span', { class: 'err-what' }, `✕ ${total} type error${total > 1 ? 's' : ''} in `, ...joined(links, ', ')),
    h('span', { class: 'err-hint' }, ': hover the red lines (the page still runs)'),
  );
}

/** Open the file with a red line and scroll to it: the open file's first, or the first there is. */
function showProblem(path?: string) {
  const files = [...errorsByFile().keys()];
  const target = path ?? (activeFile && files.includes(activeFile) ? activeFile : files[0]);
  const model = target ? models.get(target) : undefined;
  const first = model ? errorsIn(model)[0] : undefined;
  if (!target || !first) return;
  if (target !== activeFile) openFile(target);
  editor.layout();
  editor.revealLineInCenter(first.startLineNumber);
  revealSideways(new monaco.Range(first.startLineNumber, first.startColumn, first.endLineNumber, first.endColumn));
  noteMarkInView();
  editor.setPosition({ lineNumber: first.startLineNumber, column: first.startColumn });
  editor.focus();
}

/** "Show the red line" is on the card of a step that expects red lines, while there are any. */
function updateRedLine() {
  if (redLine) redLine.hidden = !errorsByFile().size;
}

/** The red lines changed: say so under the editor, in the file list and on the step card. */
let problemsTimer: number | undefined;
function showProblems() {
  clearTimeout(problemsTimer);
  problemsTimer = window.setTimeout(() => {
    showTypeStatus();
    renderFiles();
    updateRedLine();
  }, 0);
}
monaco.editor.onDidChangeMarkers(() => showProblems());

/** Monaco loads its TypeScript support lazily; wait for it on the first run. */
async function tsWorkerGetter() {
  for (let i = 0; ; i++) {
    try {
      return (await ts.getTypeScriptWorker()) as unknown as (...u: monaco.Uri[]) => Promise<TsWorker>;
    } catch (e) {
      if (i > 100) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

/** Compile every code file to a System module. */
async function compile(): Promise<Record<string, string>> {
  const paths = Object.keys(project.files).filter((p) => isCode(p) && !p.endsWith('.d.ts'));
  if (!paths.length) return {};
  // A call to a TypeScript worker that is replaced meanwhile (Monaco does that when its options change) is
  // never answered, so: wait a little, then compile again with the current worker.
  for (let wait = 1500; ; wait += 1500) {
    const out = await Promise.race([compileOnce(paths), new Promise<undefined>((r) => setTimeout(() => r(undefined), wait))]);
    if (out) {
      showTypeStatus();
      return out;
    }
    if (wait >= 6000) throw new Error('The TypeScript checker did not answer. Press Run, or reload the page.');
  }
}

async function compileOnce(paths: string[]): Promise<Record<string, string>> {
  const getWorker = await tsWorkerGetter();
  const worker = await getWorker(...paths.map(uriOf));
  const out: Record<string, string> = {};
  for (const p of paths) {
    const emitted = await worker.getEmitOutput(uriOf(p).toString());
    const js = emitted.outputFiles.find((f) => f.name.endsWith('.js'));
    if (!js) throw new Error(`${p} could not be compiled.`);
    out[p] = js.text;
  }
  // A query file is imported as text (`./queries/x.dax?raw`), so it goes to the preview as it is.
  for (const p of Object.keys(project.files)) if (p.endsWith('.dax')) out[`${p}?raw`] = project.files[p];
  return out;
}

// ---------------------------------------------------------------- preview
let iframe: HTMLIFrameElement | undefined;
let iframeReady: Promise<void> = Promise.resolve();
let runId = 0;
let queryTimes: number[] = [];
let mode: Mode = 'normal';
let outline = false;

function setRunState(text: string, cls: '' | 'live' | 'stopped' = '') {
  const el = $('run-state');
  el.textContent = text;
  el.title = '';
  // classList, not className: a step may have outlined this element (`pointed`).
  el.classList.remove('live', 'stopped');
  if (cls) el.classList.add(cls);
}

function showError(message: string | null) {
  const el = $('preview-error');
  el.hidden = !message;
  el.textContent = message ?? '';
}

function showIdle(text: string | null) {
  const el = $('preview-idle');
  el.hidden = !text;
  el.replaceChildren(...(text ? [h('p', {}, rich(text))] : []));
}

function makeIframe() {
  iframe?.remove();
  const frame = h('iframe', {
    title: 'Page preview',
    sandbox: 'allow-scripts',
    src: 'preview.html',
  }) as HTMLIFrameElement;
  iframeReady = new Promise((resolve) => {
    const onReady = (e: MessageEvent) => {
      if (e.source === frame.contentWindow && e.data?.source === 'playground-preview' && e.data.type === 'ready') {
        window.removeEventListener('message', onReady);
        resolve();
      }
    };
    window.addEventListener('message', onReady);
  });
  $('preview').prepend(frame);
  iframe = frame;
}

function toFrame(msg: Record<string, unknown>) {
  iframe?.contentWindow?.postMessage(msg, '*');
}

async function runNow() {
  clearTimeout(runTimer);
  const myRun = ++runId;
  $('preview-stopped').hidden = true;
  showError(null);
  if (!project.appDir) {
    setRunState('No app yet');
    const create = byId.get('create')!;
    showIdle(`No app yet. It starts in the **Terminal**, in **${num(create)} ${create.title}**.`);
    return;
  }
  if (!project.dev) {
    setRunState('Dev loop not running');
    showIdle('The dev loop isn\'t running. Run `npm run dev` in the **Terminal** to see the page.');
    return;
  }
  setRunState('Compiling…');
  let files: Record<string, string>;
  try {
    files = await compile();
  } catch (e) {
    if (myRun !== runId) return;
    setRunState('Not running', 'stopped');
    showError(String((e as Error).message ?? e));
    return;
  }
  if (myRun !== runId) return;
  if (!files[PAGE_FILE]?.trim() || !project.files[PAGE_FILE]?.trim()) {
    setRunState('No page yet');
    showIdle('No page yet: `src/App.tsx` is empty.');
    return;
  }
  showIdle(null);
  if (!iframe) makeIframe();
  await iframeReady;
  if (myRun !== runId) return;
  queryTimes = [];
  runQueries = 0;
  logRunStart(myRun);
  toFrame({ type: 'outline', on: outline });
  toFrame({
    type: 'run',
    runId: myRun,
    files,
    entry: PAGE_FILE,
    installed: project.packages,
    connectors: connectorNames(project),
    env: SIMULATED_ENV,
    signIn: signInSettings(),
  });
  showRunning(true);
}

let runQueries = 0;
/** "Running". The number of queries sent shows only on a card about it (the redraw trap, the review); otherwise it is in the tooltip. */
function showRunning(start = false) {
  const el = $('run-state');
  if (!start && !el.classList.contains('live')) return;
  const sent = `${runQueries} quer${runQueries === 1 ? 'y' : 'ies'} sent`;
  setRunState(currentStep()?.point === 'status' ? `Running · ${sent}` : 'Running', 'live');
  el.title = `Running: ${sent} since the page started`;
}

function stop(reason: string) {
  runId++;
  iframe?.remove();
  iframe = undefined;
  showError(null);
  $('stopped-text').textContent = reason;
  $('preview-stopped').hidden = false;
  setRunState('Stopped', 'stopped');
}

window.addEventListener('message', (e: MessageEvent) => {
  if (!iframe || e.source !== iframe.contentWindow) return;
  const msg = e.data;
  if (!msg || msg.source !== 'playground-preview') return;
  if (msg.type === 'runtimeError' && msg.runId !== undefined && msg.runId !== runId) return;
  if (msg.type === 'runtimeError') showError(`The page threw an error:\n${msg.message}`);
  if (msg.type === 'empty') showIdle('No page yet: `src/App.tsx` is empty.');
  if (msg.type === 'query' && msg.runId === runId) onQuery(msg.runId, msg.id, String(msg.connector), msg.decoded !== false, String(msg.query), msg.limit);
  if (msg.type === 'read' && msg.runId === runId) onRead(msg.runId, msg.id, msg as ReadRequest);
  if (msg.type === 'data' && msg.runId === runId) {
    // Only what the page asked for: the message's own fields (its id, its run) stay out of the request.
    const req: DataRequest = { entity: msg.entity, op: msg.op, kind: msg.kind, state: msg.state, input: msg.input, id: msg.recordId };
    onData(msg.runId, msg.id, JSON.parse(JSON.stringify(req)));
  }
  if (msg.type === 'identity' && msg.runId === runId) onIdentity(msg);
});

/** Count a query or read against the cut-off; false when the page was stopped. */
function countQuery() {
  const now = performance.now();
  queryTimes = queryTimes.filter((t) => now - t < CUTOFF.withinMs);
  queryTimes.push(now);
  runQueries++;
  showRunning();
  if (queryTimes.length > CUTOFF.queries) {
    stop(
      `Stopped: the page sent more than ${CUTOFF.queries} queries in ${CUTOFF.withinMs / 1000} seconds. ` +
        'Something is running the query again on every redraw. In a real app, each of those is a query against the model or the lakehouse.',
    );
    return false;
  }
  return true;
}

/** Simulated identity, from the connector's `auth` in rayfin.yml (a real app doesn't print it). */
function runsAs(connector: string) {
  const auth = connectorAuth(project, connector);
  if (auth === 'delegated') return `runs as: the signed-in user (delegated)${dataService(project).enabled ? ` · ${who()}` : ''}`;
  if (auth === 'application') return 'runs as: the app owner (application)';
  return '';
}

/** A read from an entity connector (the lakehouse), answered from its table after a short delay. */
function onRead(forRun: number, id: number, req: ReadRequest) {
  const started = new Date();
  const a = readLakehouse(req, mode);
  const row = logRead(started, req, a);
  if (!countQuery()) return;
  const delay = QUERY_DELAY_MS[0] + Math.random() * (QUERY_DELAY_MS[1] - QUERY_DELAY_MS[0]);
  window.setTimeout(() => {
    if (forRun !== runId) return;
    row.setDuration(Math.round(delay));
    toFrame({ type: 'queryResult', runId: forRun, id, result: a.result, thrown: a.thrown });
  }, delay);
}

/**
 * A query from a semantic model connector, answered from the saved results of that connector's model.
 * `decoded`: the connector has its runtime (`fabricSemanticModel()`). Without it, the page gets the raw
 * payload instead of a result, as in Rayfin 2.0 (src/connectors-sim.mjs, rawPayload).
 */
function onQuery(forRun: number, id: number, connector: string, decoded: boolean, query: string, limit: unknown) {
  const started = new Date();
  const result = answer(connector, query, limit, mode);
  const raw = !decoded && !result.thrown ? rawPayload(connector) : undefined;
  const row = logQuery(started, connector, query, result, raw);
  if (!countQuery()) return;
  const delay = QUERY_DELAY_MS[0] + Math.random() * (QUERY_DELAY_MS[1] - QUERY_DELAY_MS[0]);
  window.setTimeout(() => {
    if (forRun !== runId) return;
    row.setDuration(Math.round(delay));
    toFrame({ type: 'queryResult', runId: forRun, id, result: raw ?? result.result, thrown: result.thrown });
  }, delay);
}

// ---------------------------------------------------------------- terminal tab
const termOut = h('pre', { class: 'term-out', 'aria-live': 'polite' });
const termPrompt = h('span', { class: 'term-prompt' });
const termInput = h('input', { type: 'text', class: 'term-input', 'aria-label': 'Command', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
const termForm = h('form', { class: 'term-in' }, termPrompt, termInput);
let termHistoryAt = -1;

function promptText() {
  return project.cwd ? `~/${project.cwd} $` : '~ $';
}
function renderPrompt() {
  termPrompt.textContent = promptText();
}

function termPrint(lines: string[], cls = '') {
  for (const line of lines) {
    termOut.append(h('div', { class: `term-line${cls ? ` ${cls}` : ''}${line.startsWith('Playground:') ? ' pg' : ''}` }, line || ' '));
  }
  while (termOut.childElementCount > 400) termOut.firstElementChild?.remove();
  termOut.scrollTop = termOut.scrollHeight;
  try {
    store.set('terminal', JSON.stringify([...termOut.children].slice(-200).map((c) => [c.textContent, c.className])));
  } catch {
    /* fine */
  }
}

/** The terminal's lines, to put back later. */
const saveTerminal = () => [...termOut.children].map((c) => [c.textContent ?? '', c.className] as [string, string]);
function restoreTerminal(lines: [string, string][]) {
  termOut.replaceChildren(...lines.map(([text, cls]) => h('div', { class: cls }, text)));
  termPrint([]); // keeps them, and scrolls to the end
}

function submitCommand(line: string) {
  const text = line.trim();
  termInput.value = '';
  termHistoryAt = -1;
  if (!text) return;
  termPrint([`${promptText()} ${text}`], 'cmd');
  if (/^(clear|cls)$/.test(text)) {
    termOut.replaceChildren();
    project.history.push(text);
    saveProject();
    return;
  }
  const before = project;
  const r = runCommand(project, text, terminalAnswer);
  project = r.project as Project;
  termPrint(r.lines, r.ok ? '' : 'err');
  saveProject();
  renderPrompt();
  const filesChanged = JSON.stringify(before.files) !== JSON.stringify(project.files);
  if (before.db !== project.db) renderData();
  if (filesChanged) {
    syncModels();
    if (!activeFile && project.files[PAGE_FILE] !== undefined) openFile(PAGE_FILE);
    // A command that rewrote a file we wrote ourselves (such as `connector add --yes` on schema.ts) can be undone.
    const rewritten = Object.keys(before.files).filter((f) => before.files[f] !== project.files[f] && !isGenerated(f, before.files[f]));
    if (rewritten.length) showUndo(`The command rewrote ${rewritten.join(', ')}.`, () => replaceProject(before, 'Undone.'));
  } else {
    updateLibs();
  }
  updateDoneTick();
  if (filesChanged || before.dev !== project.dev || before.packages.length !== project.packages.length) runNow();
  if (filesChanged) markFind(currentStep());
}

function initTerminal() {
  const el = $('tab-terminal');
  el.append(termOut, termForm);
  try {
    const saved = JSON.parse(store.get('terminal') ?? '[]') as [string, string][];
    for (const [text, cls] of saved) termOut.append(h('div', { class: cls }, text));
  } catch {
    /* fine */
  }
  if (!termOut.childElementCount) termPrint(['Playground: A simulated terminal. Type `help` for the commands it knows.']);
  renderPrompt();
  termForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitCommand(termInput.value);
  });
  termInput.addEventListener('keydown', (e) => {
    const history = project.history;
    if (e.key === 'ArrowUp' && history.length) {
      termHistoryAt = termHistoryAt < 0 ? history.length - 1 : Math.max(0, termHistoryAt - 1);
      termInput.value = history[termHistoryAt];
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && termHistoryAt >= 0) {
      termHistoryAt = Math.min(history.length, termHistoryAt + 1);
      termInput.value = history[termHistoryAt] ?? '';
      e.preventDefault();
    }
  });
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON' && !window.getSelection()?.toString()) termInput.focus();
  });
}

// ---------------------------------------------------------------- log tab
let logCount = 0;
const logEl = $('tab-log');
logEl.append(h('p', { class: 'muted' }, 'Every query the page sends shows up here, newest first. Click one to see the DAX and what came back.'));

/** Something new in the Log: a small dot on its tab, until the tab is opened. No number. */
function markLogNew() {
  if (tabButton('log')?.getAttribute('aria-selected') !== 'true') $('log-new').hidden = false;
}

function logRunStart(n: number) {
  logEl.prepend(h('div', { class: 'log-run' }, `Run ${n} · ${fmtTime(new Date())}`));
  trimLog();
}

function trimLog() {
  while (logEl.children.length > 300) logEl.lastElementChild?.remove();
}

function logQuery(at: Date, connector: string, query: string, a: Answer, raw?: ArrayBuffer) {
  logCount++;
  markLogNew();
  const r = a.result;
  let status: HTMLElement;
  let cols = '';
  if (a.thrown) status = h('span', { class: 'err' }, `${connector} · threw: network`);
  else if (raw) status = h('span', { class: 'raw' }, `${connector} · raw payload, not decoded`);
  else if (r?.status === 'error') status = h('span', { class: 'err' }, `${connector} · error: ${r.error.category}`);
  else {
    status = h('span', { class: 'ok' }, `${connector} · ${a.entry!.id}`);
    cols = r!.status === 'success' ? r!.table.columns.map((c) => c.name).join(', ') : '';
  }
  const ms = h('span', { class: 't' }, '…');
  const details = h(
    'details',
    { class: 'log-row' },
    h(
      'summary',
      {},
      h('span', { class: 'n' }, `#${logCount}`),
      h('span', { class: 't' }, fmtTime(at)),
      h('span', { class: 'what' }, status, cols ? h('span', { class: 'cols' }, `  ${cols}`) : null),
      ms,
    ),
  );
  details.addEventListener('toggle', () => {
    if (details.querySelector('.log-detail')) return;
    const shown = a.thrown ? { thrown: a.thrown } : clip(r);
    const sentTo = `Query sent to ${connector}${runsAs(connector) ? ` · ${runsAs(connector)}` : ''}`;
    details.append(
      h(
        'div',
        { class: 'log-detail' },
        h('div', { class: 'muted' }, sentTo),
        h('pre', { class: 'dax' }, query.trim()),
        ...(raw
          ? [
              h('div', { class: 'muted' }, `What executeQuery returned: an ArrayBuffer of ${raw.byteLength} bytes, with no status`),
              h(
                'p',
                { class: 'muted' },
                `Playground: no runtime is registered under the name "${connector}", so the connector hands the page the raw payload it received, undecoded, as Rayfin 2.0 does. ` +
                  'Rayfin asks the model for Apache Arrow, and an Arrow reply comes back as an ArrayBuffer. These bytes are a placeholder; the deployed reply format is not documented.',
              ),
            ]
          : [
              h('div', { class: 'muted' }, a.thrown ? 'The call threw' : 'Result (what executeQuery returned)'),
              h('pre', { class: 'json' }, JSON.stringify(shown, null, 2)),
            ]),
      ),
    );
  });
  const firstRun = logEl.querySelector('.log-run');
  if (firstRun) firstRun.after(details);
  else logEl.prepend(details);
  trimLog();
  return { setDuration: (n: number) => (ms.textContent = `${n} ms`) };
}

function logRead(at: Date, req: ReadRequest, a: ReadAnswer) {
  logCount++;
  markLogNew();
  const what = `${req.connector}.${req.entity}`;
  const status = a.thrown ? h('span', { class: 'err' }, `threw: ${what}`) : h('span', { class: 'ok' }, `read ${what}: ${a.rows} row${a.rows === 1 ? '' : 's'}`);
  const ms = h('span', { class: 't' }, '…');
  const details = h(
    'details',
    { class: 'log-row' },
    h('summary', {}, h('span', { class: 'n' }, `#${logCount}`), h('span', { class: 't' }, fmtTime(at)), h('span', { class: 'what' }, status), ms),
  );
  details.addEventListener('toggle', () => {
    if (details.querySelector('.log-detail')) return;
    const result = a.result as unknown;
    const shown = Array.isArray(result) && result.length > 12 ? [...result.slice(0, 12), `… ${result.length - 12} more rows`] : result;
    details.append(
      h(
        'div',
        { class: 'log-detail' },
        h('div', { class: 'muted' }, `Read sent (Playground: the real client sends it as a GraphQL query) · ${runsAs(req.connector)}`),
        h('pre', { class: 'json' }, JSON.stringify({ entity: req.entity, call: req.kind === 'paged' ? 'executePaginated' : req.kind === 'first' ? 'findFirst' : 'execute', ...req.state }, null, 2)),
        h('div', { class: 'muted' }, a.thrown ? 'The call threw' : 'What came back'),
        h('pre', { class: 'json' }, a.thrown ? a.thrown : JSON.stringify(shown, null, 2)),
      ),
    );
  });
  const firstRun = logEl.querySelector('.log-run');
  if (firstRun) firstRun.after(details);
  else logEl.prepend(details);
  trimLog();
  return { setDuration: (n: number) => (ms.textContent = `${n} ms`) };
}

/** Long results are cut for display only. */
function clip(r: Answer['result']) {
  if (!r || r.status !== 'success' || r.table.rows.length <= 12) return r;
  return {
    ...r,
    table: { ...r.table, rows: [...r.table.rows.slice(0, 12), `… ${r.table.rows.length - 12} more rows`] },
  };
}

// ---------------------------------------------------------------- queries tab
function renderQueries() {
  const el = $('tab-queries');
  const modes: [Mode, string][] = [
    ['normal', 'Answer normally'],
    ['network', 'Network down: the call throws a NetworkError, as in a deployed browser app'],
  ];
  const modeBox = h('fieldset', { class: 'modes' }, h('legend', {}, 'How the simulated connector answers (for Failure and the review)'));
  for (const [value, label] of modes) {
    const input = h('input', { type: 'radio', name: 'mode', value, id: `mode-${value}` }) as HTMLInputElement;
    input.checked = value === mode;
    input.addEventListener('change', () => {
      if (input.checked) mode = value;
    });
    modeBox.append(h('label', { class: 'check' }, input, ` ${label}`));
  }
  el.append(
    h(
      'p',
      {},
      'These are the only queries the simulated semantic model connectors can answer: saved results from the Contoso measures model (contoso) and, from Two semantic models on, the Pareto model (pareto). ',
      'Send one of them through the connector it names, word for word (spacing and letter case don\'t matter), and you get its result. ',
      'Anything else comes back as an error result. ',
      'Reads from the lakehouse (from Read a lakehouse on) are not listed here: they are answered from a small table of Contoso rows, the sales lines of the stores in France in 2023.',
    ),
    modeBox,
  );
  // A filter over the list: titles, connectors and ids that contain the text, ignoring case.
  const find = h('input', { type: 'search', class: 'q-find', placeholder: 'Find a query: a word from its title, or contoso or pareto', 'aria-label': 'Find a query' }) as HTMLInputElement;
  el.prepend(h('label', { class: 'q-find-label' }, h('b', {}, 'Find a query '), find));
  const boxes: { box: HTMLElement; items: [HTMLElement, string][] }[] = [];
  find.addEventListener('input', () => {
    const text = find.value.trim().toLowerCase();
    for (const { box, items } of boxes) {
      let shown = 0;
      for (const [item, haystack] of items) {
        item.hidden = !!text && !haystack.includes(text);
        if (!item.hidden) shown++;
      }
      box.hidden = shown === 0;
    }
  });
  const groups = [...new Set(entries.map((e) => e.group))];
  for (const g of groups) {
    const box = h('div', { class: 'q-group' }, h('h3', {}, g));
    boxes.push({ box, items: [] });
    for (const e of entries.filter((x) => x.group === g)) {
      const item = h('details', { class: 'q-item' }, h('summary', {}, h('span', {}, e.title), h('span', { class: 'id' }, `${e.connector} · ${e.id}`)));
      boxes.at(-1)!.items.push([item, `${e.title} ${e.connector} ${e.id}`.toLowerCase()]);
      item.addEventListener('toggle', () => {
        if (item.querySelector('pre')) return;
        const saved = savedResult(e.id)!;
        const copy = h('button', { type: 'button' }, 'Copy DAX');
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(e.query);
            copy.textContent = 'Copied';
          } catch {
            copy.textContent = 'Copy failed: select the text instead';
          }
          setTimeout(() => (copy.textContent = 'Copy DAX'), 1500);
        });
        item.append(
          h('div', { class: 'actions' }, copy),
          h('pre', { class: 'dax' }, e.query),
          saved.status === 'success'
            ? snapTable(saved.table)
            : h('p', { class: 'muted' }, `Saved error (${saved.error.category}): ${saved.error.message}`),
        );
      });
      box.append(item);
    }
    el.append(box);
  }
}

function snapTable(t: { columns: { name: string; dataType: string }[]; rows: unknown[][] }) {
  const shown = t.rows.slice(0, 10);
  return h(
    'div',
    {},
    h(
      'table',
      { class: 'snap' },
      h('thead', {}, h('tr', {}, ...t.columns.map((c) => h('th', { title: c.dataType }, c.name)))),
      h('tbody', {}, ...shown.map((row) => h('tr', {}, ...row.map((v) => h('td', { class: typeof v === 'number' ? 'num' : undefined }, fmtCell(v)))))),
    ),
    t.rows.length > shown.length ? h('p', { class: 'muted' }, `… ${t.rows.length - shown.length} more rows`) : null,
  );
}

const fmtCell = (v: unknown) =>
  typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : v === null ? 'null' : String(v);

// ---------------------------------------------------------------- help tab: common problems, then the words the lessons use
function renderTerms() {
  const rows = terms.map((t) =>
    h('tr', { id: `term-${t.id}` }, h('th', { scope: 'row' }, t.term), h('td', {}, rich(t.means)), h('td', {}, rich(t.pbi)), h('td', {}, lessonLink(byId.get(t.lesson)!))),
  );
  $('tab-help').append(
    h('h3', { class: 'help-head', id: 'help-words' }, 'Words the lessons use'),
    h('p', { class: 'muted' }, 'What each means, and the nearest thing in Power BI. Underlined words in a lesson open their row here.'),
    h(
      'table',
      { class: 'ref' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Term'), h('th', {}, 'What it means'), h('th', {}, 'In Power BI'), h('th', {}, 'Taught in'))),
      h('tbody', {}, ...rows),
    ),
  );
}

function showTerm(id: string) {
  selectTab('help', false);
  const row = document.getElementById(`term-${id}`);
  if (!row) return;
  // Scroll the tab only: scrollIntoView could move the page as well.
  const box = $('tab-help');
  box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 3;
  row.classList.remove('flash');
  void row.offsetWidth; // restart the highlight
  row.classList.add('flash');
}

function renderHelp() {
  $('tab-help').append(
    h('h3', { class: 'help-head' }, 'Something odd?'),
    h('p', { class: 'muted' }, 'Find what you see in the first column.'),
    h(
      'table',
      { class: 'ref' },
      h('thead', {}, h('tr', {}, h('th', {}, 'What you see'), h('th', {}, 'Likely cause'), h('th', {}, 'Fix'))),
      h('tbody', {}, ...help.map((r) => h('tr', {}, h('th', { scope: 'row' }, rich(r.symptom)), h('td', {}, rich(r.cause)), h('td', {}, rich(r.fix))))),
    ),
  );
}

// ---------------------------------------------------------------- about: opened by the Simulated chip
/** The disclaimer's text, with the sources it names as links, and the way to report a mistake. */
function disclaimerNodes(text: string): (Node | string)[] {
  return [
    h('b', {}, DISCLAIMER_TITLE + ' '),
    ...disclaimerParts(text).map((p: { text: string; href?: string }) => (p.href ? h('a', { href: p.href, target: '_blank', rel: 'noopener' }, p.text) : p.text)),
    ' ',
    h('a', { href: REPORT_MISTAKE_URL, target: '_blank', rel: 'noopener', class: 'report-mistake' }, REPORT_MISTAKE_LABEL),
  ];
}

function renderAbout() {
  const p = (...parts: (string | Node)[]) => h('p', {}, ...parts);
  const a = (href: string, text: string) => h('a', { href, target: '_blank', rel: 'noopener' }, text);
  $('about-body').append(
    h('p', { class: 'about-disclaimer' }, ...disclaimerNodes(DISCLAIMER_TEXT)),
    p(
      h('b', {}, 'A Gold Layer tool. '),
      'Unofficial, and not affiliated with Microsoft. It is for Power BI developers who want to read and write the code of a Fabric app, from an empty folder to a reviewed report. More free tools are on the ',
      a('https://goldlayerdata.com/tools.html', 'Tools page'),
      ', and articles and shorts on ',
      a('https://goldlayerdata.com/', 'goldlayerdata.com'),
      '.',
    ),
    p(
      h('b', {}, 'Nothing here talks to Fabric or Power BI. '),
      'The terminal simulates the Rayfin 2.0 commands the lessons use; what they write (rayfin.yml, the connector\'s schema file, the generated connectors.ts, the package.json files) follows the Rayfin docs and the default template, the Universal App, as installed by the Rayfin CLI 2.0.0, and lines we could not check against the real output start with Playground:. ',
      'The Rayfin packages are simulated too: the editor checks your code against their real 2.0 signatures (a subset, MIT), and in the page, executeQuery matches the query text against saved results and returns them in the connector\'s result shape. Sign-in is skipped. Request ids starting with "simulated-" are made up. The real thing: ',
      a('https://learn.microsoft.com/fabric/apps/connectors', 'Connect Fabric Apps to Fabric data'),
      ' on Microsoft Learn, and ',
      a('https://rayfin.ai/docs/connectors/semantic-models', 'Semantic models'),
      ' in the Rayfin docs.',
    ),
    p(
      h('b', {}, 'The lakehouse. '),
      'connector add --type fabric-sqlanalytics writes what the Rayfin CLI 2.0.0 writes (its placeholder schema file and messages are taken from its code); metadata.json has the documented shape, but its types and values are the playground\'s, not captured from a real lakehouse. Reads (select, where, orderBy, first, after) are answered in the browser from a small table, in pages of 100 by default, as the docs describe; the cursor is made up. The "runs as" line in the Log is the playground\'s: a real app doesn\'t print it. The real thing: ',
      a('https://rayfin.ai/docs/connectors/sql-sources', 'Fabric SQL sources'),
      ' and ',
      a('https://rayfin.ai/docs/connectors/entity-generation', 'Generating entity files'),
      ' in the Rayfin docs.',
    ),
    p(
      h('b', {}, 'The app\'s own data and sign-in. '),
      'The app\'s database is simulated in this browser: `npx rayfin up db apply` reads every exported entity class in packages/data/src/, as the real CLI collects them (with a small parser of the decorators), compares them with what it applied last, and stops before the changes Rayfin\'s docs call potentially destructive; its output is the playground\'s wording. Each request from the page is checked against the entity\'s permission rules (`policy` with `.eq`, `.neq`, `.and`, `.or`; `include` and `exclude`) for the claims of the person on the Signed in as switch, here in the browser: on Fabric, the data API (Data API builder) checks them on the server. The people, ids and emails are made up; on Fabric, people sign in with Microsoft Entra ID and nobody switches. When rayfin.yml turns dynamic claims on, your claims function runs in the page\'s sandbox at each switch; on Fabric, the deployed function runs at sign-in and refresh, if the backend has dynamic claims for your workspace\'s region. Refusals and errors without documented wording start with Playground:. The Data tab shows every row, ignoring permissions: no real app has that view. The real thing: ',
      a('https://rayfin.ai/docs/data', 'Data'),
      ', ',
      a('https://rayfin.ai/docs/data/permissions', 'Permissions'),
      ' and ',
      a('https://rayfin.ai/docs/auth/dynamic-claims', 'Dynamic auth claims'),
      ' in the Rayfin docs, and ',
      a('https://learn.microsoft.com/fabric/apps/data-permissions', 'Define data permissions'),
      ' on Microsoft Learn.',
    ),
    p(
      h('b', {}, 'The lessons. '),
      'Their structure follows the way Microsoft Learn builds training (modules of short units, a knowledge check at the end of a module, summaries) and the way the Rayfin docs teach (numbered steps, then what to read next). Only the structure is borrowed.',
    ),
    p(
      h('b', {}, 'Data. '),
      `Snapshots taken ${snapshotsTakenAt} from the Contoso measures model and the Pareto model (gold-layer-examples), both built with the `,
      a('https://github.com/sql-bi/Contoso-Data-Generator-V2', 'SQLBI Contoso Data Generator V2'),
      ' (MIT). Sales lines from January 2023 to 9 November 2026, so 2026 is a part year. The queries use the model\'s own measures, as a real app does, such as [Revenue] (quantity × net price, in USD), [# Orders], [# Customers] and [Margin %]. Only Measure or query and the review lesson write one into a query, to compare.',
      ' The Pareto model has the same tables and data, with its own measures for the vital few categories; both models have [Revenue], with the same formula.',
      ' The lakehouse holds every store and the sales lines of the stores in France in 2023, from the same Contoso files: they add up to the model\'s [Revenue] for France in 2023.',
    ),
    p(
      h('b', {}, 'Versions. '),
      'Mirrors Rayfin 2.0. React 19.3.1 and its types. The editor\'s checking uses TypeScript ',
      monaco.typescript.typescriptVersion,
      ' (built into Monaco 0.57.0); every lesson\'s code is also checked with TypeScript 6.0.3. (The template itself pins TypeScript ~6.0.2.) Tailwind CSS 4.3.4, in-browser build.',
    ),
    p(
      h('b', {}, 'Your project and progress '),
      'are kept in this browser only. Reset takes a lesson back to its start; the lessons drawer can start the project over. Both offer Undo.',
    ),
  );
}

// ---------------------------------------------------------------- sign-in (simulated) and the app's own data
// The "Signed in as" switch: made-up people, ids and emails. On Fabric, people sign in with Microsoft
// Entra ID, and nobody can switch to someone else.
type Persona = { id: string; name: string; email: string; userId: string; about: string };
const PERSONAS: Persona[] = [
  { id: 'alice', name: 'Alice', email: 'alice@contoso.example', userId: '6f1c2a0e-41b7-4c55-9a1e-a11ce0000001', about: 'country manager, Germany' },
  { id: 'carol', name: 'Carol', email: 'carol@contoso.example', userId: '2d8e7b4f-0c3a-4e9d-8b6f-ca401000002a', about: 'country manager, France' },
  { id: 'bob', name: 'Bob', email: 'bob@contoso.example', userId: '9a4b6c1d-7e2f-4a3b-b5c6-b0b000000003', about: 'sales director' },
  { id: 'dan', name: 'Dan', email: 'dan@contoso.example', userId: '4e5f6a7b-8c9d-4e0f-a1b2-da9000000004', about: 'no sales role' },
];
let persona: Persona = PERSONAS.find((x) => x.id === store.get('persona')) ?? PERSONAS[0];

/** Who is signed in, as the permission checks see it. The claims come from the preview, which runs the claims function. */
type Identity = { signedIn: boolean; claims: Record<string, unknown>; error?: { code: string; message: string }; pending?: boolean };
// `role`: as @microsoft/rayfin-auth types a signed-in person's role ('Anonymous' | 'Authenticated').
const baseClaims = (x: Persona) => ({ sub: x.userId, email: x.email, role: 'Authenticated' });
let identity: Identity = { signedIn: true, claims: baseClaims(persona), pending: true };

/** Sign-in settings for the preview: the claims function runs only when rayfin.yml turns dynamic claims on. */
function signInSettings() {
  const on = dynamicClaims(project).enabled && functionsEnabled(project) && project.files[FUNCTION_APP] !== undefined;
  const contract = project.files[CLAIMS_TYPES] !== undefined ? claimsContract(project.files[FUNCTION_APP]).claims : undefined;
  return { persona: { userId: persona.userId, email: persona.email }, claimsFile: on ? FUNCTION_APP : undefined, contract };
}

function switchPersona(next: Persona) {
  persona = next;
  store.set('persona', next.id);
  const settings = signInSettings();
  const wasSignedIn = identity.signedIn;
  identity = { signedIn: true, claims: baseClaims(next), pending: !!settings.claimsFile };
  if (iframe && project.dev) {
    switchedFrom = wasSignedIn;
    toFrame({ type: 'signIn', runId, signIn: settings });
  }
  renderSignIn();
  renderData();
}
/** While a switch waits for the preview's sign-in: whether someone was signed in before it. */
let switchedFrom: boolean | undefined;

function onIdentity(msg: { signedIn: boolean; claims: Record<string, unknown>; error?: { code: string; message: string } }) {
  identity = { signedIn: msg.signedIn, claims: msg.claims, error: msg.error };
  renderSignIn();
  renderData();
  // A switch that signs someone out (a refused sign-in), or back in: the page starts again, as a real app
  // shows its sign-in screen instead of the report.
  const before = switchedFrom;
  switchedFrom = undefined;
  if (before !== undefined && before !== msg.signedIn) runNow();
}

function renderSignIn() {
  const el = $('signin');
  el.hidden = !dataService(project).enabled;
  const label = identity.signedIn ? `Signed in as: ${persona.name}` : `Not signed in (${persona.name} refused)`;
  const btn = h(
    'button',
    {
      type: 'button',
      class: `signin-btn${identity.signedIn ? '' : ' refused'}`,
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      title: 'Simulated sign-in: on Fabric, people sign in with Microsoft Entra ID, and nobody switches. Click to sign in as someone else.',
    },
    label,
    h('span', { 'aria-hidden': 'true' }, ' ▾'),
  );
  const menu = h('div', { class: 'signin-menu', role: 'menu', hidden: '' });
  for (const x of PERSONAS) {
    const item = h(
      'button',
      { type: 'button', role: 'menuitem', class: x === persona ? 'on' : undefined },
      h('b', {}, x.name),
      ` · ${x.email}`,
      h('span', { class: 'muted' }, ` (${x.about}, as the business sees it)`),
    );
    item.addEventListener('click', () => {
      menu.hidden = true;
      switchPersona(x);
    });
    menu.append(item);
  }
  btn.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  const refused = identity.error ? `Sign-in refused (${identity.error.code}): ${identity.error.message}` : '';
  const note = identity.error ? h('span', { class: 'signin-error', role: 'status', title: refused }, refused) : null;
  el.replaceChildren(btn, menu, ...(note ? [note] : []));
}
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('#signin')) $('signin').querySelector<HTMLElement>('.signin-menu')?.setAttribute('hidden', '');
});

const who = () => (identity.signedIn ? persona.email : 'nobody signed in');

/** A request to the app's own data, from the page: answered as the data API would, as the person signed in. */
function onData(forRun: number, id: number, req: DataRequest) {
  const started = new Date();
  const r = handleRequest(project.db, req, identity);
  if (r.ok && r.db !== project.db) {
    project = { ...project, db: r.db };
    saveProject();
    renderData();
  }
  const row = logData(started, req, r, 'page');
  if (!countQuery()) return;
  const delay = QUERY_DELAY_MS[0] + Math.random() * (QUERY_DELAY_MS[1] - QUERY_DELAY_MS[0]);
  window.setTimeout(() => {
    if (forRun !== runId) return;
    row.setDuration(Math.round(delay));
    toFrame({ type: 'queryResult', runId: forRun, id, result: r.result, thrown: r.ok ? undefined : r.error });
  }, delay);
}

type DataRequest = { entity: string; op: 'read' | 'create' | 'update' | 'delete'; kind?: string; state?: Record<string, unknown>; input?: Record<string, unknown>; id?: string };

function logData(at: Date, req: DataRequest, r: ReturnType<typeof handleRequest>, from: 'page' | 'direct' | 'tab') {
  logCount++;
  markLogNew();
  const what = `${req.entity}.${req.op}`;
  const status = r.ok
    ? h('span', { class: 'ok' }, `${what}${req.op === 'read' ? `: ${r.rows} row${r.rows === 1 ? '' : 's'}` : ''}`)
    : h('span', { class: 'err' }, `${what}: ${r.error === 'Internal server error' ? 'Internal server error' : 'refused'}`);
  const ms = h('span', { class: 't' }, from === 'page' ? '…' : from === 'direct' ? 'sent directly' : 'Data tab');
  const details = h(
    'details',
    { class: 'log-row' },
    h('summary', {}, h('span', { class: 'n' }, `#${logCount}`), h('span', { class: 't' }, fmtTime(at)), h('span', { class: 'what' }, status), ms),
  );
  details.addEventListener('toggle', () => {
    if (details.querySelector('.log-detail')) return;
    const result = r.result as unknown;
    const shown = Array.isArray(result) && result.length > 12 ? [...result.slice(0, 12), `… ${result.length - 12} more rows`] : result;
    details.append(
      h(
        'div',
        { class: 'log-detail' },
        h('div', { class: 'muted' }, `To the app's data API (Playground: the real client sends GraphQL) · runs as: the signed-in user · ${who()}`),
        h('pre', { class: 'json' }, JSON.stringify(req, null, 2)),
        h('div', { class: r.ok ? 'muted' : 'err' }, r.ok ? `Allowed by: ${r.rule}` : `Refused${r.rule ? ` (${r.rule})` : ''}`),
        h('div', { class: 'muted' }, r.ok ? 'What came back' : 'The call threw'),
        h('pre', { class: 'json' }, r.ok ? JSON.stringify(shown, null, 2) : String(r.error)),
        h('div', { class: 'muted' }, 'Playground: permissions checked in this browser; on Fabric the data API checks them on the server.'),
      ),
    );
  });
  const firstRun = logEl.querySelector('.log-run');
  if (firstRun) firstRun.after(details);
  else logEl.prepend(details);
  trimLog();
  return { setDuration: (n: number) => (ms.textContent = `${n} ms`) };
}

/** Change the simulated database from the Data tab (ignoring permissions), with Undo. */
function changeRows(note: string, change: (db: AppDb) => AppDb) {
  const before = project;
  project = { ...project, db: change(project.db) };
  saveProject();
  renderData();
  showUndo(note, () => {
    project = { ...project, db: before.db };
    saveProject();
    renderData();
  });
}

let directResult = '';

/** A suggested body for Send directly: every required field, with values that pass the field rules. */
function suggestion(entity: string, op: string) {
  const table = project.db.tables[entity];
  if (!table) return '{}';
  if (op === 'update') return JSON.stringify({ amount: 1 }, null, 2);
  const out: Record<string, unknown> = {};
  for (const [n, c] of Object.entries(table.columns) as [string, AppColumn][]) {
    if (n === 'id' || c.optional) continue;
    out[n] =
      n === 'country' ? 'Germany'
      : n === 'year' ? 2027
      : n === 'owner_id' ? persona.userId
      : c.kind === 'int' || c.kind === 'decimal' ? (typeof c.min === 'number' ? c.min : 1000000)
      : c.kind === 'date' ? new Date().toISOString()
      : c.kind === 'boolean' ? false
      : c.kind === 'set' ? c.values?.[0]
      : 'text';
  }
  return JSON.stringify(out, null, 2);
}

function renderData() {
  updateDataTab();
  const el = $('tab-data');
  const svc = dataService(project);
  const db = project.db;
  const files = entityFiles(project);
  const parts: (Node | string)[] = [
    h(
      'p',
      { class: 'muted' },
      'The app\'s own database, simulated in this browser. Playground view: every table and every row, whatever the permissions. No real app has this view.',
    ),
  ];
  if (!svc.enabled) {
    parts.push(h('p', {}, rich('The data service is off in `rayfin/rayfin.yml`: no database yet.')));
    el.replaceChildren(...parts);
    return;
  }
  const claimText = Object.entries(identity.claims).map(([k, v]) => `${k}: ${String(v)}`).join(' · ');
  parts.push(
    h(
      'p',
      { class: 'identity' },
      h('b', {}, identity.signedIn ? `Signed in as ${persona.email}. ` : 'Nobody is signed in. '),
      identity.signedIn
        ? rich(`Claims (**Who is using it** explains them): ${claimText}${identity.pending ? ' (the claims function runs when the page runs)' : ''}`)
        : identity.error?.message ?? '',
      h('span', { class: 'muted' }, rich(' (Playground: `role` as Rayfin\'s auth package types it; what Fabric puts there isn\'t documented.)')),
    ),
  );
  const names = [...new Set([...files.map((f) => f.name), ...Object.keys(db.tables)])];
  if (!names.length) parts.push(h('p', {}, rich('No tables yet. Entities in `packages/data/src/` become tables once applied.')));
  const unlimited = unlimitedText(db);
  for (const name of names) {
    const e = files.find((x) => x.name === name);
    const table = db.tables[name] as AppTable | undefined;
    const typed = inAppSchema(project, name) ? '' : ' · not in UniversalAppSchema yet, so the client has no typed entity for it';
    const state = !table ? `not applied yet${e ? typed : ''}` : !e ? 'applied; no longer declared' : `applied${typed}`;
    const section = h('section', { class: 'data-entity' }, h('h3', {}, name, h('span', { class: 'muted' }, ` · ${state}`)));
    // Columns, from the decorators, marked where they differ from the applied table.
    if (e) {
      const cols = h('ul', { class: 'cols' });
      for (const f of e.fields) {
        const c = columnOf(f);
        const applied = table?.columns[f.name];
        const differs = table && (!applied || JSON.stringify(applied) !== JSON.stringify(c));
        cols.append(
          h(
            'li',
            {},
            h('code', {}, `${f.name} ${sqlType(c)}${c.optional ? '' : ' NOT NULL'}`),
            differs ? h('span', { class: 'pending' }, applied ? ' changed, not applied yet' : ' not applied yet') : null,
          ),
        );
      }
      section.append(h('p', { class: 'kicker' }, 'Columns (from your decorators)'), cols);
      const rules = effectiveRules(e);
      const access = h('ul', { class: 'access' });
      for (const r of rules) access.append(h('li', {}, describeRule(r)));
      const appliedRules = table ? JSON.stringify(table.rules.map((r: AppRule) => r.source)) === JSON.stringify(rules.map((r) => r.source)) : true;
      section.append(h('p', { class: 'kicker' }, 'Access (read from your decorators)'));
      if (!e.explicitRules) section.append(h('p', { class: 'warn' }, 'No permission decorator: the default applies, full access for every signed-in person.'));
      section.append(access);
      if (!appliedRules) section.append(h('p', { class: 'pending' }, rich('These rules are not applied yet: run `npx rayfin up db apply`.')));
      section.append(...e.problems.map((x: string) => h('p', { class: 'warn' }, x)));
    }
    if (table) {
      const rows = (db.rows[name] ?? []) as Record<string, unknown>[];
      const read = h('button', { type: 'button' }, `Read ${name}`);
      const out = h('pre', { class: 'json', hidden: '' });
      read.addEventListener('click', () => {
        const req: DataRequest = { entity: name, op: 'read', kind: 'execute', state: { select: Object.keys(table.columns) } };
        const r = handleRequest(project.db, req, identity);
        logData(new Date(), req, r, 'tab');
        out.hidden = false;
        out.textContent = r.ok ? JSON.stringify(r.result, null, 2) : String(r.error);
        out.classList.toggle('err', !r.ok);
      });
      const clear = h('button', { type: 'button', title: 'Ignores permissions. Undo is offered.' }, 'Delete all rows');
      clear.addEventListener('click', () => changeRows(`Deleted every row of ${name}.`, (d) => ({ ...d, rows: { ...d.rows, [name]: [] } })));
      const cols = Object.keys(table.columns);
      const tbl = h(
        'table',
        { class: 'snap' },
        h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', {}, c)), h('th', {}))),
        h(
          'tbody',
          {},
          ...rows.map((row) => {
            const del = h('button', { type: 'button', class: 'row-del', title: 'Delete this row (ignores permissions; Undo is offered)', 'aria-label': 'Delete this row' }, '×');
            del.addEventListener('click', () =>
              changeRows(`Deleted a ${name} row.`, (d) => ({ ...d, rows: { ...d.rows, [name]: (d.rows[name] ?? []).filter((x: Record<string, unknown>) => x.id !== row.id) } })),
            );
            return h('tr', {}, ...cols.map((c) => h('td', { class: typeof row[c] === 'number' ? 'num' : undefined }, fmtCell(row[c] ?? null))), h('td', {}, del));
          }),
        ),
      );
      section.append(
        h('p', { class: 'kicker' }, `Rows (${rows.length})`),
        h('div', { class: 'actions' }, read, clear),
        out,
        rows.length ? tbl : h('p', { class: 'muted' }, 'No rows.'),
      );
      if (unlimited.some((u) => u.startsWith(`${name}.`))) {
        section.append(h('p', { class: 'warn' }, 'Applied with a text column without max (NVARCHAR(MAX)).'));
      }
    }
    parts.push(section);
  }
  // Send directly: a create or update straight to the data API, skipping the page.
  const appliedNames = Object.keys(db.tables);
  if (appliedNames.length) {
    const entitySel = h('select', { 'aria-label': 'Entity' }, ...appliedNames.map((n) => h('option', { value: n }, n))) as HTMLSelectElement;
    const opSel = h('select', { 'aria-label': 'Action' }, h('option', { value: 'create' }, 'create'), h('option', { value: 'update' }, 'update')) as HTMLSelectElement;
    const idInput = h('input', { type: 'text', placeholder: 'id (for update)', 'aria-label': 'Row id', class: 'direct-id' }) as HTMLInputElement;
    const body = h('textarea', { rows: '7', spellcheck: 'false', 'aria-label': 'Fields, as JSON' }) as HTMLTextAreaElement;
    body.value = suggestion(appliedNames[0], 'create');
    const refresh = () => {
      body.value = suggestion(entitySel.value, opSel.value);
      idInput.hidden = opSel.value !== 'update';
    };
    entitySel.addEventListener('change', refresh);
    opSel.addEventListener('change', refresh);
    idInput.hidden = true;
    const send = h('button', { type: 'button' }, `Send as ${identity.signedIn ? persona.name : 'nobody'}`);
    const result = h('p', { class: 'direct-result' }, directResult);
    send.addEventListener('click', () => {
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(body.value);
      } catch {
        result.textContent = 'The fields must be JSON, such as {"country": "Germany"}.';
        return;
      }
      const req: DataRequest = { entity: entitySel.value, op: opSel.value as 'create' | 'update', input, id: opSel.value === 'update' ? idInput.value.trim() : undefined };
      const r = handleRequest(project.db, req, identity);
      logData(new Date(), req, r, 'direct');
      directResult = r.ok ? `Done: ${JSON.stringify(r.result)}` : `Refused: ${r.error}`;
      if (r.ok && r.db !== project.db) {
        project = { ...project, db: r.db };
        saveProject();
      }
      renderData();
    });
    parts.push(
      h(
        'section',
        { class: 'data-entity direct' },
        h('h3', {}, 'Send directly'),
        h('p', { class: 'muted' }, 'A request straight to the data API, as the person signed in, as if from outside the page: the permissions still apply.'),
        h('div', { class: 'actions' }, entitySel, opSel, idInput, send),
        body,
        result,
      ),
    );
  }
  const scroll = el.scrollTop;
  el.replaceChildren(...parts);
  el.scrollTop = scroll;
}

// ---------------------------------------------------------------- wiring
/** Show a tab of the bottom panel. `focus`: the reader picked it, so the terminal's command line takes the keyboard. */
function selectTab(name: string, focus = true) {
  for (const t of document.querySelectorAll<HTMLButtonElement>('.panel-tabs button[data-tab]')) {
    t.setAttribute('aria-selected', String(t.dataset.tab === name));
    $(`tab-${t.dataset.tab}`).hidden = t.dataset.tab !== name;
  }
  if (name === 'log') $('log-new').hidden = true;
  if (name === 'terminal' && focus) termInput.focus();
}

/** The Data tab is there once the data service is on (Store your own data turns it on). */
function updateDataTab() {
  const tab = tabButton('data')!;
  const off = !dataService(project).enabled;
  if (off && tab.getAttribute('aria-selected') === 'true') selectTab('terminal', false);
  tab.hidden = off;
}

for (const t of document.querySelectorAll<HTMLButtonElement>('.panel-tabs button[data-tab]')) {
  t.addEventListener('click', () => selectTab(t.dataset.tab!));
}

$('btn-run').addEventListener('click', () => runNow());
$('btn-restart').addEventListener('click', () => runNow());
$('btn-stop').addEventListener('click', () => stop('Stopped. Press Run, or edit the code, to start again.'));
$('btn-reset').addEventListener('click', () => {
  if (check) return;
  replaceProject(checkpointOf(lesson), `Back to the start of ${num(lesson)} ${lesson.title}.`);
  goTo(position);
});
$('btn-answer').addEventListener('click', () => {
  // Every step of this lesson done: the project as the next lesson starts.
  replaceProject(projectAfter(lesson), `${num(lesson)} ${lesson.title}: every step done.`);
  goTo(position);
});
$<HTMLInputElement>('outline').addEventListener('change', (e) => {
  outline = (e.target as HTMLInputElement).checked;
  toFrame({ type: 'outline', on: outline });
});
$('btn-version').addEventListener('click', () => setPopped($('about').classList.contains('popped') ? null : $('about')));
$('btn-about-close').addEventListener('click', () => setPopped(null));
$('btn-course').addEventListener('click', () => ($('course').hidden ? openCourse() : closeCourse()));
$('btn-course-close').addEventListener('click', closeCourse);
$('course-backdrop').addEventListener('click', closeCourse);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCourse();
    setPopped(null);
  }
});
window.addEventListener('hashchange', () => {
  const r = parseHash();
  if (r) openRoute(r);
});
$('btn-panel-pop').addEventListener('click', () => setPopped($('panel').classList.contains('popped') ? null : $('panel')));
$('btn-editor-pop').addEventListener('click', () => setPopped($('editor-wrap').classList.contains('popped') ? null : $('editor-wrap')));
$('btn-tree').addEventListener('click', () => {
  const on = $('editor-wrap').classList.contains('no-tree');
  store.set('size:tree', on ? '1' : '0');
  treeToggled = true;
  showTree(on);
});
applyTree();
window.addEventListener('resize', applyTree);
$('pop-backdrop').addEventListener('click', () => setPopped(null));
{
  const left = document.querySelector<HTMLElement>('.left')!;
  const right = document.querySelector<HTMLElement>('.right')!;
  const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 50);
  initSplit('split-main', '--left-w', 'sized-main', (e) => pct(e.clientX, window.innerWidth), 25, 75);
  initSplit('split-lesson', '--lesson-h', 'sized-lesson', (e) => pct(e.clientY - left.getBoundingClientRect().top, left.clientHeight), 12, 80);
  initSplit('split-panel', '--panel-h', 'sized-panel', (e) => pct(right.getBoundingClientRect().bottom - e.clientY, right.clientHeight), 10, 75);
  // The file list's width, in pixels: wide enough for long names, never so wide the code has no room.
  const files = $('files');
  initSplit('split-tree', '--tree-w', 'sized-tree', (e) => e.clientX - files.getBoundingClientRect().left, 110, 420, 'px');
}

// ---------------------------------------------------------------- restart, and the splash screen
/** Everything the course keeps in this browser, except the layout sizes. */
const courseKeys = () => {
  try {
    // not the layout sizes, nor the version of the saved step positions (they stay in today's numbering)
    return Object.keys(localStorage).filter((k) => k.startsWith('page-playground:') && !k.startsWith('page-playground:size:') && k !== 'page-playground:steps-v');
  } catch {
    return [];
  }
};

/** Back to the very start: empty project, no progress, no quiz answers, a clean terminal. Undo puts it all back. */
function restartCourse() {
  const backup = courseKeys().map((k) => [k, localStorage.getItem(k)] as const);
  const before = project;
  for (const [k] of backup) localStorage.removeItem(k);
  termOut.replaceChildren();
  termPrint(['Playground: A simulated terminal. Type `help` for the commands it knows.']);
  mode = 'normal';
  const normal = document.getElementById('mode-normal') as HTMLInputElement | null;
  if (normal) normal.checked = true;
  setPopped(null);
  replaceProject(emptyProject() as Project, 'The playground is back at its very start.');
  check = undefined;
  lesson = order[0];
  mismatch = undefined;
  goTo(0);
  showUndo('The playground is back at its very start: empty project, no progress.', () => {
    clearTimeout(saveTimer);
    for (const k of courseKeys()) localStorage.removeItem(k);
    for (const [k, v] of backup) if (v !== null) localStorage.setItem(k, v);
    store.set('project', JSON.stringify(before));
    // Back to the lesson we were on, not the tour the restart opened.
    const was = backup.find(([k]) => k === 'page-playground:lesson')?.[1];
    history.replaceState(null, '', was ? `#${was}` : location.pathname + location.search);
    location.reload();
  });
}

function hideSplash() {
  const el = $('splash');
  el.classList.add('leaving');
  document.body.classList.remove('on-splash');
  window.setTimeout(() => (el.hidden = true), 350);
}

function showSplash() {
  const el = $('splash');
  const started = !!project.appDir || order.some((l) => progress.started(l));
  const current = chapterOf(lesson);
  const currentDone = lessonsOf(current).filter(progress.done).length;
  // Like the site's articles page: the parts and their chapters in a sidebar on the left, the chosen chapter's
  // breakdown on the right. The chapter you are working in is chosen first.
  let picked: Chapter = current;
  const main = h('div', { class: 'splash-main', id: 'splash-chapter-detail', 'aria-live': 'polite' });
  const links = new Map<Chapter, HTMLButtonElement>();
  // the short state beside a chapter in the sidebar: lessons done, a tick, or "soon"
  const shortState = (c: Chapter) => {
    const state = chapterState(c);
    if (state.key === 'coming') return 'soon';
    if (state.key === 'done') return '✓';
    if (state.key === 'progress') return `${lessonsOf(c).filter(progress.done).length}/${lessonsOf(c).length}`;
    return '';
  };
  const renderMain = () => {
    for (const [c, btn] of links) {
      if (c === picked) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    }
    const c = picked;
    const p = partList.find((x) => x.chapters.includes(c.id))!;
    const state = chapterState(c);
    const body = h('div', { class: 'body' });
    if (c.modules) {
      body.append(
        h(
          'ol',
          { class: 'splash-modules' },
          ...modulesOf(c).map((m) => h('li', {}, h('span', { class: 't' }, m.title), h('span', { class: 'g' }, m.goal))),
        ),
      );
    } else {
      body.append(h('p', { class: 'planned-head' }, 'Lessons planned:'), h('ul', { class: 'planned' }, ...c.coming!.map((t) => h('li', {}, t))));
    }
    main.replaceChildren(
      h('p', { class: 'main-part' }, `Part ${partNum(p)} · ${p.title}`),
      h('div', { class: 'main-head' }, h('h2', {}, h('span', { class: 'n' }, `Chapter ${chapterNum(c)}`), c.title), h('span', { class: `chip ${state.key}` }, state.label)),
      h('p', { class: 'main-goal' }, c.goal),
      body,
    );
    renderGo();
  };
  // The big button follows the chapter picked: continue where you are, or start (or continue) the chapter picked.
  const go = $('splash-go') as HTMLButtonElement;
  const renderGo = () => {
    const other = picked !== current && !!picked.modules;
    const state = chapterState(picked).key;
    go.disabled = false;
    go.dataset.chapter = other ? picked.id : '';
    go.title = other && state === 'new' ? 'Builds the project as this chapter begins (every earlier step done). Undo is offered.' : '';
    go.textContent = other
      ? `${state === 'new' ? 'Start' : 'Continue'}: ${picked.title} →`
      : started
        ? `Continue: ${check ? `Check your knowledge, ${check.title}` : `${num(lesson)} ${lesson.title}`} →`
        : 'Start building →';
  };
  const navLink = (c: Chapter) => {
    const state = chapterState(c);
    const btn = h(
      'button',
      { type: 'button', class: `${state.key}${c === current ? ' current' : ''}`, 'aria-controls': 'splash-chapter-detail' },
      h('span', { class: 't' }, h('span', { class: 'n' }, String(chapterNum(c))), c.title),
      h('span', { class: 'side-count' }, shortState(c)),
    ) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      picked = c;
      renderMain();
    });
    links.set(c, btn);
    return h('li', {}, btn);
  };
  $('splash-chapters').replaceChildren(
    h(
      'nav',
      { class: 'splash-nav', 'aria-label': 'Chapters' },
      ...partList.map((p) =>
        h(
          'div',
          { class: 'side-block' },
          h('h2', { class: 'side-title' }, `Part ${partNum(p)} · ${p.level}`),
          h('p', { class: 'side-part' }, p.title),
          h('ul', { class: 'side-list' }, ...chaptersOf(p).map(navLink)),
        ),
      ),
      // The playground's other page: every Power BI visual beside the same visual in an app (visuals/).
      h(
        'div',
        { class: 'side-block' },
        h('h2', { class: 'side-title' }, 'Reference'),
        h('ul', { class: 'side-list' }, h('li', {}, h('a', { href: 'visuals/' }, h('span', { class: 't' }, 'Visuals'), h('span', { class: 'side-count' }, '→')))),
        h('p', { class: 'side-sub' }, 'Each Power BI visual beside the same visual in a Fabric app, and what it takes.'),
      ),
    ),
    main,
  );
  renderMain();
  $('splash-progress').textContent = started
    ? `Chapter ${chapterNum(current)}: ${currentDone} of ${lessonsOf(current).length} lessons done. Your project and progress are kept in this browser.`
    : `${order.length} lessons in ${chapterList.filter((c) => c.modules).length} chapters so far, one step at a time.`;
  $('splash-restart').hidden = !started;
  el.classList.remove('leaving');
  el.hidden = false;
  document.body.classList.add('on-splash');
  go.focus({ preventScroll: true });
  el.scrollTop = 0;
}

$('splash-go').addEventListener('click', () => {
  const c = chapterList.find((x) => x.id === ($('splash-go') as HTMLButtonElement).dataset.chapter);
  if (c) openChapter(c);
  else hideSplash();
});
$('splash-visuals').textContent = `Or browse the visuals: ${VISUAL_IDS.length} Power BI visuals, and what each one takes in an app →`;
// Said on the way in: this is our reading of the docs, not a guarantee (src/disclaimer.mjs). The full text is in About.
{
  const more = h('button', { type: 'button', class: 'link-btn' }, 'More in About');
  more.addEventListener('click', () => $('btn-version').click());
  $('splash-disclaimer').replaceChildren(...disclaimerNodes(DISCLAIMER_SHORT), ' ', more);
  // ... and said again at the bottom, where people expect it.
  $('splash-note').textContent = `${DISCLAIMER_FOOTER} Simulated: nothing here connects to Fabric or Power BI. Made for a desktop browser.`;
}
$('splash-restart').addEventListener('click', () => {
  restartCourse();
  hideSplash();
});
// The bar's brand and Playground tab are links to this page (src/topbar.mjs); here they show the start screen.
for (const id of ['brand', 'tab-course']) {
  $(id).addEventListener('click', (e) => {
    e.preventDefault();
    showSplash();
  });
}

initTerminal();
renderSignIn();
renderData();
renderQueries();
renderHelp();
renderTerms();
renderAbout();
syncModels();
if (project.files[PAGE_FILE] !== undefined) openFile(PAGE_FILE);
else if (Object.keys(project.files).length) openFile(Object.keys(project.files)[0]);
else showNoFiles();
// A link to one step or quiz question (for example from a trainer) goes straight in; otherwise, the splash.
const deepLink = /^#(check\/|[\w-]+\/\d)/.test(location.hash);
openRoute(parseHash() ?? { lesson: byId.get(store.get('lesson') ?? '') ?? order[0] });
if (deepLink) {
  $('splash').hidden = true;
  document.body.classList.remove('on-splash');
} else showSplash();
showTypeStatus();
runNow();
