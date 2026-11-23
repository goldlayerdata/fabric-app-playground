# Maintaining the Fabric app playground

This guide is for whoever updates the playground later: changing a lesson, adding a chapter, refreshing the data, fixing a failing check, and shipping. Each task is a short list of steps. Commands are for PowerShell, run from the repository folder.

**You need:**
- Node.js 22, which is what the deploy uses.
- Git.
- The GitHub CLI `gh`, optionally, to watch deploys.
- PowerShell 7 (`pwsh`) and Power BI Desktop, only for retaking snapshots.

**First time on a machine:**

```powershell
npm ci
npm run check
```

---

## 1. How it fits together

### Two pages, one site

| Page | Address | Starts at |
| --- | --- | --- |
| **Playground**: the lessons, editor, terminal, preview | `/` | `src/index.html`, `src/app.ts` |
| **Visuals**: each Power BI visual beside the same visual in a Fabric app | `/visuals/` | `src/visuals/index.html`, `src/visuals/shell/main.tsx` |

- **Shared top bar:** both pages use one top bar, with its markup in `src/topbar.mjs` and its styles in `src/top.css`.
- **Sandboxed preview:** the learner's code runs in a sandboxed preview frame (`src/preview.html`, `src/runtime.tsx`).
- **Nothing is live:** nothing talks to Fabric or Power BI. Queries are answered from saved results (snapshots) taken once in Power BI Desktop.

### One build

`npm run build` (`tools/build.mjs`) bundles everything from `node_modules` into `dist/`, with no CDN. It also:

- writes the top bar into both pages, in place of their `<top-bar page="…">` element;
- copies `preview.html`, `tailwind.js`, `favicon.svg`, the licence and the notices;
- prints both pages' sizes and writes `dist/visuals/bundle-report.json`, which the Visuals Notes page reads.

`npm run dev` does the same, unminified. It serves on `http://127.0.0.1:5180` and rebuilds the code and CSS when you save.

### What `npm run check` proves

It runs two scripts in order and writes nothing. They are joined with `&&`, so if the lessons check fails, the Visuals check doesn't run.

**`tools/check-lessons.mjs`: the lessons**

- **Structure:** every lesson is in exactly one module; chapters hold the modules in order; parts hold the chapters in order; live chapters come before coming ones.
- **Text rules:**
  - lessons are never referred to by number;
  - every `[[term]]` is in the glossary;
  - "In a real Fabric app" links go only to learn.microsoft.com or rayfin.ai;
  - a step with several edits says **Do it for me** makes them;
  - quiz answers name a real lesson and step.
- **Every lesson, built from an empty folder** the way **Do it for me** would build it:
  - after every step, the project is type-checked (TypeScript 6.0.3, strict), and the number of errors must equal the step's `errors`;
  - every DAX query the project can send must have a saved answer from the model its connector names.
- **Controls:** behaviour a type check can't see. That covers connector names, permissions and claims, and the numbers shown in "Two models, one page" and "Rows or measures". It also checks that the lakehouse rows add up to the model's `[Revenue]`.
- **Saved step positions:** `src/step-moves.mjs` must be up to date. This needs Git history. The deploy and the pull request check fetch the whole history (`fetch-depth: 0`), so it runs there too. A shallow clone prints `skipped: no git history to compare with`.

**`tools/check-visuals.mjs`: the Visuals page**

- every `.dax` file sends exactly the text of a saved answer, including the slicer's query for every set of years;
- every data number quoted in the page text (such as `$60,466,772` or `55.9%`) appears in a saved answer;
- `src/visuals/pages.mjs` and the page definitions agree, and its lesson links name real lessons;
- the page's code type-checks.

**A pass ends with:**

```
all checks passed (TypeScript 6.0.3)
...
visuals page: all checks passed
```

**A failure** prints lines starting with `FAIL`, then `N failure(s)`. Section 3 explains each message.

**What the check does not prove:**

