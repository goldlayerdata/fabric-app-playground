---
name: release-check
description: The checklist to run before a change to the Fabric app playground goes to main (and so to the live site) - checks, reviews, docs, privacy scan. Use when a change is ready to merge or push, or when the maintainer asks whether it is ready to ship.
---

# Release check

Merging or pushing to `main` publishes the site. Run through this list, and report each item as done, failed or not applicable. Don't push or merge unless the maintainer asks in this session.

1. **Checks:** run `npm run check`. It must pass, and its "saved step positions" section must have run, not been skipped. Then run `npm run build`.
2. **Moved steps:** if steps were added, split or moved, check that:
   - `FROM` is the live commit;
   - `STEPS_VERSION` was raised;
   - `src/step-moves.mjs` is regenerated and part of the change (see the `add-or-split-a-step` skill);
   - knowledge-check `step:` numbers still point at the steps that teach them.
3. **Reviews:** the `fact-checker` and `beginner-reader` agents reviewed the change, and their findings are fixed or answered.
4. **Honesty:** new claims are sourced, and output we couldn't check starts with `Playground:`. The disclaimer is unchanged, or was changed only in `src/disclaimer.mjs`.
5. **Docs match the code:** `README.md`, About (`renderAbout` in `src/app.ts`), `THIRD-PARTY-NOTICES.md`, the Visuals Notes page and `MAINTAINING.md` describe what the code now does: versions, counts, file names.
6. **Nothing private:** scan the change, and review every hit:

   ```bash
   git diff main...HEAD | grep -nIE '\b[A-Z]:\\|/Users/|@gmail|@outlook|@hotmail' || true
   git diff main...HEAD | grep -nIE '[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}' | grep -v '00000000-0000-0000' || true
   ```

   The expected hits are the made-up sign-in people in `src/app.ts`. Anything else must go.
7. **Look at it:** run `npm run build`, then `npm run preview` (127.0.0.1:5181). Click through the changed lessons with "Do it for me" in a private window, and look at any changed Visuals pages.

Report it as a short list. If everything passes, say it is ready, and leave the push to the maintainer.
