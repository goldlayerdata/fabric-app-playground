// Where a saved step position moves to when a lesson's steps were split. Shared by tools/make-step-moves.mjs,
// which writes src/step-moves.mjs, and tools/check-lessons.mjs, which checks it. Both read the lessons as they
// were at a commit with `git show`.
//
// Positions: 0 is a lesson's idea card, 1..n its steps, n + 1 its summary.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The lessons of src/lesson-list.mjs at a commit. course-code.mjs comes from the same commit (it imports nothing,
 * and its constants change when lessons do); project.mjs comes from today's src.
 */
export async function lessonsAt(rev) {
  const show = (f) => execFileSync('git', ['show', `${rev}:src/${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let text = show('lesson-list.mjs');
  // only the file's own import lines: lesson code quotes imports too
  const today = async (f) => import(pathToFileURL(join(root, 'src', f)).href);
  const shims = {};
  for (const m of text.matchAll(/^import \{([^}]*)\} from '\.\/([\w.-]+)';/gm)) {
    if (m[2] === 'course-code.mjs') continue;
    // Names today's module no longer exports become empty strings: they only shape old steps' keys.
    const names = m[1].split(',').map((n) => n.trim()).filter(Boolean);
    const mod = await today(m[2]);
    const missing = names.filter((n) => !(n in mod));
    if (missing.length) shims[m[2]] = `export * from '${pathToFileURL(join(root, 'src', m[2])).href}';\n${missing.map((n) => `export const ${n} = '';`).join('\n')}\n`;
  }
  text = text.replace(/^(import [^\n]* from )'\.\/([\w.-]+)';/gm, (_, head, f) =>
    f === 'course-code.mjs'
      ? `${head}'data:text/javascript,${encodeURIComponent(show(f)).replace(/'/g, '%27')}';`
      : shims[f]
        ? `${head}'data:text/javascript,${encodeURIComponent(shims[f]).replace(/'/g, '%27')}';`
        : `${head}'${pathToFileURL(join(root, 'src', f)).href}';`,
  );
  return (await import(`data:text/javascript,${encodeURIComponent(text)}`)).lessons;
}

/** What a step does, to recognise it in another version: its edits or command, or, for a step that only looks, its text. */
export const stepKey = (s) => (s.edits || s.run ? JSON.stringify([s.edits ?? null, s.run ?? null]) : `look:${s.do}`);
/** A step that only creates an empty file (+ New file): the first half of a "create and paste" step that was split. */
const createsEmpty = (s) => !!s.edits?.length && s.edits.every((e) => e.from === '' && e.to === '');

/**
 * For one lesson, the new position of every old position (old.length + 2 entries). Steps with the same content
 * (same edits or command, or the same text for a step that only looks) are matched in order (longest common
 * subsequence); the idea card and the summary match each other. A step that has no match took the place after
 * the previous one, when a new step is there to take it; when there is none (the step was removed, or merged
 * into fewer steps), it lands on the next step that is still there, or on the summary. A matched step with new
 * steps just before it moves to the first of them when they create its file (the first half of "create the file,
 * then paste"); otherwise those new steps are the second half of the previous step (such as "Then open
 * Categories"), and it keeps its match.
 */
export function computeMoves(oldSteps, newSteps) {
  const a = oldSteps.map(stepKey);
  const b = newSteps.map(stepKey);
  // longest common subsequence
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Array(a.length).fill(-1);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) match[i++] = j++;
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  // positions: steps are 1-based, 0 the idea card, n + 1 the summary
  const moves = [0];
  for (let i = 0; i < a.length; i++) {
    const prev = moves[i];
    if (match[i] < 0) {
      // the next step that is still there (or the summary): a removed step can't land past it
      const nextKept = match.slice(i + 1).find((m) => m >= 0);
      moves.push(Math.min(prev + 1, nextKept === undefined ? newSteps.length + 1 : nextKept + 1));
      continue;
    }
    const at = match[i] + 1;
    const firstInGap = prev + 1;
    moves.push(at > firstInGap && createsEmpty(newSteps[firstInGap - 1]) ? firstInGap : at);
  }
  moves.push(newSteps.length + 1);
  return moves;
}

/** Every lesson whose positions move, as { id: moves }. */
export function movesFor(oldLessons, newLessons) {
  const out = {};
  const before = new Map(oldLessons.map((l) => [l.id, l]));
  for (const l of newLessons) {
    const old = before.get(l.id);
    if (!old) continue;
    const moves = computeMoves(old.steps, l.steps);
    if (moves.some((m, i) => m !== i)) out[l.id] = moves;
  }
  return out;
}
