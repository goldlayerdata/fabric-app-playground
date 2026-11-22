// The first three visuals of the Visuals page (Bar chart, Slicer, Key influencers) and the pieces every page shares,
// in Power BI terms: the three jobs (fields, format, interactions), the "What it takes" items, and the developer
// notes. Package claims cite the installed package file they were read from. The other pages: visuals-gallery.tsx.
import type { ReactNode } from 'react';

export type Mark = 'pbi' | 'pkg' | 'you' | 'no' | 'unchecked';

export const MARK_LABEL: Record<Mark, string> = {
  pbi: 'done for you',
  pkg: 'done for you',
  you: 'you write',
  no: 'not possible',
  unchecked: 'not checked',
};

/** The item's name in the two short lists, in plain words. A ScoreItem's `plain` overrides it. */
export const PLAIN: Record<string, string> = {
  'Data query': 'the query',
  'Shaping the rows': 'column names and formats',
  'Drawing': 'drawing it',
  'Tooltip': 'tooltip',
  'Number formatting': 'number formats',
  'Sort': 'sorting',
  'Selection and cross-filter': 'filtering other visuals on a click',
  'Keyboard and screen reader': 'keyboard and screen reader',
  'Theme and dark mode': 'theme and dark mode',
  'Export': 'export',
  '"Show as table"': 'show as table',
};

/** Which lines of a file a card shows, and short notes beside them in Power BI terms. */
export interface Excerpt {
  path: string; // under src/app
  whole?: boolean; // show the whole file (short files)
  find?: string[]; // lines containing one of these
  block?: string[]; // whole blocks starting at a line containing one of these
  notes?: { at: string; note: string }[]; // gutter note on the first line containing `at`
  simplify?: (text: string) => string | null; // card shows a simplified version (null: couldn't)
}
export interface Job {
  pbi: string; // "Fields"
  app: string; // "DAX query"
  text: ReactNode;
  excerpts: Excerpt[];
  after?: ReactNode; // one line under the code
}
export interface Side {
  mark: Mark;
  short: string; // at most 12 words
  why?: ReactNode;
  cite?: string[];
}
export interface ScoreItem {
  item: string;
  plain?: string; // this visual's own wording for the short lists
  unlisted?: boolean; // nothing to do on either side: keep it out of the short lists
  pbi: Side;
  app: Side;
}
export interface Well {
  name: string;
  fields: string[];
}
export interface VisualDef {
  id: string;
  name: string;
  group: string;
  blurb: string;
  inPowerBI: string; // headline, Power BI half
  hint?: string; // under the running app
  wells: Well[]; // the field wells of the sketch, top to bottom
  formatWells?: { title: string; wells: Well[] }; // a format-pane setting the visual needs
  appNote?: ReactNode; // one line under the running app
  takesLead?: ReactNode; // the second sentence of "What it takes", when the usual one doesn't fit
  noEquiv?: { why: ReactNode; instead: ReactNode[]; source: ReactNode }; // a page without a running visual
  packages: ReactNode;
  headlineFiles: string[]; // what the page runs for this visual: its queries, spec and components
  extras: { label: string; files: string[] }[]; // what the page runs for the other visual on it
  restNote: string; // what the lines outside the cards are
  pbiText: ReactNode; // what you're looking at, in Power BI terms
  allFiles: string[]; // every file the page needs, for the developer section
  jobs: Job[];
  score: ScoreItem[];
  devNotes: ReactNode[];
}

export const V = 'fabric-visuals/dist/index.js';
export const VD = 'fabric-visuals/dist/index.d.ts';
export const CORE = 'fabric-visuals-core/dist/index.js';
export const DG = 'fabric-datagrid/dist/index.js';
const SL = 'fabric-slicers/dist/index.js';
const SLR = 'fabric-slicers/README.md';
const SKILL = 'rayfin-cli/templates/data-app/.agents/skills/visuals/SKILL.md';
export const LEARN_A11Y = 'learn.microsoft.com/power-bi/create-reports/desktop-accessibility-creating-reports';
const LEARN_KEYS = 'learn.microsoft.com/power-bi/create-reports/desktop-accessibility-keyboard-shortcuts#on-visual';
export const LEARN_SHOW = 'learn.microsoft.com/power-bi/visuals/service-reports-show-data';
const LEARN_EXPORT = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-export-data';
const LEARN_KI = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-influencers';
const LEARN_SLICER = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-slicers#control-which-visuals-a-slicer-affects';
export const LEARN_CONSUME = 'learn.microsoft.com/power-bi/explore-reports/desktop-accessibility-consuming-tools';

