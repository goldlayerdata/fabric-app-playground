// The other pages of the owner's Power BI visual gallery, one variation each, in the same form as the first three.
// Package claims cite the installed package file they were read from; Power BI claims cite Microsoft Learn.
import type { ReactNode } from 'react';
import {
  CORE, DG, NOT_BUILT, V, VD, LEARN_A11Y, LEARN_SHOW, PBI_EXPORT, PBI_KEYS, PBI_QUERY, PBI_ROWS, PBI_THEME,
  chartFormat, chartShowTable, chartTheme,
  type Excerpt, type Job, type ScoreItem, type Side, type VisualDef,
} from './visuals';

const Q = 'queries/sales/';
const C = 'components/';
const BARREL = `${Q}index.ts`;
const VL = 'vega-lite/build/index.js';
const LEARN_GAUGE = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-radial-gauge-charts';
const LEARN_KPI = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-kpi';
const LEARN_FUNNEL = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-funnel-charts';
const LEARN_RIBBON = 'learn.microsoft.com/power-bi/visuals/desktop-ribbon-charts';
const LEARN_WATERFALL = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-waterfall-charts';
const LEARN_TREEMAP = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-treemaps';
const LEARN_MATRIX = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-matrix-visual';
const LEARN_DECOMP = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-decomposition-tree';
const LEARN_MAP = 'learn.microsoft.com/azure/azure-maps/power-bi-visual-get-started';
const LEARN_MAP_ADMIN = 'learn.microsoft.com/azure/azure-maps/power-bi-visual-manage-access';
const LEARN_COMBO = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-combo-chart';
const LEARN_AXES = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-customize-x-axis-and-y-axis';
const LEARN_CARD = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-card';
const LEARN_PIE = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-pie-donut-chart';
const LEARN_GRID_FORMAT = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-matrix-visual-format-settings';
const LEARN_TOOLTIPS = 'learn.microsoft.com/power-bi/visuals/power-bi-visualization-visual-tooltips';