- that a page looks right;
- that the text is true (that's the fact-check, section 4);
- that numbers in other lessons' text match the data;
- that a quiz question's step number points at the step that teaches it.

### To change X, edit Y

| To change | Edit |
| --- | --- |
| A lesson's text, steps, summary, Fabric note | `src/lesson-list.mjs` (its header comment documents every field) |
| Long code that steps paste | `src/course-code.mjs` |
| The DAX in the lessons' query files (`src/queries/*.dax` in the learner's project) | `src/course-code.mjs`, the `*_DAX` constants; the file paths are at the top of `src/lesson-list.mjs` |
| Which module a lesson is in, lesson order, knowledge checks | `src/course.mjs`, `modules` |
| Chapters (live or "coming soon") | `src/course.mjs`, `chapters` |
| Parts (groups of chapters) | `src/course.mjs`, `parts` |
| Glossary terms and the Help tab's troubleshooting rows | `src/terms.mjs`, `terms` and `help` |
| What the simulated terminal does and writes | `src/project.mjs` |
| The app's own database, permissions, claims | `src/app-data.mjs` |
| How connector names resolve | `src/connectors-sim.mjs` |
| The queries the models can answer | `tools/make-catalog.mjs`, which writes `data/catalog.json` |
| The saved answers | `data/snapshots.json`, written by `tools/snapshot.ps1` |
| The lakehouse rows (Chapter 3) | `data/lakehouse.json` (edited by hand: there is no generator) |
| Saved step positions after steps move | `src/step-moves.mjs`, generated by `tools/make-step-moves.mjs` |
| Rayfin types the editor and the checker know | `src/editor-types/packages/*.d.ts`, plus the lists in `tools/build.mjs` (`editorLibsPlugin`) and `tools/check-lessons.mjs` (`PACKAGE_TYPES`) |
| Versions named in the About tab | `src/app.ts`, `renderAbout` |
| The top bar | `src/topbar.mjs` (markup), `src/top.css` (styles) |
| Visuals page list and order, links to the lessons | `src/visuals/pages.mjs` |
| A visual page's text | `src/visuals/shell/visuals.tsx` (Bar chart, Slicer, Key influencers), `src/visuals/shell/visuals-gallery.tsx` (the others) |
| The app code a visual page runs | `src/visuals/app/` (components, `.dax`, `.json` specs, `.ts` query files) |
| Which saved answer a `.dax` file uses | `tools/visuals-answers.mjs`; answers captured for Visuals only go in `data/visuals-extra-answers.json` |
| A visual's sketch | `GLYPHS` in `src/visuals/shell/sketches.tsx` |
| Space kept free for a visual (no layout shift) | `SURFACE_H` in `src/visuals/shell/main.tsx` |
| The disclaimer ("our interpretation, not a guarantee") on the start screen, the top bar chip, About and the Visuals pages | `src/disclaimer.mjs` (one source for all of them) |
| Licences of bundled code | `THIRD-PARTY-NOTICES.md` |
| Deploy | `.github/workflows/pages.yml` |
| Checks on pull requests; issue forms; the pull request template | `.github/workflows/check.yml`, `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` |
| Rules for AI coding tools; Claude Code reviewers and skills | `AGENTS.md` (all tools), `CLAUDE.md` (imports it), `.claude/agents/`, `.claude/skills/`. Keep them in step with this guide. |

---

## 2. Everyday tasks

### 2.1 Fix a typo in a lesson

1. Search for the text across `src/`. Lesson text is in `src/lesson-list.mjs`; quiz text is in `src/course.mjs`.
2. Fix it. Text may use only inline `` `code` ``, `**bold**` and `[[term]]` / `[[shown text|term-id]]`.
3. Run `npm run check`.
4. If the typo was inside `code`, `edits` or `run`, it changes what the project contains, and later steps may then fail with `text not found` (see 3.1).
5. If the check says `src/step-moves.mjs is out of date`, follow 2.2, step 5.

### 2.2 Add or split a step

**Why the extra care:** each browser remembers which step a learner is on, as a position number within the lesson (0 is the idea card, 1 to n are the steps, n + 1 is the summary).

- **What goes wrong:** split step 2 into two and every later step moves up one, so a learner who was on step 5 would land on what used to be step 4.
- **The table:** `src/step-moves.mjs` records where each old position now points. The app applies it once per browser, when `STEPS_VERSION` changes.
- **What never moves:** finished lessons and done ticks are stored by lesson id.

1. In `src/lesson-list.mjs`, add or split the step. Give each step one action: creating a file and pasting into it are two steps.
   - **A step that changes the project** has either `run: '…'` or `edits: [{ file, from, to }]`. A `from` of `''` writes a new or empty file.
   - **Expected red lines:** set `errors: 1` (or `'1+'`) when they should appear after the step.
   - **The pink mark:** `find` is the text to mark. Make it unique in the file, because the mark goes on the first match.
2. In `src/course.mjs`, update knowledge-check questions about this lesson (`lesson: '<id>'`) whose `step:` is at or after the change. The checker can't tell if they now point at the wrong step.
3. Run `npm run check`, and fix any failures in later steps or lessons (3.1).
4. Regenerate the table and look at what changed:

   ```powershell
   node tools/make-step-moves.mjs
   git diff --ignore-cr-at-eol src/step-moves.mjs
   ```

   On Windows, Git checks files out with CRLF line endings and the generator writes LF, so `git status` may list the file as changed even when no position moved. If `git diff --ignore-cr-at-eol` shows nothing, run `git checkout -- src/step-moves.mjs`; you're done.

