import './app.css';
import * as monaco from './monaco.js';
import { lessons } from './lesson-list.mjs';
import { modules } from './course.mjs';
import { terms, help } from './terms.mjs';
import editorLibs from 'virtual:editor-libs';
import { answer, entries, savedResult, snapshotsTakenAt, type Answer, type Mode } from './stand-in';
import {
  PAGE_FILE,
  SIMULATED_ENV,
  applyFileEdits,
  checkpoint,
  connectorNames,
  emptyProject,
  isGenerated,
  runCommand,
  stepIsDone,
} from './project.mjs';

type Edit = { file?: string; from: string; to: string; all?: boolean };
type Point = 'editor' | 'files' | 'preview' | 'status' | 'terminal' | 'log' | 'queries' | 'terms' | 'run' | 'reset';
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
  done?: { file?: string; before?: [string, string]; absent?: string };
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
type Project = { cwd: string | null; appDir: string | null; files: Record<string, string>; packages: string[]; dev: boolean; history: string[] };

// ---------------------------------------------------------------- settings
const RUN_DELAY_MS = 700; // compile and run after a pause in typing
const QUERY_DELAY_MS: [number, number] = [250, 600]; // simulated round trip
// Stop a page that keeps querying. A redraw loop runs at about one query per simulated round
// trip (2 to 4 a second), so it trips this within 10 seconds; a normal page sends a handful.
const CUTOFF = { queries: 20, withinMs: 10_000 };

// ---------------------------------------------------------------- the course
const course = modules as Module[];
const byId = new Map((lessons as Lesson[]).map((l) => [l.id, l]));
/** Every lesson, in course order. */
const order: Lesson[] = course.flatMap((m) => m.lessons.map((id) => byId.get(id)!));
const moduleOf = (l: Lesson) => course.find((m) => m.lessons.includes(l.id))!;
/** "2.1": module number, then the lesson's place in it. */
function num(l: Lesson) {
  const m = moduleOf(l);
  return `${course.indexOf(m)}.${m.lessons.indexOf(l.id) + 1}`;
}
const termById = new Map(terms.map((t) => [t.id, t]));

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