// ---------------------------------------------------------------- shared pieces
const CHART = 'components/revenue-by-category-chart.tsx';
const SPEC = 'queries/sales/revenue-by-category.json';
const DAX_ALL = 'queries/sales/revenue-by-category.dax';
const DAX_YEARS = 'queries/sales/revenue-by-category-for-years.dax';
const DAX_CAT_YEAR = 'queries/sales/revenue-by-category-and-year.dax';
const DAX_BY_YEAR = 'queries/sales/sales-by-year.dax';
const FACTORY = 'queries/sales/revenue-by-category.ts';
const FACTORY_CAT_YEAR = 'queries/sales/revenue-by-category-and-year.ts';
const FACTORY_BY_YEAR = 'queries/sales/sales-by-year.ts';
const BARREL = 'queries/sales/index.ts';
const CROSS = 'components/category-cross-filter.tsx';
const SLICER = 'components/year-slicer.tsx';

const specExcerpt: Excerpt = {
  path: SPEC,
  whole: true,
  notes: [
    { at: '"y"', note: '≈ Y-axis: CategoryName (titled Category), sorted by Revenue' },
    { at: '"mark": "bar"', note: '≈ the visual type: bar chart' },
    { at: '"x"', note: '≈ X-axis: Revenue; bars stop 90 px short, for the labels' },
    { at: '"fillOpacity"', note: '≈ how the picked bar stands out' },
    { at: '"labelHorizontal"', note: '≈ Data labels: on' },
  ],
};

export const PBI_QUERY: Side = { mark: 'pbi', short: 'The visual writes the query from its field wells.' };
export const PBI_ROWS: Side = { mark: 'pbi', short: 'Done for you.' };
export const PBI_THEME: Side = { mark: 'pbi', short: 'The report theme; no code.' };
export const PBI_KEYS: Side = {
  mark: 'pbi',
  short: 'Keyboard navigation and screen reader built in.',
  why: <>Learn: "All Power BI visuals support keyboard navigation". Enter or the spacebar selects a data point; Ctrl+Shift+C clears it.</>,
  cite: [LEARN_A11Y, LEARN_KEYS],
};
export const PBI_EXPORT: Side = {
  mark: 'pbi',
  short: 'More options > Export data, where allowed.',
  why: <>.csv in Power BI Desktop; .xlsx as well in the service. Report designers and admins can restrict or turn off exporting.</>,
  cite: [LEARN_EXPORT],
};