5. If it really changed, positions moved since the site last published. Point the table at the version learners have now:
   1. Find the commit the live site was built from: `git fetch`, then `git log -1 --format=%h origin/main`. If you already pushed the split, use the commit before it instead; `git log --oneline -- src/lesson-list.mjs` shows that file's history.
   2. In `tools/make-step-moves.mjs`, set `export const FROM = '<that hash>';`.
   3. In the same file, inside the template text, raise `export const STEPS_VERSION = '2';` by one (to `'3'`, then `'4'`, and so on). Every browser applies a version only once, so the number must change. The generator writes this value into `src/step-moves.mjs` each time it runs, so edit it in the generator, not in the output.
   4. Run `node tools/make-step-moves.mjs`. It prints each lesson whose positions move, for example `client: 2→3, 3→4`.
   5. Run `npm run check` until it passes.
   6. Commit `tools/make-step-moves.mjs` and `src/step-moves.mjs` together with the lesson change.

Known limits:
- Links such as `#client/3` are never moved.
- A learner who skipped a whole version gets only the newest table, so their saved step may be a card or two off.

### 2.3 Add a lesson

1. Add an entry to the `lessons` array in `src/lesson-list.mjs`. The fields are documented at the top of the file. A minimal shape:

   ```js
   {
     id: 'by-name',                         // stable: used in links and progress
     title: 'Read by name',
     goal: 'read a result by column name',  // lower case, no full stop
     builds: ['first-query'],               // earlier lessons it uses
     pbi: 'The idea in Power BI terms.',
     idea: 'What this lesson does.',
     steps: [
       { do: 'Open `src/data.ts`.', file: 'src/data.ts', find: 'export function toBars' },
       { do: 'Replace … with …', edits: [{ file: 'src/data.ts', from: '…', to: '…' }], see: '…', why: '…' },
     ],
     summary: ['First point.', 'Second point.'],          // 2 or 3 bullets
     fabric: { text: 'How this looks in a real Fabric app.', links: [learn.query] },
   },
   ```

   Link objects (`learn.*`, `rayfin.*`) are defined at the top of the file. Long pasted code goes in `src/course-code.mjs`.
2. Put its `id` in a module's `lessons` list in `src/course.mjs`. The order in that list is the lesson order.
3. If the module's knowledge check should ask about it, add a question: 2 to 4 options of similar length, `answer` (0-based), `why`, `lesson` and `step` (1-based).
4. If it sends new queries, add them first (2.7).
5. Run `npm run check`. Later lessons start from this lesson's end, so their `edits` may need updating.
6. Click through it with `npm run dev` (2.10).

A new lesson doesn't affect saved step positions: lessons that didn't exist before have no saved position.

### 2.4 Add a chapter, or take a "coming soon" chapter live

Chapters live in `chapters` in `src/course.mjs`. Each chapter has:
- `id`, `title` and `goal`;
- `builds`: the ids of earlier chapters, shown to the learner;
- exactly one of these:
  - `coming`: planned lesson titles, shown muted, with no numbers or links;
  - `modules`: module ids, for a live chapter.

**Add a coming chapter:** add it with `coming: ['First lesson title', …]`, then add its id to a part (2.5).

**Take a chapter live:**
1. Write its lessons (2.3) and its modules: add module objects to `modules` in lesson order, after the last live chapter's modules.
2. In the chapter, replace `coming: […]` with `modules: ['module-id', …]`.
3. Mind the order. The checker enforces two rules:
   - **Live chapters come before every coming chapter.** Taking one live that isn't next means moving it up the list. That changes its number, which is fine, because lesson text never uses numbers.
   - **Parts must list the chapters in the same order as `chapters`.** If the moved chapter belongs to a later part, either move the chapters that now sit after it, or move it into another part. That's a content decision.
4. The project is one app: a chapter always starts where the previous live chapter ends, whatever `builds` says.
5. Run `npm run check`, then click through the chapter from the start screen.

### 2.5 Add a part

Add an entry to `parts` in `src/course.mjs`, with these fields:
- `id`, `title` and `goal`;
- `level`, for example "Going further";
- `chapters`: chapter ids, in lesson order.

Every chapter must be in exactly one part, and the parts in order must list the chapters in the same order as `chapters`. Run `npm run check`.

### 2.6 Add or change a glossary term or a Help row

Both are in `src/terms.mjs` and show in the Help tab.

- **A term:** `{ id, term, means, pbi, lesson }`. `pbi` is the Power BI match, and `lesson` is the id of the lesson that teaches it, which must exist.
- **A link to a term from any text:** write `[[Connector]]`, which uses the id `connector` (the shown text, lower-cased), or `[[shown text|term-id]]`.
- **A Help row:** `{ symptom, cause, fix }`.

Run `npm run check`; it fails if a `[[…]]` names a term that doesn't exist.

### 2.7 Add a saved answer, or retake the snapshots

Answers come from two Contoso models in the public gold-layer-examples repository:

| Connector | Model to open in Power BI Desktop |
| --- | --- |
| `contoso` | `examples/default_measures/gold-layer-data-contoso-measures.pbip` |
| `pareto` | `examples/pareto/gold-layer-data-pareto.pbip` |