/** [[props]] or [[shown text|term-id]]: a word that opens its row in the Terms tab. */
function termLink(inner: string): Node {
  const [shown, id = shown.toLowerCase()] = inner.split('|');
  const t = termById.get(id);
  if (!t) return document.createTextNode(shown);
  const b = h('button', { type: 'button', class: 'term', title: `${t.term}: ${plain(t.means)} (click for the Terms tab)` }, shown);
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

/** Progress, kept in this browser. A lesson is done once its summary card has been shown. */
const progress = {
  done: (l: Lesson) => store.get(`done:${l.id}`) === '1',
  started: (l: Lesson) => progress.done(l) || Number(store.get(`step:${l.id}`) ?? 0) > 0,
  right: (m: Module, i: number) => store.get(`check:${m.id}:${i}`) === '1',
  checkDone: (m: Module) => !!m.check?.every((_, i) => progress.right(m, i)),
};

const fmtTime = (d: Date) => d.toTimeString().slice(0, 8);
const terminalAnswer = (query: string) => answer(query, undefined, 'normal').result;

// ---------------------------------------------------------------- the project
function loadProject(): Project {
  try {
    const p = JSON.parse(store.get('project') ?? 'null') as Project | null;
    if (p && typeof p.files === 'object' && Array.isArray(p.packages)) {
      for (const f of Object.keys(p.files)) p.files[f] = p.files[f].replace(/\r\n/g, '\n');
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
function replaceProject(next: Project, note: string) {
  const previous = project;
  project = JSON.parse(JSON.stringify(next));
  saveProject();
  syncModels();
  const first = Object.keys(project.files).includes(PAGE_FILE) ? PAGE_FILE : Object.keys(project.files)[0];
  if (first) openFile(first);
  else showNoFiles();
  renderPrompt();
  updateDoneTick();
  runNow();
  showUndo(note, () => replaceProject(previous, 'Undone.'));
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
}

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

function makeDots(label: (p: number) => string, isEnd: (p: number) => boolean) {
  const dots = h('div', { class: 'dots', role: 'list', 'aria-label': 'Cards' });
  for (let p = 0; p <= lastPosition(); p++) {
    const dot = h('button', {
      type: 'button',
      class: `dot${p === position ? ' on' : ''}${isEnd(p) ? ' end' : ''}`,
      title: label(p),
      'aria-label': label(p),
      'aria-current': p === position ? 'step' : undefined,
    });
    dot.addEventListener('click', () => goTo(p));
    dots.append(dot);
  }
  return dots;
}

function panelHead(m: Module, title: (Node | string)[], dots: HTMLElement) {
  const link = h('button', { type: 'button', class: 'link-btn', title: 'Copy a link to this card' }, 'Copy link');
  link.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      link.textContent = 'Link copied';
    } catch {
      link.textContent = 'Copy it from the address bar';
    }
    setTimeout(() => (link.textContent = 'Copy link'), 1500);
  });
  return h(
    'div',
    { class: 'lesson-head' },
    h('div', { class: 'titles' }, h('p', { class: 'module-line' }, `Module ${course.indexOf(m)} · ${m.title}`), h('h1', {}, ...title)),
    h('div', { class: 'head-right' }, dots, link, popButton($('lesson'))),
  );
}

// ---------------------------------------------------------------- pop-outs and resizable sections
/** Show a section large, over the page, for comfortable reading. One at a time; Esc or a click outside docks it. */
function setPopped(el: HTMLElement | null) {
  for (const x of document.querySelectorAll('.popped')) x.classList.remove('popped');
  el?.classList.add('popped');
  $('pop-backdrop').hidden = !el;
  for (const b of document.querySelectorAll<HTMLElement>('.pop-btn')) {
    const on = !!b.closest('.popped');
    b.textContent = on ? 'Dock' : 'Pop out';
    b.setAttribute('aria-pressed', String(on));
  }
  if (el?.id === 'panel') termOut.scrollTop = termOut.scrollHeight;
}

function popButton(target: HTMLElement) {
  const on = target.classList.contains('popped');
  const b = h(
    'button',
    { type: 'button', class: 'link-btn pop-btn', 'aria-pressed': String(on), title: 'Show this large, for comfortable reading (Esc closes)' },
    on ? 'Dock' : 'Pop out',
  );
  b.addEventListener('click', () => setPopped(target.classList.contains('popped') ? null : target));
  return b;
}

/** A divider that sets a CSS size variable while dragged. The size is remembered; double-click resets it. */
function initSplit(id: string, cssVar: string, sizedClass: string, compute: (e: PointerEvent) => number, min: number, max: number) {
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
    const move = (ev: PointerEvent) => apply(`${Math.max(min, Math.min(max, compute(ev))).toFixed(1)}%`);
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
      upNext: [`Up next: ${m.check.length} questions on Module ${course.indexOf(m)}, ${m.title}.`],
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
  const file = step?.file ?? step?.edits?.[0]?.file ?? (step?.edits || step?.find ? PAGE_FILE : undefined);
  if (file && project.files[file] !== undefined && file !== activeFile) openFile(file);
  pointAt(step?.point);
  markFind(step);
  renderCourseButton();
  ($('btn-answer') as HTMLButtonElement).hidden = !!check || !lesson.steps.some((s) => s.edits || s.run);
}

/** The "your project isn't at this lesson's start" banner. */
function mismatchBanner() {
  if (mismatch !== lesson) return null;
  const use = h('button', { type: 'button' }, "Use the course's version");
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
    h('p', {}, 'Your project is not where this lesson starts (you may have skipped ahead, or written something differently). The steps expect the course\'s version.'),
    h('div', { class: 'actions' }, use, keep),
  );
}

