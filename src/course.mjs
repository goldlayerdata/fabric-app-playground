// The course: chapters, the modules in each, the lessons in each module (by id, from
// lesson-list.mjs), and each module's knowledge check (2 to 4 questions).
//
// Numbers come from positions here, so they are never written anywhere else (tools/check-lessons.mjs
// checks every reference). A chapter's number is its place in `chapters`, from 1. Module numbers run
// on across chapters, from 0, so a lesson keeps one number for good: Chapter 1 has modules 0 to 5,
// Chapter 2 starts at module 6 (lesson 6.1). Adding a chapter never moves an earlier number, a link
// such as #failure/9, or the progress kept in the browser (stored by lesson and module id).
//
// A chapter:
//   id       stable, used in links and progress
//   title    short, sentence case
//   goal     one line, what the learner can do after it
//   builds   ids of earlier chapters it starts from (its project starts where they end)
//   modules  a live chapter: module ids, in order (every module is in exactly one chapter, in order)
//   coming   a chapter not built yet: planned lesson titles, shown muted with no numbers or links
export const chapters = [
  {
    id: 'model-app',
    title: 'An app on a semantic model',
    goal: 'From an empty folder to a report page on a semantic model, and a review of an agent\'s page.',
    builds: [],
    modules: ['start', 'setup', 'build', 'data', 'interact', 'own'],
  },
  {
    id: 'lakehouse',
    title: 'Read a lakehouse',
    goal: 'Read typed rows from a lakehouse, and know which numbers belong to the model.',
    builds: ['model-app'],
    modules: ['lake-connect', 'lake-rows'],
  },
  {
    id: 'own-data',
    title: 'Store your own data',
    goal: 'Give the app a database of its own: model sales targets, apply the schema, read and write them.',
    builds: ['lakehouse'],
    coming: ['Turn on the data service', 'Model a sales target', 'Register and apply', 'Read and write targets', 'Change the model'],
  },
  {
    id: 'who',
    title: 'Who is using it',
    goal: 'Sign-in, claims and policies: who sees and changes which targets, and whose identity each call runs as.',
    builds: ['own-data'],
    coming: ['Signed in as', 'My rows only', 'Two identities', 'Roles the business knows', 'Each country, its own targets'],
  },
  {
    id: 'approvals',
    title: 'Approvals',
    goal: 'A change request one person proposes and another approves, and the approved value written where Power BI can read it.',
    builds: ['who'],
    coming: ['A change request', 'Requester and approver', 'Apply the approved value', 'Where each record lives', 'Review the agent\'s approval page'],
  },
  {
    id: 'files',
    title: 'Files, two ways',
    goal: 'Upload and manage files in the app\'s own storage, or write them to a lakehouse from a function.',
    builds: ['who'],
    coming: ['A folder in the app', 'When an upload fails', 'A file into a lakehouse', 'Which one, when'],
  },
  {
    id: 'ask',
    title: 'Ask in plain words',
    goal: 'Questions about Power BI data in plain words: Fabric IQ as the signed-in user, a data agent as the app.',
    builds: ['who'],
    coming: ['Ask Fabric IQ', 'A conversation', 'A data agent from a function', 'Whose answer is it'],
  },
  {
    id: 'ship',
    title: 'Ship it',
    goal: 'Environments, deployment pipelines, and tests that run without Fabric.',
    builds: ['approvals'],
    coming: ['Dev, test and prod', 'Promote with a pipeline', 'Tests without Fabric', 'Ready to share'],
  },
];