1. **Add the query.** In `tools/make-catalog.mjs`, add an entry to `contosoQueries` or `twoModelQueries`, with `id`, `group`, `title` and the query text.
   - For the second model, add `connector: 'pareto'`.
   - A query that should fail on purpose gets `expectError: true`.
   - For a lesson, the text its code sends must be the same; spacing and letter case are ignored. A lesson's query lives in a `.dax` file in the learner's project, and its code either sends the file as it is, fills in the file's `/* filters */` marker (`withFilters`), or wraps the file's `ROW` in `CALCULATETABLE`. Keep comments out of these files: a comment would become part of the text.
   - For the Visuals page, the text must be the `.dax` file's text exactly (2.8).
2. Run `npm run catalog`.
3. **Open both models and find their ports.** Open each `.pbip` in its own Power BI Desktop window. Each window runs its own local Analysis Services on its own port. To list them:

   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Microsoft\Power BI Desktop\AnalysisServicesWorkspaces" -Directory |
     Sort-Object LastWriteTime |
     ForEach-Object {
       $file = Join-Path $_.FullName 'Data\msmdsrv.port.txt'
       if (Test-Path $file) { '{0:HH:mm}  port {1}' -f $_.LastWriteTime, (Get-Content $file -Encoding Unicode) }
     }
   ```

   - **Store version:** with the Microsoft Store version of Desktop, the folder is `$env:USERPROFILE\Microsoft\Power BI Desktop Store App\AnalysisServicesWorkspaces`.
   - **Telling the ports apart:** open `contoso` first and run the snippet, then open `pareto` and run it again. The new line is pareto's.
   - **Old folders:** they can be left behind after a crash, so trust the newest lines.
4. **Run the queries:**

   ```powershell
   npm run snapshots -- -ContosoPort <port> -ParetoPort <port>
   ```

   - `tools/snapshot.ps1` reruns every catalog query (read-only) and rewrites `data/snapshots.json` at the end. If it stops part-way, the file is unchanged.
   - It needs PowerShell 7 and Desktop's ADOMD client at the default install path. Pass `-AdomdDll <path to Microsoft.PowerBI.AdomdClient.dll>` if Desktop is installed elsewhere.
5. **Check the result:** run `git diff --stat data/`, then `npm run check`. If the model's data changed, numbers on screen change too. The check catches the Visuals page's numbers and the two lessons it verifies; search the lesson text for any other figures you wrote by hand.

**Lakehouse rows** (`data/lakehouse.json`) are edited by hand from the generated Contoso files. The check verifies that France's 2023 lines add up to the saved `totals-2023-france` answer.

### 2.8 Add a visual to the Visuals page

1. **The app code**, in `src/visuals/app/`, written the way a learner would in a Rayfin data app:
   - a `.dax` file in `queries/sales/`;
   - a `.json` chart spec;
   - a small `.ts` query file (connection `contoso`, the `.dax` imported with `?raw`, column metadata, the spec), exported from `queries/sales/index.ts`;
   - a component in `components/`.
2. **An answer for its query.** The Visuals page matches the query text exactly; only line endings and outer whitespace are ignored. Do one of these:
   - if the catalog already has the same text, add `['your-file.dax', 'catalog-id']` to the list in `tools/visuals-answers.mjs`;
   - otherwise, add the query to the catalog and retake the snapshots (2.7), then add that line;
   - or capture an answer for this page only, in `data/visuals-extra-answers.json` (`id`, `model`, `capturedAt`, `how`, `query`, `table`).
3. **The page list:** add the id to `VISUAL_IDS` in `src/visuals/pages.mjs`. The list order is the landing order.
4. **The page definition:** add it to `GALLERY` in `src/visuals/shell/visuals-gallery.tsx`. Write its id on its own line, exactly as `    id: 'your-id',` (four spaces): the checker finds definitions by that line.
5. **The running app:** add the component to `APPS` in `src/visuals/shell/main.tsx`. A visual with no drop-in equivalent uses `noEquiv` in its definition instead.
6. **The sketch:** add a glyph under the same id in `GLYPHS` in `src/visuals/shell/sketches.tsx`.
7. **No layout shift:** open the page with `npm run dev`, wait for the chart, read the height of `.app-surface` in the browser's developer tools at a desktop width, and add `your-id: <px>` to `SURFACE_H` in `main.tsx`.
8. **Optionally, a link to a lesson:** add it to `COURSE_LINKS` in `pages.mjs`. A lesson step can link to it with `visual: 'your-id'`.
9. Run `npm run check`, then look at `http://127.0.0.1:5180/visuals/#/your-id`.

**How its numbers are checked:** `npm run check` and `npm run build` both stop if a `.dax` file's text differs from its saved answer. The check also fails if a dollar amount or percentage in the page text isn't in any saved answer. Numbers inside `<code>…</code>` are not checked, because they hold formats, not data.