export const chartTooltip: Side = {
  mark: 'pkg',
  short: 'On by default, formatted like the axis.',
  why: (
    <>
      The base theme turns tooltips on for every mark (<code>mark: {'{ tooltip: true }'}</code>) and <code>VegaVisual</code>{' '}
      attaches vega-tooltip. Vega-Lite's default tooltip takes the axis format, so it shows $22,474,278. That works because{' '}
      <code>x</code> sits inside the bar layer: the package formats encodings inside <code>layer</code> entries only, so with{' '}
      <code>x</code> in a shared encoding beside the layers, axis and tooltip both stay unformatted.
    </>
  ),
  cite: [`${V}:1259-1261`, `${V}:1785-1799`, `${V}:126-133`],
};
export const chartFormat: Side = {
  mark: 'pkg',
  short: 'Your column format reaches axis, labels, tooltip and table.',
  why: (
    <>
      You write the format once, in the column list: <code>$#,0</code>, the <code>formatString</code> of the Revenue
      measure in both models' TMDL (<code>_Measures.tmdl</code> in gold-layer-data-contoso-measures,{' '}
      <code>sales.tmdl</code> in gold-layer-data-visuals). The skill suggests <code>$#,0.00</code> for currency; the
      model's format wins here on purpose. The package applies it through
      numfmt to axis labels, data labels and tooltips, and the grid uses it for cells. One gap: the skill says{' '}
      <code>displayName</code> becomes the axis title, but 1.0.0's chart never reads it, so the spec writes{' '}
      <code>title</code>. A compact axis ($70M) is possible: give the axis its own <code>format</code> and{' '}
      <code>formatType</code>, which the package then leaves alone. Not done here: Vega-Lite's default tooltip takes the
      axis format, so tooltips would turn compact too unless you also write a tooltip encoding, and the skill says not
      to put formats in specs.
    </>
  ),
  cite: [`${V}:119-188`, `${V}:266-277`, `${CORE}:300`, `${DG}:1749`],
};
export const chartKeys: Side = {
  mark: 'you',
  short: 'Chart: mouse only. Screen readers get formatted bar labels.',
  why: (
    <>
      1.0.0 listens for mouse clicks only (no bar takes keyboard focus; checked in the page). Vega, not the Fabric package,
      writes a label on each bar for screen readers, such as "Revenue: $22,474,278; Category: Cell phones". Keyboard
      access is yours. 5.4.0 adds Enter and Space (read from the npm tarball).
    </>
  ),
  cite: [`${V}:1803-1809`],
};
export const chartTheme: Side = {
  mark: 'pkg',
  short: 'Follows your CSS colours and dark mode.',
  why: (
    <>
      <code>useCssTheme()</code> reads the page's <code>--color-*</code> variables and redraws when the <code>dark</code>{' '}
      class on <code>&lt;html&gt;</code> changes. You set the variables (the template's <code>global.css</code> has them).
      Try the theme switch on the app side.
    </>
  ),
  cite: [`${V}:1873-1926`, `${CORE}:598-624`, `${V}:1512-1581`],
};
export const chartExport: Side = {
  mark: 'you',
  short: 'Not built in. The table copies cells with Ctrl+C.',
  why: (
    <>
      No export in 1.0.0. A <code>ref</code> on <code>VegaVisual</code> gives you the Vega <code>View</code>, from which you
      could write an image or CSV download. The <code>DataGrid</code> copies selected cells as tab-separated text.
    </>
  ),
  cite: [`${VD} (VegaVisualHandle)`, `${DG}:1566-1586`],
};
export const chartShowTable: Side = {
  mark: 'you',
  short: 'Not built in; add a DataGrid yourself.',
  why: <>Not in 1.0.0. Render a <code>DataGrid</code> from the same <code>DataTable</code>. 5.4.0 adds a built-in "Show as table" action (read from the npm tarball).</>,
};

/** The card's version of the bar handler: the running file's handler without the quirk lines. */
function simpleBarHandler(text: string): string | null {
  const toggle = '      setCategory((current) => (current === value ? undefined : value));';
  if (!text.includes(toggle)) return null;
  return text
    .split('\n')
    .filter((l) => !/^\s*\/\/ (The chart is rebuilt|A second click)/.test(l))
    .join('\n')
    .replace(toggle, '      setCategory(value);');
}

export const QUIRK_NOTE = (
  <>
    The handler on the card is simplified. The running file differs in one line: a second click on the same bar should clear
    the filter, but the chart is rebuilt when its highlight changes and forgets which bar it reported, so it reports{' '}
    <code>select</code> again. The running code therefore toggles:{' '}
    <code>setCategory((current) =&gt; (current === value ? undefined : value))</code>, plus a two-line comment.
  </>
);

// ---------------------------------------------------------------- the visuals
export const FIRST_VISUALS: VisualDef[] = [
  {
    id: 'bar',
    name: 'Bar chart',
    group: 'Charts',
    blurb: 'Revenue by category. A click filters the table.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a bar: the table shows that category, year by year. Click it again to clear.',
    pbiText: <>A clustered bar chart: CategoryName in the Y-axis well, Revenue in the X-axis well, sorted by Revenue. On a report page, a click on a bar filters or highlights the other visuals, and Edit interactions decides which. The app side builds the same chart, plus a table for the click to filter.</>,
    wells: [{ name: 'Y-axis', fields: ['CategoryName'] }, { name: 'X-axis', fields: ['Revenue'] }],
    packages: <>@microsoft/fabric-visuals 1.0.0 (VegaVisual) and @microsoft/fabric-datagrid 1.0.0 (DataGrid), the versions Rayfin 2.0's data-app template pins.</>,
    headlineFiles: [DAX_ALL, SPEC, CHART],
    extras: [{ label: 'for the table it filters', files: [DAX_CAT_YEAR, CROSS] }],
    restNote: 'the lines that bring in the packages, sending the queries, the loading and error messages, picking the table rows, and layout',
    allFiles: [CROSS, CHART, SPEC, DAX_ALL, DAX_CAT_YEAR, DAX_YEARS, FACTORY, FACTORY_CAT_YEAR, BARREL],
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop CategoryName on the Y-axis and Revenue on the X-axis. In an app you write that as a DAX query. The table needs one more: revenue by category and year.</>,
        excerpts: [
          {
            path: DAX_ALL,
            whole: true,
            notes: [
              { at: "'product'[CategoryName]", note: '≈ Y-axis well: CategoryName' },
              { at: '"Revenue", [Revenue]', note: '≈ X-axis well: Revenue' },
              { at: 'ORDER BY', note: '≈ Sort by Revenue, descending' },
            ],
          },
          {
            path: DAX_CAT_YEAR,
            whole: true,
            notes: [{ at: "'date'[Year]", note: '≈ a second field: Year, for the table' }],
          },
        ],
      },
      {
        pbi: 'Format pane',
        app: 'chart spec',
        text: <>Bars, data labels, sort and axis titles: in an app they are settings in one small file, called a chart spec.</>,
        excerpts: [specExcerpt],
        after: <>A small component hands this spec and the data to <code>VegaVisual</code>; its lines are in the headline count.</>,
      },
      {
        pbi: 'Interactions',
        app: 'click handler',
        text: <>Power BI filters the other visuals for you. In an app the chart tells you which bar was clicked, and you filter the table.</>,
        excerpts: [
          {
            path: CROSS,
            block: ['function handleBarInteraction'],
            simplify: simpleBarHandler,
            notes: [
              { at: 'function handleBarInteraction', note: '≈ Edit interactions: Filter' },
              { at: 'event.action === "clear"', note: '≈ click on empty space: clear' },
              { at: 'const picked', note: '≈ which bar was clicked' },
              { at: 'setCategory(value)', note: '≈ the table and the bars follow that category' },
            ],
          },
        ],
        after: <>The running file changes one line of this, for a package quirk; see <b>For developers</b>. The whole component is one click away.</>,
      },
    ],
    score: [
      { item: 'Data query', pbi: PBI_QUERY, app: { mark: 'you', short: 'A DAX query per visual, in a .dax file.', why: <>The template's <code>useSemanticModelQuery</code> sends it.</> } },
      { item: 'Shaping the rows', pbi: PBI_ROWS, app: { mark: 'you', short: 'Name each column and its format; the template joins rows.', why: <>A <code>columnMetadata</code> list per query (in the small <code>.ts</code> query file); the template's <code>toDataTable</code> joins it to the rows.</> } },
      { item: 'Drawing', pbi: { mark: 'pbi', short: 'Pick the visual, drop the fields.' }, app: { mark: 'pkg', short: 'VegaVisual draws your spec.', why: <><code>VegaVisual</code> compiles the Vega-Lite spec, adds the data, applies its base theme and redraws on resize. Labels that would run past the edge are cut to "…", so the spec stops the bars 90 px short of the edge to leave room for the longest label.</>, cite: [`${V}:1592-1631`, `${V}:1758-1836`, `${V}:359-393`] } },
      { item: 'Tooltip', pbi: { mark: 'pbi', short: 'On by default.' }, app: chartTooltip },
      { item: 'Number formatting', pbi: { mark: 'pbi', short: 'Format strings from the model apply.' }, app: chartFormat },
      { item: 'Sort', pbi: { mark: 'pbi', short: 'Sort axis in More options; viewers can change it.' }, app: { mark: 'you', short: 'One line in the spec, plus ORDER BY.', why: <><code>"sort": "-x"</code> in the spec. Viewers get no sort menu on the chart; the <code>DataGrid</code> sorts on a header click.</>, cite: [`${DG}:752-770`] } },
      { item: 'Selection and cross-filter', plain: 'filtering the table on a click', pbi: { mark: 'pbi', short: 'A click filters or highlights the other visuals.' }, app: { mark: 'you', short: 'The chart reports the click; you filter the table.', why: <>The package sends <code>select</code> with the bar's fields, or <code>clear</code>. Filtering the table and dimming the other bars are yours.</>, cite: [`${V}:20-58`, `${V}:1803-1809`] } },
      { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: chartKeys },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: chartTheme },
      { item: 'Export', pbi: PBI_EXPORT, app: chartExport },
      { item: '"Show as table"', pbi: { mark: 'pbi', short: 'More options > Show as a table.', why: <>Alt+Shift+F11 opens a table a screen reader can read.</>, cite: [LEARN_SHOW, LEARN_A11Y] }, app: chartShowTable },
    ],
    devNotes: [
      QUIRK_NOTE,
      <>Against 5.4.0 the handler doesn't compile: <code>p.name</code> is now <code>p.fieldId</code>. Renaming alone isn't enough: values are now <code>{'{ kind, value }'}</code>, so <code>String(picked.values[0])</code> would give "[object Object]". A version that reads <code>.value</code> compiles against 5.4.0 (checked).</>,
    ],
  },
  {
    id: 'slicer',
    name: 'Slicer',
    group: 'Slicers and buttons',
    blurb: 'A year dropdown that filters the bar chart.',
    inPowerBI: 'drop 1 field, pick the Dropdown style',
    hint: 'Open the Year dropdown and untick years: the chart reloads for those years.',
    pbiText: <>A slicer on Year, in Dropdown style. It filters every visual on the report page by default; Edit interactions can change that. On the app side it filters the bar chart from the Bar chart page.</>,
    wells: [{ name: 'Field', fields: ['Year'] }],
    formatWells: { title: 'Format · Slicer settings', wells: [{ name: 'Style', fields: ['Dropdown'] }] },
    appNote: <>Extra package, not in Rayfin's template. Details in For developers.</>,
    packages: (
      <>
        @microsoft/fabric-slicers 4.4.0 (DropdownSlicer) with @microsoft/fabric-visuals 1.0.0. The slicer package is{' '}
        <b>not in Rayfin's template or its visuals skill</b>; the skill says to ask the user before using another library. 4.4.0
        is the latest on npm; no slicer release matches the template's 1.0.0 family.
      </>
    ),
    headlineFiles: [DAX_BY_YEAR, DAX_YEARS, SLICER],
    extras: [{ label: "for the chart it filters (the Bar chart page's chart)", files: [DAX_ALL, SPEC, CHART] }],
    restNote: 'the chart it filters (shown on the Bar chart page), the lines that bring in the packages, sending the query, the loading and error messages, and layout',
    allFiles: [SLICER, CHART, SPEC, DAX_BY_YEAR, DAX_ALL, DAX_YEARS, FACTORY, FACTORY_BY_YEAR, BARREL],
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI the slicer's field is Year. In an app you write a query for the years, and a version of the chart query that takes the picked years.</>,
        excerpts: [
          {
            path: DAX_BY_YEAR,
            whole: true,
            notes: [
              { at: "'date'[Year]", note: "≈ the slicer's Field well: Year" },
              { at: '"Revenue", [Revenue]', note: 'extra column, ignored' },
              { at: '"Orders", [# Orders]', note: 'extra column, ignored' },
            ],
          },
          {
            path: DAX_YEARS,
            whole: true,
            notes: [{ at: 'TREATAS', note: '≈ the filter the slicer applies to the chart' }],
          },
        ],
      },
      {
        pbi: 'Format pane',
        app: 'slicer settings',
        text: <>Slicer settings, Style: Dropdown. In an app that is a ready-made dropdown slicer from Microsoft's slicer package, set up in two lines. The chart is the one from the Bar chart page.</>,
        excerpts: [
          {
            path: SLICER,
            find: ['<DropdownSlicer data', 'onInteraction={handleSlicerInteraction}'],
            notes: [
              { at: '<DropdownSlicer data', note: '≈ Style: Dropdown, header: Year' },
              { at: 'onInteraction={handleSlicerInteraction}', note: '≈ tells you which years are picked' },
            ],
          },
        ],
      },
      {
        pbi: 'Interactions',
        app: 'change handler',
        text: <>A Power BI slicer filters the page by default. In an app the slicer tells you which years are picked, and you pass them to the chart's query.</>,
        excerpts: [
          {
            path: SLICER,
            block: ['function handleSlicerInteraction'],
            notes: [
              { at: 'function handleSlicerInteraction', note: '≈ the slicer filters this page' },
              { at: 'event.action === "clear"', note: '≈ Clear, or all years ticked' },
              { at: '.find((p) => p.fieldId', note: '≈ which years are ticked' },
              { at: 'setYears(picked', note: '≈ the chart reloads for those years' },
            ],
          },
        ],
      },
    ],
    score: [
      { item: 'Data query', pbi: { mark: 'pbi', short: 'The slicer queries its field.' }, app: { mark: 'you', short: 'Two queries: the years, and the chart for those years.', why: <>The years here are years <i>with sales</i>. A Power BI slicer on <code>'date'[Year]</code> lists every year in the Date table; whether that differs was not checked.</> } },
      { item: 'Shaping the rows', plain: 'column names', pbi: PBI_ROWS, app: { mark: 'you', short: 'Name the columns; the template joins rows.' } },
      { item: 'Drawing', pbi: { mark: 'pbi', short: 'Pick the slicer, set Style to Dropdown.' }, app: { mark: 'pkg', short: 'DropdownSlicer draws it: two lines of JSX.', why: <>It draws the summary button ("All", the picked years, or "3 of 4") and a searchable checklist. Outside Rayfin's template and skill; see For developers.</>, cite: [`${SLR} (Dropdown slicer)`, `${SL}:872`] } },
      { item: 'Tooltip', plain: "the chart's tooltip", pbi: { mark: 'pbi', short: "The chart's tooltip; a slicer has none." }, app: { ...chartTooltip, short: "The chart's tooltip, formatted; the slicer has none." } },
      { item: 'Number formatting', pbi: { mark: 'pbi', short: 'Format strings from the model apply.' }, app: { mark: 'pkg', short: 'Column formats apply; years stay plain.', why: <>README: "Table column formats apply to displayed values". Years get no format, as the skill's rules say. Not exercised here, since Year has no format.</>, cite: [`${SLR} (Public API)`] } },
      { item: 'Sort', plain: 'the order of the years', pbi: { mark: 'pbi', short: 'The slicer lists values in ascending order.' }, app: { mark: 'you', short: 'ORDER BY in the query; the slicer keeps that order.', why: <>The slicer's code sorts nothing but indices, and compares dates, so the order comes from <code>ORDER BY 'date'[Year]</code>.</>, cite: [`${SL}:241`, `${SL}:1241-1253`] } },
      { item: 'Selection and cross-filter', plain: 'filtering the chart', pbi: { mark: 'pbi', short: 'Filters every visual on the page by default.', why: <>Learn: "By default, slicers filter all other visuals on the report page, including other slicers." Edit interactions can set a visual to None, so the slicer skips it.</>, cite: [LEARN_SLICER] }, app: { mark: 'you', short: 'The slicer reports years; you re-query the chart.', why: <>Its events have a newer shape than the chart's (see For developers).</>, cite: [`${SL}:118`, `${SL}:170`, `${SLR} (Interactions)`] } },
      { item: 'Keyboard and screen reader', plain: 'keyboard and screen reader for the slicer', pbi: PBI_KEYS, app: { mark: 'pkg', short: 'Slicer: arrows, Space, Enter. The chart: mouse only.', why: <>Checked in the page: Enter opens it, Tab and the arrow keys move, Space ticks a year. ARIA labels on the list and its rows. The chart it filters has no keyboard access in 1.0.0.</>, cite: [`${SLR} (Keyboard navigation)`, `${SL}:600-622`, `${SL}:734-783`] } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'Pass the same theme to slicer and chart.', cite: [...(chartTheme.cite ?? []), `${SLR} (Theming)`] } },
      { item: 'Export', plain: 'export from the chart', pbi: { ...PBI_EXPORT, short: "The chart's Export data; a slicer has none." }, app: { ...chartExport, short: 'Chart: not built in. Slicer: nothing to export.' } },
      { item: '"Show as table"', plain: 'showing the chart as a table', pbi: { mark: 'pbi', short: "The chart's Show as a table; not for slicers.", why: <>Learn: the "Show visuals as tables" view doesn't apply to slicers.</>, cite: [LEARN_CONSUME] }, app: { ...chartShowTable, short: 'Chart: add a DataGrid yourself.' } },
    ],
    devNotes: [
      <>Not in the template, not in the skill. Rayfin's visuals skill names only <code>VegaVisual</code> and <code>DataGrid</code>; its custom-visuals rule says to ask the user before using another library. The only other options in the skill: a VegaVisual-drawn control, or plain React.</>,
      <>fabric-slicers 4.4.0 brings its own fabric-visuals-core 5.4.0. Its events use <code>fieldId</code> and <code>{'{ kind, value }'}</code> values; the 1.0.0 chart's use <code>name</code> and plain values. So the slicer's handler takes its event type from the slicer's own props (the <code>SlicerEvents</code> line).</>,
      <>Version history: fabric-slicers starts at 3.0.1 (core 4.3.0). In 3.0.1 only the range slicer sends events, so a list or dropdown can't filter anything.</>,
      <>Two or three ticked years: no saved answer exists for that query, so the numbers are the sum of the saved per-year answers, marked "derived" under Where the numbers come from, below. One year or all years: saved answers.</>,
    ],
  },
  {
    id: 'key-influencers',
    name: 'Key influencers',
    group: 'AI and maps',
    blurb: 'No drop-in equivalent: Power BI runs an analysis behind it.',
    inPowerBI: 'drop 5 fields in 3 wells',
    wells: [{ name: 'Analyze', fields: ['Revenue'] }, { name: 'Explain by', fields: ['Gender', 'Continent', 'Age'] }, { name: 'Expand by', fields: ['CustomerKey'] }],
    takesLead: <>In an app, one part is not possible with Microsoft's packages. For a chart of results you work out yourself, the packages do some of it, and you write the rest.</>,
    noEquiv: {
      why: <>Key influencers runs an analysis for you: regressions that find which factors move the metric, and a decision tree that finds segments. The Fabric visuals packages draw charts and tables; none of them runs an analysis. So there is nothing honest to show here, and this page doesn't fake it.</>,
      instead: [
        <><b>Run the analysis ahead of time.</b> In a Fabric notebook, fit a regression (in Python, for example) on one row per customer, and save the results to a lakehouse table: factor, value, effect. The app reads that table and draws an ordinary bar chart, like the Bar chart page.</>,
        <><b>Or run it on demand</b> in a server-side function the app calls. The data-app template includes a package for calling your app's own server functions (<code>@microsoft/rayfin-functions</code>); a Fabric user data function is another option. Whether either can load the libraries a regression needs is still an open question.</>,
        <><b>Not the same thing:</b> a DAX query comparing average revenue per customer by gender or continent is easy to draw, but it is a difference of averages, with no regression and no significance test. Label it that way.</>,
      ],
      source: <>How Power BI does it: Microsoft Learn, "Create key influencers visualizations".</>,
    },
    packages: <>None. No Fabric visuals package runs this analysis.</>,
    pbiText: <>Key influencers with Revenue in Analyze; Gender, Continent and Age in Explain by; and CustomerKey in Expand by, so the analysis runs per customer. Power BI runs the analysis and draws its result.</>,
    headlineFiles: [],
    extras: [],
    restNote: '',
    allFiles: [],
    jobs: [],
    score: [
      { item: 'Data query', plain: 'a query with one row per customer', pbi: { mark: 'pbi', short: 'Queries one row per customer (Expand by).' }, app: { mark: 'you', short: 'A row-level query: one row per customer.', why: <>No saved answer, so this page shows no numbers.</> } },
      { item: 'Shaping the rows', plain: 'preparing the data for the analysis', pbi: PBI_ROWS, app: { mark: 'you', short: 'Prepare the analysis input yourself.' } },
      { item: 'Drawing', plain: 'running the analysis', pbi: { mark: 'pbi', short: 'Runs the analysis, then draws the influencers.', why: <>ML.NET: logistic regression for a categorical target, linear regression for a number, a Wald test at p 0.05, and a decision tree for Top segments, on a sample of 10,000 data points.</>, cite: [LEARN_KI] }, app: { mark: 'no', short: 'No package runs the analysis.', why: <>The 1.0.0 packages draw (VegaVisual, DataGrid) and reshape data (filter, group, aggregate). Results made elsewhere are an ordinary bar chart.</>, cite: ['fabric-visuals-core/dist/index.d.ts (exports)', VD] } },
      { item: 'Tooltip', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: { ...chartTooltip, short: 'Your results chart: as on the Bar chart page.' } },
      { item: 'Number formatting', pbi: { mark: 'pbi', short: 'Shows effects as amounts, such as $158.49K.', why: <>For a number, the bubble shows the difference as an amount: Learn's example says houses with excellent kitchens cost $158.49K more on average.</>, cite: [LEARN_KI] }, app: { ...chartFormat, short: 'Your results chart: as on the Bar chart page.' } },
      { item: 'Sort', plain: 'ranking the results', pbi: { mark: 'pbi', short: 'Influencers are ranked for you.' }, app: { mark: 'you', short: 'Rank your results yourself.' } },
      { item: 'Selection and cross-filter', plain: 'rerunning the analysis when a filter changes', pbi: { mark: 'pbi', short: 'Reruns its analysis when you slice or filter.', why: <>Learn, "Interact with other visuals": every slicer, filter or visual selection reruns the analysis on that part of the data. Outgoing clicks were not checked.</>, cite: [`${LEARN_KI}#interact-with-other-visuals`] }, app: { mark: 'you', short: 'Re-run the analysis per filter, or filter its results.' } },
      { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: { ...chartKeys, short: 'Your results chart: mouse only.' } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'Your results chart: as on the Bar chart page.' } },
      { item: 'Export', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: { ...chartExport, short: 'Export your results table from where it lives.' } },
      { item: '"Show as table"', pbi: { mark: 'unchecked', short: 'Not in the all-visuals table view.', why: <>Learn: the "Show visuals as tables" view doesn't apply to Key influencers. The per-visual "Show as a table" was not checked.</>, cite: [LEARN_CONSUME] }, app: { ...chartShowTable, short: 'A DataGrid of your results.' } },
    ],
    devNotes: [],
  },
];

/** Skill and README statements that don't match the 1.0.0 packages (Notes page). */
export const MISMATCHES: { text: ReactNode; cite: string[] }[] = [
  { text: <>The skill says <code>displayName</code> becomes axis titles and tooltip labels. <code>VegaVisual</code> 1.0.0 never reads <code>displayName</code> (the grid does), so a spec sets <code>title</code>.</>, cite: [SKILL, V, `${DG}:1749`] },
  { text: <>The skill says formats reach axes and tooltips automatically. True when <code>x</code> and <code>y</code> sit in each layer's encoding. With the skill's own layered pattern and a shared encoding beside <code>layer</code>, the package formats only the layer encodings, so axis and tooltip stay unformatted.</>, cite: ['skills/visuals/references/formatting.md', 'skills/visuals/references/vega-lite-visual.md', `${V}:126-133`] },
  { text: <>The named-style values in <code>formatting.md</code> differ from the code: labelHorizontal dx 8 (code 6), labelVertical dy -4 (code -6), labelCallout fontSize 32 (code 24), labelSubtitle fontSize 16 and dy 32 (code 14, no dy).</>, cite: ['skills/visuals/references/formatting.md', `${V}:1303-1335`] },
  { text: <>The skill lists a <code>DataGridTheme</code> export and a <code>semanticType</code> column field. Neither exists in 1.0.0.</>, cite: [SKILL, 'fabric-datagrid/dist/index.d.ts', 'fabric-visuals-core/dist/index.d.ts'] },
  { text: <>The skill says the chart palette can't be set from CSS. True in 1.0.0; 5.4.0 reads <code>--color-data-1</code> to <code>--color-data-10</code> (read from the npm tarball).</>, cite: ['skills/visuals/references/formatting.md', 'fabric-visuals-core 5.4.0 dist/index.d.ts (CSS_CATEGORY_PALETTE_VARS)'] },
  { text: <>The fabric-visuals README (not the skill) says <code>config</code> in a spec is ignored. Vega-Lite's compile merges the spec's config over the theme, so it applies.</>, cite: ['fabric-visuals/README.md', 'vega-lite/src/compile/compile.ts:86'] },
  { text: <>Not in the skill: when the spec, data or theme changes, the chart is rebuilt and forgets its selection, so a second click on the same bar arrives as <code>select</code>, not <code>clear</code>.</>, cite: [`${V}:1758-1763`] },
];