// The modules, in course order: every live chapter's modules, one after the other.
//
// A check question:
//   q        the question (same formatting as lesson text)
//   options  2 to 4 answers, alike in length and style, so the right one doesn't stand out
//   answer   index of the right one (0-based)
//   why      shown after answering
//   lesson, step   where it was taught: step is the step number in that lesson (1 = first step)
export const modules = [
  {
    id: 'start',
    title: 'Start here',
    goal: 'Find your way around: files, code, the page, the terminal and the queries.',
    lessons: ['tour'],
  },
  {
    id: 'setup',
    title: 'Set up the project',
    goal: 'Create a Fabric app project, connect it to a semantic model, and wire the client.',
    lessons: ['create', 'connector', 'client'],
    check: [
      {
        q: 'After `npx rayfin connector add`, what is left for us to do?',
        options: ['Run the `npm install` line it printed', 'Add the connector to `rayfin.yml` by hand', 'Type the model\'s ids into `schema.ts`'],
        answer: 0,
        why: '`connector add` writes `rayfin.yml` and the schema file itself, but installs nothing: it prints the exact install line to run.',
        lesson: 'connector',
        step: 4,
      },
      {
        q: 'Besides `rayfin.yml`, where must the client use the name `contoso`?',
        options: ['In `package.json`, next to the connector packages', 'In `.env.local`, with the other values', 'In the schema type, `configs` and `runtime`'],
        answer: 2,
        why: 'The client registers each connector under its name, in all three places, and the page calls `rayfinClient.connectors.contoso`.',
        lesson: 'client',
        step: 4,
      },
      {
        q: 'Why does the client check `VITE_RAYFIN_API_URL` before using it?',
        options: ['Its type says it may be missing, and the client needs text', 'It is secret, and must be hidden first', 'The model rejects queries without it'],
        answer: 0,
        why: 'The template declares it as `string | undefined`. After the check, TypeScript knows it is text.',
        lesson: 'client',
        step: 5,
      },
    ],
  },
  {
    id: 'build',
    title: 'Build a page',
    goal: 'Lay out a 16:9 page, make a visual reusable, and read a red line.',
    lessons: ['grid', 'component', 'types'],
    check: [
      {
        q: 'On the 12-column grid, two cards are `col-span-4` and the chart is `col-span-6`. What happens?',
        options: ['Everything shrinks to fit one row', 'The chart moves down, to where it fits', 'A red line appears'],
        answer: 1,
        why: '4 + 4 + 6 is 14, more than 12, so the chart no longer fits next to the cards. Nothing shrinks, and layout is not a type error.',
        lesson: 'grid',
        step: 4,
      },
      {
        q: 'In `<KpiCard title="Orders" value={57744} />`, what are `title` and `value`?',
        options: ['The card\'s props', 'Columns in the model', 'Measures in the model'],
        answer: 0,
        why: 'Props are the values a component is given, like the fields and settings of a visual. They are written in the page code, not in the model.',
        lesson: 'component',
        step: 1,
      },
      {
        q: '`value="7.3K"` is passed where a `number` goes. What happens?',
        options: ['A red line, and the page still draws', 'The page refuses to run until fixed', 'The model returns an error'],
        answer: 0,
        why: 'The red line is a check for us, not a gate: the browser runs whatever it gets. The model never sees it.',
        lesson: 'types',
        step: 2,
      },
    ],
  },
  {
    id: 'data',
    title: 'Get data from the model',
    goal: 'Ask the model with DAX, use its measures by name, read results safely, and show its errors.',
    lessons: ['first-query', 'conversion', 'measure-or-query', 'failure'],
    check: [
      {
        q: 'The DAX now returns country, orders, revenue, and the code still reads `row[1]` as revenue. What do you see?',
        options: ['Order counts on the bars', 'A red line under `row[1]`', 'An error from the model'],
        answer: 0,
        why: 'The second column is now Orders. TypeScript can\'t see the model and the query is fine, so nothing warns you: look columns up by name.',
        lesson: 'conversion',
        step: 1,
      },
      {
        q: 'A measure name is mistyped in a DAX string. What reports it?',
        options: ['TypeScript, with a red line as we type', 'The model, when the query runs: its error is in the Log', 'Nothing: the model skips unknown measures'],
        answer: 1,
        why: 'To TypeScript, the DAX is just text. Only the model knows its measures, and our page showed 0% until it checked `status`.',
        lesson: 'measure-or-query',
        step: 11,
      },
      {
        q: 'The network is down, and the page checks `status`. What does the page show?',
        options: ['Zeros and an empty chart', 'Its error message, in the error panel', 'A red line in the editor'],
        answer: 1,
        why: 'The call throws; `.catch` in `useDax` turns that into an error result, and the status check shows its message on the page.',
        lesson: 'failure',
        step: 9,
      },
    ],
  },
  {
    id: 'interact',
    title: 'Make it interactive',
    goal: 'Add a slicer, avoid query loops, filter from a click, and add pages.',
    lessons: ['slicer', 'redraw-trap', 'cross-filter', 'pages'],
    check: [
      {
        q: 'What makes `useDax` run its query again?',
        options: ['Any click on the page', 'Any redraw of the page', 'A change in `runDax` or `query`'],
        answer: 2,
        why: 'Apart from the first draw, only a change in its list `[runDax, query]` runs it again. A redraw alone doesn\'t, unless it makes a new `runDax`.',
        lesson: 'slicer',
        step: 13,
      },
      {
        q: '`runDax` is made inside the page component. What happens?',
        options: ['It queries again and again, in a loop', 'A red line under `runDax`', 'Nothing: the query text is the same'],
        answer: 0,
        why: 'A function made inside a component is a new one on every draw, so `useDax` sees a change each time.',
        lesson: 'redraw-trap',
        step: 4,
      },
      {
        q: 'A click on a bar filters the cards. Which part of the code keeps the selected country?',
        options: ['The bar chart, `BarList`', 'The page component', 'The query'],
        answer: 1,
        why: 'Lifting state up: the chart only reports the click; the page keeps the selection and hands it to the queries that use it.',
        lesson: 'cross-filter',
        step: 8,
      },
      {
        q: 'A new page id is added to `PageId`, but not to `PAGES`. What happens?',
        options: ['A red line under `PAGES`', 'An empty entry in the page list', 'The model returns an error'],
        answer: 0,
        why: '`Record<PageId, …>` asks for one entry per page id, so TypeScript points at the missing one.',
        lesson: 'pages',
        step: 2,
      },
    ],
  },
  {
    id: 'own',
    title: 'Own what the agent wrote',
    goal: 'Review a page you didn\'t write, and know what changes on real Fabric.',
    lessons: ['review', 'to-fabric'],
    check: [
      {
        q: 'An agent\'s page shows 0 on every card when the network is down, and no message. What is missing?',
        options: ['A check of each result\'s `status`', 'A measure in the model', '`useCallback` around `runDax`'],
        answer: 0,
        why: 'The conversions turned a failed result into zeros. Check `status` and show the error instead.',
        lesson: 'review',
        step: 8,
      },
      {
        q: 'An agent\'s query defines its own margin formula, and the model already has `[Margin %]`. What do you do?',
        options: ['Keep both, to compare', 'Use the model\'s measure', 'Copy the formula into every page'],
        answer: 1,
        why: 'One formula, in the model, shared by every report and app. A copy can drift without any error.',
        lesson: 'review',
        step: 11,
      },
      {
        q: 'On Fabric, whose permissions does a semantic model query run with?',
        options: ['The app\'s own account', 'The developer who published it', 'The person using the app'],
        answer: 2,
        why: 'Semantic model connectors use delegated access only: each query runs as the person signed in, so each user needs Build and Read permission on the model.',
        lesson: 'to-fabric',
        step: 2,
      },
    ],
  },
  // ================================================================== Chapter 2: Read a lakehouse
  {
    id: 'lake-connect',
    title: 'Connect a lakehouse',
    goal: 'Add a read-only lakehouse connector, and turn its tables into typed entities.',
    lessons: ['lakehouse-connector', 'lakehouse-entities'],
    check: [
      {
        q: 'What does `connector add --type fabric-sqlanalytics` write?',
        options: ['A `rayfin.yml` entry, `metadata.json` and a placeholder schema', 'One entity file for every table it found', 'The packages, and the wiring in the client'],
        answer: 0,
        why: 'For a SQL source it discovers the tables and columns, and stops there: the entity files are ours (or an agent\'s) to write, and the install is the line it prints.',
        lesson: 'lakehouse-connector',
        step: 2,
      },
      {
        q: 'The metadata has no primary key for `store`. What goes in `Source`?',
        options: ['`primaryKey: [\'storeKey\']`', '`primaryKey: []`', '`primaryKey: [\'id\']`'],
        answer: 1,
        why: 'Never invent a key from column names: the entity is keyless, so it has no `findByKey`, `update` or `delete`.',
        lesson: 'lakehouse-entities',
        step: 4,
      },
      {
        q: 'Both tables have a `storeKey` column. Does the generated `Sales` get a relationship to `Store`?',
        options: ['Yes: matching column names make one', 'Yes, once both entities are in `schema.ts`', 'No: relationships come only from foreign keys in the metadata'],
        answer: 2,
        why: 'The metadata has no foreign keys, so there is no relationship. To combine the tables, the app joins them itself.',
        lesson: 'lakehouse-entities',
        step: 6,
      },
    ],
  },
  {
    id: 'lake-rows',
    title: 'Rows, not measures',
    goal: 'Read lakehouse rows on a page, keep totals in the model, and know whose identity each read uses.',
    lessons: ['lakehouse-rows', 'rows-or-measures', 'who-runs-it'],
    check: [
      {
        q: 'What does the lakehouse connector need in `connectorsService`?',
        options: ['An entry in `configs` and one in `runtime`', 'An entry in `configs` only', 'An entry in `runtime` only'],
        answer: 1,
        why: '`runtime` is for function-style connectors, such as the semantic model (`fabricSemanticModel()` decodes its answer). An entity connector, such as a lakehouse, takes no `runtime` entry.',
        lesson: 'lakehouse-rows',
        step: 3,
      },
      {
        q: '`Sales.select([...]).where(...).execute()` matches 5,000 rows. What comes back?',
        options: ['All 5,000 rows', 'An error asking for paging', 'The first 100, with no warning'],
        answer: 2,
        why: '`execute()` returns one page, 100 rows by default. Page through with `executePaginated()`, or take totals from the model.',
        lesson: 'rows-or-measures',
        step: 4,
      },
      {
        q: 'Who does a lakehouse query run as, by default?',
        options: ['The owner of the app', 'The person using the app', 'The developer who added it'],
        answer: 0,
        why: '`connector add` writes `auth` of type `application` for SQL sources. Choose `delegated` for per-user access.',
        lesson: 'who-runs-it',
        step: 1,
      },
      {
        q: 'The page calls `Sales.create(...)` on the lakehouse connector. What happens?',
        options: ['A new row in the lakehouse', 'A red line: there is no `create`', 'A row only in the browser'],
        answer: 1,
        why: 'The connector\'s operations are `read` only, so its type has no write methods; at run time the client refuses too.',
        lesson: 'who-runs-it',
        step: 4,
      },
    ],
  },
];