### 2.9 Update a dependency, the Rayfin type subsets, and the notices

**A package.** Versions in `package.json` are exact; keep them that way.

```powershell
npm outdated
npm install --save-exact <package>@<version>
npm run check
npm run build
npm run preview
```

Then:
1. Click through both pages.
2. **Monaco:** `src/monaco.js` lists the editor features taken from Monaco's own `editor.main.js`. Regenerate it, and check the worker paths in `tools/build.mjs`.
3. **TypeScript:** it decides which red lines learners see. Keep it at the version the mirrored Rayfin CLI installs, and expect `errors` counts to need review.
4. **Versions named elsewhere:** update every place that names a version:
   - `README.md`;
   - the About tab (`renderAbout` in `src/app.ts`);
   - the Visuals Notes page and the "about 1.2 MB" line in `src/visuals/shell/main.tsx`;
   - the size group labels in `weigh()` in `tools/build.mjs`;
   - `THIRD-PARTY-NOTICES.md`.

**The notices:**
- The first table lists what the lessons page bundles.
- The Visuals table follows esbuild's output. After `npm run build`, the `other:` line lists packages in the Visuals bundle that have no named group, and each needs a row.
- `dist/visuals/assets/main.js.LEGAL.txt` collects the licence comments.

**Rayfin type subsets** (`src/editor-types/packages/*.d.ts`) are trimmed copies of the real packages' type files. Each file's header says which package, version and file it came from.
1. Install the real packages in a scratch folder outside the repository, or in the gitignored `reference/` folder.
2. Compare their `dist/*.d.ts` with the subsets, then update the subsets and their headers.
3. For a new package, add the file, then add it to `editorLibsPlugin` in `tools/build.mjs` and to `PACKAGE_TYPES` in `tools/check-lessons.mjs`.
4. A new Rayfin version is a content change. The lessons pin `@2.0.0` in install commands, and the disclaimer (`src/disclaimer.mjs`) names Rayfin 2.0, so every lesson needs a fresh fact-check (section 4).

### 2.10 Preview locally

```powershell
npm run dev        # http://127.0.0.1:5180/  and  /visuals/   (rebuilds code and CSS on save)
npm run build
npm run preview    # serves dist/ as published: http://127.0.0.1:5181/
```

- **127.0.0.1 only:** both servers bind to 127.0.0.1, so other machines can't reach them and Windows asks no firewall question. Keep it that way: never change `host` in `tools/build.mjs` or `tools/serve-dist.mjs`.
- **Restart after HTML changes:** `npm run dev` writes the HTML pages once, at start. After editing `src/topbar.mjs`, `src/index.html`, `src/visuals/index.html` or `src/preview.html`, stop it (Ctrl+C) and start it again.
- **`dist/` gets replaced:** both commands rewrite it, so run `npm run build` right before `npm run preview`.
- **Test like a learner:** use a private window, which starts with no saved progress, and click through with **Do it for me**.

### 2.11 Ship

Every push to `main` publishes the site. The workflow "Publish to GitHub Pages" (`.github/workflows/pages.yml`) has two jobs:
- **build:** `npm ci`, `npm run check` and `npm run build`, then it uploads `dist/`;
- **deploy:** publishes it.

A run takes about two minutes. Pushing another branch publishes nothing.

A pull request gets the same checks without publishing: the workflow "Check a pull request" (`.github/workflows/check.yml`) runs `npm ci`, `npm run check` and `npm run build`. Contributors follow [CONTRIBUTING.md](CONTRIBUTING.md). Issues use the forms in `.github/ISSUE_TEMPLATE/` ("A step is wrong", "An idea"), and the pull request template mirrors section 5.

1. Run `npm run check` locally. The deploy runs it again, but failing there means a failed deploy.
2. Commit and push:

   ```powershell
   git status
   git add <files>
   git commit -m "What changed, in plain words"
   git push origin main
   ```

3. Watch the run, or open the repository's **Actions** tab:

   ```powershell
   gh run list --workflow pages.yml --limit 3
   gh run watch                          # pick the run
   gh run view --log-failed              # if it failed
   ```

4. Confirm both live pages: https://goldlayerdata.github.io/fabric-app-playground/ and `/visuals/`. Press **Ctrl+F5**, and check that your change is there.
5. To republish without a new commit, run `gh workflow run pages.yml`.

---

## 3. Troubleshooting

### 3.1 `npm run check` failures

Each failure is one line starting with `FAIL`. Lesson messages start with the lesson id and step number (`client step 4:`). Step numbers count from 1 in that lesson's `steps`.

