// The lessons, one step at a time. Their order, and the modules they sit in, are in course.mjs.
// There are no start files: the course is one project that grows from an empty folder. Each lesson
// starts where the one before it ended (a lesson's "checkpoint" is every earlier step, done).
//
// Each lesson:
//   goal     what the reader can do after it ("You'll be able to: …"), lower case, no full stop
//   builds   ids of earlier lessons it uses (shown as "Builds on")
//   pbi      the idea in Power BI terms; idea: what this lesson does
//   steps    see below
//   summary  2 or 3 bullets, closing the lesson
//   fabric   { text, links: [{ href, label }] }: how this looks in a real Fabric app
//            (Microsoft Learn or rayfin.ai only; checked by tools/check-lessons.mjs)
//
// Each step does one thing:
//   do      what to do, and where. Short.
//   code    optional snippet to paste or type, exactly as it goes in (shown with a Copy button)
//   run     optional: a command for the terminal. "Do it for me" runs it; done once it has been run.
//   see     optional: what is visible once it's done
//   why     optional: the explanation, shown under "see" in a quieter style
//   file    optional: the file the step is about (its tab opens). Default: the file of its first edit.
//   find    optional: text to mark in that file (pink), and select with "Show me in the code"
//   point   optional: a part of the playground to outline: editor, files, preview, status (the query
//           count), terminal, log, queries, terms, run, reset
//   edits   optional: the exact change, as [{ file?, from, to, all? }] (file defaults to src/App.tsx;
//           from: '' writes a new or empty file). An edit whose `to` starts with its `from` adds under
//           that line, and "Show me in the code" puts the cursor there; one whose `to` ends with its
//           `from` adds above it. Used by "Do it for me", by the done tick, and by
//           tools/check-lessons.mjs, which builds the whole course from empty and type-checks after
//           every step.
//   done    optional: another way to tell an edit step is done: { file, before: [a, b] } or { file, absent }
//   errors  optional: type errors expected in the project after this step (default 0). '1+': at least one.
//   queryFails  optional: after this step, the page sends a query saved as the model's error
//
// Text formatting: inline `code`, **bold**, and [[term]] or [[shown text|term-id]] for a word in the
// glossary (terms.mjs). Nothing else.
import * as C from './course-code.mjs';
import { PLACEHOLDER } from './project.mjs';

const LEARN = 'https://learn.microsoft.com/fabric/apps';
const learn = {
  template: { href: `${LEARN}/data-apps-template`, label: 'Create an app connected to a semantic model (Microsoft Learn)' },
  templateWhy: { href: `${LEARN}/data-apps-template#why-use-the-data-app-template`, label: 'Why use the data app template? (Microsoft Learn)' },
  templateChecks: { href: `${LEARN}/data-apps-template#browser-validation`, label: 'Browser validation (Microsoft Learn)' },
  templateVerify: { href: `${LEARN}/data-apps-template#deploy-and-verify-the-app`, label: 'Deploy and verify the app (Microsoft Learn)' },
  query: { href: `${LEARN}/connectors#query-connected-data`, label: 'Query connected data (Microsoft Learn)' },
  addConnector: { href: `${LEARN}/connectors#add-a-connector`, label: 'Add a connector (Microsoft Learn)' },
  deploy: { href: `${LEARN}/connectors#deploy-the-connector`, label: 'Deploy the connector (Microsoft Learn)' },
  copilotReview: { href: `${LEARN}/create-app-with-github-copilot#review-the-generated-changes`, label: 'Review the generated changes (Microsoft Learn)' },
};
const rayfin = {
  docs: { href: 'https://rayfin.ai/docs', label: 'Rayfin docs overview (rayfin.ai)' },
  quickstart: { href: 'https://rayfin.ai/docs/start/quickstart', label: 'Quickstart (rayfin.ai)' },
  adding: { href: 'https://rayfin.ai/docs/connectors/adding', label: 'Adding a connector (rayfin.ai)' },
  clientSetup: { href: 'https://rayfin.ai/docs/connectors/client-setup', label: 'Wiring connectors into your app (rayfin.ai)' },
  semanticModels: { href: 'https://rayfin.ai/docs/connectors/semantic-models', label: 'Semantic models (rayfin.ai)' },
};

const APP = 'src/App.tsx';
const COMP = 'src/components.tsx';
const DATA = 'src/data.ts';
const CLIENT = 'src/services/rayfinClient.ts';
const AGENT = 'src/SalesOverview.tsx';
const YML = 'rayfin/rayfin.yml';
const UNDO = 'Undo: click in the editor and press Ctrl+Z (Cmd+Z on a Mac), or use **Do it for me**.';

const ADD_CONNECTOR = `npx rayfin connector add --type fabric-semanticmodel --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.itemId} --name contoso`;
const INSTALL_CONNECTOR = 'npm install @microsoft/rayfin-connector-fabric-semanticmodel@2.0.0 @microsoft/rayfin-connectors@2.0.0';
const INVOKE = 'npx rayfin connector invoke contoso executeQuery --input \'{"query":"EVALUATE ROW ( \\"Revenue\\", [Revenue] )"}\'';

// Lines the lessons edit more than once.
const COUNTRY_ROW = "    'store'[CountryName],\n    \"Revenue\", [Revenue]";
const COUNTRY_ROW_ORDERS = "    'store'[CountryName],\n    \"Orders\", [# Orders],\n    \"Revenue\", [Revenue]";
const KPI_VALUE_LINE = "      <p className=\"text-2xl font-bold\">{value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</p>\n";
const KPI_VALUE_FORMAT = "      <p className=\"text-2xl font-bold\">\n        {format === 'percent'\n          ? value.toLocaleString('en-US', { style: 'percent', maximumFractionDigits: 1 })\n          : value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}\n      </p>\n";
const COMP_IMPORT = "import { KpiCard } from './components';\n";
const DATA_IMPORT_1 = "import { runDax, salesByCountryQuery, toBars, useDax } from './data';";
const DATA_IMPORT_2 = "import { runDax, salesByCountryQuery, toBars, toTotals, totalsQuery, useDax } from './data';";
const DATA_IMPORT_3 = "import { marginQuery, runDax, salesByCountryQuery, toBars, toPercent, toTotals, totalsQuery, useDax } from './data';";
const DATA_IMPORT_4 = "import { marginQuery, runDax, salesByCategoryQuery, salesByCountryQuery, toBars, toPercent, toTotals, totalsQuery, useDax } from './data';";
const COUNTRIES_LINES = '  const countriesResult = useDax(runDax, salesByCountryQuery);\n  const countries = countriesResult ? toBars(countriesResult) : [];\n';
const TOTALS_LINES = '  const totalsResult = useDax(runDax, totalsQuery);\n  const totals = totalsResult ? toTotals(totalsResult) : { revenue: 0, orders: 0, customers: 0 };\n';
const MARGIN_LINE = '  const marginResult = useDax(runDax, marginQuery);\n';
const LOADING = '  if (!countriesResult || !totalsResult || !marginResult) return <p className="p-4">Loading…</p>;\n';
const ERRORS = "  for (const r of [countriesResult, totalsResult, marginResult]) if (r.status === 'error') return <ErrorPanel message={r.error.message} />;\n";
const YEAR_STATE = '  const [year, setYear] = useState<number | undefined>(undefined);\n';
const LOCAL_RUNDAX = '  const runDax = (query: string) => rayfinClient.connectors.contoso.executeQuery({ query });\n';
const AGENT_RUNDAX_IN_PAGE = '  // Runs a DAX query against the model.\n  const runDax: RunDax = (query) => rayfinClient.connectors.contoso.executeQuery({ query });\n\n';

