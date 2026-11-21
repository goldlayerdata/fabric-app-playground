# Fabric app playground

A Gold Layer playground where Power BI developers build a Fabric app from an empty folder, chapter by chapter. Chapter 1: create the project, add a semantic model connector, wire the client, then build a report-style 16:9 page in TypeScript and React, make it interactive, and review a page "an agent" wrote. Chapter 2: read a lakehouse through an entity connector, and keep totals in the model. Chapter 3: give the app a database of its own and read and write sales targets. Chapter 4: sign-in, claims and permissions: who sees and changes which targets. Unofficial, and not affiliated with Microsoft.

There is no Fabric and no model behind it:

- **The terminal** simulates the Rayfin 2.0 commands the course uses (`npm create @microsoft/rayfin@latest … --template dataapp`, `npm install`, `npx rayfin connector add`, `connector invoke`, `connector search`, `connector inspect`, `npm run dev`, `npx rayfin up`, `npx rayfin up connector apply`). What they write (`package.json`, `rayfin/rayfin.yml`, the connector's `schema.ts`) follows the Rayfin docs and the data app template as installed by the Rayfin CLI 2.0.0. Lines we could not check against the real output start with `Playground:`. Sign-in is skipped.
- **The lakehouse** (Chapter 2) is simulated too. `connector add --type fabric-sqlanalytics` writes what the Rayfin CLI 2.0.0 writes (its placeholder `schema.ts` and messages are taken from its code); `metadata.json` has the documented shape, with the playground's own types and values. Reads (`select`, `where`, `orderBy`, `first`, `after`, `execute`, `executePaginated`) are answered in the browser from `data/lakehouse.json`, one page of 100 rows unless `first` says otherwise, as rayfin.ai describes; cursors are made up. The Log's "runs as" line comes from each connector's `auth` in `rayfin.yml`.
- **The app's own database** (Chapters 3 and 4) is simulated in the browser (`src/app-data.mjs`). `npx rayfin up db apply` reads the entities registered in `rayfin/data/schema.ts` (a small parser of their decorators), compares them with what it applied last, and stops before the changes Rayfin's docs call potentially destructive unless `--force` is given; a `@text()` without `max` applies, then the data API answers "Internal server error", as the docs describe. The page's `rayfinClient.data` calls are checked against the entity's permission rules (`policy` with `.eq`, `.neq`, `.and`, `.or`; `include`, `exclude`) for the claims of the person on the **Signed in as** switch (made-up people), and rows are kept with the project in this browser. With dynamic claims on, the project's `udf.authClaims` function runs in the preview's sandbox at each switch. The **Data** tab shows every row, ignoring permissions (no real app has that view), and can send a request directly. The real CLI's output and the data API's refusals aren't documented word for word: those lines start with `Playground:`. `rayfin init` is not rerun (what it writes in a data app project isn't documented); the lesson turns the service on by hand, as Microsoft Learn describes.
- **The Rayfin packages** are simulated. The editor checks the learner's code against their real 2.0 signatures (a subset, MIT: `src/editor-types/packages/`), and only once the project has "installed" them. In the page, `executeQuery` matches the query text against saved results from a Contoso model and returns them in the connector's result shape.

## Run it

```powershell
npm install
npm run dev        # http://localhost:5180, rebuilds on save
npm run build      # static site in dist/
npm run preview    # serves dist/ at http://localhost:5181
npm run check      # checks the course, then builds it from an empty folder, step by step
```

`dist/` is a plain static site (GitHub Pages works). Everything is bundled from pinned packages; nothing loads from a CDN.

## How it works