| Message (as printed) | Likely cause | Fix |
| --- | --- | --- |
| `src/step-moves.mjs is out of date: run node tools/make-step-moves.mjs` | Steps were added, removed, split or reordered since the commit in `FROM`, or a step's identity changed. | 2.2, steps 4–5. |
| `step-moves <id>: old step N lands on step M, which is not that step or its first part` | The generated table maps an old step to unrelated content, usually after a large rewrite of one lesson. | Check the lesson's history. If the rewrite is right, move `FROM` to the live commit and raise `STEPS_VERSION` (2.2). |
| `make-step-moves` fails with `does not provide an export named …` | The lesson list at `FROM` is loaded with today's `src/project.mjs`, which no longer exports a name the old list imports. | Keep that export for now, or move `FROM` to a newer published commit. |
| `<where>: refers to a lesson by number ("lesson 4"); use its title`, or a chapter, module or `4.2`-style number | Text names a lesson, chapter or module by number. Numbers come from positions and move. | Use the title, for example "in **Wire the client**". |
| `<id> step N: expected X type error(s), got Y`, followed by the errors | An edit changed the code, or a package's types changed, so the red-line count differs from the step's `errors`. | Read the printed errors. Fix the edit, or set `errors` to the new count if the red line is intended. |
| `<id> step N: an expected error is in no file of the project: …` | An expected red line is in a type file, which the learner can't open. | Change the step so the error is in the learner's code. |
| `<id> step N: names <file>, which isn't in the project at this step` | The step's `file`, or its first edit's file, doesn't exist yet. | Create it in an earlier step (`from: ''`), or fix the path. |
| `<id> step N: "Show me" text not found in <file>: …` | `find` doesn't match the file as it is at that step. The match is case-sensitive. | Copy the text from the file as the lessons build it. |
| `<id> step N: <file>: text not found: …`, `… does not exist`, `… is not empty` | An edit's `from` no longer matches, often because an earlier step changed the same lines. Or a `from: ''` edit hit a file that already has content. | Update `from` to the current text. To write a new file, the file must be new or empty. |
| `<id> step N: looks done before it is applied` / `not detected as done after applying it` | The done tick can't tell before from after, for example because `to` is already in the file. | Make `to` unique, or add `done: { file, before: [a, b] }` or `done: { file, absent }`. |
| `<id> step N: query not in the catalog for <connector> (…)` | The project can send a query with no saved answer. Query functions are called with every year and country. | Add it to `tools/make-catalog.mjs` and retake the snapshots (2.7), or make the code build an existing query's text. |
| `<id> step N: <query-id> (…) is a saved error, but data is expected here` | The step sends a query saved as the model's error, without `queryFails`. | Fix the query, or add `queryFails: true` if the failure is the point. |
| `<id> step N: expected a query saved as the model's error` | `queryFails` is set, but no failing query is sent. | Remove it, or send the failing query. |
| `<id> step N: expected this command to fail: …` | `commandFails` is set, but the simulated command succeeded. | Check the command and `src/project.mjs`. |
| `<id>: "…" makes N edits without saying Do it for me does them` | One card asks for several manual edits. | Split the step (one action per card), or say in `do` that **Do it for me** makes them. |
| `check <module> question N: <lesson> has no step N`, `unknown lesson …`, `taught in a later module`, `answer out of range`, `needs 2 to 4 options` | A knowledge-check question points at a missing step or lesson, or is malformed. | Fix it in `src/course.mjs`. After adding or splitting steps, also check that `step` is still the step that teaches it. |
| `<where>: [[x]] is not in the glossary` / `term <id>: unknown lesson …` | A term link with no matching term, or a term whose lesson was renamed. | Add the term, or fix the id (2.6). |
| `lesson <id> is in N modules (should be 1)` / `course.mjs names a lesson that doesn't exist: …` | A lesson isn't placed, is placed twice, or its id is misspelled. | Fix `modules[].lessons` in `src/course.mjs`. |
| `course.mjs: live chapters come first, then the coming ones`, `… every module once, in the order of modules`, `… every chapter once, in the order of chapters`, `chapter <id>: needs exactly one of modules or coming` | Chapter, module or part order is out of step. | 2.4 and 2.5. |
| `<id>: link outside Microsoft Learn and rayfin.ai: …` | A Fabric note links somewhere else. | Use a Learn or rayfin.ai page. |
| `<id>: goal should start lower case…`, `summary needs 2 or 3 bullets`, `unknown step field …`, `unknown point …`, `unknown visual …` | A field is misspelled or breaks the format. | See the header comment in `src/lesson-list.mjs`. |
| `<n.n>: the steps don't show …` / `the lakehouse lines don't add up to the model's [Revenue]` | New snapshots changed numbers that a lesson's steps show. | Update the numbers in that lesson's text, or fix `data/lakehouse.json`. |
| `the finished course has N type error(s)` | The project at the end of the last lesson has red lines. | Usually a slip on purpose that a later step never undoes. |
| `answers: no saved answer for <file>.dax` | A Visuals `.dax` file has no answer. | 2.8, step 2. |
| `answers: <file>.dax: the app's DAX differs from the saved query text` | The `.dax` file and its catalog query differ (the match is exact). | Make the texts identical, then retake the snapshots if the catalog changed. |
| `answers: no answer for <file> with 2023, 2024` | The slicer's query can't be answered for that set of years. | Check `revenue-by-category-for-years.dax` and the per-year answers. |
| `answers: extra answer <id>: no .dax file in src/visuals/app sends this query text` | An entry in `data/visuals-extra-answers.json` matches no `.dax` file. | Copy the `.dax` text into `query`. |
| `<file>.tsx: $60,466,772 is not in any saved answer` (or `$12.34M`, `55.9%`) | The Visuals text quotes a number that isn't in the data, often an old one after new snapshots. | Update the text to the saved value. |
| `pages.mjs: <id> has 0 page definitions (should be 1)` / `page <id> is not in pages.mjs` | The page list and the definitions disagree, or a definition's id line isn't written exactly `    id: '…',`. | 2.8, steps 3–4. |
| `pages.mjs: <id> links to "…", but lesson … is called "…"` | A lesson was renamed. | Update `COURSE_LINKS` in `src/visuals/pages.mjs`. |
| `types: src/visuals/…: …` | The Visuals code has a type error. | Fix the file named. |