export const lessons = [
  // ================================================================== 0 Start here
  {
    id: 'tour',
    title: 'Tour',
    goal: 'find your way around the playground before we start',
    builds: [],
    pbi: 'Think of Power BI Desktop: the report canvas, the files behind it, and Performance analyzer listing the query each visual sends. Here we build a [[Fabric app|fabric-app]] instead, and everything is code.',
    idea: 'A Fabric app is a web app that runs in Fabric and queries Fabric data, such as a semantic model. AI agents often write its code. In this course we write one ourselves, from an empty folder, so we can read, fix and trust what an agent writes. First, where everything is.',
    steps: [
      {
        do: 'Under the page area, open the **Terminal** tab, type this and press Enter:',
        run: 'help',
        point: 'terminal',
        see: 'The commands this terminal knows. A terminal works like this: one line, Enter, and the answer is printed underneath.',
        why: 'Nothing else works yet: there is no project until the next lesson creates one. The commands are simulated, and lines starting with `Playground:` are the playground talking, not the real tool.',
      },
      {
        do: 'Look above the code area: the **file list**.',
        point: 'files',
        see: 'Empty for now. Our project\'s files appear here as we create them; click one to open it.',
      },
      {
        do: 'The code area is where we read and write those files.',
        point: 'editor',
        see: 'Empty too. When a step is about some code, that code is marked in pink.',
        why: 'Our code is TypeScript: JavaScript, plus [[types|type]] that say what kind of value goes where. The editor checks it as we type and underlines problems in red.',
      },
      {
        do: 'On the right, the page our app draws.',
        point: 'preview',
        see: 'Nothing yet: we have no app.',
      },
      {
        do: 'Next to **Terminal**, the **Log** tab.',
        point: 'log',
        see: 'Every query the page sends will show up there, with what came back. Like Performance analyzer.',
      },
      {
        do: 'Then the **Queries** tab.',
        point: 'queries',
        see: 'Every query the playground can answer, and a switch to make queries fail on purpose (we use it in **Failure**).',
        why: 'Nothing here talks to Fabric. The answers were saved once from a real Contoso model, so the numbers are real, but only those queries have answers.',
      },
      {
        do: 'Underlined words, like [[component]], are explained in the **Terms** tab. **Help** lists common problems.',
        point: 'terms',
      },
      {
        do: 'Steps that change something have **Do it for me**: it types the command or makes the change. **Show me in the code** shows where a change goes, and **Copy** copies a snippet.',
        why: 'Doing it by hand teaches more; both are fine. The project and how far we got are kept in this browser, and **Reset**, above the page, takes a lesson back to its start.',
      },
    ],
    summary: [
      'Files and code on the left, the page on the right, the terminal and the queries under it.',
      'Pink marks show where a step is. **Do it for me** is always there for steps that change something.',
      'Commands and data are simulated. Nothing connects to Fabric.',
    ],
    fabric: {
      text: 'A real Fabric app starts the same way: a terminal, an empty folder and the Rayfin command-line tool.',
      links: [rayfin.quickstart],
    },
  },

  // ================================================================== 1 Set up the project
  {
    id: 'create',
    title: 'Create the project',
    goal: 'create a Fabric app project from Microsoft\'s data app template',
    builds: ['tour'],
    pbi: 'Like File > New in Power BI Desktop, but for an app: one command makes a project folder from a template.',
    idea: 'We use Microsoft\'s data app template, made for apps that query a semantic model. It is created by [[Rayfin]], the toolkit for Fabric apps.',
    steps: [
      {
        do: 'In the **Terminal**, create the project:',
        run: 'npm create @microsoft/rayfin@latest contoso-app -- --template dataapp',
        point: 'terminal',
        see: 'A `contoso-app` folder, and its files in the file list.',
        why: '`npm` fetches and runs JavaScript packages; `npm create` runs a project creator, here Rayfin\'s (`@latest`: its newest version). The lone `--` passes `--template dataapp` on to Rayfin\'s creator. Without it, the real command asks which template to use. (In Windows PowerShell, some versions drop the lone `--`: Rayfin\'s docs say to use `npm.cmd` there.)',
      },
      {
        do: 'Move into the new folder:',
        run: 'cd contoso-app',
        see: 'The text before the cursor now ends in `contoso-app`: commands now run inside that folder, where the project\'s files are.',
      },
      {
        do: 'Install the packages the template lists:',
        run: 'npm install',
        see: 'React, the Rayfin client and the rest are installed.',
        why: 'A package is code someone else wrote, such as React.',
      },
      {
        do: 'Open `package.json` in the file list.',
        file: 'package.json',
        find: '"dependencies": {',
        see: 'Its `dependencies`: the packages `npm install` just fetched, React and the Rayfin ones among them.',
        why: '`scripts` holds shortcuts: `npm run dev` runs the `dev` line, `rayfin dev`.',
      },
      {
        do: 'Open `rayfin/rayfin.yml`.',
        file: YML,
        find: 'staticHosting:',
        see: 'The app\'s settings, as `name: value` lines; indented lines belong to the line above. `auth` turns on Fabric sign-in; `staticHosting` says which built folder Fabric hosts, and how to build it.',
        why: 'Read-only here, to keep the course on track. In a real project you can edit it; `connector add` writes its connector part for you.',
      },
      {
        do: 'Sign in to Fabric:',
        run: 'npx rayfin login',
        see: 'The playground skips it, and says what the real one does.',
        why: '`npx` runs a tool from a package: here, the `rayfin` command. The real `login` opens the browser for Microsoft Entra ID sign-in. No sign-in happens here.',
      },
      {
        do: 'Start the dev loop:',
        run: 'npm run dev',
        see: 'The preview says there is no page yet: `src/App.tsx` is empty.',
        why: '`npm run dev` runs the `dev` script, which is `rayfin dev`. It keeps running and redraws the page as we edit. In a real project it holds that terminal (open a second one for the next commands) and serves the page at a local address. The data app template\'s README has us view it through the Fabric portal, by adding `&devUri=http://localhost:5173` to the app\'s address there.',
      },
    ],
    summary: [
      'One command creates the project from the data app template; `npm install` fetches its packages.',
      '`package.json` lists packages and scripts; `rayfin.yml` holds the app\'s settings. `npm run dev` starts the loop: edit, and see the page.',
    ],
    fabric: {
      text: 'Microsoft\'s walkthrough starts with a similar `npm create … --template dataapp` (it also passes `--workspace`), then adds the connector. The real template comes with more than we show: its own client, Fabric sign-in, a placeholder page, and its own way to query a semantic model. This course uses Rayfin\'s connector instead, as rayfin.ai documents it.',
      links: [learn.template, rayfin.quickstart],
    },
  },

  {
    id: 'connector',
    title: 'Add the connector',
    goal: 'connect the project to a semantic model with the Rayfin CLI',
    builds: ['create'],
    pbi: 'Like Get data > Power BI semantic models: the app gets a connection to one model. In a Fabric app that connection is a [[connector]].',
    idea: 'One command adds the connector. We give it a name, `contoso`, and the ids of the workspace and the model. The ids here are made up: in a real project they come from `npx rayfin connector search` or the model\'s address in the Fabric portal.',
    steps: [
      {
        do: 'Add a semantic model connector named `contoso`:',
        run: ADD_CONNECTOR,
        point: 'terminal',
        see: '`rayfin.yml` changed, a new `rayfin/connectors/contoso/schema.ts` appears in the file list, and the terminal prints an install line to run next.',
        why: '`--type` says what kind of Fabric item, `--workspace-id` and `--item-id` say which one, and `--name` is the name our code will use.',
      },
      {
        do: 'Open `rayfin/rayfin.yml` again.',
        file: YML,
        find: 'connectors:',
        see: 'A new `connectors:` section: the name, the type, the two ids, its one operation `executeQuery`, `auth` of type `delegated`, and a `version` to leave as generated.',
        why: '`delegated` means each query runs as the person using the app. Semantic model connectors only work that way.',
      },
      {
        do: 'Open `rayfin/connectors/contoso/schema.ts`.',
        file: 'rayfin/connectors/contoso/schema.ts',
        find: "export type ContosoSchema = FabricSemanticModel<'executeQuery'>;",
        see: 'A generated file, with red lines: its packages aren\'t installed yet. `ContosoSchema` describes what the connector can do: one operation, `executeQuery`.',
        why: 'TypeScript uses it to check our calls. (A different "type" from `--type`, which is the kind of Fabric item.) The first line says not to edit it: to change the connector, we run `connector add` again.',
      },
      {
        do: 'Run the install line the command printed:',
        run: INSTALL_CONNECTOR,
        see: 'Two connector packages added to `package.json`, and the red lines in `schema.ts` go.',
        why: '`connector add` installs nothing itself. It prints the exact versions to install.',
      },
      {
        do: 'Test the connector from the terminal, with one DAX query (copy it rather than type it):',
        run: INVOKE,
        see: '`"status": "ok"`, and in `output`, `"status": "success"`, the column `[Revenue]` and one row: 150632573.6073.',
        why: '`connector invoke` sends a query without any app code: it checks that we can query the model (for real, we need Read and Build permission on it, and the CLI may ask for Power BI consent first). `--input` carries the DAX, wrapped in JSON; the backslashes keep its inner quotes. Real projects often put it in a file instead (`--file`), because quoting differs between terminals.',
      },
    ],
    summary: [
      '`npx rayfin connector add` writes the connector into `rayfin.yml` and generates its schema file.',
      'It installs nothing: we run the `npm install` it prints.',
      '`npx rayfin connector invoke` tests a query before we write any app code.',
    ],
    fabric: {
      text: 'In a real project the ids are real, the command checks you can reach the model, and every user of the app needs access to it. A query from the terminal proves you can reach the model; the connector itself is proven once the deployed app runs the query.',
      links: [rayfin.adding, rayfin.semanticModels, learn.addConnector],
    },
  },

  {
    id: 'client',
    title: 'Wire the client',
    goal: 'create the client the app uses to call the connector',
    builds: ['connector'],
    pbi: 'The connector is like a connection in a report. The client is what lets the page use it: one object, created once, that every query goes through.',
    idea: 'We write `src/services/rayfinClient.ts` in three parts: what we import, the list of connectors, and the client itself. Then a first query from the page.',
    steps: [
      {
        do: 'Create `src/services/rayfinClient.ts` (**+ New file** in the file list, then type that whole path), and paste these imports:',
        code: C.CLIENT_IMPORTS,
        edits: [{ file: CLIENT, from: '', to: C.CLIENT_IMPORTS }],
        point: 'files',
        see: 'A new file, no red lines: every package it names is installed.',
        why: '`import` brings in code from a package (`@microsoft/…`) or another project file. `{ … }` picks named parts; `../../` means two folders up; `as contosoConfig` gives `connectorConfig` a clearer name here.',
      },
      {
        do: 'Under the imports, add the list of connectors:',
        code: C.CLIENT_SCHEMA.trimStart(),
        edits: [{ file: CLIENT, from: C.CLIENT_IMPORTS, to: C.CLIENT_IMPORTS + C.CLIENT_SCHEMA }],
        see: 'Nothing visible changes.',
        why: '`type` declares a shape for TypeScript to check against; it never runs. One entry per connector, under its name in `rayfin.yml`: `contoso`.',
      },
      {
        do: 'At the end of the file, create the client:',
        code: C.CLIENT_CREATE.trimStart(),
        edits: [{ file: CLIENT, from: C.CLIENT_SCHEMA, to: C.CLIENT_SCHEMA + C.CLIENT_CREATE }],
        errors: '1+',
        see: 'Red lines under `baseUrl` and `publishableKey`. The next two cards explain the code, then the red lines.',
      },
      {
        do: 'Look at the marked `connectorsService`.',
        file: CLIENT,
        find: 'connectorsService<AppConnectorsSchema>',
        see: '`RayfinClient.create` makes the one client the app uses. `auth: browserSession(…)` handles the signed-in session. `connectorsService` registers our connectors: `configs` tells the client each connector\'s type (the ids stay in `rayfin.yml`), and `runtime: fabricSemanticModel()` turns the model\'s answer into a result the page can read.',
        why: 'All three use the name `contoso`. `export` lets other files use `rayfinClient`; `baseUrl` and `publishableKey` say which app backend to talk to.',
      },
      {
        do: 'Open `src/vite-env.d.ts`, from the template.',
        file: 'src/vite-env.d.ts',
        find: 'readonly VITE_RAYFIN_API_URL?: string;',
        see: 'The `?` marks `VITE_RAYFIN_API_URL` as possibly missing. So its type is `string | undefined`: text, or nothing at all.',
        why: 'That is the red line: the client needs text for `baseUrl`. `import.meta.env` holds the values `rayfin dev` writes for us.',
      },
      {
        do: 'Back in `src/services/rayfinClient.ts`, check the values first: replace the marked lines with these.',
        code: C.CLIENT_ENV_TO,
        file: CLIENT,
        edits: [{ file: CLIENT, from: C.CLIENT_ENV_FROM, to: C.CLIENT_ENV_TO }],
        see: 'The red lines go.',
        why: '`!` means not, `||` means or: if either is missing, stop with a clear message (`throw`). After that, TypeScript knows they are text. `publishableKey,` is short for `publishableKey: publishableKey`.',
      },
      {
        do: 'A first query from the page: paste this into `src/App.tsx`.',
        code: C.TEST_PAGE,
        edits: [{ file: APP, from: '', to: C.TEST_PAGE }],
        find: 'rayfinClient.connectors.contoso',
        see: 'The page shows **Revenue: 150632573.6073**, and the Log shows the query.',
        why: 'Read only the marked call: it is the one line that talks to the model. The rest is replaced in the next lesson, and each part comes back later. (In a real project, Rayfin\'s docs say to test connector queries against a deployed app: `rayfin dev` doesn\'t wire connectors.)',
      },
    ],
    summary: [
      'The client is created once, with the connector registered under its name: in the schema type, in `configs` and in `runtime`.',
      '`fabricSemanticModel()` in `runtime` is what turns the model\'s answer into a result the page can read.',
      '`executeQuery({ query })` sends DAX through the connector.',
    ],
    fabric: {
      text: 'This is Rayfin 2.0\'s way to register a semantic model connector: `connectorsService` with `fabricSemanticModel()` in its `runtime` map. In a real data app project, add it to the template\'s existing client (`src/lib/rayfin-client.ts`) instead of making a second one; that client is fetched with `await getRayfinClient()`. As of November 2026, Microsoft Learn\'s pages still show the 1.x client (`ConnectorsRayfinClient`), so an agent following them may write that; the 2.0 version is on rayfin.ai.',
      links: [rayfin.clientSetup, rayfin.semanticModels],
    },
  },

  // ================================================================== 2 Build a page
  {
    id: 'grid',
    title: 'The grid',
    goal: 'place visuals on a 16:9 page with a 12 × 6 grid',
    builds: ['client'],
    pbi: 'A report page is a canvas you place visuals on. Here the canvas is a grid: 12 columns, 6 rows, and each visual says how many cells it takes.',
    idea: 'We replace the test with a real page layout. The numbers on it are typed in for now, like a mock-up; the model fills them in, in **Get data from the model**.',
    steps: [
      {
        do: 'In `src/App.tsx`, replace everything with this page:',
        code: C.CANVAS,
        edits: [{ file: APP, from: C.TEST_PAGE, to: C.CANVAS }],
        see: 'A title, two cards, an empty chart box and an About box.',
        why: 'A page is written as tags: `<div>` and `<section>` are boxes, `<h1>` and `<h2>` titles, `<p>` a line of text. `className` holds style words; we only change the layout ones.',
      },
      {
        do: 'Tick **Outline cells**, above the preview.',
        see: 'A dashed box around each visual: the grid cells it takes.',
      },
      {
        do: 'Look at the marked line: the canvas.',
        file: APP,
        find: 'grid grid-cols-12 grid-rows-6',
        see: '`grid-cols-12 grid-rows-6` makes the 12 × 6 grid; `aspect-video` keeps it 16:9.',
        why: '`col-span-3` is 3 columns wide, `row-span-2` is 2 rows tall.',
      },
      {
        do: 'Make both cards wider: change their `col-span-3` to `col-span-4`.',
        edits: [{ from: 'col-span-3 row-span-2', to: 'col-span-4 row-span-2', all: true }],
        see: 'The chart drops lower.',
        why: '4 + 4 + 6 is more than 12, so it no longer fits next to the cards.',
      },
      {
        do: 'Make the chart `col-span-4`, so the row adds up to 12 again.',
        edits: [{ from: 'col-span-6 row-span-5', to: 'col-span-4 row-span-5' }],
        see: 'Three visuals side by side.',
      },
      {
        do: 'Give **About this page** the space under the cards: change its `col-span-6` to `col-span-8`.',
        edits: [{ from: 'col-span-6 row-span-3', to: 'col-span-8 row-span-3' }],
        see: '**About this page** spans under both cards.',
      },
      {
        do: 'Pin the chart to the right edge: put `col-start-9` in front of its `col-span-4`.',
        edits: [{ from: 'col-span-4 row-span-5', to: 'col-start-9 col-span-4 row-span-5' }],
        see: 'Nothing moves now. Later, when the cards change, the chart keeps its place.',
        why: 'Without it, visuals flow in the order they are written: left to right, then down. `col-start-9` starts the chart at column 9.',
      },
    ],
    summary: [
      'The page is a 12 × 6 grid. `col-span-…` and `row-span-…` say how many cells a visual takes.',
      'Visuals flow in the order they are written, left to right, then down. `col-start-…` pins one to a column.',
    ],
    fabric: {
      text: 'Words like `col-span-4` come from Tailwind CSS, a common styling kit. The data app template, as installed by the Rayfin CLI 2.0.0, has Tailwind CSS 4 in its `package.json`, so we will read the same words there. (The link is Microsoft\'s walkthrough of that template.)',
      links: [learn.template],
    },
  },

  {
    id: 'component',
    title: 'A component',
    goal: 'write a visual once and use it with different props',
    builds: ['grid'],
    pbi: 'A [[component]] is a visual: a function that gets some values (its [[props]]) and returns what to draw.',
    idea: 'Our two cards repeat the same markup. We write a card component once, in its own file, and use it for every card.',
    steps: [
      {
        do: 'Create `src/components.tsx` (**+ New file**) with the card component:',
        code: C.KPI_CARD,
        edits: [{ file: COMP, from: '', to: C.KPI_CARD }],
        see: 'A new file. `KpiCardProps` lists the props: a `title` that is text (`string`) and a `value` that is a `number`.',
        why: '`export` lets other files use it.',
      },
      {
        do: 'In `src/App.tsx`, add this line at the very top, above the marked line:',
        code: "import { KpiCard } from './components';",
        edits: [{ file: APP, from: 'export default function App() {', to: `${COMP_IMPORT}\nexport default function App() {` }],
        see: 'Nothing changes yet.',
        why: '`./components` is our `src/components.tsx`; imports leave out the `.tsx`.',
      },
      {
        do: 'Replace the marked Revenue card with the component:',
        code: '<div className="col-span-4 row-span-2">\n  <KpiCard title="Revenue (USD)" value={150632573.6} />\n</div>',
        edits: [
          {
            from: '      <div className="col-span-4 row-span-2 rounded-lg border border-gray-200 bg-white p-3">\n        <p className="text-sm text-gray-500">Revenue (USD)</p>\n        <p className="text-2xl font-bold">150.6M</p>\n      </div>\n',
            to: '      <div className="col-span-4 row-span-2">\n        <KpiCard title="Revenue (USD)" value={150632573.6} />\n      </div>\n',
          },
        ],
        see: 'The card looks the same: the component formats the number as 150.6M.',
      },
      {
        do: 'Same for the Orders card:',
        code: '<div className="col-span-4 row-span-2">\n  <KpiCard title="Orders" value={57744} />\n</div>',
        edits: [
          {
            from: '      <div className="col-span-4 row-span-2 rounded-lg border border-gray-200 bg-white p-3">\n        <p className="text-sm text-gray-500">Orders</p>\n        <p className="text-2xl font-bold">57.7K</p>\n      </div>\n',
            to: '      <div className="col-span-4 row-span-2">\n        <KpiCard title="Orders" value={57744} />\n      </div>\n',
          },
        ],
        see: 'Two cards, one component.',
      },
      {
        do: 'Make room for more cards: change both cards\' `col-span-4 row-span-2` to `col-span-2 row-span-2`.',
        edits: [{ from: 'col-span-4 row-span-2', to: 'col-span-2 row-span-2', all: true }],
        see: 'Narrower cards, and space beside them. The chart stays pinned on the right.',
      },
      {
        do: 'Add a third card, on a new line under the marked `</div>` of the Orders card:',
        code: '<div className="col-span-2 row-span-2">\n  <KpiCard title="Customers" value={7297} />\n</div>',
        edits: [
          {
            from: '        <KpiCard title="Orders" value={57744} />\n      </div>\n',
            to: '        <KpiCard title="Orders" value={57744} />\n      </div>\n      <div className="col-span-2 row-span-2">\n        <KpiCard title="Customers" value={7297} />\n      </div>\n',
          },
        ],
        see: 'Three cards: one component, used three times with different props.',
      },
    ],
    summary: [
      'A component is a visual: a function that takes props and returns what to draw.',
      'One component, used several times with different props, is most of what a page is.',
      'Components can live in their own file and be imported where they are used.',
    ],
    fabric: {
      text: 'Microsoft\'s data app template comes with ready-made visual components for analytical apps, so in a real project much of the work is passing the right props to visuals someone else wrote.',
      links: [learn.template],
    },
  },

  {
    id: 'types',
    title: 'Types',
    goal: 'read a red line, and say what TypeScript can and can\'t check',
    builds: ['component'],
    pbi: 'A [[type]] is the shape of some data: which fields, and what kind each one is. Like a table\'s columns and their data types.',
    idea: 'TypeScript reads the code as we type and underlines in red what breaks a type. In this lesson we make slips on purpose, then undo them.',
    steps: [
      {
        do: 'A slip on purpose: in the Customers card, change `value={7297}` to `value="7.3K"`.',
        edits: [{ from: 'value={7297}', to: 'value="7.3K"' }],
        errors: 1,
        see: 'A [[red line|red-line]] under `value`, and "1 type error" under the editor.',
        why: 'Hover over the red line to read why: a `string` (text) is not a `number`. `"…"` is fixed text; `{…}` is a value from the code.',
      },
      {
        do: 'Look at the preview.',
        see: 'The page still draws, with "7.3K" on the card.',
        why: 'The browser runs whatever it gets: the red line is a check for us, not a gate.',
      },
      {
        do: `${UNDO} Back to \`value={7297}\`.`,
        edits: [{ from: 'value="7.3K"', to: 'value={7297}' }],
        see: 'The red line goes.',
      },
      {
        do: 'Another slip on purpose: change `title="Customers"` to `titel="Customers"`.',
        edits: [{ from: 'title="Customers"', to: 'titel="Customers"' }],
        errors: '1+',
        see: 'A red line. Hover: `titel` doesn\'t exist, and `title` is missing.',
        why: '`KpiCardProps` lists exactly which props a card takes.',
      },
      {
        do: UNDO,
        edits: [{ from: 'titel="Customers"', to: 'title="Customers"' }],
        see: 'The red line goes.',
      },
      {
        do: 'Hover over the marked `KpiCard`.',
        file: APP,
        find: 'KpiCard title="Revenue (USD)"',
        see: 'Its props and their types, read from `src/components.tsx`.',
        why: 'TypeScript checks across files. It can\'t see the model, though: a wrong column or a wrong number in a query still passes. That comes next.',
      },
    ],
    summary: [
      'TypeScript caught text where a number goes, and a misspelled prop, across files.',
      'A red line is a check for us, not a gate: the page still runs.',
      'It can\'t see the model, so a wrong column or a wrong number still passes.',
    ],
    fabric: {
      text: 'Fabric apps are built with Microsoft\'s [[Rayfin]] toolkit, made for TypeScript, so red lines like these are everyday work there. They don\'t stop a build either: in the data app template as installed by the Rayfin CLI 2.0.0, the build script runs `tsc --noCheck`. Microsoft\'s Copilot walkthrough still asks for the build and type-check commands to be run, and their errors fixed.',
      links: [rayfin.docs, learn.copilotReview],
    },
  },

  // ================================================================== 3 Get data from the model
  {
    id: 'first-query',
    title: 'The first queries',
    goal: 'replace typed-in numbers with the model\'s',
    builds: ['types'],
    pbi: 'Binding fields to visuals: each visual asks the model a [[query]] and draws the [[result]].',
    idea: 'We add `src/data.ts`: the code that runs a query, the queries themselves, and code that turns results into what the visuals draw. Then the chart and the cards use them.',
    steps: [
      {
        do: 'Create `src/data.ts` (**+ New file**) with the code that runs queries:',
        code: C.DATA_START,
        edits: [{ file: DATA, from: '', to: C.DATA_START }],
        see: 'A new file. Nothing on the page changes yet.',
        why: 'We don\'t need every line of it. Two parts matter, and the next two cards mark them.',
      },
      {
        do: 'Look at the marked `runDax`.',
        file: DATA,
        find: 'export const runDax',
        see: 'One line: it sends a DAX query through our client, the same call as the test page.',
      },
      {
        do: 'Look at the marked `useDax`.',
        file: DATA,
        find: 'export function useDax',
        see: 'Like a visual loading: `undefined` while it waits, then the model\'s result.',
        why: 'The `cancelled` lines drop an answer that arrives after the page has moved on. It takes `runDax` as an input; **The redraw trap** shows why that matters.',
      },
      {
        do: 'At the end of `src/data.ts`, add the first query, and the code that turns its result into bars:',
        code: C.COUNTRY_QUERY.trimStart(),
        edits: [{ file: DATA, from: '  return result;\n}\n', to: `  return result;\n}\n${C.COUNTRY_QUERY}` }],
        see: 'Still nothing on the page.',
        why: '`.map` makes one bar for each row. `toBars` reads `row[0]` as the label and `row[1]` as the value: positions, counted from 0. Keep that in mind.',
      },
      {
        do: 'In `src/App.tsx`, add this import on a new line under the marked one:',
        code: DATA_IMPORT_1,
        edits: [{ file: APP, from: COMP_IMPORT, to: `${COMP_IMPORT}${DATA_IMPORT_1}\n` }],
        see: 'Nothing on the page yet.',
      },
      {
        do: 'Run the query: add these lines on new lines under the marked `export default function App() {`.',
        code: COUNTRIES_LINES.replace(/^ {2}/gm, ''),
        edits: [{ from: 'export default function App() {\n', to: `export default function App() {\n${COUNTRIES_LINES}\n` }],
        see: 'In the Log, the query and what came back: a `status`, `columns` (their names) and `rows` (lists of values).',
        why: '`a ? b : c` works like `IF(a, b, c)`: no result yet, no bars.',
      },
      {
        do: 'Now the chart. In `src/components.tsx`, add this line at the very top, above the marked line:',
        code: "import type { Bar } from './data';",
        edits: [{ file: COMP, from: 'type KpiCardProps = {', to: "import type { Bar } from './data';\n\ntype KpiCardProps = {" }],
        see: 'Nothing changes yet.',
        why: '`import type` brings in only a type, here the shape of one bar.',
      },
      {
        do: 'At the end of `src/components.tsx`, under the marked end of `KpiCard`, add the bar chart:',
        code: C.BAR_LIST.trimStart(),
        edits: [{ file: COMP, from: `${KPI_VALUE_LINE}    </div>\n  );\n}\n`, to: `${KPI_VALUE_LINE}    </div>\n  );\n}\n${C.BAR_LIST}` }],
        see: 'Nothing on the page yet.',
      },
      {
        do: 'In `src/App.tsx`, add `BarList` to the marked import: `import { BarList, KpiCard } from \'./components\';`',
        edits: [{ file: APP, from: "import { KpiCard } from './components';", to: "import { BarList, KpiCard } from './components';" }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Draw the bars: on a new line under the marked chart title, add:',
        code: '<BarList rows={countries} />',
        edits: [
          {
            from: '        <h2 className="mb-2 font-semibold">Revenue by store country</h2>\n',
            to: '        <h2 className="mb-2 font-semibold">Revenue by store country</h2>\n        <BarList rows={countries} />\n',
          },
        ],
        see: 'Real bars: United States 60,466,772, then Online, Canada…',
      },
      {
        do: 'Now the cards. At the end of `src/data.ts`, add the totals query:',
        code: C.TOTALS.trimStart(),
        edits: [{ file: DATA, from: C.TO_BARS_BY_POSITION, to: C.TO_BARS_BY_POSITION + C.TOTALS }],
        see: 'Nothing on the page yet.',
        why: '`toTotals` finds each column by its name, such as `[Orders]`.',
      },
      {
        do: 'In `src/App.tsx`, replace the marked import from `./data` with:',
        code: DATA_IMPORT_2,
        edits: [{ from: DATA_IMPORT_1, to: DATA_IMPORT_2 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run the totals query: add these lines under the marked `const countries = …` line.',
        code: TOTALS_LINES.replace(/^ {2}/gm, ''),
        edits: [{ from: '  const countries = countriesResult ? toBars(countriesResult) : [];\n', to: `  const countries = countriesResult ? toBars(countriesResult) : [];\n${TOTALS_LINES}` }],
        see: 'In the Log: a second query.',
      },
      {
        do: 'Replace the typed-in numbers: `150632573.6` with `totals.revenue`, `57744` with `totals.orders`, `7297` with `totals.customers`.',
        edits: [
          { from: 'value={150632573.6}', to: 'value={totals.revenue}' },
          { from: 'value={57744}', to: 'value={totals.orders}' },
          { from: 'value={7297}', to: 'value={totals.customers}' },
        ],
        see: 'The same 150.6M, 57.7K and 7.3K, now from the model.',
        why: 'Customers is a distinct count, so it comes from its own query: adding up customers per country would count some twice.',
      },
    ],
    summary: [
      'A query is DAX text; `useDax` runs it and keeps the result while the page draws.',
      'A conversion (`toBars`, `toTotals`) turns the result\'s rows into what a visual draws.',
      'The queries name the model\'s measures, such as `[Revenue]` and `[# Orders]`, as a report visual does.',
    ],
    fabric: {
      text: 'The real connector returns this same result shape: `columns`, each with a name and a data type, and `rows` as lists of values in column order.',
      links: [rayfin.semanticModels],
    },
  },

  {
    id: 'conversion',
    title: 'The conversion',
    goal: 'read query results by column name, not by position',
    builds: ['first-query'],
    pbi: 'The DAX decides which columns come back, and in what order. Reading them by position is like reading a table by column number instead of column name.',
    idea: '`toBars` reads `row[1]` as the value. That holds only while the DAX keeps its columns in that order. Let\'s change the DAX, the way an agent might.',
    steps: [
      {
        do: 'Change the DAX the way an agent might (we take it out again at the end): in `src/data.ts`, add an Orders column above the marked `"Revenue", [Revenue]` line.',
        code: '"Orders", [# Orders],',
        edits: [{ file: DATA, from: COUNTRY_ROW, to: COUNTRY_ROW_ORDERS }],
        see: 'The bars now show order counts: United States 22,824. No red line, no error.',
      },
      {
        do: 'Open the **Log** tab and click the newest query (the top one).',
        point: 'log',
        see: 'Its columns: `store[CountryName]`, `[Orders]`, `[Revenue]`.',
        why: 'So `row[1]`, the second column, is now Orders.',
      },
      {
        do: 'Look columns up by name instead. In `src/data.ts`, replace the marked `toBars` with this:',
        code: C.TO_BARS_BY_NAME,
        edits: [{ file: DATA, from: C.TO_BARS_BY_POSITION, to: C.TO_BARS_BY_NAME }],
        errors: 1,
        see: 'A red line in `src/App.tsx`: `toBars` now needs two more inputs (arguments). Until we give them, the bars break.',
        why: '`findIndex((c) => c.name === …)` finds the column with that name (`===` means "equals"). The red line shows where to follow up.',
      },
      {
        do: "In `src/App.tsx`, give `toBars` the two column names: `toBars(countriesResult, 'store[CountryName]', '[Revenue]')`.",
        edits: [{ from: 'toBars(countriesResult)', to: "toBars(countriesResult, 'store[CountryName]', '[Revenue]')" }],
        see: 'United States 60,466,772 again, even with the Orders column in the query.',
        why: 'In the result, the model names the column `store[CountryName]`, without the quotes the DAX uses. Copy names from the Log.',
      },
      {
        do: 'We don\'t need orders by country: remove the `"Orders", [# Orders],` line again.',
        edits: [{ file: DATA, from: COUNTRY_ROW_ORDERS, to: COUNTRY_ROW }],
        see: 'Nothing changes on the page. That is the point.',
      },
    ],
    summary: [
      'The DAX decides the columns and their order: `row[1]` is whatever came second.',
      'Look columns up by name, so a change in the DAX can\'t shift them.',
      'TypeScript won\'t catch a wrong position, so check conversions in agent code by eye.',
    ],
    fabric: {
      text: 'Rayfin\'s own semantic model example builds each row as an object keyed by the column names, which is the same idea.',
      links: [rayfin.semanticModels],
    },
  },

  {
    id: 'measure-or-query',
    title: 'Measure or query',
    goal: 'choose between naming a model measure and writing the formula into the query',
    builds: ['conversion'],
    pbi: 'In a report, a visual asks for a [[measure]] and the model works it out. An app\'s query can do the same, by naming the measure. It can also carry its own formula instead.',
    idea: 'We add a Margin % card. First with the formula written into the query, with [[DEFINE MEASURE|define-measure]], as an agent often does. Then with the model\'s own measure.',
    steps: [
      {
        do: 'At the end of `src/data.ts`, add the margin query and its conversion:',
        code: C.MARGIN_IN_QUERY.trimStart(),
        edits: [{ file: DATA, from: "Number(row[at('[Customers]')]) };\n}", to: `Number(row[at('[Customers]')]) };\n}${C.MARGIN_IN_QUERY}` }],
        see: 'Nothing on the page yet.',
        why: '`DEFINE MEASURE` adds a measure for this one query. The model never stores it, and no report can see it.',
      },
      {
        do: 'Cards need to show a percent too. In `src/components.tsx`, add this line under the marked `value: number;`:',
        code: "format?: 'compact' | 'percent';",
        edits: [{ file: COMP, from: '  value: number;\n', to: "  value: number;\n  format?: 'compact' | 'percent';\n" }],
        see: 'Nothing changes yet.',
        why: '`?` means a card can leave it out. `\'compact\' | \'percent\'` means one of those two words, nothing else.',
      },
      {
        do: 'Take `format` in with the other props: change the marked `{ title, value }` to `{ title, value, format }`.',
        edits: [{ file: COMP, from: 'export function KpiCard({ title, value }: KpiCardProps)', to: 'export function KpiCard({ title, value, format }: KpiCardProps)' }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Draw a percent when it says so: replace the marked value line with this.',
        code: KPI_VALUE_FORMAT.trim(),
        edits: [{ file: COMP, from: KPI_VALUE_LINE, to: KPI_VALUE_FORMAT }],
        see: 'The other cards are unchanged: they leave `format` out.',
      },
      {
        do: 'In `src/App.tsx`, replace the marked import from `./data` with:',
        code: DATA_IMPORT_3,
        edits: [{ from: DATA_IMPORT_2, to: DATA_IMPORT_3 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run the margin query: add this line under the marked `const totals = …` line.',
        code: MARGIN_LINE.trim(),
        edits: [
          {
            from: '  const totals = totalsResult ? toTotals(totalsResult) : { revenue: 0, orders: 0, customers: 0 };\n',
            to: `  const totals = totalsResult ? toTotals(totalsResult) : { revenue: 0, orders: 0, customers: 0 };\n${MARGIN_LINE}`,
          },
        ],
        see: 'A third query in the Log.',
      },
      {
        do: 'Add the card, under the marked `</div>` of the Customers card:',
        code: '<div className="col-span-2 row-span-2">\n  <KpiCard title="Margin %" value={marginResult ? toPercent(marginResult) : 0} format="percent" />\n</div>',
        edits: [
          {
            from: '        <KpiCard title="Customers" value={totals.customers} />\n      </div>\n',
            to: '        <KpiCard title="Customers" value={totals.customers} />\n      </div>\n      <div className="col-span-2 row-span-2">\n        <KpiCard title="Margin %" value={marginResult ? toPercent(marginResult) : 0} format="percent" />\n      </div>\n',
          },
        ],
        see: 'Margin %: 55.9%. The four cards fill the row.',
      },
      {
        do: 'A slip on purpose, the kind that is easy to make: in `marginQuery`, in the first `SUMX`, change `sales[NetPrice]` to `sales[UnitPrice]`.',
        edits: [{ file: DATA, from: 'sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] )', to: 'sales[Quantity] * ( sales[UnitPrice] - sales[UnitCost] )' }],
        see: 'Margin % shows 62.1%. No red line, no error.',
        why: 'Only the top of the fraction moved to list price; the bottom is still net revenue. A believable number that means nothing.',
      },
      {
        do: UNDO,
        edits: [{ file: DATA, from: 'sales[Quantity] * ( sales[UnitPrice] - sales[UnitCost] )', to: 'sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] )' }],
        see: 'Back to 55.9%.',
      },
      {
        do: 'The model already has this measure. Replace the marked `marginQuery` with one that names it:',
        code: C.MARGIN_FROM_MODEL_TEXT,
        edits: [{ file: DATA, from: C.MARGIN_IN_QUERY_TEXT, to: C.MARGIN_FROM_MODEL_TEXT }],
        see: 'Still 55.9%. The formula now lives in one place: the model.',
      },
      {
        do: 'One more slip on purpose: change `[Margin %]` to `[Margin Pct]`.',
        edits: [{ file: DATA, from: 'ROW ( "Margin %", [Margin %] )', to: 'ROW ( "Margin %", [Margin Pct] )' }],
        queryFails: true,
        see: 'The card shows 0%. No red line, and no message on the page.',
        why: 'To TypeScript, a measure name is just text in a string. The model returned an error (see the Log), and `toPercent` turned it into 0. That is the next lesson.',
      },
      {
        do: UNDO,
        edits: [{ file: DATA, from: 'ROW ( "Margin %", [Margin Pct] )', to: 'ROW ( "Margin %", [Margin %] )' }],
        see: 'Back to 55.9%.',
      },
    ],
    summary: [
      'Prefer naming the model\'s measures: every report and app then shares one formula, looked after by whoever owns the model.',
      '`DEFINE MEASURE` is for something the model doesn\'t have yet. It is often a sign the model needs that measure: ask its owner. One with the same name as a model measure silently replaces it for that query, so in agent code a `DEFINE` block is worth a second look.',
      'A wrong measure name shows only when the query runs, as the model\'s error.',
    ],
    fabric: {
      text: 'When a query fails on Fabric, Microsoft\'s checklist for data apps includes verifying that the DAX references existing tables, columns and measures.',
      links: [learn.templateVerify],
    },
  },

  {
    id: 'failure',
    title: 'Failure',
    goal: 'make the page show failed queries and empty results, instead of zeros',
    builds: ['measure-or-query'],
    pbi: 'When a visual\'s query fails, Power BI shows an error on the visual, not a blank chart. A page we write has to do that itself.',
    idea: 'Our conversions turn a failed result into zeros and empty lists, and the page never checks. Let\'s make a slip on purpose, and see.',
    steps: [
      {
        do: "A slip on purpose: in `src/data.ts`, mistype a column in the countries query: change `'store'[CountryName]` to `'store'[Country]`.",
        edits: [{ file: DATA, from: COUNTRY_ROW, to: "    'store'[Country],\n    \"Revenue\", [Revenue]" }],
        queryFails: true,
        see: 'The bars are gone. No message.',
      },
      {
        do: 'Open the **Log** tab and click the failed query (in red).',
        point: 'log',
        see: 'The model\'s error: it can\'t find the column `Country`.',
        why: 'The page never showed it: on a failed result, `toBars` returns an empty list.',
      },
      {
        do: 'At the end of `src/components.tsx`, under the marked end of `BarList`, add an error panel:',
        code: C.ERROR_PANEL.trimStart(),
        edits: [{ file: COMP, from: '    </ul>\n  );\n}\n', to: `    </ul>\n  );\n}\n${C.ERROR_PANEL}` }],
        queryFails: true,
        see: 'Nothing changes yet.',
      },
      {
        do: 'In `src/App.tsx`, add `ErrorPanel` to the marked import: `import { BarList, ErrorPanel, KpiCard } from \'./components\';`',
        edits: [{ from: "import { BarList, KpiCard } from './components';", to: "import { BarList, ErrorPanel, KpiCard } from './components';" }],
        queryFails: true,
        see: 'Nothing changes yet.',
      },
      {
        do: 'Wait for the results before drawing: add this line under the marked `const marginResult = …` line.',
        code: LOADING.trim(),
        edits: [{ from: MARGIN_LINE, to: `${MARGIN_LINE}\n${LOADING}` }],
        queryFails: true,
        see: 'A short "Loading…" when the page starts.',
        why: '`!` means "not", `||` means "or": until every result is back, the page says so instead of showing zeros.',
      },
      {
        do: 'Then check each result\'s [[status]]: add this line under the marked Loading line.',
        code: ERRORS.trim(),
        edits: [{ from: LOADING, to: LOADING + ERRORS }],
        queryFails: true,
        see: '**This page could not load its data**, with the model\'s message about `Country`.',
        why: '`for (const r of [a, b, c])` runs the check once for each result; the first one that failed shows its message.',
      },
      {
        do: "Fix the slip: back to `'store'[CountryName]`.",
        edits: [{ file: DATA, from: "    'store'[Country],\n    \"Revenue\", [Revenue]", to: COUNTRY_ROW }],
        see: 'The page is back.',
      },
      {
        do: 'Add an empty state too, under the marked line that checks the status:',
        code: 'if (countries.length === 0) return <p className="p-4">No data for this page.</p>;',
        edits: [{ from: ERRORS, to: `${ERRORS}  if (countries.length === 0) return <p className="p-4">No data for this page.</p>;\n` }],
        see: 'Nothing changes: it is for a query that works but returns no rows.',
      },
      {
        do: 'Open the **Queries** tab, pick **Network down**, then press **Run**, above the page.',
        point: 'queries',
        see: 'The error panel shows a network error. In the Log, the query is marked "threw".',
        why: 'This time there is no result at all: the call "throws". In a real browser app, that is what a request that can\'t reach the app\'s backend does.',
      },
      {
        do: 'Look at the marked `.catch` in `useDax`, in `src/data.ts`.',
        file: DATA,
        find: '.catch(',
        see: 'It turns a thrown call into an error result, so our status check shows it. Without it, the page would stay on "Loading…".',
        why: 'So a page needs both: the `status` check for a query the model rejects, and `.catch` for a call that never gets an answer (offline, signed out, connector not deployed).',
      },
      {
        do: 'Set the **Queries** tab back to **Answer normally**, and press **Run**.',
        see: 'The data is back.',
      },
    ],
    summary: [
      'Three ways to end up with no data: the query failed, the call failed, or no rows came back. Each one should say so on the page.',
      'Check `status` before reading a result, and show the error\'s message.',
      'A query the model rejects comes back as an error result; a call that can\'t get through throws. Handle both: check `status`, and `.catch`.',
    ],
    fabric: {
      text: 'Microsoft Learn\'s example checks the returned status first and logs the error\'s category and message. Rayfin\'s own table example shows them on the page, as we do here. In Rayfin 2.0, a browser app\'s failed request throws; from the terminal, `connector invoke` reports the same failure as an error result with category `network`.',
      links: [learn.query, rayfin.semanticModels],
    },
  },

  // ================================================================== 4 Make it interactive
  {
    id: 'slicer',
    title: 'State as a slicer',
    goal: 'add a slicer: a value the page remembers, which drives its queries',
    builds: ['failure'],
    pbi: '[[State]] is a value the page remembers; when it changes, the page redraws. A slicer selection is state.',
    idea: 'We add a year slicer. The page keeps the selected year, and the queries take it as a filter.',
    steps: [
      {
        do: 'At the end of `src/components.tsx`, under the marked end of `ErrorPanel`, add a year slicer:',
        code: C.YEAR_SLICER.trimStart(),
        edits: [{ file: COMP, from: '      <p className="mt-1 text-sm">{message}</p>\n    </div>\n  );\n}\n', to: `      <p className="mt-1 text-sm">{message}</p>\n    </div>\n  );\n}\n${C.YEAR_SLICER}` }],
        see: 'Nothing on the page yet.',
        why: 'The slicer shows a year and reports clicks. It doesn\'t keep the year itself: the page will.',
      },
      {
        do: 'In `src/App.tsx`, add this line at the very top, above the marked line:',
        code: "import { useState } from 'react';",
        edits: [{ from: "import { BarList, ErrorPanel, KpiCard } from './components';", to: "import { useState } from 'react';\nimport { BarList, ErrorPanel, KpiCard } from './components';" }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Add `YearSlicer` to the marked import: `import { BarList, ErrorPanel, KpiCard, YearSlicer } from \'./components\';`',
        edits: [{ from: "import { BarList, ErrorPanel, KpiCard } from './components';", to: "import { BarList, ErrorPanel, KpiCard, YearSlicer } from './components';" }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Keep a year: add this line under the marked `export default function App() {`.',
        code: YEAR_STATE.trim(),
        edits: [{ from: 'export default function App() {\n', to: `export default function App() {\n${YEAR_STATE}` }],
        see: 'Nothing changes yet.',
        why: '`useState` gives two things: `year`, the value, and `setYear`, which changes it and redraws the page. `number | undefined` means a year, or nothing (all years). `useState` is a [[hook]]: one of React\'s `use…` functions.',
      },
      {
        do: 'Put the slicer in the header: replace the two marked lines with these three.',
        code: '<header className="col-span-12 row-span-1 flex items-center justify-between">\n  <h1 className="text-2xl font-bold">Sales overview</h1>\n  <YearSlicer value={year} onChange={setYear} />',
        edits: [
          {
            from: '      <header className="col-span-12 row-span-1">\n        <h1 className="text-2xl font-bold">Sales overview</h1>\n',
            to: '      <header className="col-span-12 row-span-1 flex items-center justify-between">\n        <h1 className="text-2xl font-bold">Sales overview</h1>\n        <YearSlicer value={year} onChange={setYear} />\n',
          },
        ],
        see: 'The slicer, on the right of the title. Clicks move the highlight, but nothing uses the year yet.',
      },
      {
        do: 'In `src/data.ts`, add a filter helper above the marked `the queries` line:',
        code: C.FILTERS_YEAR.trimStart(),
        edits: [
          {
            file: DATA,
            from: '// ------------------------------------------------------------ the queries\n',
            to: `${C.FILTERS_YEAR.trimStart()}\n// ------------------------------------------------------------ the queries\n`,
          },
        ],
        see: 'Nothing changes yet.',
        why: 'For a picked year it makes one DAX filter, `TREATAS ( { 2024 }, \'date\'[Year] )`: the kind of filter Power BI writes for a slicer selection (copy a visual\'s query from Performance analyzer to see one).',
      },
      {
        do: 'Make `totalsQuery` take a year: replace the marked query with this function.',
        code: C.TOTALS_QUERY_FN,
        edits: [{ file: DATA, from: C.TOTALS_QUERY_CONST, to: C.TOTALS_QUERY_FN }],
        errors: '1+',
        see: 'A red line in `src/App.tsx`, and the page shows an error: `App` passes a function where query text goes. The next step fixes both.',
        why: 'No year: the plain query. A year: the same `ROW`, inside `CALCULATETABLE` with the filter.',
      },
      {
        do: 'In `src/App.tsx`, call it with the year: `totalsQuery(year)`.',
        edits: [{ from: 'useDax(runDax, totalsQuery)', to: 'useDax(runDax, totalsQuery(year))' }],
        see: 'The red line and the error go.',
      },
      {
        do: 'Same for the countries query: replace the marked `salesByCountryQuery` with this function.',
        code: C.COUNTRY_QUERY_FN,
        edits: [{ file: DATA, from: C.COUNTRY_QUERY_CONST, to: C.COUNTRY_QUERY_FN }],
        errors: '1+',
        see: 'A red line in `src/App.tsx`, and the error, again.',
      },
      {
        do: 'In `src/App.tsx`: `salesByCountryQuery(year)`.',
        edits: [{ from: 'useDax(runDax, salesByCountryQuery)', to: 'useDax(runDax, salesByCountryQuery(year))' }],
        see: 'The red line and the error go.',
      },
      {
        do: 'Click **2024** in the preview.',
        see: 'Two new queries in the Log, then 2024 numbers on the cards and the chart.',
        why: 'Margin % doesn\'t change: its query doesn\'t take the year.',
      },
      {
        do: 'Click through the four years and watch **Customers**.',
        see: '3.9K, 5.4K, 6K, 5.9K, yet **All** is 7.3K, not 21.2K.',
        why: 'A distinct count. That is why the cards ask the model for their totals.',
      },
      {
        do: 'Look at the list at the end of `useDax`, in `src/data.ts`.',
        file: DATA,
        find: '}, [runDax, query]);',
        see: '`[runDax, query]`, marked in pink.',
        why: '`useDax` runs its query again whenever something in this [[dependency list|dependency-list]] changes. A new year means new query text, so it runs again.',
      },
    ],
    summary: [
      'State is a value the page remembers. `useState` gives the value and a function that changes it and redraws the page.',
      'One value, `year`, drives everything: the slicer shows it, the queries use it, and the list at the end of `useDax` makes them run again.',
      'Distinct counts don\'t add up, so totals come from their own query.',
    ],
    fabric: {
      text: 'On Fabric, a new selection sends a live query to the semantic model (unless the app reuses an earlier answer), as the person signed in. They need Build permission on the model, which is more than a report viewer needs.',
      links: [learn.addConnector],
    },
  },

  {
    id: 'redraw-trap',
    title: 'The redraw trap',
    goal: 'spot and fix a page that keeps querying the model',
    builds: ['slicer'],
    pbi: 'In Power BI, a visual queries again when its filters change. Here, `useDax` queries again when anything in its [[dependency list|dependency-list]] `[runDax, query]` changes, and a function can count as changed on every draw.',
    idea: 'Agents often make the query function inside the page. Let\'s do that on purpose, and watch.',
    steps: [
      {
        do: 'The slip on purpose, in two parts. First, in `src/App.tsx`, add this import under the marked line:',
        code: "import { rayfinClient } from './services/rayfinClient';",
        edits: [{ from: "import { useState } from 'react';\n", to: "import { useState } from 'react';\nimport { rayfinClient } from './services/rayfinClient';\n" }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Then a `runDax` of our own, inside `App`: add this line under the marked `year` line.',
        code: LOCAL_RUNDAX.trim(),
        edits: [{ from: YEAR_STATE, to: YEAR_STATE + LOCAL_RUNDAX }],
        see: 'No red line. The page looks fine, for a moment.',
        why: 'Inside `App`, our `runDax` is used instead of the one imported from `src/data.ts`.',
      },
      {
        do: 'Watch the count next to **Running**, above the preview.',
        point: 'status',
        see: 'It keeps climbing, and the Log fills with the same queries. After more than 20 in 10 seconds, the playground stops the page.',
      },
      {
        do: 'Look at the marked line.',
        file: APP,
        find: 'const runDax = (query: string)',
        see: 'Our `runDax`, inside `App`.',
        why: 'The query text is the same on every draw, but a function made inside `App` is a new one on every draw. So: answer, redraw, new `runDax`, query again, and round it goes.',
      },
      {
        do: 'Fix it: delete that line, and the import we added (**Do it for me** does both). The `runDax` from `src/data.ts`, made once outside any page, is used again.',
        edits: [
          { from: LOCAL_RUNDAX, to: '' },
          { from: "import { rayfinClient } from './services/rayfinClient';\n", to: '' },
        ],
        done: { file: APP, absent: 'const runDax' },
        see: 'Press **Run again**: a few queries, and the count stays put.',
      },
      {
        do: 'Just read, no need to paste: in agent code you will also see this fix, which keeps `runDax` inside, wrapped in `useCallback`:',
        code: 'const runDax = useCallback((query: string) => rayfinClient.connectors.contoso.executeQuery({ query }), []);',
        why: '`useCallback` hands back the same function on every draw; `[]` is its list, and it is empty. Making it once, outside the page, is the sturdier fix.',
      },
    ],
    summary: [
      'No error, no red line, the right numbers. The only signs are the query count and, in a real app, the load on the model.',
      'In agent code, check the list at the end of `useDax`: is each thing in it made outside the page? Anything made inside the page is new on every draw.',
      'The fix: make it once, outside the component, or wrap it in `useCallback`.',
    ],
    fabric: {
      text: 'Microsoft\'s data app template names unnecessary DAX queries, during development and at run time, as a problem its patterns reduce. A redraw loop is the extreme case.',
      links: [learn.templateWhy],
    },
  },

  {
    id: 'cross-filter',
    title: 'Cross-filter',
    goal: 'make a click on one visual filter the others',
    builds: ['slicer'],
    pbi: 'Click a bar and the other visuals respond: cards filter, and other bar charts highlight by default. Here we build the filter version, like choosing Filter in Edit interactions.',
    idea: 'We add a category chart in place of About, then let a click on a country filter the cards and the categories.',
    steps: [
      {
        do: 'In `src/data.ts`, let the filters take a store country too: replace the marked `filters` function with this.',
        code: C.FILTERS_BOTH_FN,
        edits: [{ file: DATA, from: C.FILTERS_YEAR_FN, to: C.FILTERS_BOTH_FN }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Let `totalsQuery` take a country and pass it on: two small changes, `(year?: number, country?: string)` and `filters(year, country)`. **Do it for me** makes both.',
        edits: [
          { file: DATA, from: 'export function totalsQuery(year?: number) {', to: 'export function totalsQuery(year?: number, country?: string) {' },
          { file: DATA, from: '  const f = filters(year);', to: '  const f = filters(year, country);' },
        ],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Add a categories query, under the marked end of `salesByCountryQuery`:',
        code: C.CATEGORY_QUERY_FN.trimStart(),
        edits: [{ file: DATA, from: C.COUNTRY_QUERY_FN, to: C.COUNTRY_QUERY_FN + C.CATEGORY_QUERY_FN }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'In `src/App.tsx`, replace the marked import from `./data` with:',
        code: DATA_IMPORT_4,
        edits: [{ from: DATA_IMPORT_3, to: DATA_IMPORT_4 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run it: add this line under the marked `const marginResult = …` line.',
        code: 'const categoriesResult = useDax(runDax, salesByCategoryQuery(year));',
        edits: [{ from: MARGIN_LINE, to: `${MARGIN_LINE}  const categoriesResult = useDax(runDax, salesByCategoryQuery(year));\n` }],
        see: 'A new query in the Log.',
      },
      {
        do: 'Include it in the checks: add `|| !categoriesResult` to the Loading line, and `categoriesResult` to the list in the status line. **Do it for me** makes both.',
        edits: [
          { from: '!marginResult) return', to: '!marginResult || !categoriesResult) return' },
          { from: '[countriesResult, totalsResult, marginResult])', to: '[countriesResult, totalsResult, marginResult, categoriesResult])' },
        ],
        see: 'Nothing changes.',
      },
      {
        do: 'Replace the marked About section with the category chart:',
        code: "<section className=\"col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4\">\n  <h2 className=\"mb-2 font-semibold\">Revenue by category</h2>\n  <BarList rows={toBars(categoriesResult, 'product[CategoryName]', '[Revenue]')} />\n</section>",
        edits: [
          {
            from: '      <section className="col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">\n        <h2 className="mb-2 font-semibold">About this page</h2>\n        <p>Contoso sample model, revenue in USD.</p>\n      </section>\n',
            to: "      <section className=\"col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4\">\n        <h2 className=\"mb-2 font-semibold\">Revenue by category</h2>\n        <BarList rows={toBars(categoriesResult, 'product[CategoryName]', '[Revenue]')} />\n      </section>\n",
          },
        ],
        see: 'Revenue by product category, under the cards.',
      },
      {
        do: 'Keep a selected country: add this line under the marked `year` line.',
        code: 'const [country, setCountry] = useState<string | undefined>(undefined);',
        edits: [{ from: YEAR_STATE, to: `${YEAR_STATE}  const [country, setCountry] = useState<string | undefined>(undefined);\n` }],
        see: 'Nothing changes yet.',
        why: 'Hooks (the `use…` lines) go at the top, above `Loading…`: that line can stop the drawing early, and every hook must run on every draw.',
      },
      {
        do: 'Give the country chart the selection: replace the marked `<BarList rows={countries} />` with this.',
        code: '<BarList rows={countries} selected={country} onSelect={(c) => setCountry(c === country ? undefined : c)} />',
        edits: [{ from: '<BarList rows={countries} />', to: '<BarList rows={countries} selected={country} onSelect={(c) => setCountry(c === country ? undefined : c)} />' }],
        see: 'Clicking a country fades the others; clicking it again clears it.',
        why: '`c === country ? undefined : c`: the same country again means nothing selected.',
      },
      {
        do: 'Pass the country to the cards\' and the categories\' queries: `totalsQuery(year, country)` and `salesByCategoryQuery(year, country)`. **Do it for me** makes both.',
        edits: [
          { from: 'totalsQuery(year)', to: 'totalsQuery(year, country)' },
          { from: 'salesByCategoryQuery(year)', to: 'salesByCategoryQuery(year, country)' },
        ],
        see: 'Nothing changes until something is clicked.',
      },
      {
        do: 'Click **Germany**, then **2024** in the slicer.',
        see: 'The cards and categories show Germany, then Germany in 2024 (2.8M revenue). The country chart keeps all its bars.',
        why: 'Its query takes the year but not the country.',
      },
    ],
    summary: [
      'This is [[lifting state up|lifting-state]]: the chart reports the click; the page, which holds all the visuals, keeps the selection and hands it down.',
      'Each query decides what it listens to: the country chart\'s query takes the year, not the country.',
      'In agent code, look for where the selection lives and which queries use it.',
    ],
    fabric: {
      text: 'Microsoft\'s checklist for data apps, run in a browser before publishing, includes: filters, cross-highlighting and data formatting work as expected.',
      links: [learn.templateChecks],
    },
  },

  {
    id: 'pages',
    title: 'Two pages',
    goal: 'turn the page into a report with a page list',
    builds: ['cross-filter'],
    pbi: 'A report has pages, and the page tabs show which one is open. Here a page is a component, and the open page is state, like the slicer\'s year.',
    idea: 'Our `App` becomes the first page, `OverviewPage`. A new `App` draws a page list and the open page. Then we add a second page.',
    steps: [
      {
        do: 'Make it a report: rename `App` to `OverviewPage`, and add the report at the end of `src/App.tsx`. Use **Do it for me** for this one: it makes three edits.',
        code: C.REPORT.trimStart(),
        edits: [
          { from: 'export default function App() {', to: 'function OverviewPage() {' },
          { from: "import { useState } from 'react';", to: "import { useState, type ReactElement } from 'react';" },
          { from: '    </div>\n  );\n}\n', to: `    </div>\n  );\n}\n${C.REPORT}` },
        ],
        done: { file: APP, before: ['function OverviewPage() {', 'export default function App() {'] },
        see: 'A page list on the left, with **Overview** open.',
        why: '`PAGES` lists the pages; `App` keeps which one is open, with `useState`, and draws it. `export default` marks `App` as the file\'s main export: the one the preview draws.',
      },
      {
        do: 'Add a second page id. Change the marked `type PageId` line to:',
        code: "type PageId = 'overview' | 'years';",
        edits: [{ from: "type PageId = 'overview';", to: "type PageId = 'overview' | 'years';" }],
        errors: 1,
        see: 'A red line under `PAGES`. Hover: `years` is missing.',
        why: '`Record<PageId, …>` means one entry for every page id.',
      },
      {
        do: 'Add a query for it, at the end of `src/data.ts`:',
        code: C.YEARS_QUERY.trimStart(),
        edits: [{ file: DATA, from: C.CATEGORY_QUERY_FN.trimStart(), to: C.CATEGORY_QUERY_FN.trimStart() + C.YEARS_QUERY }],
        errors: 1,
        see: 'The red line stays.',
      },
      {
        do: 'Write the page, above the marked `the report` line in `src/App.tsx`. **Do it for me** also adds `salesByYearQuery` to the import from `./data`.',
        code: C.YEARS_PAGE.trim(),
        edits: [
          { from: '// ------------------------------------------------------------ the report\n', to: `${C.YEARS_PAGE}// ------------------------------------------------------------ the report\n` },
          { from: 'salesByCountryQuery, toBars,', to: 'salesByCountryQuery, salesByYearQuery, toBars,' },
        ],
        errors: 1,
        see: 'The red line stays: `PAGES` has no entry for it yet.',
      },
      {
        do: 'Add it to `PAGES`, under the marked `overview:` line:',
        code: "years: { title: 'Years', Component: YearsPage },",
        edits: [{ from: "  overview: { title: 'Overview', Component: OverviewPage },\n", to: "  overview: { title: 'Overview', Component: OverviewPage },\n  years: { title: 'Years', Component: YearsPage },\n" }],
        see: 'The red line goes, and **Years** appears in the page list.',
      },
      {
        do: 'Click **Years**, then **Overview**.',
        see: 'Sales by year. Back on Overview, the slicer is on **All** again, and its queries run again.',
        why: 'A closed page is drawn fresh when it opens, with fresh state: like a report page loading its visuals.',
      },
    ],
    summary: [
      'A page is a component, and the open page is state.',
      '`Record<PageId, …>` makes TypeScript check that every page id has an entry: a page added in one place and forgotten in the other gets a red line, not a broken menu.',
      'In agent code, a page list like `PAGES` is the report\'s table of contents.',
    ],
    fabric: {
      text: 'In a real app, one command typed in a terminal, `npx rayfin up`, deploys the whole app, all its pages included, with its connector settings: a bit like Publish in Power BI Desktop.',
      links: [learn.deploy],
    },
  },

  // ================================================================== 5 Own what the agent wrote
  {
    id: 'review',
    title: 'Review an agent\'s page',
    goal: 'review a page an agent wrote, in four checks',
    builds: ['conversion', 'measure-or-query', 'failure', 'redraw-trap', 'pages'],
    pbi: 'Before a report goes to its users, someone checks it: are the numbers right, do the filters work, does an error show as an error. A page an agent wrote needs the same check.',
    idea: 'An "agent" adds a page to our project, written from one prompt. It looks finished, and it has four problems, each from an earlier lesson. We check in the order a reviewer would: does it run, are the numbers right, what happens when a query fails, where do the formulas live.',
    steps: [
      {
        do: 'Let the agent add its file: **Do it for me**.',
        edits: [{ file: AGENT, from: '', to: C.AGENT_PAGE }],
        point: 'files',
        see: '`src/SalesOverview.tsx` in the file list: a whole page, with its own helpers.',
      },
      {
        do: 'Add it to our report: the agent asked for a page id, a `PAGES` entry and an import. **Do it for me** makes the three edits.',
        code: "import SalesOverview from './SalesOverview';\n\ntype PageId = 'overview' | 'years' | 'agent';\n\nagent: { title: 'Agent page', Component: SalesOverview },",
        edits: [
          { from: "type PageId = 'overview' | 'years';", to: "type PageId = 'overview' | 'years' | 'agent';" },
          { from: "  years: { title: 'Years', Component: YearsPage },\n", to: "  years: { title: 'Years', Component: YearsPage },\n  agent: { title: 'Agent page', Component: SalesOverview },\n" },
          { from: "import { useState, type ReactElement } from 'react';\n", to: "import { useState, type ReactElement } from 'react';\nimport SalesOverview from './SalesOverview';\n" },
        ],
        see: '**Agent page** in the page list.',
      },
      {
        do: 'Check 1: does it run? Click **Agent page**, and watch the count next to **Running**.',
        point: 'status',
        see: 'It climbs until the playground stops the page.',
        why: 'A query loop, as in **The redraw trap**.',
      },
      {
        do: 'Fix it, in `src/SalesOverview.tsx`: move the marked `runDax` line, with the comment above it, out of `SalesOverview` to just above `function useDax` (cut, then paste; **Do it for me** does the move).',
        file: AGENT,
        find: 'const runDax: RunDax = (query)',
        edits: [
          { file: AGENT, from: AGENT_RUNDAX_IN_PAGE, to: '' },
          {
            file: AGENT,
            from: 'function useDax(runDax: RunDax, query: string) {',
            to: '// Runs a DAX query against the model.\nconst runDax: RunDax = (query) => rayfinClient.connectors.contoso.executeQuery({ query });\n\nfunction useDax(runDax: RunDax, query: string) {',
          },
        ],
        done: { file: AGENT, before: ['const runDax', 'export default function SalesOverview'] },
        see: 'Press **Run again** and open **Agent page**: the count stays put.',
      },
      {
        do: 'Check 2: are the numbers right? Compare the agent\'s **Revenue** card with its bars.',
        see: 'The card says 150.6M, but the top bar, United States, says 22,824.',
        why: 'The card is right; the bars aren\'t. Which column do they read?',
      },
      {
        do: 'Open the **Log** tab and click the `sales-by-country-with-orders` query. Which column is second?',
        point: 'log',
        file: AGENT,
        find: 'value: Number(row[1])',
        see: '`[Orders]`. And the marked part of the agent\'s `toBars` reads `row[1]`.',
        why: 'So the bars show order counts, as in **The conversion**.',
      },
      {
        do: 'Fix it: click **Show me in the code** to select the marked part of `toBars`, then paste this over it:',
        code: "({ label: String(row[col(result, 'store[CountryName]')]), value: Number(row[col(result, '[Revenue]')]) })",
        edits: [{ file: AGENT, from: '({ label: String(row[0]), value: Number(row[1]) })', to: "({ label: String(row[col(result, 'store[CountryName]')]), value: Number(row[col(result, '[Revenue]')]) })" }],
        see: 'United States: 60,466,772, and the bars are in order.',
        why: '`col` is the agent\'s own helper, already used by its `toTotals`: it finds a column by name.',
      },
      {
        do: 'Check 3: what happens when a query fails? Open the **Queries** tab, pick **Network down**, press **Run**, and open **Agent page**.',
        point: 'queries',
        see: 'Every card shows 0 (Margin % shows 0%) and the chart is empty. No message.',
        why: 'The agent\'s conversions turn a failed result into zeros, and its page never checks `status`. It even wrote an `ErrorPanel`, but nothing uses it.',
      },
      {
        do: 'Fix it: add this line under the marked `Loading…` line in `src/SalesOverview.tsx`.',
        code: "for (const r of [totalsResult, countriesResult, marginResult]) if (r.status === 'error') return <ErrorPanel message={r.error.message} />;",
        file: AGENT,
        edits: [
          {
            file: AGENT,
            from: 'return <p className="p-4">Loading…</p>;\n',
            to: 'return <p className="p-4">Loading…</p>;\n  for (const r of [totalsResult, countriesResult, marginResult]) if (r.status === \'error\') return <ErrorPanel message={r.error.message} />;\n',
          },
        ],
        see: '**This page could not load its data**, with the network message.',
      },
      {
        do: 'Set the **Queries** tab back to **Answer normally**, and press **Run**.',
        see: 'The data is back.',
      },
      {
        do: 'Check 4: where do the formulas live? Look at the agent\'s marked `marginQuery`.',
        file: AGENT,
        find: 'const marginQuery',
        see: 'A whole margin formula inside the query, with `DEFINE MEASURE`.',
        why: 'The model already has `[Margin %]`, as in **Measure or query** (on a real project, look in the model\'s field list). A copy can drift from it, and nothing would warn us.',
      },
      {
        do: 'Fix it: click **Show me in the code** to select the whole of `marginQuery`, then paste this over it:',
        code: 'const marginQuery = `\nEVALUATE\nROW ( "Margin %", [Margin %] )\n`;',
        edits: [{ file: AGENT, from: C.AGENT_MARGIN_IN_QUERY, to: 'const marginQuery = `\nEVALUATE\nROW ( "Margin %", [Margin %] )\n`;' }],
        see: 'Still 55.9%: the same number, but the formula now lives in one place, the model.',
      },
    ],
    summary: [
      'Four problems, and not one red line: a query loop, numbers from the wrong column, errors turned into zeros, and a formula copied out of the model.',
      'Review in that order: does it run (the query count), are the numbers right (compare with a total you trust), what does it show when a query fails, and where do the formulas live.',
      'None of these give a red line, so running the page and reading its code is the check.',
    ],
    fabric: {
      text: 'Microsoft\'s guide to building these apps with GitHub Copilot has the same job: review what the agent changed, the connector settings and its DAX queries first. It also asks us to look at new packages and at data calls that skip the connector. The template (CLI 2.0.0) has a second data path of its own; Microsoft\'s walkthrough says to replace calls to it with the connector client, so treat it as a review finding.',
      links: [learn.copilotReview],
    },
  },

  {
    id: 'to-fabric',
    title: 'Take it to Fabric',
    goal: 'say what changes when the app goes to a real Fabric workspace',
    builds: ['review'],
    pbi: 'Like publishing a report from Desktop: the report is the same, but the data source and the permissions are real, and the data is as fresh as the model (for an Import model, its last refresh).',
    idea: 'Our project follows the steps of a real one: template, connector, client, pages. What is left is what the playground can\'t do: real ids, real sign-in, real users, and deploying.',
    steps: [
      {
        do: 'Look at the connector in `rayfin/rayfin.yml`.',
        file: YML,
        find: 'workspaceId:',
        see: 'Our made-up ids.',
        why: 'In a real project, `npx rayfin connector search --all-workspaces --type fabric-semanticmodel` lists the models you can reach, with ready-made `connector add` commands. Re-run `connector add` with `--yes` to replace the ids.',
      },
      {
        do: 'Open the **Queries** tab.',
        point: 'queries',
        see: 'Saved answers. On Fabric, each query goes live to the semantic model.',
        why: 'It runs as the person using the app, so each user needs Build and Read permission on the model, as for Analyze in Excel.',
      },
      {
        do: 'Before the first real query, check these with your Fabric admin.',
        see: 'The Fabric Apps workload is on for the tenant, and so is the tenant setting **Semantic Model Execute Queries REST API** (older name: Dataset Execute Queries REST API, under Integration settings). You need Contributor, Member or Admin on the workspace.',
        why: 'Microsoft\'s walkthrough also asks for a model hosted on Fabric or Power BI capacity; its licensing page describes what works in Pro workspaces.',
      },
      {
        do: 'Before publishing, check the page in a browser. Microsoft\'s data app template includes a browser-validation workflow (Playwright) for this.',
        see: 'Visuals draw and aren\'t cut off or squeezed, text is readable, loading, empty and error states make sense, filters and cross-highlighting work, and the browser console shows no unexpected errors.',
        why: 'We practised some of these in **Failure** (error and empty states) and **Cross-filter** (filters). Also test as a normal user who has access to both the app and the model: their permissions are the ones that count.',
      },
      {
        do: 'Deploy:',
        run: 'npx rayfin up',
        point: 'terminal',
        see: 'The playground says what the real command does. Nothing is deployed.',
        why: 'The real one builds the app and deploys it, connector included, a bit like Publish in Power BI Desktop. `npx rayfin up status` then prints its address. This is also where connector queries start to work for real: `rayfin dev` doesn\'t wire connectors.',
      },
    ],
    summary: [
      'We built an app with Rayfin\'s connector, in the order a real one is set up: the template, the connector, the client, the pages.',
      'What changes on Fabric: real ids, real sign-in, live queries as the person using the app, and a deploy. In a real data app project, the connector goes into the template\'s own client.',
      'To start a real one, follow Rayfin\'s Quickstart and Microsoft\'s walkthrough.',
    ],
    fabric: {
      text: 'Read next: Microsoft\'s walkthrough of a data app connected to a semantic model, Rayfin\'s page on semantic model connectors, and the Quickstart.',
      links: [learn.template, rayfin.semanticModels, rayfin.quickstart],
    },
  },
];