// ---------------------------------------------------------------- shared sides
const APP_QUERY: Side = { mark: 'you', short: 'A DAX query, in a .dax file.', why: <>The template's <code>useSemanticModelQuery</code> sends it.</> };
const APP_ROWS: Side = {
  mark: 'you',
  short: 'Name each column and its format; the template joins rows.',
  why: <>A <code>columnMetadata</code> list per query (in the small <code>.ts</code> query file); the template's <code>toDataTable</code> joins it to the rows.</>,
};
const PBI_DRAW: Side = { mark: 'pbi', short: 'Pick the visual, drop the fields.' };
const DRAW: Side = {
  mark: 'pkg',
  short: 'VegaVisual draws your spec.',
  why: <><code>VegaVisual</code> compiles the Vega-Lite spec, adds the data, applies its base theme and redraws on resize.</>,
  cite: [`${V}:1592-1631`, `${V}:1758-1836`],
};
const PBI_TIP: Side = { mark: 'pbi', short: 'On by default.' };
const TIP_AXIS: Side = {
  mark: 'pkg',
  short: 'On by default, formatted like the axis.',
  why: (
    <>
      The base theme turns tooltips on for every mark (<code>mark: {'{ tooltip: true }'}</code>) and <code>VegaVisual</code>{' '}
      attaches vega-tooltip. Vega-Lite's default tooltip takes the axis format, which the package set from your column
      format. That works because the value axis sits inside each layer's encoding (see the Notes page). Checked in the page.
    </>
  ),
  cite: [`${V}:1259-1261`, `${V}:1785-1799`, `${V}:126-133`],
};
const TIP_LISTED: Side = {
  mark: 'you',
  short: 'You list the tooltip fields; the package formats them.',
  why: (
    <>
      The spec has a <code>tooltip</code> list, and the package gives each listed field its column format. Checked in the
      page: the tooltip shows the name and $-formatted revenue.
    </>
  ),
  cite: [`${V}:189-207`, `${V}:1259-1261`],
};
const PBI_FORMAT: Side = { mark: 'pbi', short: 'Format strings from the model apply.' };
const FORMAT: Side = { ...chartFormat, short: 'Your column format reaches axis, labels and tooltip.' };
const PBI_CLICK: Side = { mark: 'pbi', short: 'A click filters or highlights the other visuals.' };
const APP_CLICK: Side = {
  mark: 'you',
  short: 'The chart reports the click; you decide what to filter.',
  why: (
    <>
      The package sends <code>select</code> with the clicked mark's fields, or <code>clear</code>. This page dims the
      other marks and names the pick. The Bar chart page goes one step further and filters a table with it.
    </>
  ),
  cite: [`${V}:20-58`, `${V}:1803-1809`],
};
const APP_KEYS: Side = {
  mark: 'you',
  short: 'Chart: mouse only.',
  why: (
    <>
      1.0.0 listens for mouse clicks only, and no mark takes keyboard focus. Vega, not the Fabric package, writes a
      label on each mark for screen readers (checked in the page's markup, not with a screen reader). The number in it
      is formatted when the mark sits on a formatted axis, and raw otherwise. 5.4.0 adds Enter and Space (read from
      the npm tarball).
    </>
  ),
  cite: [`${V}:1803-1809`],
};
const APP_EXPORT: Side = {
  mark: 'you',
  short: 'Not built in.',
  why: <>No export in 1.0.0. A <code>ref</code> on <code>VegaVisual</code> gives you the Vega <code>View</code>, from which you could write an image or CSV download.</>,
  cite: [`${VD} (VegaVisualHandle)`],
};
const PBI_SHOW: Side = { mark: 'pbi', short: 'More actions (...) > Show as a table.', why: <>Alt+Shift+F11 opens a table a screen reader can read.</>, cite: [LEARN_SHOW, LEARN_A11Y] };
const PBI_NO_CLICK: Side = { mark: 'pbi', short: 'Slicers and other visuals filter it.', why: <>Whether a click on this visual filters anything else was not checked.</> };
const APP_NO_CLICK: Side = {
  mark: 'you',
  short: 'Pass the filter into its query, as the Slicer page does.',
  why: <>Nothing to write until the page has a filter. Then the query takes it, like the <code>TREATAS</code> line on the Slicer page.</>,
};
const NO_SORT: [Side, Side] = [{ mark: 'pbi', short: 'Nothing to sort: one value.' }, { mark: 'pkg', short: 'Nothing to sort: one value.' }];
/** Why a page shows a different variation from the owner's gallery page. */
const variation = (gallery: string, here: string) => (
  <>The owner's gallery page shows {gallery}. This page shows {here}: no saved answer exists for the gallery's query, and no model was open to capture one.</>
);
const COLOUR_MAP_NOTE = <>The skill asks for a shared colour map (<code>scale.domain</code> and <code>scale.range</code>) when a category appears in more than one visual. This page has one visual, so it uses the theme palette as it comes.</>;
const ZERO_NOTE = <>The skill's default for a value axis is <code>"zero": false</code>, except for bars and columns. This page leaves the axis starting at zero, because its columns or its filled area are measured from zero.</>;
const DETAILS_ITEM = (): ScoreItem => youItem('Details well', 'the Details well (not built here)', 'A Details field splits each slice.', NOT_BUILT, <>The gallery's "With details" variation. Not attempted on this page; that the well splits slices is described from the gallery, not checked on Learn.</>);

/** The eleven items every page lists, with this page's wording where it differs. `extra` goes after Drawing. */
function score(p: {
  query?: Side; pbiQuery?: Side; rows?: Side;
  pbiDraw?: Side; draw?: Side; extra?: ScoreItem[];
  pbiTip?: Side; tip?: Side; pbiFormat?: Side; format?: Side;
  sort: [Side, Side]; sortPlain?: string; noSort?: boolean; tipPlain?: string;
  click?: [Side, Side]; clickPlain?: string;
  keys?: Side; export?: [Side, Side]; show?: [Side, Side];
}): ScoreItem[] {
  return [
    { item: 'Data query', pbi: p.pbiQuery ?? PBI_QUERY, app: p.query ?? APP_QUERY },
    { item: 'Shaping the rows', pbi: PBI_ROWS, app: p.rows ?? APP_ROWS },
    { item: 'Drawing', pbi: p.pbiDraw ?? PBI_DRAW, app: p.draw ?? DRAW },
    ...(p.extra ?? []),
    { item: 'Tooltip', plain: p.tipPlain, pbi: p.pbiTip ?? PBI_TIP, app: p.tip ?? TIP_AXIS },
    { item: 'Number formatting', pbi: p.pbiFormat ?? PBI_FORMAT, app: p.format ?? FORMAT },
    { item: 'Sort', plain: p.sortPlain, unlisted: p.noSort, pbi: p.sort[0], app: p.sort[1] },
    { item: 'Selection and cross-filter', plain: p.clickPlain ?? 'acting on a click', pbi: (p.click ?? [PBI_CLICK, APP_CLICK])[0], app: (p.click ?? [PBI_CLICK, APP_CLICK])[1] },
    { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: p.keys ?? APP_KEYS },
    { item: 'Theme and dark mode', pbi: PBI_THEME, app: chartTheme },
    { item: 'Export', pbi: (p.export ?? [PBI_EXPORT, APP_EXPORT])[0], app: (p.export ?? [PBI_EXPORT, APP_EXPORT])[1] },
    { item: '"Show as table"', pbi: (p.show ?? [PBI_SHOW, chartShowTable])[0], app: (p.show ?? [PBI_SHOW, chartShowTable])[1] },
  ];
}
/** Something Power BI does that this page had to build, or left out. */
const youItem = (item: string, plain: string, pbi: string, app: string, why?: ReactNode, cite?: string[], pbiCite?: string[]): ScoreItem => ({
  item, plain, pbi: { mark: 'pbi', short: pbi, cite: pbiCite }, app: { mark: 'you', short: app, why, cite },
});

const SORT_PBI: Side = { mark: 'pbi', short: 'Sort axis in More options; viewers can change it.' };
const SORT_QUERY: Side = { mark: 'you', short: 'ORDER BY in the query; the spec keeps that order.', why: <>The axis has <code>"sort": null</code>, so the marks keep the order the query returns. Viewers get no sort menu.</> };
const SORT_YEARS: Side = { mark: 'you', short: 'ORDER BY in the query; years also sort by themselves.', why: <>An ordinal axis sorts its values ascending by default. Viewers get no sort menu.</> };

// ---------------------------------------------------------------- shared code pieces
/** The card's version of a click handler: the running file's handler without the quirk lines. */
const simpleHandler = (setter: string) => (text: string): string | null => {
  const toggle = `      ${setter}((current) => (current === value ? undefined : value));`;
  if (!text.includes(toggle)) return null;
  return text
    .split('\n')
    .filter((l) => !/^\s*\/\/ (The chart is rebuilt|A second click)/.test(l))
    .join('\n')
    .replace(toggle, `      ${setter}(value);`);
};
const handlerExcerpt = (path: string, fn: string, setter: string, what: string): Excerpt => ({
  path,
  block: [`function ${fn}`],
  simplify: simpleHandler(setter),
  notes: [
    { at: `function ${fn}`, note: '≈ what a click does' },
    { at: 'event.action === "clear"', note: '≈ click on empty space: clear' },
    { at: 'const picked', note: `≈ which ${what} was clicked` },
    { at: `${setter}(value)`, note: `≈ the page remembers that ${what}` },
  ],
});
const HANDLER_AFTER = <>The running file changes one line of this, for a package quirk; see <b>For developers</b>. The whole component is one click away.</>;
const quirkNote = (what: string, setter: string) => (
  <>
    The handler on the card is simplified. The running file differs in one line: a second click on the same {what} should
    clear the pick, but the chart is rebuilt when its highlight changes and forgets which {what} it reported, so it reports{' '}
    <code>select</code> again. The running code therefore toggles:{' '}
    <code>{setter}((current) =&gt; (current === value ? undefined : value))</code>, plus a two-line comment.
  </>
);
const V5_NOTE = <>Like the Bar chart handler, this one reads <code>p.name</code> and plain values. 5.4.0 changed both (<code>fieldId</code>, <code>{'{ kind, value }'}</code>); see the Notes page.</>;
const REST = 'the lines that bring in the packages, sending the query, the loading and error messages, the line that names the pick, and layout';
const REST_STATIC = 'the lines that bring in the packages, sending the query, and the loading and error messages';
const PKG_CHART = <>@microsoft/fabric-visuals 1.0.0 (VegaVisual), the version Rayfin 2.0's data-app template pins. The default template's visuals pack pins 1.3.0.</>;
const PKG_GRID = <>@microsoft/fabric-datagrid 1.0.0 (DataGrid), the version Rayfin 2.0's data-app template pins. The default template's visuals pack pins 1.3.0.</>;
const clickJob = (what: string, excerpt: Excerpt): Job => ({
  pbi: 'Interactions',
  app: 'click handler',
  text: <>Power BI filters the other visuals for you. In an app the chart tells you which {what} was clicked, and what happens next is yours. Here the page dims the others and names the pick.</>,
  excerpts: [excerpt],
  after: HANDLER_AFTER,
});
const NO_CLICK_JOB: Job = {
  pbi: 'Interactions',
  app: 'nothing to write yet',
  text: <>This visual shows one number, so there is no click to handle. Slicers and other visuals filter it in Power BI; in an app you pass the filter into its query, as the Slicer page does.</>,
  excerpts: [],
};
const specCard = (text: ReactNode, excerpt: Excerpt, after?: ReactNode): Job => ({
  pbi: 'Format pane',
  app: 'chart spec',
  text,
  excerpts: [excerpt],
  after: after ?? <>A small component hands this spec and the data to <code>VegaVisual</code>; its lines are in the headline count.</>,
});
const files = (dax: string, spec: string | null, component: string, factory: string) => ({
  headlineFiles: [Q + dax, ...(spec ? [Q + spec] : []), C + component],
  extras: [],
  allFiles: [C + component, ...(spec ? [Q + spec] : []), Q + dax, Q + factory, BARREL],
});

// ---------------------------------------------------------------- the pages
export const GALLERY: VisualDef[] = [
  {
    id: 'column',
    name: 'Column chart',
    group: 'Charts',
    blurb: 'Revenue by year, with data labels.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a column: the others dim and the page names the year. Click it again to clear.',
    pbiText: <>A clustered column chart: Year in the X-axis well, Revenue in the Y-axis well, data labels on. On a report page, a click on a column filters or highlights the other visuals. The app side builds the same chart.</>,
    wells: [{ name: 'X-axis', fields: ['Year'] }, { name: 'Y-axis', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('sales-by-year.dax', 'sales-by-year-columns.json', 'revenue-by-year-column-chart.tsx', 'sales-by-year-columns.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop Year on the X-axis and Revenue on the Y-axis. In an app you write that as a DAX query.</>,
        excerpts: [{ path: `${Q}sales-by-year.dax`, whole: true, notes: [{ at: "'date'[Year]", note: '≈ X-axis well: Year' }, { at: '"Revenue", [Revenue]', note: '≈ Y-axis well: Revenue' }, { at: '"Orders", [# Orders]', note: 'extra column, ignored here' }, { at: 'ORDER BY', note: '≈ Sort by Year' }] }],
        after: <>The query is shared with the Line and column page, which also draws Orders.</>,
      },
      specCard(<>Columns, data labels and axis titles: in an app they are settings in one small file, called a chart spec.</>, {
        path: `${Q}sales-by-year-columns.json`, whole: true,
        notes: [{ at: '"x"', note: '≈ X-axis: Year' }, { at: '"mark": "bar"', note: '≈ the visual type: columns' }, { at: '"y": { "field": "Revenue", "type": "quantitative", "title"', note: '≈ Y-axis: Revenue' }, { at: '"fillOpacity"', note: '≈ how the picked column stands out' }, { at: '"labelVertical"', note: '≈ Data labels: on' }],
      }),
      clickJob('column', handlerExcerpt(`${C}revenue-by-year-column-chart.tsx`, 'handleColumnInteraction', 'setYear', 'column')),
    ],
    score: score({ sort: [SORT_PBI, SORT_YEARS] }),
    devNotes: [quirkNote('column', 'setYear'), V5_NOTE],
  },
  {
    id: 'line',
    name: 'Line chart',
    group: 'Charts',
    blurb: 'Revenue by month, in calendar order.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a marker: the others dim and the page names the month. Click it again to clear.',
    pbiText: <>A line chart: YearMonthShort in the X-axis well, Revenue in the Y-axis well. The months read "Jan 2023", and the model sorts them by a second column, YearMonthNumber (Sort by column). The app side builds the same line, with a marker on every month.</>,
    wells: [{ name: 'X-axis', fields: ['YearMonthShort'] }, { name: 'Y-axis', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-month.dax', 'revenue-by-month-line.json', 'revenue-by-month-line-chart.tsx', 'revenue-by-month-line.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop YearMonthShort and Revenue, and the model's Sort by column puts the months in order. In an app the query asks for the sort column too, and orders by it.</>,
        excerpts: [{ path: `${Q}revenue-by-month.dax`, whole: true, notes: [{ at: "'date'[YearMonthNumber]", note: '≈ the Sort by column' }, { at: "'date'[YearMonthShort]", note: '≈ X-axis well: YearMonthShort' }, { at: '"Revenue", [Revenue]', note: '≈ Y-axis well: Revenue' }, { at: 'ORDER BY', note: '≈ months in calendar order' }] }],
      },
      specCard(<>A line, its markers and the axis titles: settings in the chart spec. The line and the markers are two layers of the same chart.</>, {
        path: `${Q}revenue-by-month-line.json`, whole: true,
        notes: [{ at: '"mark": "line"', note: '≈ the visual type: line' }, { at: '"sort": null, "title"', note: '≈ X-axis: months, in the order the query returns' }, { at: '"title": "Revenue"', note: '≈ Y-axis: Revenue, fitted to the data' }, { at: '"mark": "point"', note: '≈ Markers: on' }, { at: '"opacity"', note: '≈ how the picked marker stands out' }],
      }),
      clickJob('marker', handlerExcerpt(`${C}revenue-by-month-line-chart.tsx`, 'handleMarkerInteraction', 'setMonth', 'marker')),
    ],
    score: score({
      sort: [
        { mark: 'pbi', short: 'Sort by column in the model orders the months.' },
        { mark: 'you', short: 'The query orders the months; the spec keeps that order.', why: <>Text months sort alphabetically unless told otherwise (Apr 2023, Apr 2024, …). The query has <code>ORDER BY 'date'[YearMonthNumber]</code> and the axis has <code>"sort": null</code>. See For developers for what happened with the package's own hover line.</> },
      ],
      sortPlain: 'months in calendar order',
      extra: [youItem('Markers', 'markers to hover and click', 'A line shows its tooltip anywhere along it.', 'A marker layer, so each month can be hovered and clicked.', <>A line is one shape, so its tooltip and its click report only one of its points. The marker layer gives every month its own shape.</>)],
    }),
    devNotes: [
      <>The package can add a hover line with a tooltip to a line or area chart by itself, when the spec has no <code>params</code>. Tried first on this page: the months came out in alphabetical order, because the added layer's axis has no sort and Vega-Lite then sorts the shared axis ascending. Its tooltip also names the column by its code name. This page therefore draws its own markers, and its <code>highlight</code> param switches the hover line off. Charts with a date or number axis don't have the sorting problem.</>,
      quirkNote('marker', 'setMonth'),
      V5_NOTE,
    ],
  },
  {
    id: 'area',
    name: 'Area chart',
    group: 'Charts',
    blurb: 'Revenue by month, filled to the axis.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a marker: the others dim and the page names the month. Click it again to clear.',
    pbiText: <>An area chart: YearMonthShort in the X-axis well, Revenue in the Y-axis well, months sorted by the model's Sort by column. The app side builds the same area, with a marker on every month.</>,
    wells: [{ name: 'X-axis', fields: ['YearMonthShort'] }, { name: 'Y-axis', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-month.dax', 'revenue-by-month-area.json', 'revenue-by-month-area-chart.tsx', 'revenue-by-month-area.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>The same two fields as the Line chart page, and the same query: the months, their sort column and Revenue.</>,
        excerpts: [{ path: `${Q}revenue-by-month.dax`, whole: true, notes: [{ at: "'date'[YearMonthNumber]", note: '≈ the Sort by column' }, { at: "'date'[YearMonthShort]", note: '≈ X-axis well: YearMonthShort' }, { at: '"Revenue", [Revenue]', note: '≈ Y-axis well: Revenue' }, { at: 'ORDER BY', note: '≈ months in calendar order' }] }],
      },
      specCard(<>One word turns the line into an area. Everything else is the Line chart's spec, except that an area starts at zero.</>, {
        path: `${Q}revenue-by-month-area.json`, whole: true,
        notes: [{ at: '"type": "area"', note: '≈ the visual type: area, with its top line' }, { at: '"sort": null, "title"', note: '≈ X-axis: months, in the order the query returns' }, { at: '"title": "Revenue"', note: '≈ Y-axis: Revenue' }, { at: '"mark": "point"', note: '≈ Markers: on' }, { at: '"opacity"', note: '≈ how the picked marker stands out' }],
      }),
      clickJob('marker', handlerExcerpt(`${C}revenue-by-month-area-chart.tsx`, 'handleMarkerInteraction', 'setMonth', 'marker')),
    ],
    score: score({
      sort: [
        { mark: 'pbi', short: 'Sort by column in the model orders the months.' },
        { mark: 'you', short: 'The query orders the months; the spec keeps that order.', why: <>As on the Line chart page: <code>ORDER BY 'date'[YearMonthNumber]</code> in the query and <code>"sort": null</code> on the axis.</> },
      ],
      sortPlain: 'months in calendar order',
      extra: [youItem('Markers', 'markers to hover and click', 'An area shows its tooltip anywhere along it.', 'A marker layer, so each month can be hovered and clicked.', <>An area is one shape, so its tooltip and its click report only one of its points.</>)],
    }),
    devNotes: [
      <>The package's own hover line was not used, for the reason on the Line chart page: with text months it re-sorts the axis alphabetically.</>,
      ZERO_NOTE,
      <>The skill says not to set <code>opacity</code> or <code>fillOpacity</code> on area marks. The spec sets neither on the area; the <code>opacity</code> rule is on the marker layer.</>,
      quirkNote('marker', 'setMonth'),
      V5_NOTE,
    ],
  },
  {
    id: 'combo',
    name: 'Line and column',
    group: 'Charts',
    blurb: 'Revenue as columns, orders as a line, two axes.',
    inPowerBI: 'drop 3 fields',
    hint: 'Click a column: the others dim and the page names the year. Click it again to clear.',
    pbiText: <>A line and clustered column chart: Year in the X-axis well, Revenue in the Column y-axis well and # Orders in the Line y-axis well. Power BI gives the line its own axis on the right. The app side builds the same chart.</>,
    wells: [{ name: 'X-axis', fields: ['Year'] }, { name: 'Column y-axis', fields: ['Revenue'] }, { name: 'Line y-axis', fields: ['# Orders'] }],
    packages: PKG_CHART,
    ...files('sales-by-year.dax', 'sales-by-year-combo.json', 'revenue-and-orders-combo-chart.tsx', 'sales-by-year-combo.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>Three wells, three lines of the query: the year and the two measures.</>,
        excerpts: [{ path: `${Q}sales-by-year.dax`, whole: true, notes: [{ at: "'date'[Year]", note: '≈ X-axis well: Year' }, { at: '"Revenue", [Revenue]', note: '≈ Column y-axis well: Revenue' }, { at: '"Orders", [# Orders]', note: '≈ Line y-axis well: # Orders' }, { at: 'ORDER BY', note: '≈ Sort by Year' }] }],
      },
      specCard(<>Two layers in one spec: the columns and the line. The last line gives each its own axis.</>, {
        path: `${Q}sales-by-year-combo.json`, whole: true,
        notes: [{ at: '"x"', note: '≈ X-axis: Year' }, { at: '"mark": "bar"', note: '≈ the columns' }, { at: '"color": { "datum": "Revenue" }', note: '≈ legend entry and colour: Revenue' }, { at: '"fillOpacity"', note: '≈ how the picked column stands out' }, { at: '"type": "line"', note: '≈ the line, with markers' }, { at: '"color": { "datum": "Orders" }', note: '≈ legend entry and colour: Orders' }, { at: '"resolve"', note: '≈ a second axis for the line' }],
      }),
      clickJob('column', handlerExcerpt(`${C}revenue-and-orders-combo-chart.tsx`, 'handleColumnInteraction', 'setYear', 'column')),
    ],
    score: score({
      sort: [SORT_PBI, SORT_YEARS],
      pbiDraw: { mark: 'pbi', short: 'Pick the visual, drop the fields; the second axis comes with it.', why: <>Learn: "When you add a line value to a combo chart, Power BI creates a secondary Y-axis." The well names are Learn's too: "Drag Gross Margin Last Year % from Column y-axis into Line y-axis."</>, cite: [`${LEARN_AXES}#dual-y-axes`, `${LEARN_COMBO}#create-a-combo-chart-with-two-axes`] },
      draw: { ...DRAW, short: 'VegaVisual draws both layers; one spec line adds the second axis.' },
      format: { ...FORMAT, short: 'Each axis takes the format of its own column.', why: <>Revenue shows as $ on the left axis and Orders as a plain count on the right, each from its column format. That works because each layer is a plain mark with its own <code>y</code>: the package formats the encodings of first-level layers only.</>, cite: [`${V}:126-133`, `${V}:175-179`] },
    }),
    devNotes: [
      variation('revenue as columns with margin % as the line', 'revenue as columns with orders as the line'),
      ZERO_NOTE,
      <>The skill says to wrap each series in its own nested <code>layer</code> for a dual axis. Not done here: the package applies column formats to the encodings of first-level layers only, so an axis inside a nested layer would lose its format. The line's markers come from <code>"point": true</code> instead.</>,
      <>Both series get their colour and legend entry from <code>"color": {'{ "datum": … }'}</code>. The theme gives bars and lines the same first colour (<code>fabric-visuals/dist/index.js:1544-1553</code>), so without it the line would be hard to tell from the columns; that is read from the code, not tried.</>,
      quirkNote('column', 'setYear'),
      V5_NOTE,
    ],
  },
  {
    id: 'pie',
    name: 'Pie chart',
    group: 'Charts',
    blurb: 'Share of revenue by store country.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a slice: the others dim and the page names the country. Click it again to clear.',
    pbiText: <>A pie chart: the store's CountryName in the Legend well, Revenue in the Values well. Each slice is a store country's (or Online's) share of revenue. The app side builds the same pie, largest slice first.</>,
    wells: [{ name: 'Legend', fields: ['CountryName'] }, { name: 'Values', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-store-country.dax', 'revenue-by-store-country-pie.json', 'revenue-by-country-pie-chart.tsx', 'revenue-by-store-country-pie.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop CountryName on Legend and Revenue on Values. In an app that is a DAX query.</>,
        excerpts: [{ path: `${Q}revenue-by-store-country.dax`, whole: true, notes: [{ at: "'store'[CountryName]", note: '≈ Legend well: CountryName' }, { at: '"Revenue", [Revenue]', note: '≈ Values well: Revenue' }, { at: 'ORDER BY', note: '≈ largest first' }] }],
      },
      specCard(<>Slices, colours, the legend and the tooltip: settings in the chart spec.</>, {
        path: `${Q}revenue-by-store-country-pie.json`, whole: true,
        notes: [{ at: '"mark": "arc"', note: '≈ the visual type: pie' }, { at: '"theta"', note: '≈ Values: the size of each slice' }, { at: '"color"', note: '≈ Legend: one colour per country' }, { at: '"order"', note: '≈ slices from largest to smallest' }, { at: '"fillOpacity"', note: '≈ how the picked slice stands out' }, { at: '"tooltip"', note: '≈ what the tooltip lists' }],
      }),
      clickJob('slice', handlerExcerpt(`${C}revenue-by-country-pie-chart.tsx`, 'handleSliceInteraction', 'setCountry', 'slice')),
    ],
    score: score({
      sort: [{ mark: 'pbi', short: 'Sort by value or by name in More options.' }, { mark: 'you', short: 'ORDER BY in the query, plus one spec line for the slices.', why: <>The <code>order</code> line sorts the slices by Revenue; the legend keeps the query's order (<code>"sort": null</code>).</> }],
      tip: { ...TIP_LISTED, why: <>A pie has no axis to take a number format from, so the spec lists the tooltip fields and the package gives each its column format. Checked in the page: "Country United States, Revenue $60,466,772".</> , cite: [`${V}:120-122`, `${V}:189-207`] },
      format: { ...FORMAT, short: 'Your column format reaches the tooltip.' },
      extra: [youItem('Detail labels', 'labels on the slices', 'Detail labels show the value or share on each slice.', NOT_BUILT, <>It would be a second layer of text marks placed on the slices. Not built here; the legend and the tooltip carry the numbers.</>), DETAILS_ITEM()],
    }),
    devNotes: [
      variation('revenue by the customer\'s continent', 'revenue by store country'),
      COLOUR_MAP_NOTE,
      quirkNote('slice', 'setCountry'),
      V5_NOTE,
    ],
  },
  {
    id: 'donut',
    name: 'Donut chart',
    group: 'Charts',
    blurb: 'Share of revenue by product category, as a ring.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a slice: the others dim and the page names the category. Click it again to clear.',
    pbiText: <>A donut chart: CategoryName in the Legend well, Revenue in the Values well. A pie with an open centre. The app side builds the same ring, largest slice first.</>,
    wells: [{ name: 'Legend', fields: ['CategoryName'] }, { name: 'Values', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-category.dax', 'revenue-by-category-donut.json', 'revenue-by-category-donut-chart.tsx', 'revenue-by-category-donut.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop CategoryName on Legend and Revenue on Values. In an app that is a DAX query, the same one as the Bar chart page.</>,
        excerpts: [{ path: `${Q}revenue-by-category.dax`, whole: true, notes: [{ at: "'product'[CategoryName]", note: '≈ Legend well: CategoryName' }, { at: '"Revenue", [Revenue]', note: '≈ Values well: Revenue' }, { at: 'ORDER BY', note: '≈ largest first' }] }],
      },
      specCard(<>The Pie chart's spec with one more setting: an inner radius, which opens the centre.</>, {
        path: `${Q}revenue-by-category-donut.json`, whole: true,
        notes: [{ at: '"innerRadius"', note: '≈ the visual type: donut; the size of the hole' }, { at: '"theta"', note: '≈ Values: the size of each slice' }, { at: '"color"', note: '≈ Legend: one colour per category' }, { at: '"order"', note: '≈ slices from largest to smallest' }, { at: '"fillOpacity"', note: '≈ how the picked slice stands out' }, { at: '"tooltip"', note: '≈ what the tooltip lists' }],
      }),
      clickJob('slice', handlerExcerpt(`${C}revenue-by-category-donut-chart.tsx`, 'handleSliceInteraction', 'setCategory', 'slice')),
    ],
    score: score({
      sort: [{ mark: 'pbi', short: 'Sort by value or by name in More options.' }, { mark: 'you', short: 'ORDER BY in the query, plus one spec line for the slices.', why: <>The <code>order</code> line sorts the slices by Revenue; the legend keeps the query's order (<code>"sort": null</code>).</> }],
      tip: { ...TIP_LISTED, why: <>A ring has no axis to take a number format from, so the spec lists the tooltip fields and the package gives each its column format.</>, cite: [`${V}:120-122`, `${V}:189-207`] },
      format: { ...FORMAT, short: 'Your column format reaches the tooltip.' },
      extra: [youItem('Detail labels', 'labels on the slices', 'Detail labels show the value or share on each slice.', NOT_BUILT, <>It would be a second layer of text marks placed on the slices. Not built here. Long legend names are cut with "…": the theme limits a legend label to 100 px.</>, [`${V}:1342`]),
        youItem('Center value', 'a value in the centre of the ring (not built here)', 'Center value shows the total in the middle.', NOT_BUILT, <>Learn: "When you turn on the center value, the donut displays it right in the middle." In an app it would be one more text layer and a total to put in it.</>, undefined, [`${LEARN_PIE}#add-a-center-value-to-a-donut-chart`]),
        DETAILS_ITEM(),
      ],
    }),
    devNotes: [variation('revenue by the customer\'s continent', 'revenue by product category'), COLOUR_MAP_NOTE, quirkNote('slice', 'setCategory'), V5_NOTE],
  },
  {
    id: 'scatter',
    name: 'Scatter chart',
    group: 'Charts',
    blurb: 'Orders against revenue, one point per store country.',
    inPowerBI: 'drop 3 fields',
    hint: 'Click a point: the others dim and the page names the country. Click it again to clear.',
    pbiText: <>A scatter chart: the store's CountryName in the Values well, # Orders on the X Axis and Revenue on the Y Axis. One point per country. The app side builds the same chart.</>,
    wells: [{ name: 'Values', fields: ['CountryName'] }, { name: 'X Axis', fields: ['# Orders'] }, { name: 'Y Axis', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('orders-and-revenue-by-store-country.dax', 'orders-and-revenue-by-store-country-scatter.json', 'orders-and-revenue-scatter-chart.tsx', 'orders-and-revenue-by-store-country-scatter.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>Three wells, three lines of the query: the country that makes a point, and the two measures that place it.</>,
        excerpts: [{ path: `${Q}orders-and-revenue-by-store-country.dax`, whole: true, notes: [{ at: "'store'[CountryName]", note: '≈ Values well: CountryName, one point each' }, { at: '"Orders", [# Orders]', note: '≈ X Axis well: # Orders' }, { at: '"Revenue", [Revenue]', note: '≈ Y Axis well: Revenue' }] }],
      },
      specCard(<>Points, the two axes and the tooltip: settings in the chart spec.</>, {
        path: `${Q}orders-and-revenue-by-store-country-scatter.json`, whole: true,
        notes: [{ at: '"mark"', note: '≈ the visual type: scatter; marker size' }, { at: '"x"', note: '≈ X Axis: Orders, fitted to the data' }, { at: '"y"', note: '≈ Y Axis: Revenue, fitted to the data' }, { at: '"fillOpacity"', note: '≈ how the picked point stands out' }, { at: '"tooltip"', note: '≈ what the tooltip lists, country first' }],
      }),
      clickJob('point', handlerExcerpt(`${C}orders-and-revenue-scatter-chart.tsx`, 'handlePointInteraction', 'setCountry', 'point')),
    ],
    score: score({
      sort: [{ mark: 'pbi', short: 'Nothing to sort: two value axes.' }, { mark: 'pkg', short: 'Nothing to sort: two value axes.' }],
      noSort: true,
      tip: { ...TIP_LISTED, why: <>The spec lists the tooltip fields so the country comes first, and the package gives each field its column format. Checked in the page.</> },
    }),
    devNotes: [
      variation('one point per product subcategory, revenue against margin %', 'one point per store country, orders against revenue'),
      <>The skill says to use the <code>circle</code> mark for a scatter chart. Tried first: 1.0.0's theme styles <code>point</code> but leaves <code>circle</code> empty, so circles came out small and in Vega-Lite's own blue-grey. This page uses <code>point</code>, which takes the theme's colour, and sets its size.</>,
      quirkNote('point', 'setCountry'),
      V5_NOTE,
    ],
  },
  {
    id: 'treemap',
    name: 'Treemap',
    group: 'Charts',
    blurb: 'No drop-in equivalent: the chart language has no treemap.',
    inPowerBI: 'drop 2 fields',
    pbiText: <>A treemap: CategoryName in the Category well, Revenue in the Values well. Power BI sizes one rectangle per category and packs them, largest at the top left.</>,
    wells: [{ name: 'Category', fields: ['CategoryName'] }, { name: 'Values', fields: ['Revenue'] }],
    packages: <>None draws a treemap. @microsoft/fabric-visuals 1.0.0 draws Vega-Lite specs, and Vega-Lite has no treemap mark.</>,
    headlineFiles: [], extras: [], allFiles: [], restNote: '', jobs: [],
    takesLead: <>In an app, the packing of the rectangles is not possible with Microsoft's packages as they come. If you work out the rectangles yourself, the packages can draw them, and you write the rest.</>,
    noEquiv: {
      why: <>A treemap needs a layout step: something has to work out where every rectangle goes. Rayfin's chart language has bars, lines, areas, arcs, points and text, but no treemap and no layout for one. So there is no spec to write for this visual, and this page doesn't fake it.</>,
      instead: [
        <><b>Use a bar chart.</b> For one level of categories, the Bar chart page shows the same numbers, and they are easier to compare than areas.</>,
        <><b>Or work out the rectangles yourself.</b> A treemap layout turns your rows into four numbers per rectangle: left, right, top and bottom. Add those to your rows and the chart language can draw them as plain rectangles with labels. The layout code is yours to write or to bring in; that was not built or tested here.</>,
        <><b>Or another library.</b> Rayfin's visuals skill says to ask the user first before using a chart library other than its own two components.</>,
      ],
      source: <>How Power BI does it: Microsoft Learn, "Treemaps in Power BI".</>,
    },
    score: [
      { item: 'Data query', pbi: PBI_QUERY, app: { ...APP_QUERY, why: <>The same query as the Bar chart page would do.</> } },
      { item: 'Shaping the rows', plain: 'working out the rectangles', pbi: PBI_ROWS, app: { mark: 'you', short: 'Work out each rectangle yourself.', why: <>Left, right, top and bottom per category. Not built here.</> } },
      { item: 'Drawing', plain: 'packing the rectangles', pbi: { mark: 'pbi', short: 'Sizes and packs the rectangles for you.', why: <>Learn: "The rectangles are arranged by size with the largest branch node at the top left and the smallest branch at the bottom right."</>, cite: [LEARN_TREEMAP] }, app: { mark: 'no', short: 'No treemap mark and no layout in the chart language.', why: <><code>VegaVisual</code> always compiles its spec as Vega-Lite. Vega, the engine underneath, does have a treemap layout, but a Vega spec is not accepted: tried in Node, Vega-Lite's compiler rejects it as an invalid spec.</>, cite: [`${V}:1582-1583`, `${VL} (marks)`] } },
      { item: 'Tooltip', plain: 'if you draw it as bars: tooltip', pbi: PBI_TIP, app: { ...TIP_AXIS, short: 'As bars: as on the Bar chart page. As rectangles: not tested.', why: <>Nothing was drawn or tested on this page. For bars, see the Bar chart page.</> } },
      { item: 'Number formatting', pbi: PBI_FORMAT, app: { ...FORMAT, short: 'As bars: as on the Bar chart page. As rectangles: not tested.', why: <>Nothing was drawn or tested on this page. For bars, see the Bar chart page.</> } },
      { item: 'Sort', plain: 'ordering by size', pbi: { mark: 'pbi', short: 'Largest first, for you.' }, app: { mark: 'you', short: 'ORDER BY in the query.' } },
      { item: 'Selection and cross-filter', plain: 'acting on a click', pbi: { mark: 'pbi', short: 'A click cross-highlights and cross-filters the page.', cite: [`${LEARN_TREEMAP}#use-highlighting-and-cross-filtering`] }, app: { ...APP_CLICK, short: 'Your chart reports the click; you decide what to filter.' } },
      { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: { ...APP_KEYS, short: 'Your chart: mouse only.' } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'As bars: as on the Bar chart page. As rectangles: not tested.' } },
      { item: 'Export', pbi: PBI_EXPORT, app: APP_EXPORT },
      { item: '"Show as table"', pbi: PBI_SHOW, app: { ...chartShowTable, short: 'A DataGrid of the same rows.' } },
    ],
    devNotes: [],
  },
  {
    id: 'funnel',
    name: 'Funnel',
    group: 'Charts',
    blurb: 'Categories as centred bars, largest first. An approximation.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a bar: the others dim and the page names the category. Click it again to clear.',
    pbiText: <>A funnel: CategoryName in the Category well, Revenue in the Values well. Power BI centres one bar per category, largest first, and its tooltip adds each bar's share of the first bar and of the one before. The app side builds the centred bars; the shares are not there.</>,
    wells: [{ name: 'Category', fields: ['CategoryName'] }, { name: 'Values', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-category.dax', 'revenue-by-category-funnel.json', 'revenue-by-category-funnel-chart.tsx', 'revenue-by-category-funnel.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop CategoryName on Category and Revenue on Values. In an app that is a DAX query, the same one as the Bar chart page.</>,
        excerpts: [{ path: `${Q}revenue-by-category.dax`, whole: true, notes: [{ at: "'product'[CategoryName]", note: '≈ Category well: CategoryName' }, { at: '"Revenue", [Revenue]', note: '≈ Values well: Revenue' }, { at: 'ORDER BY', note: '≈ largest first: the funnel shape' }] }],
      },
      specCard(<>There is no funnel in the chart language. The spec draws a bar chart and centres the bars, which gives the funnel shape.</>, {
        path: `${Q}revenue-by-category-funnel.json`, whole: true,
        notes: [{ at: '"y"', note: '≈ Category: one bar each, in the query\'s order' }, { at: '"mark": "bar"', note: '≈ the bars' }, { at: '"stack": "center"', note: '≈ the funnel shape: bars centred, 90 px kept free for labels' }, { at: '"fillOpacity"', note: '≈ how the picked bar stands out' }, { at: '"tooltip"', note: '≈ what the tooltip lists' }, { at: '"align": "right"', note: '≈ Data labels, in a column on the right, no tooltip' }],
      }),
      clickJob('bar', handlerExcerpt(`${C}revenue-by-category-funnel-chart.tsx`, 'handleBarInteraction', 'setCategory', 'bar')),
    ],
    score: score({
      pbiDraw: { mark: 'pbi', short: 'Pick the visual, drop the fields.' },
      draw: { ...DRAW, short: 'VegaVisual draws your spec: bars, centred.' },
      extra: [
        youItem('The funnel shape', 'the funnel shape (centred bars)', 'The visual is a funnel.', 'No funnel mark: one spec setting centres a bar chart.', <><code>"stack": "center"</code> on the value axis. The result is the same shape as Power BI's funnel with plain categories.</>),
        youItem('Share of first and previous', 'each bar\'s share of the first and the previous bar (not built here)', 'The tooltip shows % of first and % of previous.', NOT_BUILT, <>Learn lists the overall conversion rate (% of the first stage) and the stage-to-stage value (% of the previous stage) among the tooltip's details. In an app those are two more columns, from the query or worked out in the component, and two more tooltip fields.</>, undefined, [LEARN_FUNNEL, LEARN_TOOLTIPS]),
      ],
      sort: [{ mark: 'pbi', short: 'Sort in More options; viewers can change it.' }, SORT_QUERY],
      tip: { ...TIP_LISTED, short: 'You list the tooltip fields; no shares in it.', why: <>Left to itself the tooltip read "Revenue $17,196,810, productCategoryName Home Appliances": the category axis has no title, so its code name showed. The spec lists the two fields with their titles (checked in the page).</> },
    }),
    devNotes: [
      <>The value axis is hidden with <code>"labels": false</code>, not <code>"axis": null</code>: for a column with a format, the package writes the format into the axis and so would bring a removed axis back (<code>fabric-visuals/dist/index.js:175-179</code>; read from the code, not tried).</>,
      quirkNote('bar', 'setCategory'),
      V5_NOTE,
    ],
  },
  {
    id: 'waterfall',
    name: 'Waterfall chart',
    group: 'Charts',
    blurb: 'Revenue building up by category to the total. An approximation.',
    inPowerBI: 'drop 2 fields',
    hint: 'Click a column: the others dim and the page names the category. Click it again to clear.',
    pbiText: <>A waterfall chart: CategoryName in the Category well, Revenue in the Y-axis well. Each column starts where the one before ended: Power BI works out the running total. The Gold Layer example report's waterfall ends with a total column. The app side works out the running total in code, adds that total column, then draws floating columns.</>,
    wells: [{ name: 'Category', fields: ['CategoryName'] }, { name: 'Y-axis', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue-by-category.dax', 'revenue-by-category-waterfall.json', 'revenue-by-category-waterfall-chart.tsx', 'revenue-by-category-waterfall.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop CategoryName on Category and Revenue on the Y-axis. In an app that is a DAX query, the same one as the Bar chart page.</>,
        excerpts: [{ path: `${Q}revenue-by-category.dax`, whole: true, notes: [{ at: "'product'[CategoryName]", note: '≈ Category well: CategoryName' }, { at: '"Revenue", [Revenue]', note: '≈ Y-axis well: Revenue' }, { at: 'ORDER BY', note: '≈ largest step first' }] }],
      },
      {
        pbi: 'Format pane',
        app: 'chart spec, and a running total',
        text: <>There is no waterfall in the chart language. The component adds where each column starts and ends, and a Total row; the spec then draws columns between those two numbers.</>,
        excerpts: [
          { path: `${C}revenue-by-category-waterfall-chart.tsx`, block: ['const steps = useMemo'], notes: [{ at: 'let runningTotal', note: '≈ the running total Power BI keeps for you' }, { at: 'return [name', note: '≈ where this column starts and ends' }, { at: 'rows.push', note: '≈ the Total column' }, { at: 'columns: [', note: '≈ the new columns, with their $ format' }] },
          { path: `${Q}revenue-by-category-waterfall.json`, whole: true, notes: [{ at: '"x"', note: '≈ Category, in the order of the rows; labels tilted' }, { at: '"y": { "field": "Start"', note: '≈ Y-axis: the column starts here…' }, { at: '"y2"', note: '≈ …and ends here' }, { at: '"color"', note: '≈ Increase and Total colours, with a legend' }, { at: '"fillOpacity"', note: '≈ how the picked column stands out' }, { at: '"tooltip"', note: '≈ what the tooltip lists' }, { at: '"labelVertical"', note: '≈ Data labels: on' }] },
        ],
      },
      clickJob('column', handlerExcerpt(`${C}revenue-by-category-waterfall-chart.tsx`, 'handleColumnInteraction', 'setCategory', 'column')),
    ],
    score: score({
      draw: { ...DRAW, short: 'VegaVisual draws your spec: floating columns.' },
      extra: [
        youItem('Running total and Total column', 'the running total and the Total column', 'Works out the running total and adds the total.', 'About a dozen lines in the component.', <>Learn: "Waterfall charts show a running total as Power BI adds and subtracts values." The Total column is described from the gallery's waterfall page; it was not checked on Learn. In the app, the component adds Start, End and Kind to the <code>DataTable</code>, so the new columns carry a format like any other.</>, undefined, [LEARN_WATERFALL]),
        youItem('Increase and decrease colours', 'colours for decreases (not built here)', 'Columns are colour coded for increases and decreases.', 'Increase and Total only; this data has no decrease.', <>The colour comes from the Kind column the component adds. A decrease would be a third value of Kind.</>, undefined, [LEARN_WATERFALL]),
        youItem('Breakdown', 'the Breakdown well (not built here)', 'A Breakdown field splits each step.', NOT_BUILT, <>Not attempted on this page.</>, undefined, [`${LEARN_WATERFALL}#create-a-waterfall-chart`]),
      ],
      sort: [{ mark: 'pbi', short: 'Sort in More options; the total stays last.', why: <>That the total stays last was not checked on Learn.</> }, { mark: 'you', short: 'ORDER BY in the query; the component adds Total last.' }],
      tip: TIP_LISTED,
    }),
    devNotes: [
      <>Why the running total is worked out in the component and not inside the spec: Vega-Lite could do it with a window transform, but the package takes number formats from the <code>DataTable</code>'s columns, and a field made inside the spec has none. As <code>DataTable</code> columns, Start and End get <code>$#,0</code> on the axis.</>,
      variation('Margin by category', 'Revenue by category'),
      COLOUR_MAP_NOTE,
      <>The data labels have <code>"tooltip": null</code>: left on, hovering a label added "End" to the tooltip. The Funnel page's labels have it for the same kind of reason.</>,
      <>The data labels have their own <code>limit</code>. Without it the package limits a label to the width of its column (<code>fabric-visuals/dist/index.js:375-376</code>), which is narrower than these numbers; read from the code, not tried.</>,
      quirkNote('column', 'setCategory'),
      V5_NOTE,
    ],
  },
  {
    id: 'ribbon',
    name: 'Ribbon chart',
    group: 'Charts',
    blurb: 'Categories ranked in every year, joined by bands. An approximation.',
    inPowerBI: 'drop 3 fields',
    hint: 'Click a block: the other categories dim and the page names the pick. Click it again to clear.',
    pbiText: <>A ribbon chart: Year in the X-axis well, Revenue in the Y-axis well, CategoryName in the Legend well. In every column Power BI stacks the categories by rank, largest on top, and joins each category from column to column with a ribbon. The app side ranks the categories in code and draws straight bands between the columns.</>,
    wells: [{ name: 'X-axis', fields: ['Year'] }, { name: 'Y-axis', fields: ['Revenue'] }, { name: 'Legend', fields: ['CategoryName'] }],
    packages: PKG_CHART,
    ...files('revenue-by-category-and-year.dax', 'revenue-by-category-and-year-ribbon.json', 'revenue-by-category-ribbon-chart.tsx', 'revenue-by-category-and-year-ribbon.ts'),
    restNote: REST,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>Three wells, three lines of the query: the category, the year and Revenue.</>,
        excerpts: [{ path: `${Q}revenue-by-category-and-year.dax`, whole: true, notes: [{ at: "'product'[CategoryName]", note: '≈ Legend well: CategoryName' }, { at: "'date'[Year]", note: '≈ X-axis well: Year' }, { at: '"Revenue", [Revenue]', note: '≈ Y-axis well: Revenue' }] }],
      },
      {
        pbi: 'Format pane',
        app: 'chart spec, and a ranking',
        text: <>There is no ribbon in the chart language. The component ranks the categories inside every year and adds where each block starts and ends; the spec draws the blocks, and an area per category joins them.</>,
        excerpts: [
          { path: `${C}revenue-by-category-ribbon-chart.tsx`, block: ['const ranked = useMemo'], notes: [{ at: '.sort(', note: '≈ rank inside the year, smallest at the bottom' }, { at: 'return [name, year', note: '≈ where this block starts and ends' }, { at: 'return { columns', note: '≈ the new columns, with their $ format' }] },
          { path: `${Q}revenue-by-category-and-year-ribbon.json`, whole: true, notes: [{ at: '"x"', note: '≈ X-axis: Year' }, { at: '"color"', note: '≈ Legend: one colour per category' }, { at: '"opacity"', note: '≈ how the picked category stands out' }, { at: '"type": "area"', note: '≈ the ribbons: straight bands, no tooltip' }, { at: '"type": "bar"', note: '≈ the blocks in each column' }, { at: '"tooltip"', note: '≈ what the tooltip lists' }] },
        ],
      },
      clickJob('block', handlerExcerpt(`${C}revenue-by-category-ribbon-chart.tsx`, 'handleColumnInteraction', 'setCategory', 'block')),
    ],
    score: score({
      draw: { ...DRAW, short: 'VegaVisual draws your spec: blocks and bands.' },
      extra: [
        youItem('Ranking in every column', 'ranking the categories in every column', 'Ranks the series in every column, largest on top.', 'About a dozen lines in the component.', <>Learn: "The ribbon for the highest rank (value) is always displayed on top of the other ribbons for each time period." In the app, the component sorts each year's rows and adds Start and End to the <code>DataTable</code>.</>, undefined, [LEARN_RIBBON]),
        youItem('Ribbon shape', 'curved ribbons (straight bands here)', 'Curved ribbons join the columns.', 'Straight bands, from an area per category.', <>The bands run from the centre of one column to the centre of the next and cross where the rank changes. Power BI's ribbons are curved and have their own settings (spacing, transparency, border); none of that is here.</>, undefined, [`${LEARN_RIBBON}#format-a-ribbon-chart`]),
        youItem('Ribbon tooltip', 'a tooltip on the ribbons (not built here)', 'A ribbon has its own tooltip.', NOT_BUILT, <>What Power BI's ribbon tooltip shows was not checked on Learn. Here only the blocks have a tooltip: category, year, revenue. The bands' tooltip is switched off in the spec (<code>"tooltip": null</code>): left on, it listed Start and End, the running totals the bands are drawn between, not a revenue.</>),
      ],
      sort: [{ mark: 'pbi', short: 'Sort the axis in More options.' }, SORT_YEARS],
      tip: { ...TIP_LISTED, short: 'On the blocks: you list the fields; the package formats them.' },
      tipPlain: 'tooltip on the blocks',
    }),
    devNotes: [
      <>The answer for this query is derived, not captured as one query: see Where the numbers come from, below.</>,
      <>Tried first: stacking inside the spec, ordered by Revenue through the <code>order</code> channel. The bars stacked by rank, but each area fell apart into one piece per point, because Vega-Lite also groups an area by its <code>order</code> field. So the ranking moved into the component, as on the Waterfall page.</>,
      <>The skill says not to set <code>opacity</code> on area marks. The <code>opacity</code> rule sits beside the layers, so it also dims the bands of the other categories on a click; that is the point of it here.</>,
      COLOUR_MAP_NOTE,
      <>The <code>highlight</code> param also switches off the hover line the package would add for the area layer. With Start and End on the axis, that hover line's tooltip would list running totals, not revenue.</>,
      quirkNote('block', 'setCategory'),
      V5_NOTE,
    ],
  },
  {
    id: 'gauge',
    name: 'Gauge',
    group: 'Charts',
    blurb: 'Margin % on a half ring from 0% to 100%. An approximation.',
    inPowerBI: 'drop 1 field, set the axis maximum',
    pbiText: <>A gauge: Margin % in the Value well. Left alone, Power BI runs the scale from 0 to twice the value, so the gauge is always half full; for a rate you set Gauge axis, Max to 1 in the Format pane. The app side draws the same half ring from two arcs.</>,
    wells: [{ name: 'Value', fields: ['Margin %'] }],
    formatWells: { title: 'Format · Gauge axis', wells: [{ name: 'Max', fields: ['1'] }] },
    packages: PKG_CHART,
    ...files('margin-pct.dax', 'margin-pct-gauge.json', 'margin-gauge.tsx', 'margin-pct-gauge.ts'),
    restNote: REST_STATIC,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop Margin % on Value. In an app that is a DAX query that returns one row with one number.</>,
        excerpts: [{ path: `${Q}margin-pct.dax`, whole: true, notes: [{ at: 'ROW', note: '≈ Value well: Margin %' }] }],
      },
      specCard(<>There is no gauge in the chart language. The spec draws it from three layers: a pale half ring, a ring segment for the value, and the number.</>, {
        path: `${Q}margin-pct-gauge.json`, whole: true,
        notes: [{ at: '"theta": -1.5708', note: '≈ the empty scale: a half ring, pale' }, { at: '"theta": { "field"', note: '≈ Value, on Gauge axis Min 0 and Max 1' }, { at: '"tooltip": [', note: '≈ what the tooltip lists' }, { at: '"labelCallout"', note: '≈ Callout value' }],
      }),
      NO_CLICK_JOB,
    ],
    score: score({
      draw: { ...DRAW, short: 'VegaVisual draws your spec: two arcs and a number.' },
      extra: [
        youItem('The gauge shape', 'the gauge shape (two arcs)', 'The visual is a gauge.', 'No gauge mark: the spec builds it from two arcs.', <>The angles are written in the spec in radians: -1.5708 to 1.5708 is the half circle.</>),
        youItem('Scale minimum and maximum', 'the scale\'s minimum and maximum', 'Min 0 and Max twice the value, or your own.', 'Written into the spec: 0 to 1.', <>Learn: "The start point on the gauge (Minimum value) is set to 0. The end point on the gauge (Maximum value) is set to double the current value." You can also bind fields or type values under Gauge axis. In the app the scale is the <code>domain</code> in the spec; a maximum from a measure would need another column and more spec.</>, undefined, [LEARN_GAUGE]),
        youItem('Target line', 'the target line (not built here)', 'A Target value draws a needle.', NOT_BUILT, <>Learn: adding a target "creates a needle on the gauge chart". In the app it would be one more column and one more layer.</>, undefined, [`${LEARN_GAUGE}#add-a-target-value`]),
        youItem('Axis labels', 'the labels at the ends of the scale (not built here)', 'Shows the minimum and maximum at the ends.', NOT_BUILT, <>Two more text layers. That Power BI labels the ends is described from its default look; it was not checked on Learn.</>),
      ],
      sort: NO_SORT,
      noSort: true,
      click: [PBI_NO_CLICK, APP_NO_CLICK],
      clickPlain: 'reacting to a filter',
      tip: { ...TIP_LISTED, short: 'You list the field; the package formats it.', why: <>Left to itself the tooltip on the arc read "MarginPct 0.558602366592": an arc has no axis to take a format or a title from. The spec lists the field with a title, and switches the tooltip off on the pale ring and on the number (checked in the page).</>, cite: [`${V}:120-122`, `${V}:189-207`, `${V}:1259-1261`] },
      pbiTip: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> },
      format: { ...FORMAT, short: 'Your column format reaches the number: 55.9%.', why: <>The column list gives Margin % the format <code>0.0%</code>, the model's format for the measure, and the package applies it to the text mark.</>, cite: [`${V}:122`, `${V}:185-188`] },
    }),
    devNotes: [
      <>The owner's gallery page filters its gauges to 2025. This page shows Margin % for all years: that is the saved answer, and no model was open to capture the 2025 one.</>,
      <>Both arcs get the theme's first colour from <code>"color": {'{ "datum": … }'}</code>. The theme sets no fill for arcs (<code>fabric-visuals/dist/index.js:1182-1186</code>), so without it they would take Vega-Lite's own default colour; that is read from the code, not tried.</>,
    ],
  },
  {
    id: 'card',
    name: 'Card',
    group: 'Cards and KPIs',
    blurb: 'One number: total revenue.',
    inPowerBI: 'drop 1 field',
    pbiText: <>A card: Revenue in the Values well. One number with its label. Power BI shortens the number (Display units: Auto). The app side builds the card as a tiny chart of two pieces of text and shows the number in full.</>,
    wells: [{ name: 'Values', fields: ['Revenue'] }],
    packages: PKG_CHART,
    ...files('revenue.dax', 'revenue-card.json', 'revenue-card.tsx', 'revenue-card.ts'),
    restNote: REST_STATIC,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop Revenue on the card's Values well. In an app that is a DAX query that returns one row with one number.</>,
        excerpts: [{ path: `${Q}revenue.dax`, whole: true, notes: [{ at: 'ROW', note: '≈ the card\'s field: Revenue' }] }],
      },
      specCard(<>A card is two pieces of text: the number and its label. The spec has one layer for each.</>, {
        path: `${Q}revenue-card.json`, whole: true,
        notes: [{ at: '"labelCallout"', note: '≈ Callout value: large and bold' }, { at: '"text": { "field"', note: '≈ the number, in the column\'s format' }, { at: '"labelSubtitle"', note: '≈ Label: smaller, 28 px lower' }, { at: '"text": { "value"', note: '≈ the label text' }],
      }),
      NO_CLICK_JOB,
    ],
    score: score({
      draw: { ...DRAW, short: 'VegaVisual draws your spec: two text marks.', why: <>The skill's rule for a single value: one layer in the <code>labelCallout</code> style, one in <code>labelSubtitle</code>, both cut with "…" when the card is too narrow. The two styles are in the package's theme.</>, cite: [`${V}:1310-1322`, `${V}:1592-1631`] },
      extra: [
        youItem('Label', 'the label under the number', 'The field name appears as the label.', 'Written in the spec, with its position.', <>1.0.0's chart never reads <code>displayName</code>, so the spec writes "Revenue". The skill's reference says the subtitle style sits 32 px lower by itself; the code has no offset, so the spec adds <code>"dy": 28</code>.</>, [`${V}:1318-1322`]),
        youItem('Display units', 'short numbers such as 150.63M (not built here)', 'Display units: Auto shortens the number (K, M, bn, T).', 'Shows the full number: $150,632,574.', <>Learn: "By default, the card visual's callout value uses Display units set to Auto, which abbreviates large numbers with a K (thousands), M (millions), bn (billions), or T (trillions) suffix." The app's card shows the column's format, <code>$#,0</code>, the model's format for Revenue. A format with scaling commas, <code>$#,0.00,,"M"</code>, gives $150.63M in numfmt (tried in Node), at the price of a format that differs from the model's.</>, undefined, [`${LEARN_CARD}#show-full-numbers-or-change-display-units`]),
      ],
      sort: NO_SORT,
      noSort: true,
      click: [{ mark: 'pbi', short: 'Slicers and other visuals filter it; a click on it filters nothing.', why: <>Learn: on a card, "the category headers are selectable and filter other visuals". This card has no Categories field, so it has nothing to select.</>, cite: [`${LEARN_CARD}#add-categories`] }, APP_NO_CLICK],
      clickPlain: 'reacting to a filter',
      pbiTip: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> },
      tip: { mark: 'you', short: 'Switched off in the spec; a card has nothing to add.', why: <>The theme turns tooltips on for every mark. Left on, hovering the number showed a tooltip that only said "true" (checked in the page), so both text marks have <code>"tooltip": null</code>.</>, cite: [`${V}:1259-1261`] },
      format: { ...FORMAT, short: 'Your column format reaches the number.', cite: [`${V}:122`, `${V}:185-188`, `${CORE}:300`] },
      show: [{ mark: 'unchecked', short: '—', why: <>Not checked for a card.</> }, { ...chartShowTable, short: 'One number; a table adds nothing.' }],
    }),
    devNotes: [
      <>The well name is from Learn's card article: "Add a measure or any data column to the Values field well" (<code>{LEARN_CARD}</code>). In the report's files the well is called <code>Data</code>.</>,
    ],
  },
  {
    id: 'kpi',
    name: 'KPI',
    group: 'Cards and KPIs',
    blurb: 'The latest year\'s revenue over its trend. No target. An approximation.',
    inPowerBI: 'drop 2 fields',
    pbiText: <>A KPI: Revenue in the Value well, Year in the Trend axis well, and no Target. Power BI shows a value over the trend as a background; in the Gold Layer example report's KPI, it is the latest year's. With a Target it also shows the distance to it and colours the value. The app side draws the number over an area; it has no target either. The latest year here is 2026, which is not a full year in this data.</>,
    wells: [{ name: 'Value', fields: ['Revenue'] }, { name: 'Trend axis', fields: ['Year'] }],
    packages: PKG_CHART,
    ...files('sales-by-year.dax', 'sales-by-year-kpi.json', 'revenue-kpi.tsx', 'sales-by-year-kpi.ts'),
    restNote: REST_STATIC,
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>In Power BI you drop Revenue on Value and Year on Trend axis. In an app that is a DAX query with one row per year.</>,
        excerpts: [{ path: `${Q}sales-by-year.dax`, whole: true, notes: [{ at: "'date'[Year]", note: '≈ Trend axis well: Year' }, { at: '"Revenue", [Revenue]', note: '≈ Value well: Revenue' }, { at: '"Orders", [# Orders]', note: 'extra column, ignored here' }, { at: 'ORDER BY', note: '≈ years in order' }] }],
        after: <>The query is shared with the Column chart and the Line and column pages.</>,
      },
      specCard(<>There is no KPI in the chart language. The spec draws two layers: the trend as an area without axis labels, and the latest year's number on top.</>, {
        path: `${Q}sales-by-year-kpi.json`, whole: true,
        notes: [{ at: '"type": "area"', note: '≈ Trend axis: on, as the background' }, { at: '"joinaggregate"', note: '≈ find the latest year…' }, { at: '"filter"', note: '≈ …and keep only that row' }, { at: '"labelCallout"', note: '≈ Callout value' }],
      }),
      NO_CLICK_JOB,
    ],
    score: score({
      draw: { ...DRAW, short: 'VegaVisual draws your spec: an area and a number.' },
      extra: [
        youItem('Latest value', 'picking the latest value', 'Shows the value of the last point on the trend axis.', 'Two lines in the spec pick the latest year.', <>That Power BI's KPI shows the last point is described from the gallery's KPI page; Learn's article doesn't say it in so many words.</>, undefined, [LEARN_KPI]),
        youItem('Target and distance', 'the target, the distance to it and its colour (not built here)', 'A Target adds the goal, the distance and a colour.', NOT_BUILT, <>Learn: the Target well takes the goal, "Distance to goal sets the style and direction of the distance from the goal", and the trend axis has a direction such as "High is good". This page has no target: no saved answer has one. In an app it would be one more column, a calculation and more text layers.</>, undefined, [LEARN_KPI]),
      ],
      sort: [{ mark: 'pbi', short: 'Sorted before it becomes a KPI; no sort option after.', why: <>Learn: "Once you convert the visualization to a KPI, there's no option to sort."</>, cite: [LEARN_KPI] }, SORT_YEARS],
      sortPlain: 'the order of the years',
      click: [PBI_NO_CLICK, APP_NO_CLICK],
      clickPlain: 'reacting to a filter',
      pbiTip: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> },
      tip: { mark: 'pkg', short: 'A hover line with the year and its revenue, added for you.', why: <>For a spec with one line or area layer and no <code>params</code>, the package adds a vertical rule that follows the pointer and a tooltip in the column's format: "Year 2024, Revenue $34,958,423" (checked in the page). The tooltip names the column by its code name, so this page's column list calls the column <code>Year</code>. The number's own tooltip is switched off in the spec.</>, cite: [`${V}:1361-1384`, `${V}:1385-1416`, `${V}:1417-1509`] },
      format: { ...FORMAT, short: 'Your column format reaches the number.', cite: [`${V}:122`, `${V}:185-188`] },
      show: [{ mark: 'unchecked', short: '—', why: <>Not checked for a KPI.</> }, chartShowTable],
    }),
    devNotes: [
      <>The axes are emptied with <code>"labels": false</code>, not <code>"axis": null</code>: for a column with a format, the package writes the format into the axis and so would bring a removed axis back (<code>fabric-visuals/dist/index.js:175-179</code>; read from the code, not tried).</>,
      variation('KPIs with a target (last year\'s revenue, or a revenue target)', 'the trend-only form, on revenue by year'),
      ZERO_NOTE,
      <>2026 is the latest year in the saved answer and it is not a full year (the data ends in November 2026).</>,
    ],
  },
  {
    id: 'table',
    name: 'Table',
    group: 'Tables',
    blurb: 'Orders and revenue by store country. A click picks a row.',
    inPowerBI: 'drop 3 fields',
    hint: 'Click a row: the page names the country. Click it again to clear. Click a header to sort.',
    pbiText: <>A table: the store's CountryName, # Orders and Revenue in the Columns well. A Power BI table can also show a row for totals. The app side shows the same rows in a grid, without a total.</>,
    wells: [{ name: 'Columns', fields: ['CountryName', '# Orders', 'Revenue'] }],
    packages: PKG_GRID,
    ...files('orders-and-revenue-by-store-country.dax', null, 'sales-by-country-table.tsx', 'orders-and-revenue-by-store-country.ts'),
    restNote: 'the lines that bring in the packages, sending the query, the loading and error messages, the line that names the pick, and layout',
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>Three fields in the Columns well, three lines of the query.</>,
        excerpts: [{ path: `${Q}orders-and-revenue-by-store-country.dax`, whole: true, notes: [{ at: "'store'[CountryName]", note: '≈ Columns well: CountryName' }, { at: '"Orders", [# Orders]', note: '≈ Columns well: # Orders' }, { at: '"Revenue", [Revenue]', note: '≈ Columns well: Revenue' }, { at: 'ORDER BY', note: '≈ Sort by Revenue, descending' }] }],
      },
      {
        pbi: 'Format pane',
        app: 'grid',
        text: <>A table needs no chart spec. One line hands the rows to the grid, which takes its headers and number formats from the column list.</>,
        excerpts: [{ path: `${C}sales-by-country-table.tsx`, find: ['<DataGrid data'], notes: [{ at: '<DataGrid data', note: '≈ the visual type: table' }] }],
        after: <>The column names and formats are in the small query file; see <b>For developers</b>.</>,
      },
      {
        pbi: 'Interactions',
        app: 'click handler',
        text: <>Power BI filters the other visuals when you click a row. In an app the grid tells you which row was clicked, and what happens next is yours. Here the page names the pick.</>,
        excerpts: [{ path: `${C}sales-by-country-table.tsx`, block: ['function handleRowInteraction'], notes: [{ at: 'function handleRowInteraction', note: '≈ what a click does' }, { at: 'event.action === "clear"', note: '≈ second click on the row: clear' }, { at: 'const picked', note: '≈ which row was clicked' }, { at: 'setCountry(picked', note: '≈ the page remembers that country' }] }],
      },
    ],
    score: [
      { item: 'Data query', pbi: PBI_QUERY, app: APP_QUERY },
      { item: 'Shaping the rows', pbi: PBI_ROWS, app: APP_ROWS },
      { item: 'Drawing', plain: 'drawing the grid', pbi: PBI_DRAW, app: { mark: 'pkg', short: 'DataGrid draws the rows: one line of JSX.', why: <>From a <code>DataTable</code> the grid makes its own columns: the header is <code>displayName</code>, and numbers are right-aligned.</>, cite: [`${DG}:1746-1766`, `${DG}:1788-1818`] } },
      youItem('Total row', 'the Total row (not built here)', 'A Total row, worked out by the model.', NOT_BUILT, <>1.0.0's grid has no totals; 5.4.0 lists a <code>grandTotals</code> prop (read from the npm tarball). A total is another query, as on the Card page: adding up the rows is only right for measures that add up, and a distinct count such as # Orders may not. Learn's format-settings article says "the table visual displays a single grand total row rather than subtotals"; whether it is on by default was not checked.</>, undefined, [LEARN_GRID_FORMAT]),
      { item: 'Tooltip', pbi: { mark: 'pbi', short: 'Shows the cell value on hover.', why: <>Learn: "Tables and matrices show the cell value on hover."</>, cite: [LEARN_TOOLTIPS] }, app: { mark: 'pkg', short: 'On cells whose text is cut off.', why: <>README: a native <code>title</code> tooltip "only when content is actually truncated". Not exercised here: no cell is cut off.</>, cite: ['fabric-datagrid/README.md (Features)'] } },
      { item: 'Number formatting', pbi: PBI_FORMAT, app: { mark: 'pkg', short: 'Your column format applies to the cells.', why: <>The grid formats each cell with the column's format through numfmt.</>, cite: [`${DG}:842-845`, `${DG}:1749-1754`, `${CORE}:300`] } },
      { item: 'Sort', pbi: { mark: 'pbi', short: 'Click a header to sort.' }, app: { mark: 'pkg', short: 'Click a header to sort; Shift+click adds a column.', why: <>Unsorted, ascending, descending, in turn. The first order is the query's <code>ORDER BY</code>.</>, cite: [`${DG}:752-770`, `${DG}:1000-1060`, 'fabric-datagrid/README.md (Features)'] } },
      { item: 'Column filters', plain: 'filter, resize and reorder on the headers', pbi: { mark: 'unchecked', short: '—', why: <>Power BI filters through the Filters pane and slicers; header filters on a table were not checked.</> }, app: { mark: 'pkg', short: 'Filter, resize and reorder from the headers.', why: <>A filter icon per column opens a searchable checklist; headers resize by dragging and reorder by drag and drop.</>, cite: [`${DG}:426-657`, `${DG}:1068-1180`, `${DG}:1188-1280`] } },
      { item: 'Selection and cross-filter', plain: 'acting on a click', pbi: { mark: 'pbi', short: 'A click on a row filters the other visuals.' }, app: { mark: 'you', short: 'The grid reports the row; you decide what to filter.', why: <>A click sends <code>select</code> with every column of the row; a second click on the same row sends <code>clear</code>. The grid is not rebuilt by this page, so its own clear works and the handler needs no toggle.</>, cite: [`${DG}:1667-1707`] } },
      { item: 'Keyboard and screen reader', plain: 'picking a row with the keyboard', pbi: PBI_KEYS, app: { mark: 'you', short: 'Arrow keys move between cells; picking a row is mouse only.', why: <>Cells take focus and the arrow keys move it; the code is there, and it was not tried in the page. The row pick listens for clicks only.</>, cite: [`${DG}:396-405`, `${DG}:1590-1630`, `${DG}:1687-1705`] } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'Follows your CSS colours and dark mode.', why: <>The grid is HTML and reads the page's <code>--color-*</code> variables directly; passing <code>useCssTheme()</code> keeps it in step with the charts. Try the theme switch on the app side.</>, cite: [`${DG}:1949-1974`, `${VD} (useCssTheme)`] } },
      { item: 'Export', plain: 'export to a file', pbi: PBI_EXPORT, app: { mark: 'you', short: 'No file export. Selected cells copy with Ctrl+C.', why: <>The grid copies the selected cells as tab-separated text.</>, cite: [`${DG}:1566-1586`] } },
      { item: 'Conditional formatting', plain: 'data bars and colours in cells (not built here)', pbi: { mark: 'pbi', short: 'Data bars, colours and icons from the Format pane.', why: <>Not checked on Learn for this page.</> }, app: { mark: 'you', short: 'A cell renderer per column, written in React.', why: <>Rayfin's skill shows a data bar as a <code>cellRenderer</code>. A column with one loses its number format, so the renderer formats too. Not built here.</>, cite: ['rayfin-cli/templates/data-app/.agents/skills/visuals/references/data-grid-visual.md'] } },
    ],
    devNotes: [
      variation('a table by product category with revenue, margin and margin %', 'a table by store country with orders and revenue'),
      <>The rows are passed as a <code>DataTable</code>, so the grid needs no column definitions. Passing plain row objects is the other way in; then you write the columns yourself.</>,
      <>Rayfin's skill says the grid's parent must scroll (<code>overflow: auto</code>); the component does that.</>,
      V5_NOTE,
    ],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    group: 'Tables',
    blurb: 'Categories down, years across. A grid, pivoted in code. An approximation.',
    inPowerBI: 'drop 3 fields',
    hint: 'Click a row: the page names the category. Click it again to clear. Click a header to sort.',
    pbiText: <>A matrix: CategoryName in the Rows well, Year in the Columns well, Revenue in the Values well. Power BI turns the years into columns, and can add totals for rows and columns. The app side turns the years into columns in code and shows them in a grid, without totals.</>,
    wells: [{ name: 'Rows', fields: ['CategoryName'] }, { name: 'Columns', fields: ['Year'] }, { name: 'Values', fields: ['Revenue'] }],
    packages: PKG_GRID,
    ...files('revenue-by-category-and-year.dax', null, 'revenue-by-category-matrix.tsx', 'revenue-by-category-and-year.ts'),
    restNote: 'the lines that bring in the packages, sending the query, the loading and error messages, the line that names the pick, and layout',
    jobs: [
      {
        pbi: 'Fields',
        app: 'DAX query',
        text: <>Three wells, three lines of the query. The answer comes back long: one row per category and year.</>,
        excerpts: [{ path: `${Q}revenue-by-category-and-year.dax`, whole: true, notes: [{ at: "'product'[CategoryName]", note: '≈ Rows well: CategoryName' }, { at: "'date'[Year]", note: '≈ Columns well: Year' }, { at: '"Revenue", [Revenue]', note: '≈ Values well: Revenue' }] }],
      },
      {
        pbi: 'Format pane',
        app: 'pivot, then grid',
        text: <>The grid has no Columns well. The component turns the long answer into one row per category with a column per year, and one line hands that to the grid.</>,
        excerpts: [
          { path: `${C}revenue-by-category-matrix.tsx`, block: ['const pivoted = useMemo'], notes: [{ at: 'const years', note: '≈ Columns well: one column per year' }, { at: 'for (const [name', note: '≈ put each value in its row and column' }, { at: 'columns: [categoryColumn', note: '≈ headers 2023, 2024, …, in the Revenue format' }] },
          { path: `${C}revenue-by-category-matrix.tsx`, find: ['<DataGrid data'], notes: [{ at: '<DataGrid data', note: '≈ the visual type: a grid of the pivoted rows' }] },
        ],
      },
      {
        pbi: 'Interactions',
        app: 'click handler',
        text: <>Power BI filters the other visuals when you click a row header or a cell. In an app the grid tells you which row was clicked, not which cell. Here the page names the row's category.</>,
        excerpts: [{ path: `${C}revenue-by-category-matrix.tsx`, block: ['function handleRowInteraction'], notes: [{ at: 'function handleRowInteraction', note: '≈ what a click does' }, { at: 'event.action === "clear"', note: '≈ second click on the row: clear' }, { at: 'const picked', note: '≈ which row was clicked' }, { at: 'setCategory(picked', note: '≈ the page remembers that category' }] }],
      },
    ],
    score: [
      { item: 'Data query', pbi: PBI_QUERY, app: APP_QUERY },
      { item: 'Shaping the rows', pbi: PBI_ROWS, app: APP_ROWS },
      youItem('Pivot', 'turning the years into columns', 'The Columns well turns a field into columns.', 'About a dozen lines in the component.', <>Neither the grid nor the core package has a pivot: the core's helpers filter, slice, group and aggregate. The component builds a new <code>DataTable</code> with a column per year.</>, ['fabric-visuals-core/dist/index.d.ts (exports)', 'fabric-datagrid/dist/index.d.ts (DataGridProps)'], [LEARN_MATRIX]),
      { item: 'Drawing', plain: 'drawing the grid', pbi: PBI_DRAW, app: { mark: 'pkg', short: 'DataGrid draws the pivoted rows: one line of JSX.', cite: [`${DG}:1746-1766`, `${DG}:1788-1818`] } },
      youItem('Totals', 'row and column totals (not built here)', 'Totals for rows and columns, worked out by the model.', NOT_BUILT, <>1.0.0's grid has no totals. Totals belong in the query: adding up cells is only right for measures that add up. Learn's format-settings article describes Row subtotals and Column subtotals toggles and the grand totals; whether they are on by default was not checked. The gallery's matrix page says "with subtotals".</>, undefined, [LEARN_GRID_FORMAT]),
      youItem('Expand and collapse', 'row levels that expand and collapse (not built here)', 'Row levels expand with +.', 'The grid can do it; you build the levels.', <>Learn: "expand the row and column headers by selecting the + icons". The grid draws rows with children as a tree with a toggle, and grouped column headers, but only when you pass row objects and column definitions, not a <code>DataTable</code>. This page has one row level and doesn't use either.</>, [`${DG}:1710-1721`, `${DG}:22-40`, 'fabric-datagrid/README.md (Features)'], [LEARN_MATRIX]),
      { item: 'Tooltip', pbi: { mark: 'pbi', short: 'Shows the cell value on hover.', cite: [LEARN_TOOLTIPS] }, app: { mark: 'pkg', short: 'On cells whose text is cut off.', why: <>README: a native <code>title</code> tooltip "only when content is actually truncated".</>, cite: ['fabric-datagrid/README.md (Features)'] } },
      { item: 'Number formatting', pbi: PBI_FORMAT, app: { mark: 'pkg', short: 'Each year column carries the Revenue format.', why: <>The pivot copies the Revenue column's definition, format included, to every year column; the grid formats the cells with it.</>, cite: [`${DG}:842-845`, `${DG}:1749-1754`] } },
      { item: 'Sort', pbi: { mark: 'pbi', short: 'Sort from the header menu.' }, app: { mark: 'pkg', short: 'Click any header to sort by that column.', cite: [`${DG}:752-770`, `${DG}:1000-1060`] } },
      { item: 'Selection and cross-filter', plain: 'acting on a click', pbi: { mark: 'pbi', short: 'A click on a header or cell filters the other visuals.' }, app: { mark: 'you', short: 'The grid reports the row, not the cell; you decide the rest.', why: <>A click sends <code>select</code> with every column of the row, so the year of the clicked cell is not in it.</>, cite: [`${DG}:1667-1707`] } },
      { item: 'Keyboard and screen reader', plain: 'picking a row with the keyboard', pbi: PBI_KEYS, app: { mark: 'you', short: 'Arrow keys move between cells; picking a row is mouse only.', why: <>The code is there; it was not tried in the page.</>, cite: [`${DG}:396-405`, `${DG}:1590-1630`, `${DG}:1687-1705`] } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'Follows your CSS colours and dark mode.', cite: [`${DG}:1949-1974`, `${VD} (useCssTheme)`] } },
      { item: 'Export', plain: 'export to a file', pbi: PBI_EXPORT, app: { mark: 'you', short: 'No file export. Selected cells copy with Ctrl+C.', cite: [`${DG}:1566-1586`] } },
    ],
    devNotes: [
      <>The answer for this query is derived, not captured as one query: see Where the numbers come from, below.</>,
      <>The pivot uses <code>getUniqueColumnValues</code> from fabric-visuals-core for the years, in the order they first appear.</>,
      V5_NOTE,
    ],
  },
  {
    id: 'decomposition-tree',
    name: 'Decomposition tree',
    group: 'AI and maps',
    blurb: 'No drop-in equivalent: a tree you drill in any order, with AI splits.',
    inPowerBI: 'drop 5 fields in 2 wells',
    pbiText: <>A decomposition tree with Revenue in Analyze, and Continent, CategoryName, Brand and Year in Explain by. The viewer clicks + on a bar and picks the next field, in any order, or lets an AI split pick the field with the highest or lowest value.</>,
    wells: [{ name: 'Analyze', fields: ['Revenue'] }, { name: 'Explain by', fields: ['Continent', 'CategoryName', 'Brand', 'Year'] }],
    packages: <>None. No Fabric visuals package draws a tree or lets a viewer choose the next split.</>,
    headlineFiles: [], extras: [], allFiles: [], restNote: '', jobs: [],
    takesLead: <>In an app, the tree itself is not possible with Microsoft's packages. A drill-down made of ordinary bar charts is: the packages draw each level, and you write the rest.</>,
    noEquiv: {
      why: <>A decomposition tree is a small application of its own. It queries the model again at every click, lets the viewer pick the next field in any order, and its AI splits look through all the remaining fields for the highest or lowest value. The Fabric visuals packages draw charts and tables from rows you already have; none draws a tree or runs that search. So there is nothing honest to show here, and this page doesn't fake it.</>,
      instead: [
        <><b>A fixed drill path of bar charts.</b> One bar chart per level, side by side: a click on a bar filters the next chart, as on the Bar chart page. You choose the order of the fields in advance; the viewer can't.</>,
        <><b>Let the viewer choose the next field</b> with a dropdown above each level. Every choice is one more query, with the fields picked so far as its filters. The state, the queries and the layout are yours to write.</>,
        <><b>An AI split is a search you can write.</b> Learn describes High value as considering all available fields and choosing the one that leads to the highest value. In an app: run one query per remaining field and keep the largest result. That is many queries per click; it was not built or timed here.</>,
      ],
      source: <>How Power BI does it: Microsoft Learn, "Create and view decomposition tree visuals in Power BI".</>,
    },
    score: [
      { item: 'Data query', plain: 'a query per level', pbi: { mark: 'pbi', short: 'Queries the model again at every split.' }, app: { mark: 'you', short: 'One query per level, filtered by the path so far.', why: <>No saved answers for these queries, so this page shows no numbers.</> } },
      { item: 'Shaping the rows', pbi: PBI_ROWS, app: APP_ROWS },
      { item: 'Drawing', plain: 'the tree', pbi: { mark: 'pbi', short: 'Draws the tree and its connectors.', why: <>Up to 50 levels, 5,000 data points, and the top 10 per level.</>, cite: [`${LEARN_DECOMP}#considerations-and-limitations`] }, app: { mark: 'no', short: 'No tree in the packages; a bar chart per level works.', why: <>The 1.0.0 packages export <code>VegaVisual</code> and <code>DataGrid</code>, and Vega-Lite has no tree layout.</>, cite: [VD, 'fabric-datagrid/dist/index.d.ts (exports)'] } },
      { item: 'Choosing the next field', plain: 'letting the viewer choose the next field', pbi: { mark: 'pbi', short: 'Click + and pick any field, in any order.', why: <>Learn: "you can drill into fields in any order you want".</>, cite: [`${LEARN_DECOMP}#get-started`] }, app: { mark: 'you', short: 'Your own control, state and queries.' } },
      { item: 'AI splits', plain: 'AI splits (a search across the fields)', pbi: { mark: 'pbi', short: 'High value and Low value pick the field for you.', why: <>Learn: High Value "considers all available fields and determines which one to drill into to get the highest value of the measure being analyzed". There is also a Relative mode, which looks for values that stand out.</>, cite: [`${LEARN_DECOMP}#ai-splits`] }, app: { mark: 'you', short: 'One query per remaining field; keep the largest.', why: <>The Absolute mode is a search over query results. The Relative mode's calculation is on Learn too. Neither was built here.</> } },
      { item: 'Tooltip', plain: 'for the bar charts you build: tooltip', pbi: PBI_TIP, app: { ...TIP_AXIS, short: 'Your bar charts: as on the Bar chart page.', why: <>Nothing was drawn or tested on this page. For bars, see the Bar chart page.</> } },
      { item: 'Number formatting', pbi: PBI_FORMAT, app: { ...FORMAT, short: 'Your bar charts: as on the Bar chart page.' } },
      { item: 'Sort', plain: 'ordering each level', pbi: { mark: 'pbi', short: 'Each level is ordered for you.' }, app: { mark: 'you', short: 'ORDER BY in each query.' } },
      { item: 'Selection and cross-filter', plain: 'filtering other visuals from the tree', pbi: { mark: 'pbi', short: 'A node on the last level cross-filters the page.', why: <>Learn: "Selecting a node from the last level cross-filters the data. Selecting a node from an earlier level changes the path." Other visuals also filter the tree.</>, cite: [`${LEARN_DECOMP}#get-started`] }, app: { ...APP_CLICK, short: 'Each chart reports its click; you pass it on.' } },
      { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: { ...APP_KEYS, short: 'Your bar charts: mouse only.' } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { ...chartTheme, short: 'Your bar charts: as on the Bar chart page.' } },
      { item: 'Export', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: APP_EXPORT },
      { item: '"Show as table"', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: { ...chartShowTable, short: 'A DataGrid per level.' } },
    ],
    devNotes: [],
  },
  {
    id: 'azure-map',
    name: 'Azure map',
    group: 'AI and maps',
    blurb: 'No drop-in equivalent: a map needs a map service.',
    inPowerBI: 'drop 2 fields',
    pbiText: <>An Azure Maps visual with the customer's country in Location and Revenue in Size: one bubble per country on a world map. Power BI fetches the map from Azure Maps and asks it where each country is.</>,
    wells: [{ name: 'Location', fields: ['CountryFull'] }, { name: 'Size', fields: ['Revenue'] }],
    packages: <>None. No Fabric visuals package includes a map, its tiles or a place-name lookup.</>,
    headlineFiles: [], extras: [], allFiles: [], restNote: '', jobs: [],
    takesLead: <>In an app, the map itself is not possible with Microsoft's visuals packages. With a map service of your own, or with outlines and coordinates you bring, you write the rest.</>,
    noEquiv: {
      why: <>Behind this visual is a service. Power BI sends Azure Maps the area in view and gets map images back, and it sends the place names in Location to be turned into coordinates. Your administrator switches that on for the whole tenant. The Fabric visuals packages draw charts and tables; they have no map, no map images and no lookup from "Germany" to a point. An app would need its own Azure Maps account and its keys. So there is nothing honest to show here, and this page doesn't fake it.</>,
      instead: [
        <><b>A ranked bar chart.</b> If the question is "which country sells most", the Bar chart page answers it without a map.</>,
        <><b>A drawn map without a service.</b> The chart language can draw outlines from a file of country shapes and place points by latitude and longitude. You supply the shapes file and the coordinates: there is no background map and no place-name lookup. That route was not built or tested here.</>,
        <><b>A real map from Azure Maps.</b> Its web map control is another library, with your own Azure Maps account and a key or sign-in for it. Rayfin's visuals skill says to ask the user before using a library other than its own two components. Not built here.</>,
      ],
      source: <>How Power BI does it: Microsoft Learn, "Get started with Azure Maps Power BI visual" and "Manage Azure Maps Power BI visual within your organization".</>,
    },
    score: [
      { item: 'Data query', pbi: PBI_QUERY, app: { ...APP_QUERY, why: <>Revenue by customer country was not captured, so this page shows no numbers.</> } },
      { item: 'Shaping the rows', plain: 'coordinates for every place', pbi: { mark: 'pbi', short: 'Place names are looked up for you.', why: <>Learn: "Data in the Location bucket may be sent to Azure to retrieve map coordinates (a process called geocoding)."</>, cite: [`${LEARN_MAP}#what-is-sent-to-azure`] }, app: { mark: 'you', short: 'Bring latitude and longitude, or call a lookup service.' } },
      { item: 'Drawing', plain: 'the map', pbi: { mark: 'pbi', short: 'Draws the map and the bubbles on it.', why: <>The map images come from Azure Maps; the bubbles are drawn in the browser. A tenant setting enables the visual.</>, cite: [`${LEARN_MAP}#what-is-sent-to-azure`, LEARN_MAP_ADMIN] }, app: { mark: 'no', short: 'No map in the packages.', why: <>The 1.0.0 packages export <code>VegaVisual</code> and <code>DataGrid</code>. Vega-Lite has a mark for shapes and map projections, but it draws only what you give it.</>, cite: [VD, `${V}:1255-1258`] } },
      { item: 'Tooltip', pbi: PBI_TIP, app: { mark: 'you', short: 'Depends on the route you take.' } },
      { item: 'Number formatting', pbi: PBI_FORMAT, app: { mark: 'you', short: 'Depends on the route you take.' } },
      { item: 'Sort', unlisted: true, pbi: { mark: 'pbi', short: 'Nothing to sort on a map.' }, app: { mark: 'pkg', short: 'Nothing to sort on a map.' } },
      { item: 'Selection and cross-filter', plain: 'acting on a click', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: { mark: 'you', short: 'Depends on the route you take.' } },
      { item: 'Keyboard and screen reader', plain: 'keyboard use', pbi: PBI_KEYS, app: { mark: 'you', short: 'Depends on the route you take.' } },
      { item: 'Theme and dark mode', pbi: PBI_THEME, app: { mark: 'you', short: 'Depends on the route you take.' } },
      { item: 'Export', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: APP_EXPORT },
      { item: '"Show as table"', pbi: { mark: 'unchecked', short: '—', why: <>Not checked for this visual.</> }, app: { ...chartShowTable, short: 'A DataGrid of the same rows.' } },
    ],
    devNotes: [],
  },
];