### 3.2 Build, deploy and the live site

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build stops with `withTopBar: no <top-bar> element in the page` | `src/index.html` or `src/visuals/index.html` lost its `<top-bar page="…">…</top-bar>` element. | Put it back. |
| Build stops with `topBar: unknown page …` | `page=` isn't `course` or `visuals`. | Fix the attribute (see `PAGES` in `src/topbar.mjs`). |
| Build stops with an `answers:` message | `tools/visuals-answers.mjs` also checks the Visuals queries during the build. | As in 3.1. |
| Build stops with `ENOENT` on a file in `src/editor-types/packages/` | `tools/build.mjs` lists a type file that doesn't exist. | Fix the list, or add the file. |
| `Could not resolve "…"` | A package is missing or changed. | `npm ci`. If you added the import, use `npm install --save-exact`. |
| Deploy: `npm ci` fails ("not in sync") | `package.json` and `package-lock.json` disagree. | Run `npm install` locally and commit both files. |
| Deploy: `npm run check` fails in Actions but passes locally | Usually a file you forgot to commit. | Run `git status` and commit; compare with `gh run view --log-failed`. |
| Deploy job: "not allowed to deploy to github-pages due to environment protection rules" | The workflow ran from a branch other than `main`. | Merge to `main` and push. |
| The site shows 404 | Pages isn't set to deploy from Actions, the deploy failed, or the address is wrong. | Settings → Pages → Source: **GitHub Actions**. Check the latest run. The address ends `/fabric-app-playground/`. |
| An old page after a deploy | GitHub Pages lets browsers cache files for about 10 minutes, and the main script names have no hash. | Press **Ctrl+F5**, or wait a few minutes, after confirming the run finished. |
| `npm run dev` fails with a bind or "address in use" error | Another dev server is still running. | Close it, or find it: `Get-NetTCPConnection -LocalPort 5180`. |
| `localhost:5180` doesn't load | The server listens on 127.0.0.1 only, and the browser tried IPv6. | Use `http://127.0.0.1:5180/`. |
| Windows Firewall asks about `esbuild.exe` | Something started a server on all network interfaces instead of 127.0.0.1. Each copy of `esbuild.exe`, so each checkout, asks again. | Click **Cancel**; nothing needs outside access. Make sure `host: '127.0.0.1'` is in `tools/build.mjs` and `tools/serve-dist.mjs`. |
| `git status` shows `src/step-moves.mjs` changed, but `git diff --ignore-cr-at-eol` shows nothing | Line endings only: Git checks out CRLF, and the generator writes LF. | `git checkout -- src/step-moves.mjs`. |

