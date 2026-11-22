# Instructions for AI coding agents

These instructions are for any AI coding tool working in this repository (Claude Code, GitHub Copilot, Cursor, Codex and others). People follow the same rules, written for humans in [CONTRIBUTING.md](CONTRIBUTING.md) and [MAINTAINING.md](MAINTAINING.md). Read MAINTAINING.md before changing lessons, chapters, data or the Visuals page: it says, task by task, which files to edit.

## What this is

The Gold Layer Fabric app playground is a browser course in which Power BI developers who know DAX, but have never written TypeScript, build a Fabric app (Rayfin 2.0, TypeScript, React) one step at a time. It has two pages:
- the course (`src/index.html`, `src/app.ts`);
- the Visuals page (`src/visuals/`).

Nothing talks to Fabric or Power BI: the course is simulated, and every number comes from answers saved from a Contoso model (`data/`).

It is unofficial. It is our interpretation of public documentation, not a guarantee (`src/disclaimer.mjs`).

Learners trust every sentence. An invented fact or a made-up command output is the worst possible bug here.

## Commands

```bash
npm ci             # install (exact versions)
npm run check      # the course built from an empty folder, step by step, plus the Visuals checks; must pass
npm run build      # the static site in dist/
npm run dev        # http://127.0.0.1:5180/ and /visuals/
npm run preview    # serves dist/ at http://127.0.0.1:5181/
node tools/make-step-moves.mjs   # after adding, removing or splitting steps (see below)
```

**A change is not done until `npm run check` passes.** MAINTAINING.md, section 3.1, lists every failure message and its fix.

## Hard rules

1. **Source every claim.** Anything about Fabric, Power BI or Rayfin must come from a source you have actually read in this session:
   - Microsoft Learn (learn.microsoft.com);
   - rayfin.ai;
   - the Rayfin packages' own docs and code;
   - the CLI's `--help`.

   Name the source when you report. If you can't find one, write that it isn't documented. Never fill a gap from memory.
2. **Never invent tool output.** Simulated CLI or service output that can't be checked against the real tool starts with `Playground:` (the `PG()` helper in `src/project.mjs`). Made-up ids look fake: `00000000-…`, `*.invalid`, `@contoso.example`.
3. **Real numbers only.** Figures in lesson or page text come from the saved answers in `data/`. Never type a number from memory.
4. **One action per step card.** Creating a file and pasting into it are two steps.
5. **Plain words first.** Each card starts with a plain sentence in Power BI terms. Code words, counts and citations come after it, or are folded away. Write "we", and don't talk down.
6. **No lesson, chapter or module numbers in text.** Refer to lessons by title; the checker enforces this.
7. **Saved progress.** Learners' browsers remember their step by position. After adding, removing, splitting or reordering steps, follow MAINTAINING.md 2.2: regenerate `src/step-moves.mjs` and, if positions moved, set `FROM` and raise `STEPS_VERSION`. Also check that knowledge-check `step:` numbers in `src/course.mjs` still point at the steps that teach them.
8. **Nothing private.** The repository and its history are public. Never add any of these:
   - local paths;
   - real names or email addresses (use the made-up people at `contoso.example`);
   - credentials, keys or tokens;
   - client or company names;
   - real workspace, item or tenant ids.
9. **Unofficial.** No Microsoft logos or official-sounding wording. Change the disclaimer only in `src/disclaimer.mjs`.
10. **Local servers bind to 127.0.0.1**, never to all interfaces.
11. **Don't publish.** Merging or pushing to `main` publishes the site. Propose changes as a branch or pull request, and let a maintainer merge.

## Working habits

- **Search narrowly.** Don't run recursive searches or size scans over `node_modules`; open the specific package files you need. A local reference install of the Rayfin packages, if present, lives in the gitignored `reference/` folder.
- **Line endings.** On Windows, Git may check files out with CRLF, and the generators write LF. If `git status` shows `src/step-moves.mjs` changed but `git diff --ignore-cr-at-eol` is empty, restore it with `git checkout -- src/step-moves.mjs`.
- **Keep each file's line endings** when editing, and avoid unescaped apostrophes inside single-quoted JavaScript strings.
- **Clean up stale details.** After a rename, a reorder or a split, look for stale numbers, names or step references in code, comments and docs.

## Reviewing a change

Every content change gets two independent reviews before it is merged:

1. **A fact-check.** Every new or changed claim is checked against its source: Learn, rayfin.ai, the packages, or `data/` for numbers.
2. **A beginner read.** The changed lessons are walked as a Power BI developer new to TypeScript would walk them: one action per card, and what the card promises is what appears.

Give reviewers the files and the sources, not your own conclusions. Claude Code users have both reviewers ready-made in `.claude/agents/`, and step-by-step skills in `.claude/skills/`.