| Part | File |
| --- | --- |
| The project (files, installed packages, terminal history) and the simulated CLI, as pure functions | `src/project.mjs` |
| Editor: Monaco 0.57.0, one model per project file, React 19 types, Rayfin types per installed package | `src/app.ts`, `src/monaco.js`, `src/editor-types/packages/` |
| Compile on pause: Monaco's TypeScript worker emits each file as a System module (keeps `import.meta.env`) | `src/app.ts` (`compile`) |
| Preview: sandboxed iframe (`allow-scripts`, no same-origin) that links the modules, simulates the Rayfin packages, and draws `src/App.tsx` | `src/preview.html`, `src/runtime.tsx` |
| Saved answers: the iframe asks the parent page, which answers from the snapshots after a short delay and logs every query | `src/stand-in.ts`, `src/app.ts` (`onQuery`) |
| Cut-off: more than 20 queries in 10 seconds stops the page | `src/app.ts` (`CUTOFF`) |
| Course: chapters, modules, their order, knowledge checks | `src/course.mjs` |
| Lakehouse reads (filter, sort, pages) | `src/stand-in.ts` (`readLakehouse`), `src/runtime.tsx` (`entityConnector`) |
| The app's own database: decorators read, `db apply`, permission policies, claim rules | `src/app-data.mjs`; `src/runtime.tsx` (`client.data`, the session, the claims function); `src/app.ts` (`onData`, the Data tab, the **Signed in as** switch) |
| Lessons: goals, steps, summaries, Fabric notes; the longer code pieces they paste | `src/lesson-list.mjs`, `src/course-code.mjs` |
| Glossary (Terms tab) and troubleshooting (Help tab) | `src/terms.mjs` |
| Start screen (chapters), course drawer, progress, routing (`#lesson-id/step`, `#check/module-id`), terminal tab | `src/app.ts` |
| Layout: three draggable dividers (sizes remembered, double-click resets) and **Pop out** on the lesson card and the bottom panel (large text, Esc docks) | `src/app.ts` (`initSplit`, `setPopped`), `src/app.css` |
| Colours: a Gold Layer Tools piece, so Tools pink `#FF7FB5` leads (`--accent`), in text and lines only; gold for the logo and the "In a real Fabric app" notes. The logo links to goldlayerdata.com/tools.html, and the start screen lists the site sections and socials | `src/app.css` |

## Data