### 3.3 In the browser

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Preview stuck on **Compiling…** | Monaco's TypeScript worker didn't answer, or the preview frame never reported "ready". `runNow` in `src/app.ts` waits for both. | After about 6 s, a stuck worker shows "The TypeScript checker did not answer. Press Run, or reload the page." If the preview still hangs, look in the developer tools' Network tab for 404s on `preview.html`, `runtime.js`, `tailwind.js` or `assets/ts.worker.js`, then rebuild. |
| Red lines don't show | Types appear only after the package's `npm install` step, which is by design. Or the worker hasn't answered yet: the status says "Checking types…". | Check the lesson order, then reload. The check runs in `checkTypes` in `src/app.ts`; Monaco's own check is off on purpose. |
| A red line says a Rayfin module can't be found | The package's type file isn't mapped in `editorLibsPlugin` in `tools/build.mjs`. | Add it there, and to `PACKAGE_TYPES` in `tools/check-lessons.mjs`. |
| The pink mark, selections or red lines sit left of the text | Monaco measured the code font before the web font arrived. | `remeasureFonts` in `src/app.ts` handles this. If you change the editor font or size, update its `document.fonts.load("13.5px 'IBM Plex Mono'")` line to match. |
| The mark is on the wrong line, or missing | The step's `find`, or its first edit's `from`, matches earlier in the file, or the step's file isn't the one open (`markFind` in `src/app.ts`). | Make `find` unique in that file. |
| A learner lands on the wrong step after steps were split | `src/step-moves.mjs` wasn't regenerated, or `STEPS_VERSION` wasn't raised. Old links such as `#client/3` are never moved. | Do 2.2, step 5, and ship. The learner can pick the step in the lessons drawer; finished lessons are kept. |
| A learner is offered "the playground's version" of a lesson | Their project doesn't match the lesson's start, usually because the lesson's edits changed. | By design. Accepting it offers Undo. |
| The Visuals page says **no saved answer**, or a visual shows "No saved answer for this query text." | The query the component sent doesn't match any answer exactly. It's likely built in code instead of read from its `.dax` file, or the connection isn't `contoso`. | Run `npm run check`, and make the component send its `.dax` text (`?raw` import). See `answerQuery` in `src/visuals/sim/answer-book.ts`. |
| A Visuals page jumps when the chart arrives | No reserved height, or the chart grew. | Measure `.app-surface` and set `SURFACE_H` in `src/visuals/shell/main.tsx` (2.8, step 7). |
| The top bar looks different on one page | One of these: a rule in `app.css` or `shell.css` overrides the shared `top.css`; the dev server wasn't restarted after editing the bar; or it's the lessons page's slot, which is hidden on the start screen by design (`body.on-splash .top-slot`). | Inspect the bar in developer tools, find the overriding rule, and move shared styles to `top.css`. Restart `npm run dev`. |
| The Visuals page is blank | A page id in `pages.mjs` has no definition (`no page for …` in the console). | Run `npm run check`. |

---

## 4. Rules that keep it honest

- **Fact-check against sources, not memory:**
  - the installed Rayfin packages' code, templates and bundled docs (installed locally for comparison, never committed);
  - the CLI's `--help`;
  - rayfin.ai;
  - Microsoft Learn.

  Then a second, independent pass reads the changed text as a beginner would.
- **`Playground:` lines.** When we can't check what the real tool prints, we don't imitate it: the line starts with `Playground:` (the `PG()` helper in `src/project.mjs`). Made-up ids are visibly fake: `00000000-…`, `*.invalid`, `@contoso.example`.
- **One action per step card.** Creating a file and pasting into it are two steps. The checker fails a card with several manual edits.
- **Plain words first.** Start each card with a plain sentence in Power BI terms; for example, a component is a visual, and state is a slicer selection. Code words, counts and citations come later or are folded away. Don't talk down; use "we".
- **No lesson numbers in text.** Numbers come from positions and move whenever a lesson or chapter is added, so refer to lessons by title. The checker enforces this. Write data numbers only where the checker verifies them, and leave out counts that go stale.
- **Fabric note links** go only to Microsoft Learn and rayfin.ai.
- **Unofficial, and our interpretation.** This is a Gold Layer playground, not a Microsoft product. Every screen says it is our reading of the docs, not a guarantee (`src/disclaimer.mjs`): the start screen on the way in, the top bar chip while you work, and About and the Visuals pages in full. Keep that wording in one place.
- **Nothing private in this repository:** no local paths, personal names or emails, credentials, client names, or real workspace or item ids.

---

## 5. Releasing a version: checklist

- [ ] `npm run check` passes **locally**, with the "saved step positions" section run, not skipped.
- [ ] If steps moved: `FROM` is set to the live commit, `STEPS_VERSION` is raised, and `src/step-moves.mjs` is regenerated and committed.
- [ ] Knowledge-check `step` numbers still point at the steps that teach them.
- [ ] New or changed claims are fact-checked, and unchecked CLI output starts with `Playground:`.
- [ ] `npm run build`, then `npm run preview`. Click through every changed lesson with **Do it for me** in a private window, and look at any changed Visuals pages.
- [ ] `README.md`, the About tab, `THIRD-PARTY-NOTICES.md` and the Visuals Notes page match the versions and the lessons.
- [ ] Nothing private. Run these and review the hits:

  ```powershell
  git grep -nIE '\b[A-Z]:\\' -- ':!package-lock.json'
  git grep -nIE '[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}' -- ':!package-lock.json' | Select-String -NotMatch '00000000-0000-0000'
  ```

  Expected hits: Desktop's default install path in `tools/snapshot.ps1`, and the made-up sign-in people in `src/app.ts`.
- [ ] Push to `main`, watch the run, and confirm both pages live with Ctrl+F5.
