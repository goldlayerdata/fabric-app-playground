// The glossary (Terms tab) and the troubleshooting table (Help tab).
// Lesson text links a term with [[term]] or [[shown text|id]]; tools/check-lessons.mjs checks
// that every link resolves and that each term's lesson exists.
export const terms = [
  { id: 'fabric-app', term: 'Fabric app', means: 'A web app that runs in Fabric and works with Fabric data, such as a semantic model. Its pages are TypeScript code.', pbi: 'Like a report, except the pages, visuals and queries are all code.', lesson: 'tour' },
  { id: 'rayfin', term: 'Rayfin', means: 'Microsoft\'s toolkit for building Fabric apps: a command-line tool, typed in a terminal (`npx rayfin …`), and code packages, the connectors included.', pbi: 'No direct match: it plays the part Power BI Desktop plays for reports.', lesson: 'create' },
  { id: 'component', term: 'Component', means: 'A function that takes props and returns what to draw.', pbi: 'A visual.', lesson: 'component' },
  { id: 'props', term: 'Props', means: 'The values a component is given, written like attributes: `<KpiCard title="Orders" />`.', pbi: 'A visual\'s fields and format settings.', lesson: 'component' },
  { id: 'type', term: 'Type', means: 'The shape of some data: which fields, and what kind each one is (`string`, `number`…).', pbi: 'A table\'s columns and their data types.', lesson: 'types' },
  { id: 'red-line', term: 'Red line (type error)', means: 'TypeScript found a value that breaks a type. Hover over it for the message. The page still runs.', pbi: 'Like a formula bar underlining a mistake, except nothing stops the page.', lesson: 'types' },
  { id: 'query', term: 'Query', means: 'The DAX text a page sends with `executeQuery`.', pbi: 'The DAX query a visual sends to the model, as Performance analyzer shows it.', lesson: 'first-query' },
  { id: 'result', term: 'Result', means: 'What `executeQuery` returns: a `status`, then a `table` (columns and rows) or an `error`.', pbi: 'The table a visual gets back.', lesson: 'first-query' },
  { id: 'status', term: 'status', means: '`\'success\'` or `\'error\'`, on every result. Check it before reading the table.', pbi: 'Whether a visual loaded or shows an error.', lesson: 'failure' },
  { id: 'measure', term: 'Measure', means: 'A formula stored in the model. A query names it, like `[Revenue]`.', pbi: 'The same thing: a model measure.', lesson: 'measure-or-query' },
  { id: 'define-measure', term: 'DEFINE MEASURE', means: 'A measure written inside one query. The model never stores it.', pbi: 'A query-scoped measure, as in DAX query view.', lesson: 'measure-or-query' },
  { id: 'state', term: 'State', means: 'A value the page remembers. Changing it redraws the page.', pbi: 'A slicer selection.', lesson: 'slicer' },
  { id: 'hook', term: 'Hook', means: 'React\'s `use…` functions, such as `useState` and `useEffect`. They go at the top of a component.', pbi: 'No direct match: the plumbing behind a visual.', lesson: 'slicer' },
  { id: 'dependency-list', term: 'Dependency list', means: 'The list at the end of `useEffect` (here, of `useDax`). When something in it changes, the effect runs again.', pbi: 'What makes a visual query again: its filters changing.', lesson: 'redraw-trap' },
  { id: 'lifting-state', term: 'Lifting state up', means: 'Keeping a selection in the component that holds all the visuals, and handing it down to them.', pbi: 'What makes cross-filtering work: the page, not one visual, holds the selection.', lesson: 'cross-filter' },
  { id: 'connector', term: 'Connector', means: 'How a Fabric app reaches existing data in other Fabric items. Added with `npx rayfin connector add`; the page calls it as `rayfinClient.connectors.contoso`.', pbi: 'A connection to a semantic model (or another Fabric item, such as a warehouse).', lesson: 'connector' },
];

export const help = [
  {
    symptom: '"Playground: Not simulated here" in the terminal',
    cause: 'The terminal simulates only the commands this course uses.',
    fix: 'Type `help` for the list, or use **Do it for me** on the step.',
  },
  {
    symptom: 'A red line on an `import` from `@microsoft/…`',
    cause: 'That package isn\'t installed in the project yet.',
    fix: 'Run the `npm install` the lesson (or `connector add`) gives.',
  },
  {
    symptom: '"No page yet" in the preview',
    cause: '`src/App.tsx` is empty, or has no `export default function`.',
    fix: 'Follow the lesson that writes it, or use **Reset** to go back to the lesson\'s start.',
  },
  {
    symptom: '"This query is not in the playground\'s saved results"',
    cause: 'The simulated connector only answers saved queries, word for word. The DAX text was changed.',
    fix: 'Reset, or copy a query from the **Queries** tab.',
  },
  {
    symptom: 'A red line, and "N type errors" under the editor',
    cause: 'TypeScript found something that breaks a type. The page still runs.',
    fix: 'Hover over the red line for the message. A lesson step may expect it: read the step.',
  },
  {
    symptom: '"Stopped: the page sent more than 20 queries…"',
    cause: 'Something runs the query again on every draw (see **The redraw trap**).',
    fix: 'Check the list at the end of `useDax`, then press **Run again**.',
  },
  {
    symptom: 'Every query fails, or "Network down is on"',
    cause: 'The **Queries** tab is still on **Network down**.',
    fix: 'Pick **Answer normally**, then press **Run**.',
  },
  {
    symptom: 'A red box: "The page threw an error"',
    cause: 'The code threw while drawing the page.',
    fix: 'Read the message; Ctrl+Z, or Reset.',
  },
  {
    symptom: '"Your code differs here" on **Do it for me**',
    cause: 'The code around that spot is not what the step expects.',
    fix: 'Make the change by hand, or Reset and use **Do it for me** from the start.',
  },
  {
    symptom: 'My edits are still there after a reload',
    cause: 'Edits and progress are kept in this browser, per lesson.',
    fix: 'Reset brings back the lesson\'s starting code.',
  },
];
