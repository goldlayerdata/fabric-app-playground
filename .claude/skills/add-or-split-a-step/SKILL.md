---
name: add-or-split-a-step
description: Add, remove, split or reorder step cards in a lesson of the Fabric app playground without breaking learners' saved progress or knowledge-check references. Use whenever a change touches the steps array of a lesson in src/lesson-list.mjs.
---

# Add or split a step

Learners' browsers remember which step they are on, by its position in the lesson. Moving steps without the extra work below sends them to the wrong card. Follow these steps in order. They mirror MAINTAINING.md, section 2.2.

1. **Edit the steps** in `src/lesson-list.mjs`. One action per card: creating a file and pasting into it are two steps.
   - A step that changes the project has `run: '…'` or `edits: [{ file, from, to }]`. `from: ''` writes a new or empty file.
   - Set `errors` when red lines are expected after the step.
   - `find` must be unique in its file, because the mark goes on the first match.
   - Start `do` with a plain sentence. Put any new term in `[[…]]`. Write no lesson numbers.
2. **Check the quiz references.** In `src/course.mjs`, every knowledge-check question with `lesson: '<this lesson>'` and a `step:` at or after the change must still point at the step that teaches its answer. The checker only checks the range.
3. **Run `npm run check`** and fix any failures, including later steps whose `edits` no longer match. MAINTAINING.md, section 3.1, explains each message.
4. **Regenerate the position table:**

   ```bash
   node tools/make-step-moves.mjs
   git diff --ignore-cr-at-eol src/step-moves.mjs
   ```

   If that diff is empty, nothing moved. Restore the file with `git checkout -- src/step-moves.mjs` (line endings only) and go to step 6.
5. **If positions moved:**
   1. Find the commit the live site was built from (`git fetch`, then `git log -1 --format=%h origin/main`). If the split is already pushed, use the commit before it.
   2. Set `export const FROM = '<hash>';` in `tools/make-step-moves.mjs`.
   3. In that file's template text, raise `export const STEPS_VERSION` by one. Edit it there, not in `src/step-moves.mjs`.
   4. Run `node tools/make-step-moves.mjs` again and read what it prints, for example `client: 2→3, 3→4`.
   5. Run `npm run check` until it passes.
6. **Get the change reviewed** by the `fact-checker` and `beginner-reader` agents. Give them the changed lesson ids and the commit range.
7. **Commit** the lesson change, `tools/make-step-moves.mjs` and `src/step-moves.mjs` together. Don't push to `main` unless the maintainer asks.