function renderLesson() {
  const n = lesson.steps.length;
  const last = lastPosition();
  const el = $('lesson');
  doneTick = undefined;

  const dots = makeDots(
    (p) => (p === 0 ? 'The idea' : p === last ? 'Summary' : `Step ${p}`),
    (p) => p === 0 || p === last,
  );

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
    card.append(h('p', { class: 'kicker' }, `Step ${position} of ${n}`), h('p', { class: 'do' }, rich(step.do)));
    const snippet = step.run ?? step.code;
    if (snippet) card.append(h('div', { class: `snippet${step.run ? ' command' : ''}` }, h('pre', {}, step.run ? `$ ${step.run}` : snippet), copyButton(snippet)));
    const actions = h('div', { class: 'actions' });
    const findText = step.find ?? step.edits?.[0]?.from.trim();
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
    if (actions.childElementCount) card.append(actions);
    if (step.see) card.append(h('p', { class: 'see' }, h('b', {}, 'You should see: '), rich(step.see)));
    if (step.why) card.append(h('p', { class: 'why' }, h('b', {}, 'Why: '), rich(step.why)));
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
    panelHead(moduleOf(lesson), [h('span', { class: 'num' }, num(lesson)), lesson.title], dots),
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
  const dots = makeDots(
    (p) => (p === qs.length ? 'Result' : `Question ${p + 1}`),
    (p) => p === qs.length,
  );

  const card = h('div', { class: 'card' });
  if (position < qs.length) {
    const qi = position;
    const q = qs[qi];
    card.append(h('p', { class: 'kicker' }, `Question ${qi + 1} of ${qs.length}`), h('p', { class: 'do' }, rich(q.q)));
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
          h('p', { class: ok ? 'ok' : 'bad' }, ok ? 'Right.' : 'Not quite.'),
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
          ? `That is Module ${course.indexOf(m)} done: ${m.goal.charAt(0).toLowerCase()}${m.goal.slice(1)}`
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
      : h('span', { class: 'muted' }, 'That was the whole course.');
  } else {
    next = h('button', { type: 'button', class: 'next' }, position === qs.length - 1 ? 'Result →' : 'Next question →');
    next.addEventListener('click', () => goTo(position + 1));
  }

  el.replaceChildren(panelHead(m, ['Check your knowledge'], dots), card, h('div', { class: 'lesson-nav' }, back, next));
  el.scrollTop = 0;
}

// ---------------------------------------------------------------- course drawer
function renderCourseButton() {
  const done = order.filter(progress.done).length;
  $('course-where').textContent = check ? `${course.indexOf(check)} · Check your knowledge` : `${num(lesson)} ${lesson.title}`;
  $('course-count').textContent = `${done} of ${order.length} lessons`;
  ($('course-bar').firstElementChild as HTMLElement).style.width = `${(done / order.length) * 100}%`;
}

function renderCourse() {
  const resume = order.find((l) => !progress.done(l));
  const body = $('course-body');
  const startOver = h(
    'button',
    { type: 'button', class: 'link-btn', title: 'Empties the project and clears progress and quiz answers. Undo is offered.' },
    'Restart the whole course',
  );
  startOver.addEventListener('click', () => {
    closeCourse();
    restartCourse();
  });
  body.replaceChildren(
    h(
      'p',
      { class: 'muted' },
      `${order.length} lessons in ${course.length} modules, one step at a time, building one app. Progress and the project are kept in this browser only.`,
    ),
    resume
      ? h('a', { class: 'next resume', href: `#${resume.id}` }, `${progress.started(resume) ? 'Continue' : 'Start'}: ${num(resume)} ${resume.title} →`)
      : h('p', { class: 'ok' }, 'Every lesson done.'),
  );
  for (const [mi, m] of course.entries()) {
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
        ),
      );
    }
    body.append(
      h('section', { class: 'mod' }, h('h3', {}, h('span', { class: 'num' }, `Module ${mi}`), m.title), h('p', { class: 'muted' }, m.goal), list),
    );
  }
  body.append(h('p', { class: 'start-over' }, startOver));
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