`data/catalog.json` lists every query the connector can answer (114: basics, totals and categories for every year and store country, the "Measure or query" queries, and two saved errors). `data/snapshots.json` holds their results, taken from the Contoso measures model in [gold-layer-examples](https://github.com/goldlayerdata/gold-layer-examples) (`examples/default_measures/gold-layer-data-contoso-measures.pbip`). The queries use that model's own measures (`[Revenue]`, `[# Orders]`, `[# Customers]`, `[Margin %]`), the way a real app's queries do.

To retake the snapshots, open that PBIP in Power BI Desktop (if several Desktop files are open, pass `-Port` to the snapshot script), then:

```powershell
npm run catalog     # tools/make-catalog.mjs -> data/catalog.json
npm run snapshots   # tools/snapshot.ps1: runs each query over ADOMD, writes data/snapshots.json
```

`data/lakehouse.json` is the lakehouse of Chapter 2: its `metadata.json` (two tables, `sales` and `store`), every store, and the 283 sales lines of the stores in France in 2023, from `datasets/contoso` in gold-layer-examples (prices rounded to 4 decimals, as the model stores them). Those lines add up to the model's `[Revenue]` for France in 2023, which `npm run check` verifies against the saved snapshot.

Queries match ignoring spacing and letter case. `npm run check` finds every query the project can send (query functions are called with every year and store country) and fails if one has no saved answer.

## The course

One app, built from an empty folder. Structured the way Microsoft Learn builds training (modules of short units, a knowledge check at the end of a module, summaries) and the way the Rayfin docs teach (numbered steps, then what to read next). Only the structure is borrowed.

Chapters group the modules (`chapters` in `src/course.mjs`). Module numbers run on across chapters, so a lesson's number never changes when a chapter is added: Chapter 1 is modules 0 to 5, Chapter 2 starts at module 6. Progress is kept by lesson and module id. Chapters not built yet are listed as Coming soon, with their planned lesson titles. The start screen shows each chapter's state (done, in progress, not started, coming soon); **Start this chapter** builds the project as that chapter begins, with Undo.

**Chapter 1: An app on a semantic model**

| Module | Lessons |
| --- | --- |
| 0 Start here | 0.1 Tour |
| 1 Set up the project | 1.1 Create the project · 1.2 Add the connector · 1.3 Wire the client |
| 2 Build a page | 2.1 The grid · 2.2 A component · 2.3 Types |
| 3 Get data from the model | 3.1 The first queries · 3.2 The conversion · 3.3 Measure or query · 3.4 Failure |
| 4 Make it interactive | 4.1 State as a slicer · 4.2 The redraw trap · 4.3 Cross-filter · 4.4 Two pages |
| 5 Own what the agent wrote | 5.1 Review an agent's page · 5.2 Take it to Fabric |

**Chapter 2: Read a lakehouse**

| Module | Lessons |
| --- | --- |
| 6 Connect a lakehouse | 6.1 Add a lakehouse connector · 6.2 Entities from the metadata |
| 7 Rows, not measures | 7.1 Rows on a page · 7.2 Rows or measures · 7.3 Who runs this query |

**Chapter 3: Store your own data**

| Module | Lessons |
| --- | --- |
| 8 Model it | 8.1 Turn on the data service · 8.2 Model a sales target · 8.3 Register and apply |
| 9 Use it | 9.1 Read and write targets · 9.2 Change the model |

**Chapter 4: Who is using it**

| Module | Lessons |
| --- | --- |
| 10 Sign-in and claims | 10.1 Signed in as · 10.2 My rows only · 10.3 Two identities |
| 11 Roles from the business | 11.1 Roles the business knows · 11.2 Each country, its own targets |

Lesson numbers come from positions in `src/course.mjs` and are never written anywhere else: lesson text refers to lessons and chapters by title, and `npm run check` fails on "lesson 4" or "chapter 2"-style references.

Each lesson is the same set of cards: the idea in Power BI terms with "You'll be able to" and "Builds on", then one card per step, then a summary with an **In a real Fabric app** note linking to Microsoft Learn or rayfin.ai. Every module after the tour ends with two to four questions; each answer links to the step that taught it. Mistakes the course is about (a wrong column, a query loop, a mistyped measure) are made on purpose by the learner, then undone; the review lesson is the one place an "agent" drops a ready-made file into the project.

## One project, step by step

There are no start files. A lesson's starting point (its checkpoint) is every earlier step done, from an empty folder. Each step either runs a terminal command (`run`) or carries its exact edit (`edits: [{ file, from, to }]`). The same data drives:

- **Do it for me**: runs the command in the terminal, or makes the edit (Ctrl+Z undoes it, one step at a time);
- the **✓ Done** tick: the command was run (a command the course runs again, such as `npx rayfin up db apply`, counts once it is in the history that many times), or the files contain the result, however the learner typed it;
- `npm run check`: builds the whole course from empty and type-checks the project after every step, against the error count the step expects (`errors`).

Opening a lesson on a project that isn't at that lesson's start offers the course's version (with Undo). **Reset** takes a lesson back to its start; **Finish the lesson for me** applies all its steps; **Restart the whole course** (course drawer and start screen) empties the project and clears progress. All offer Undo.

The playground opens on a start screen with the modules and a Start or Continue button; a link to a single step skips it, and clicking the brand in the header shows it again.

When a step card opens, its spot in the code is marked in gold and its file opens; **Show me in the code** selects it. A step can also point at a part of the playground (`point`), which gets a gold outline.

## Adding a lesson

1. Add its entry to `src/lesson-list.mjs`: `goal`, `builds`, `pbi`, `idea`, `steps` (a `run` or `edits` for every step that changes the project), `summary`, `fabric`. Put long code in `src/course-code.mjs`. Mark glossary words with `[[term]]`.
2. Put its id in a module in `src/course.mjs`. If it teaches something the module's knowledge check should ask, add or change a question there.
3. If it needs new queries, add them to `tools/make-catalog.mjs`, then retake the snapshots.
4. `npm run check`, then click through it in `npm run dev`. Later lessons start from its end, so their edits may need updating.

## Licences

MIT for this project (`LICENSE`). Bundled third-party code and fonts: `THIRD-PARTY-NOTICES.md`. The Rayfin type subsets (and the `@microsoft/fabric-user-data-functions` subset) and the data app template's files the terminal writes are from Microsoft's Rayfin 2.0 packages (MIT). Contoso data: SQLBI Contoso Data Generator V2, MIT.
