// The course: chapters, the modules in each, the lessons in each module (by id, from
// lesson-list.mjs), and each module's knowledge check (2 to 4 questions).
//
// Numbers come from positions here, so they are never written anywhere else (tools/check-lessons.mjs
// checks every reference). A chapter's number is its place in `chapters`, from 1, and a lesson's is its
// place in its chapter: Chapter 4's lessons are 4.1, 4.2 and so on. Modules have no number on screen.
// A chapter added at the end moves no number; one put between others moves the numbers of the chapters
// after it. Links such as #failure/9 and the progress kept in the browser never move: they are stored
// by lesson and module id.
//
// A chapter:
//   id       stable, used in links and progress
//   title    short, sentence case
//   goal     one line, what the learner can do after it
//   builds   ids of earlier chapters it starts from (its project starts where they end)
//   modules  a live chapter: module ids, in order (every module is in exactly one chapter, in order)
//   coming   a chapter not built yet: planned lesson titles, shown muted with no numbers or links
//
// Parts group the chapters in three steps up (see `parts` below the chapters).
export const chapters = [
  {
    id: 'model-app',
    title: 'An app on a semantic model',
    goal: 'From an empty folder to a report page on a semantic model, and a review of an agent\'s page.',
    builds: [],
    modules: ['start', 'setup', 'build', 'data', 'interact', 'own'],
  },
  {
    id: 'two-models',
    title: 'Two semantic models',
    goal: 'Add a second semantic model, register it in the client, and use both on one page without mixing them up.',
    builds: ['model-app'],
    modules: ['two-models'],
  },
  {
    id: 'lakehouse',
    title: 'Read a lakehouse',
    goal: 'Read typed rows from a lakehouse, and know which numbers belong to the model.',
    builds: ['two-models'],
    modules: ['lake-connect', 'lake-rows'],
  },
  {
    id: 'own-data',
    title: 'Store your own data',
    goal: 'Give the app a database of its own: model sales targets, apply the schema, read and write them.',
    builds: ['lakehouse'],
    modules: ['data-model', 'data-use'],
  },
  {
    id: 'who',
    title: 'Who is using it',
    goal: 'Sign-in, claims and policies: who sees and changes which targets, and whose identity each call runs as.',
    builds: ['own-data'],
    modules: ['who-signin', 'who-roles'],
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
    goal: 'Questions about Power BI data in plain words: Fabric IQ as the signed-in user, a data agent from a function.',
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

// Parts group the chapters, in order: every chapter is in exactly one part. Chapter numbers run on
// across parts. Everyone taking the course knows Power BI; the level is about building the app.
//   id        stable
//   title     short, sentence case
//   level     how far into building an app it is
//   goal      one line, what the part is about
//   chapters  chapter ids, in course order
export const parts = [
  {
    id: 'read',
    title: 'Read your data',
    level: 'First steps',
    goal: 'Report pages on semantic models and a lakehouse: data the app reads but doesn\'t own.',
    chapters: ['model-app', 'two-models', 'lakehouse'],
  },
  {
    id: 'store',
    title: 'Store and protect data',
    level: 'Building on it',
    goal: 'Data the app keeps itself, who may see and change it, and changes someone approves.',
    chapters: ['own-data', 'who', 'approvals'],
  },
  {
    id: 'further',
    title: 'Extend and ship',
    level: 'Going further',
    goal: 'Files, questions in plain words, and shipping the app to other people.',
    chapters: ['files', 'ask', 'ship'],
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
        step: 5,
      },
      {
        q: 'Why does the client check `VITE_RAYFIN_API_URL` before using it?',
        options: ['Its type says it may be missing, and the client needs text', 'It is secret, and must be hidden first', 'The model rejects queries without it'],
        answer: 0,
        why: 'The template declares it as `string | undefined`. After the check, TypeScript knows it is text.',
        lesson: 'client',
        step: 6,
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
        step: 2,
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
        step: 10,
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
        step: 10,
      },
      {
        q: 'An agent\'s query defines its own margin formula, and the model already has `[Margin %]`. What do you do?',
        options: ['Keep both, to compare', 'Use the model\'s measure', 'Copy the formula into every page'],
        answer: 1,
        why: 'One formula, in the model, shared by every report and app. A copy can drift without any error.',
        lesson: 'review',
        step: 14,
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
  // ================================================================== Chapter 2: Two semantic models
  {
    id: 'two-models',
    title: 'Two models in one app',
    goal: 'Add a second semantic model, register it in the client, and ask both from one page.',
    lessons: ['second-model', 'second-client', 'two-models-page'],
    check: [
      {
        q: '`contoso` exists, and we run `connector add … --name Contoso` for another model. What happens?',
        options: ['A second connector, `Contoso`, next to `contoso`', 'The CLI says it already exists as `contoso`, and offers to overwrite it', 'A red line in `rayfin.yml`'],
        answer: 1,
        why: 'Names ignore case, so `Contoso` is the same connector. A yes would point `contoso` at the other model.',
        lesson: 'second-model',
        step: 1,
      },
      {
        q: '`pareto` is in the schema type and in `configs`, but not in `runtime`. What do we see?',
        options: ['A red line under `runtime`', 'An error panel with the model\'s message', 'An empty headline, with no error at all'],
        answer: 2,
        why: 'Without its runtime, `executeQuery` returns the raw payload, with no `status: \'success\'` or `\'error\'` to read, and TypeScript doesn\'t check `runtime`.',
        lesson: 'second-client',
        step: 8,
      },
      {
        q: 'The Pareto query is sent with `runDax` instead of `runPareto`. What reports it?',
        options: ['The contoso model, when the query runs', 'TypeScript, with a red line', 'Nothing: the client picks the right model'],
        answer: 0,
        why: 'Both runners have the same type and the DAX is text, so only the model can see that it lacks those measures.',
        lesson: 'two-models-page',
        step: 7,
      },
      {
        q: 'Two models both have `[Revenue]`, and the numbers match today. When is it the same measure?',
        options: ['When the names match', 'When the formula, the data, the refresh and the roles match', 'When the numbers have matched for a year'],
        answer: 1,
        why: 'Same name isn\'t proof of same meaning, and matching numbers can be luck. Check the definitions where the models are built.',
        lesson: 'two-models-page',
        step: 13,
      },
    ],
  },
  // ================================================================== Chapter 3: Read a lakehouse
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
        step: 5,
      },
      {
        q: 'Both tables have a `storeKey` column. Does the generated `Sales` get a relationship to `Store`?',
        options: ['Yes: matching column names make one', 'Yes, once both entities are in `schema.ts`', 'No: relationships come only from foreign keys in the metadata'],
        answer: 2,
        why: 'The metadata has no foreign keys, so there is no relationship. To combine the tables, the app joins them itself.',
        lesson: 'lakehouse-entities',
        step: 7,
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
  // ================================================================== Chapter 4: Store your own data
  {
    id: 'data-model',
    title: 'Model it',
    goal: 'Turn on the app\'s own database, model a sales target, and apply it.',
    lessons: ['data-service', 'sales-target', 'register-apply'],
    check: [
      {
        q: 'An entity has no permission decorator. Who can change its rows?',
        options: ['Nobody, until one is added', 'Any signed-in person', 'Only the owner of the app'],
        answer: 1,
        why: 'An entity without a permission decorator silently gets full create, read, update and delete for every signed-in person. Always write one.',
        lesson: 'sales-target',
        step: 6,
      },
      {
        q: '`db apply` reports success, then every read says "Internal server error". What do you check first?',
        options: ['A `@text()` with no `max`', 'The connector\'s `auth`', 'The `.js` in the imports'],
        answer: 0,
        why: 'Text with no `max` becomes `NVARCHAR(MAX)`, which can break the data API\'s schema after an apply that succeeded. Add `max`, then apply with `--force`.',
        lesson: 'register-apply',
        step: 7,
      },
      {
        q: 'A new entity is in the `schema` array but not in `AppSchema`. What happens?',
        options: ['Nothing: one list is enough', 'The table is never created', 'The table is created, but the client has no typed entity for it'],
        answer: 2,
        why: 'Rayfin\'s docs ask for both lists. The type is what the client knows: without it there is no `rayfinClient.data.NewEntity`, so its uses get red lines. (The 2.0 CLI applies every exported entity under `rayfin/data/` anyway.)',
        lesson: 'register-apply',
        step: 2,
      },
    ],
  },
  {
    id: 'data-use',
    title: 'Use it',
    goal: 'Read and write the app\'s own data from a page, and change the model safely.',
    lessons: ['read-write', 'change-model'],
    check: [
      {
        q: 'A read selects `[\'id\', \'country\']`, and the page reads `t.amount`. What happens?',
        options: ['`undefined` on the page', 'An error from the database', 'A red line'],
        answer: 2,
        why: 'A result has only the fields it selects, and TypeScript knows it, so reading another one is a red line.',
        lesson: 'read-write',
        step: 10,
      },
      {
        q: 'A field is marked `?`, with no `optional: true`. Is its database column nullable?',
        options: ['No: the column stays required', 'Yes: `?` is enough', 'Only after `--force`'],
        answer: 0,
        why: '`?` changes only TypeScript. The column is nullable only with `{ optional: true }` in the decorator; Rayfin\'s docs ask for both.',
        lesson: 'change-model',
        step: 2,
      },
      {
        q: '`amount` is renamed to `targetAmount`, then `db apply` runs. What does the playground do?',
        options: ['It renames the column and keeps the amounts', 'It stops: dropping `amount` is potentially destructive', 'Nothing until `npx rayfin up`'],
        answer: 1,
        why: 'The property names the column, so a rename is a dropped column and a new one, and the amounts would be lost. Don\'t add `--force`: keep the column with `column: \'amount\'`, or plan the rename.',
        lesson: 'change-model',
        step: 6,
      },
    ],
  },
  // ================================================================== Chapter 5: Who is using it
  {
    id: 'who-signin',
    title: 'Sign-in and claims',
    goal: 'Show who is signed in, keep each person\'s rows to themselves, and know whose identity each call uses.',
    lessons: ['signed-in-as', 'my-rows', 'two-identities'],
    check: [
      {
        q: 'Someone else signs in, and the page still shows the first person. Why?',
        options: ['The page read the session once, and nothing told it to draw again', 'The new person has no claims yet', 'Sessions only change after a reload'],
        answer: 0,
        why: '`getSession()` is read when the page draws. `useSession()` keeps it in state and redraws on each `onSessionChange`.',
        lesson: 'signed-in-as',
        step: 5,
      },
      {
        q: 'A policy compares `claims.sub` with `item.owner_id`, and the code stores the email in `owner_id`. What happens?',
        options: ['A red line under `owner_id`', 'Nobody can change those rows', 'The email is matched too'],
        answer: 1,
        why: 'Two pieces of text that never match, and no warning: store `session.user.id`, the value policies see as `claims.sub`.',
        lesson: 'my-rows',
        step: 12,
      },
      {
        q: 'A function reads targets with `ctx.getDataClient()`, then calls Fabric with `ctx.Tokens.Fabric`. Who does each run as?',
        options: ['The caller, twice', 'The owner of the app item, twice', 'The caller, then the owner of the app item'],
        answer: 2,
        why: 'The app\'s own data runs as the person who called; function tokens belong to the app identity, the owner of the Fabric app item.',
        lesson: 'two-identities',
        step: 4,
      },
    ],
  },
  {
    id: 'who-roles',
    title: 'Roles from the business',
    goal: 'Add business roles at sign-in with dynamic claims, and scope rows by them.',
    lessons: ['business-roles', 'country-targets'],
    check: [
      {
        q: 'Why can\'t the claims function return a claim named `role`?',
        options: ['Claims must be booleans', 'Only Microsoft Entra ID sets claims', 'It\'s a name reserved by the platform'],
        answer: 2,
        why: 'The reserved names include `sub`, `email`, `role`, `name` and `scope`. Business roles get names of their own, such as `salesRole`.',
        lesson: 'business-roles',
        step: 6,
      },
      {
        q: 'The read rule is only `claims.country.eq(item.country)`, and Bob\'s country claim is `All`. What does Bob see?',
        options: ['Every target', 'No targets', 'Only targets for "All"'],
        answer: 1,
        why: 'No row has the country `All`. The director needs a rule of his own: `.or(claims.salesRole.eq(\'director\'))`.',
        lesson: 'country-targets',
        step: 10,
      },
      {
        q: '**Add** is hidden from country managers, and `SalesTarget` lets every signed-in person create (`@authenticated([\'read\', \'create\'])`, no policy). What can Alice do?',
        options: ['Create a target anyway, from outside the page', 'Nothing: the button is gone', 'Only read'],
        answer: 0,
        why: 'The data API, not the page, decides. A hidden button is a hint; the policy on the server is the security.',
        lesson: 'country-targets',
        step: 15,
      },
    ],
  },
];