function pointAt(p?: Point) {
  document.querySelectorAll('.pointed').forEach((e) => e.classList.remove('pointed'));
  if (!p) return;
  const target = {
    editor: $('editor').parentElement,
    files: $('files'),
    preview: $('preview'),
    status: $('run-state'),
    terminal: tabButton('terminal'),
    log: tabButton('log'),
    queries: tabButton('queries'),
    terms: tabButton('terms'),
    run: $('btn-run'),
    reset: $('btn-reset'),
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

/** When a step card opens, mark its spot in the code (without taking the cursor) and scroll to it. */
let findMarks: monaco.editor.IEditorDecorationsCollection | undefined;
function markFind(step?: Step) {
  findMarks?.clear();
  const model = editor.getModel();
  const text = findTextOf(step);
  if (!text || !model) return;
  const matches = model.findMatches(text, false, false, true, null, false);
  if (!matches.length) return;
  findMarks = editor.createDecorationsCollection([
    { range: matches[0].range, options: { className: 'find-mark', overviewRuler: { color: '#5fe3f0', position: monaco.editor.OverviewRulerLane.Center } } },
  ]);
  editor.revealRangeInCenterIfOutsideViewport(matches[0].range);
}

/** Select the step's spot in the editor and scroll to it. */
function showInCode(text: string, step?: Step) {
  const file = step?.file ?? step?.edits?.[0]?.file;
  if (file && project.files[file] !== undefined) openFile(file);
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
  editor.revealRangeInCenter(range);
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
    button.textContent = 'Your code differs here: do it by hand, or Reset';
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
  // Highlight the first new line the step added.
  const e = step.edits?.find((x) => x.to);
  if (e) {
    const fromLines = new Set(e.from.split('\n').map((l) => l.trim()));
    const added = e.to.split('\n').map((l) => l.trim()).find((l) => l && !fromLines.has(l));
    if (added) showInCode(added, { ...step, file: e.file ?? PAGE_FILE });
  }
  updateDoneTick();
}

let flashTimer: number | undefined;
function flash(message: string) {
  const el = $('type-status');
  const before = el.textContent;
  el.textContent = message;
  clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => {
    if (el.textContent === message) el.textContent = before;
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
type TsDiagnostic = { category: number };
type TsWorker = {
  getEmitOutput(fileName: string): Promise<{ outputFiles: { name: string; text: string }[] }>;
  getSyntacticDiagnostics(fileName: string): Promise<TsDiagnostic[]>;
  getSemanticDiagnostics(fileName: string): Promise<TsDiagnostic[]>;
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
});
const DIAGNOSTICS = { noSemanticValidation: false, noSyntaxValidation: false };
ts.typescriptDefaults.setDiagnosticsOptions(DIAGNOSTICS);
ts.typescriptDefaults.setEagerModelSync(true);

/** Monaco re-checks only the file that changed; a change in data.ts can break App.tsx, so after a
 *  change, setting the options again makes it re-check every file. */
let revalidateTimer: number | undefined;
function revalidateAll() {
  clearTimeout(revalidateTimer);
  revalidateTimer = window.setTimeout(() => ts.typescriptDefaults.setDiagnosticsOptions({ ...DIAGNOSTICS }), 400);
}
for (const [path, text] of Object.entries(editorLibs.always)) ts.typescriptDefaults.addExtraLib(text, `file:///${path}`);

// Package types appear once the package is installed in the project, as in a real project.
const packageLibs = new Map<string, { dispose(): void }[]>();
function updateLibs() {
  for (const [pkg, files] of Object.entries(editorLibs.packages)) {
    const installed = project.packages.includes(pkg);
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
    { token: 'keyword', foreground: 'ff9fc8' },
    { token: 'number', foreground: '9fe0c0' },
  ],
  colors: {
    'editor.background': '#0a1328',
    'editor.lineHighlightBackground': '#111c38',
    'editorLineNumber.foreground': '#4a5a82',
    'editorLineNumber.activeForeground': '#5fe3f0',
    'editorCursor.foreground': '#5fe3f0',
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
  automaticLayout: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  padding: { top: 8 },
  fixedOverflowWidgets: true,
  readOnly: true,
});

const models = new Map<string, monaco.editor.ITextModel>();
let activeFile: string | undefined;
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
      // An empty model on Windows defaults to CRLF; the steps' exact edits are written with \n.
      model.setEOL(monaco.editor.EndOfLineSequence.LF);
      models.set(path, model);
      model.onDidChangeContent(() => {
        project.files[path] = model!.getValue(monaco.editor.EndOfLinePreference.LF);
        revalidateAll();
        saveProject();
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
      model.dispose();
      models.delete(path);
      if (activeFile === path) activeFile = undefined;
    }
  }
  updateLibs();
  renderFiles();
  revalidateAll();
}

function openFile(path: string) {
  const model = models.get(path);
  if (!model) return;
  activeFile = path;
  editor.setModel(model);
  editor.updateOptions({ readOnly: isGenerated(path, model.getValue()) });
  renderFiles();
  markFind(currentStep());
}

function showNoFiles() {
  activeFile = undefined;
  editor.setModel(noFiles);
  editor.updateOptions({ readOnly: true });
  renderFiles();
}

function renderFiles() {
  const bar = $('files');
  const paths = Object.keys(project.files).sort((a, b) => (a === PAGE_FILE ? -1 : b === PAGE_FILE ? 1 : a.localeCompare(b)));
  const items = paths.map((p) => {
    const b = h(
      'button',
      { type: 'button', class: `file${p === activeFile ? ' on' : ''}`, title: isGenerated(p, project.files[p]) ? `${p} (generated: read-only here)` : p },
      isGenerated(p, project.files[p]) ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null,
      p.split('/').pop()!,
    );
    b.addEventListener('click', () => openFile(p));
    return b;
  });
  const add = h('button', { type: 'button', class: 'file add', title: 'Create a file in the project' }, '+ New file');
  add.addEventListener('click', newFile);
  if (!project.appDir) add.setAttribute('disabled', '');
  bar.replaceChildren(
    paths.length ? h('span', { class: 'folder' }, `${project.appDir}/`) : h('span', { class: 'muted' }, 'No project yet'),
    ...items,
    add,
  );
}

function newFile() {
  const path = window.prompt('New file, relative to the app folder (for example src/components.tsx):', 'src/');
  if (!path) return;
  const clean = path.trim().replace(/^\.?\//, '');
  if (!/^[\w./-]+\.(tsx?|css|json)$/.test(clean) || clean.includes('..')) {
    flash('Use a path like src/components.tsx.');
    return;
  }
  if (project.files[clean] === undefined) project.files[clean] = '';
  saveProject();
  syncModels();
  openFile(clean);
}

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => runNow());

/** Type errors across the project's code files. */
function countErrors() {
  const byFile: Record<string, number> = {};
  for (const [path, model] of models) {
    if (!isCode(path)) continue;
    const n = monaco.editor
      .getModelMarkers({ resource: model.uri })
      .filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
    if (n) byFile[path.split('/').pop()!] = n;
  }
  return byFile;
}

function showTypeStatus() {
  const byFile = countErrors();
  const total = Object.values(byFile).reduce((a, b) => a + b, 0);
  const el = $('type-status');
  el.className = total ? 'bad' : 'ok';
  el.textContent = total
    ? `${total} type error${total > 1 ? 's' : ''} in ${Object.keys(byFile).join(', ')}: hover the red lines (the page still runs)`
    : models.size
      ? 'No type errors'
      : '';
}
monaco.editor.onDidChangeMarkers(() => showTypeStatus());

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
  // The editor replaces its TypeScript worker when package types or options change, as they do at start-up.
  // A call that went to the replaced worker is never answered (seen on a reload with a project already there),
  // so: wait a little, then compile again with the current worker.
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
  });
  showRunning();
}

let runQueries = 0;
function showRunning() {
  setRunState(`Running · ${runQueries} quer${runQueries === 1 ? 'y' : 'ies'} sent`, 'live');
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
  if (msg.type === 'query' && msg.runId === runId) onQuery(msg.runId, msg.id, String(msg.query), msg.limit);
});

function onQuery(forRun: number, id: number, query: string, limit: unknown) {
  const now = performance.now();
  queryTimes = queryTimes.filter((t) => now - t < CUTOFF.withinMs);
  queryTimes.push(now);
  runQueries++;
  showRunning();
  const started = new Date();
  const result = answer(query, limit, mode);
  const row = logQuery(started, query, result);
  if (queryTimes.length > CUTOFF.queries) {
    stop(
      `Stopped: the page sent more than ${CUTOFF.queries} queries in ${CUTOFF.withinMs / 1000} seconds. ` +
        'Something is running the query again on every redraw. In a real app, each of those is a query against the model.',
    );
    return;
  }
  const delay = QUERY_DELAY_MS[0] + Math.random() * (QUERY_DELAY_MS[1] - QUERY_DELAY_MS[0]);
  window.setTimeout(() => {
    if (forRun !== runId) return;
    row.setDuration(Math.round(delay));
    toFrame({ type: 'queryResult', runId: forRun, id, result: result.result, thrown: result.thrown });
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
  if (filesChanged) {
    syncModels();
    if (!activeFile && project.files[PAGE_FILE] !== undefined) openFile(PAGE_FILE);
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

function logRunStart(n: number) {
  logEl.prepend(h('div', { class: 'log-run' }, `Run ${n} · ${fmtTime(new Date())}`));
  trimLog();
}

function trimLog() {
  while (logEl.children.length > 300) logEl.lastElementChild?.remove();
}

function logQuery(at: Date, query: string, a: Answer) {
  logCount++;
  $('log-count').textContent = String(logCount);
  const r = a.result;
  let status: HTMLElement;
  let cols = '';
  if (a.thrown) status = h('span', { class: 'err' }, 'threw: network');
  else if (r?.status === 'error') status = h('span', { class: 'err' }, `error: ${r.error.category}`);
  else {
    status = h('span', { class: 'ok' }, a.entry!.id);
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
    details.append(
      h(
        'div',
        { class: 'log-detail' },
        h('div', { class: 'muted' }, 'Query sent'),
        h('pre', { class: 'dax' }, query.trim()),
        h('div', { class: 'muted' }, a.thrown ? 'The call threw' : 'Result (what executeQuery returned)'),
        h('pre', { class: 'json' }, JSON.stringify(shown, null, 2)),
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
      'These are the only queries the simulated connector can answer: saved results from the Contoso model. ',
      'Send one of them, word for word (spacing and letter case don\'t matter), and you get its result. ',
      'Anything else comes back as an error result.',
    ),
    modeBox,
  );
  const groups = [...new Set(entries.map((e) => e.group))];
  for (const g of groups) {
    const box = h('div', { class: 'q-group' }, h('h3', {}, g));
    for (const e of entries.filter((x) => x.group === g)) {
      const item = h('details', { class: 'q-item' }, h('summary', {}, h('span', {}, e.title), h('span', { class: 'id' }, e.id)));
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

// ---------------------------------------------------------------- terms and help tabs
function renderTerms() {
  const rows = terms.map((t) =>
    h('tr', { id: `term-${t.id}` }, h('th', { scope: 'row' }, t.term), h('td', {}, rich(t.means)), h('td', {}, rich(t.pbi)), h('td', {}, lessonLink(byId.get(t.lesson)!))),
  );
  $('tab-terms').append(
    h('p', { class: 'muted' }, 'The words the lessons use, what they mean, and the nearest thing in Power BI. Underlined words in a lesson open their row here.'),
    h(
      'table',
      { class: 'ref' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Term'), h('th', {}, 'What it means'), h('th', {}, 'In Power BI'), h('th', {}, 'Taught in'))),
      h('tbody', {}, ...rows),
    ),
  );
}

function showTerm(id: string) {
  selectTab('terms');
  const row = document.getElementById(`term-${id}`);
  if (!row) return;
  row.scrollIntoView({ block: 'center' });
  row.classList.remove('flash');
  void row.offsetWidth; // restart the highlight
  row.classList.add('flash');
}

function renderHelp() {
  $('tab-help').append(
    h('p', { class: 'muted' }, 'Something odd? Find what you see in the first column.'),
    h(
      'table',
      { class: 'ref' },
      h('thead', {}, h('tr', {}, h('th', {}, 'What you see'), h('th', {}, 'Likely cause'), h('th', {}, 'Fix'))),
      h('tbody', {}, ...help.map((r) => h('tr', {}, h('th', { scope: 'row' }, rich(r.symptom)), h('td', {}, rich(r.cause)), h('td', {}, rich(r.fix))))),
    ),
  );
}

// ---------------------------------------------------------------- about tab
function renderAbout() {
  const p = (...parts: (string | Node)[]) => h('p', {}, ...parts);
  const a = (href: string, text: string) => h('a', { href, target: '_blank', rel: 'noopener' }, text);
  $('tab-about').append(
    p(
      h('b', {}, 'A Gold Layer Lab playground. '),
      'Unofficial, and not affiliated with Microsoft. It is for Power BI developers who want to read and write the code of a Fabric app, from an empty folder to a reviewed report. More experiments are in the ',
      a('https://goldlayerdata.com/lab.html', 'Lab'),
      ', and articles and shorts on ',
      a('https://goldlayerdata.com/', 'goldlayerdata.com'),
      '.',
    ),
    p(
      h('b', {}, 'Nothing here talks to Fabric or Power BI. '),
      'The terminal simulates the Rayfin 2.0 commands the course uses; what they write (rayfin.yml, the connector\'s schema file, package.json) follows the Rayfin docs and the data app template as installed by the Rayfin CLI 2.0.0, and lines we could not check against the real output start with Playground:. ',
      'The Rayfin packages are simulated too: the editor checks your code against their real 2.0 signatures (a subset, MIT), and in the page, executeQuery matches the query text against saved results and returns them in the connector\'s result shape. Sign-in is skipped. Request ids starting with "simulated-" are made up. The real thing: ',
      a('https://learn.microsoft.com/fabric/apps/connectors', 'Connect Fabric Apps to Fabric data'),
      ' on Microsoft Learn, and ',
      a('https://rayfin.ai/docs/connectors/semantic-models', 'Semantic models'),
      ' in the Rayfin docs.',
    ),
    p(
      h('b', {}, 'The course. '),
      'Its structure follows the way Microsoft Learn builds training (modules of short units, a knowledge check at the end of a module, summaries) and the way the Rayfin docs teach (numbered steps, then what to read next). Only the structure is borrowed.',
    ),
    p(
      h('b', {}, 'Data. '),
      `Snapshots taken ${snapshotsTakenAt} from the Contoso measures model (gold-layer-examples), built with the `,
      a('https://github.com/sql-bi/Contoso-Data-Generator-V2', 'SQLBI Contoso Data Generator V2'),
      ' (MIT). Sales lines from January 2023 to 9 November 2026, so 2026 is a part year. The queries use the model\'s own measures, as a real app does, such as [Revenue] (quantity × net price, in USD), [# Orders], [# Customers] and [Margin %]. Only Measure or query and the review lesson write one into a query, to compare.',
    ),
    p(
      h('b', {}, 'Versions. '),
      'Mirrors Rayfin 2.0. React 19.3.1 and its types. The editor\'s checking uses TypeScript ',
      monaco.typescript.typescriptVersion,
      ' (built into Monaco 0.57.0); the whole course is also checked with TypeScript 6.0.3. (The data app template itself pins TypeScript ~5.7.) Tailwind CSS 4.3.4, in-browser build.',
    ),
    p(
      h('b', {}, 'Your project and progress '),
      'are kept in this browser only. Reset takes a lesson back to its start; the course drawer can start the project over. Both offer Undo.',
    ),
  );
}

// ---------------------------------------------------------------- wiring
function selectTab(name: string) {
  for (const t of document.querySelectorAll<HTMLButtonElement>('.panel-tabs button[data-tab]')) {
    t.setAttribute('aria-selected', String(t.dataset.tab === name));
    $(`tab-${t.dataset.tab}`).hidden = t.dataset.tab !== name;
  }
  if (name === 'terminal') termInput.focus();
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
$('btn-version').addEventListener('click', () => selectTab('about'));
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
$('pop-backdrop').addEventListener('click', () => setPopped(null));
{
  const left = document.querySelector<HTMLElement>('.left')!;
  const right = document.querySelector<HTMLElement>('.right')!;
  const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 50);
  initSplit('split-main', '--left-w', 'sized-main', (e) => pct(e.clientX, window.innerWidth), 25, 75);
  initSplit('split-lesson', '--lesson-h', 'sized-lesson', (e) => pct(e.clientY - left.getBoundingClientRect().top, left.clientHeight), 12, 80);
  initSplit('split-panel', '--panel-h', 'sized-panel', (e) => pct(right.getBoundingClientRect().bottom - e.clientY, right.clientHeight), 10, 75);
}

// ---------------------------------------------------------------- restart, and the splash screen
/** Everything the course keeps in this browser, except the layout sizes. */
const courseKeys = () => {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith('page-playground:') && !k.startsWith('page-playground:size:'));
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
  replaceProject(emptyProject() as Project, 'The course is back at its very start.');
  check = undefined;
  lesson = order[0];
  mismatch = undefined;
  goTo(0);
  showUndo('The course is back at its very start: empty project, no progress.', () => {
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
  window.setTimeout(() => (el.hidden = true), 350);
}

function showSplash() {
  const el = $('splash');
  const started = !!project.appDir || order.some((l) => progress.started(l));
  const done = order.filter(progress.done).length;
  $('splash-modules').replaceChildren(
    ...course.map((m, i) => h('li', {}, h('span', { class: 'n' }, String(i)), h('span', { class: 't' }, m.title), h('span', { class: 'g' }, m.goal))),
  );
  const go = $('splash-go') as HTMLButtonElement;
  go.disabled = false;
  go.textContent = started ? `Continue: ${check ? 'Check your knowledge' : `${num(lesson)} ${lesson.title}`} →` : 'Start the course →';
  $('splash-progress').textContent = started ? `${done} of ${order.length} lessons done. Your project and progress are kept in this browser.` : `${order.length} lessons in ${course.length} modules, one step at a time.`;
  $('splash-restart').hidden = !started;
  el.classList.remove('leaving');
  el.hidden = false;
  go.focus();
}

$('splash-go').addEventListener('click', hideSplash);
$('splash-restart').addEventListener('click', () => {
  restartCourse();
  hideSplash();
});
$('brand').addEventListener('click', showSplash);
$('brand').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    showSplash();
  }
});

initTerminal();
renderQueries();
renderTerms();
renderHelp();
renderAbout();
syncModels();
if (project.files[PAGE_FILE] !== undefined) openFile(PAGE_FILE);
else if (Object.keys(project.files).length) openFile(Object.keys(project.files)[0]);
else showNoFiles();
// A link to one step or quiz question (for example from a trainer) goes straight in; otherwise, the splash.
const deepLink = /^#(check\/|[\w-]+\/\d)/.test(location.hash);
openRoute(parseHash() ?? { lesson: byId.get(store.get('lesson') ?? '') ?? order[0] });
if (deepLink) $('splash').hidden = true;
else showSplash();
showTypeStatus();
runNow();
