// The longer pieces of code the lessons paste, as text. lesson-list.mjs uses them in steps
// (snippets and exact edits); tools/check-lessons.mjs type-checks the project after every step.

// ---------------------------------------------------------------- Set up: a first query
export const TEST_PAGE = `import { useEffect, useState } from 'react';
import { getRayfinClient } from './lib/rayfin-client';

// A first test: one query, one number. The next lesson replaces it with a real page.
export default function App() {
  const [text, setText] = useState('Asking the model…');

  useEffect(() => {
    getRayfinClient()
      .then((client) => client.connectors.contoso.executeQuery({ query: 'EVALUATE ROW ( "Revenue", [Revenue] )' }))
      .then((r) => setText(r.status === 'success' ? \`Revenue: \${String(r.table.rows[0][0])}\` : r.error.message))
      .catch((e: unknown) => setText(String(e)));
  }, []);

  return <p className="p-4 text-2xl">{text}</p>;
}
`;

// ---------------------------------------------------------------- Build a page
export const CANVAS = `export default function App() {
  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1">
        <h1 className="text-2xl font-bold">Sales overview</h1>
      </header>
      <div className="col-span-3 row-span-2 rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-500">Revenue (USD)</p>
        <p className="text-2xl font-bold">150.6M</p>
      </div>
      <div className="col-span-3 row-span-2 rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-500">Orders</p>
        <p className="text-2xl font-bold">57.7K</p>
      </div>
      <section className="col-span-6 row-span-5 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Revenue by store country</h2>
      </section>
      <section className="col-span-6 row-span-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">About this page</h2>
        <p>Contoso sample model, revenue in USD.</p>
      </section>
    </div>
  );
}
`;

export const KPI_CARD = `type KpiCardProps = {
  title: string;
  value: number;
};

// A card visual: a title and one number, shown compact (150.6M), like a card's display units.
export function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</p>
    </div>
  );
}
`;

// ---------------------------------------------------------------- Get data
// ---------------------------------------------------------------- the query files (src/queries/<page>/)
// Each is a whole DAX query, as DAX query view in Power BI Desktop runs it. The playground answers a query
// from the saved results by its text (ignoring spacing and letter case), so these texts are the ones
// tools/make-catalog.mjs saved. No comments in them, except the /* filters */ marker, which the code replaces.
export const COUNTRY_DAX = `EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
`;

export const TOTALS_DAX = `EVALUATE
ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)
`;

// Measure or query: first with its formula written in, then the model's own measure.
export const MARGIN_IN_QUERY_DAX = `DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )
`;

export const MARGIN_FROM_MODEL_DAX = `EVALUATE
ROW ( "Margin %", [Margin %] )
`;

export const CATEGORY_DAX = `EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    /* filters */ "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
`;

export const YEARS_DAX = `EVALUATE
SUMMARIZECOLUMNS (
    'date'[Year],
    "Revenue", [Revenue],
    "Orders", [# Orders]
)
ORDER BY 'date'[Year]
`;

// The second model's queries (Two semantic models).
export const PARETO_HEADLINE_DAX = `EVALUATE
ROW (
    "Categories to 80%", [# Categories to 80%],
    "Headline", [Cutoff Headline]
)
`;

export const PARETO_BY_CATEGORY_DAX = `EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    /* filters */ "Revenue", [Revenue], "Share %", [Revenue Share %], "Cumulative %", [Revenue Cumulative %]
)
ORDER BY [Revenue] DESC
`;

export const REVENUE_CARD_DAX = `EVALUATE
ROW ( "Revenue", [Revenue] )
`;

// Each .dax file has a small .ts file of the same name, as the analytics skill keeps them: a function named after the
// file, in camelCase, that returns what useSemanticModelQuery takes, { connection, query }. The skill's full factory also
// returns columnMetadata and vegaLiteSpec, for the visuals pack's charts; our own components don't need them.
export const COUNTRY_TS = `import revenueByStoreCountryDax from './revenue-by-store-country.dax?raw';

// The countries chart's query, from its .dax file.
export function revenueByStoreCountry() {
  return { connection: 'contoso', query: revenueByStoreCountryDax };
}
`;
export const COUNTRY_FN_V1 = `export function revenueByStoreCountry() {
  return { connection: 'contoso', query: revenueByStoreCountryDax };
}`;
export const COUNTRY_FN_YEAR = `export function revenueByStoreCountry(year?: number) {
  return { connection: 'contoso', query: withFilters(revenueByStoreCountryDax, filters(year)) };
}`;
export const TOTALS_TS = `import salesTotalsDax from './sales-totals.dax?raw';

// The cards' query, from its .dax file: one row, three measures.
export function salesTotals() {
  return { connection: 'contoso', query: salesTotalsDax };
}
`;
export const TOTALS_FN_V1 = `export function salesTotals() {
  return { connection: 'contoso', query: salesTotalsDax };
}`;
export const TOTALS_FN_YEAR = `export function salesTotals(year?: number) {
  const f = filters(year);
  if (f.length === 0) return { connection: 'contoso', query: salesTotalsDax };
  // ROW has no place for a filter: with one, it goes inside CALCULATETABLE.
  const row = salesTotalsDax.replace('EVALUATE', '').trim();
  return { connection: 'contoso', query: \`EVALUATE CALCULATETABLE ( \${row}, \${f.join(', ')} )\` };
}`;
export const MARGIN_TS = `import marginPctDax from './margin-pct.dax?raw';

// The Margin % card's query, from its .dax file.
export function marginPct() {
  return { connection: 'contoso', query: marginPctDax };
}
`;
export const CATEGORY_TS = `import { filters, withFilters } from '../../lib/filters';
import revenueByCategoryDax from './revenue-by-category.dax?raw';

// The category chart's query, from its .dax file, with the page's filters where it has /* filters */.
export function revenueByCategory(year?: number, country?: string) {
  return { connection: 'contoso', query: withFilters(revenueByCategoryDax, filters(year, country)) };
}
`;
export const YEARS_TS = `import revenueByYearDax from './revenue-by-year.dax?raw';

// The Years page's query, from its .dax file.
export function revenueByYear() {
  return { connection: 'contoso', query: revenueByYearDax };
}
`;
export const PARETO_HEADLINE_TS = `import { filters } from '../../lib/filters';
import paretoHeadlineDax from './pareto-headline.dax?raw';

// The model's own count and sentence, for a headline card. A year: its ROW, inside CALCULATETABLE.
export function paretoHeadline(year?: number) {
  const f = filters(year);
  if (f.length === 0) return { connection: 'pareto', query: paretoHeadlineDax };
  const row = paretoHeadlineDax.replace('EVALUATE', '').trim();
  return { connection: 'pareto', query: \`EVALUATE CALCULATETABLE ( \${row}, \${f.join(', ')} )\` };
}
`;
export const PARETO_BY_CATEGORY_TS = `import { filters, withFilters } from '../../lib/filters';
import paretoByCategoryDax from './pareto-by-category.dax?raw';

// Categories, largest first, with the model's share and running share (its Pareto measures).
export function paretoByCategory(year?: number) {
  return { connection: 'pareto', query: withFilters(paretoByCategoryDax, filters(year)) };
}
`;
export const REVENUE_CARD_TS = `import { filters } from '../../lib/filters';
import revenueCardDax from './revenue-card.dax?raw';

// One measure by name, sent to the model you name: both, to compare their [Revenue].
export function revenueCard(connection: 'contoso' | 'pareto', year?: number) {
  const f = filters(year);
  if (f.length === 0) return { connection, query: revenueCardDax };
  const row = revenueCardDax.replace('EVALUATE', '').trim();
  return { connection, query: \`EVALUATE CALCULATETABLE ( \${row}, \${f.join(', ')} )\` };
}
`;
// The index.ts files: each folder re-exports its query files, and src/queries/index.ts re-exports the folders
// (the template's AGENTS.md, "Re-export via index.ts"), so a page imports every query from './queries'.
export const reExport = (name) => `export * from './${name}';\n`;
export const OVERVIEW_INDEX_V1 = reExport('revenue-by-store-country');
export const QUERIES_INDEX_V1 = reExport('overview');
export const IMPORT_FILTERS = `import { filters } from '../../lib/filters';`;
export const IMPORT_FILTERS_BOTH = `import { filters, withFilters } from '../../lib/filters';`;

// ---------------------------------------------------------------- src/lib/conversions.ts: results into what visuals draw
export const CONVERSIONS_V1 = `import type { SemanticModelQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';

// Conversions: each turns a query's result into what a visual draws.
export type Bar = { label: string; value: number };

export function toBars(result: SemanticModelQueryResult): Bar[] {
  if (result.status !== 'success') return [];
  return result.table.rows.map((row) => ({ label: String(row[0]), value: Number(row[1]) }));
}
`;
export const TO_BARS_BY_POSITION = `export function toBars(result: SemanticModelQueryResult): Bar[] {
  if (result.status !== 'success') return [];
  return result.table.rows.map((row) => ({ label: String(row[0]), value: Number(row[1]) }));
}`;
export const TO_BARS_BY_NAME = `// Columns are looked up by name, so a change in the DAX can't shift them.
export function toBars(result: SemanticModelQueryResult, labelColumn: string, valueColumn: string): Bar[] {
  if (result.status !== 'success') return [];
  const { columns, rows } = result.table;
  const l = columns.findIndex((c) => c.name === labelColumn);
  const v = columns.findIndex((c) => c.name === valueColumn);
  return rows.map((row) => ({ label: String(row[l]), value: Number(row[v]) }));
}`;
export const TOTALS_CONV = `

export type Totals = { revenue: number; orders: number; customers: number };

export function toTotals(result: SemanticModelQueryResult): Totals {
  if (result.status !== 'success' || result.table.rows.length === 0) return { revenue: 0, orders: 0, customers: 0 };
  const { columns, rows } = result.table;
  const at = (name: string) => columns.findIndex((c) => c.name === name);
  const row = rows[0];
  return { revenue: Number(row[at('[Revenue]')]), orders: Number(row[at('[Orders]')]), customers: Number(row[at('[Customers]')]) };
}`;
export const PERCENT_CONV = `

export function toPercent(result: SemanticModelQueryResult): number {
  if (result.status !== 'success' || result.table.rows.length === 0) return 0;
  const at = result.table.columns.findIndex((c) => c.name === '[Margin %]');
  return Number(result.table.rows[0][at]);
}`;
// Added in Use the second model, and in Two models, one page.
export const HEADLINE_CONV = `

export type Headline = { count: number; text: string };

export function toHeadline(result: SemanticModelQueryResult): Headline {
  if (result.status !== 'success' || result.table.rows.length === 0) return { count: 0, text: '' };
  const { columns, rows } = result.table;
  const at = (name: string) => columns.findIndex((c) => c.name === name);
  return { count: Number(rows[0][at('[Categories to 80%]')]), text: String(rows[0][at('[Headline]')]) };
}`;
export const PARETO_CONV = `

export type ParetoRow = { label: string; value: number; cumulative: number };

export function toPareto(result: SemanticModelQueryResult): ParetoRow[] {
  if (result.status !== 'success') return [];
  const { columns, rows } = result.table;
  const at = (name: string) => columns.findIndex((c) => c.name === name);
  const l = at('product[CategoryName]');
  const v = at('[Revenue]');
  const c = at('[Cumulative %]');
  return rows.map((row) => ({ label: String(row[l]), value: Number(row[v]), cumulative: Number(row[c]) }));
}

export function toRevenue(result: SemanticModelQueryResult): number {
  if (result.status !== 'success' || result.table.rows.length === 0) return 0;
  const at = result.table.columns.findIndex((c) => c.name === '[Revenue]');
  return Number(result.table.rows[0][at]);
}`;

// ---------------------------------------------------------------- src/components/: one visual per file (our choice;
// the template's AGENTS.md says only that components/ holds cards, charts and banners)
export const BAR_LIST_FILE = `import type { Bar } from '../lib/conversions';

type BarListProps = {
  rows: Bar[];
  selected?: string;
  onSelect?: (label: string) => void;
};

// A bar chart. It can report clicks (onSelect) and fade the other bars (selected):
// nothing uses that until the Cross-filter lesson.
export function BarList({ rows, selected, onSelect }: BarListProps) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <button
            type="button"
            onClick={() => onSelect?.(r.label)}
            className={\`w-full text-left \${selected !== undefined && selected !== r.label ? 'opacity-40' : ''}\`}
          >
            <div className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span>{r.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 rounded bg-yellow-400" style={{ width: \`\${(r.value / max) * 100}%\` }} />
          </button>
        </li>
      ))}
    </ul>
  );
}
`;
export const ERROR_PANEL_FILE = `// What a visual shows when its query fails: the model's own message.
export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
      <p className="font-semibold">This page could not load its data.</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
`;

// ---------------------------------------------------------------- Make it interactive
export const YEAR_SLICER_FILE = `// A slicer: it shows the selected year and reports clicks. It does not keep the year itself.
type YearSlicerProps = {
  value: number | undefined;
  onChange: (year: number | undefined) => void;
};

export function YearSlicer({ value, onChange }: YearSlicerProps) {
  const options = [undefined, 2023, 2024, 2025, 2026];
  return (
    <div className="flex gap-1">
      {options.map((y) => (
        <button
          key={y ?? 'all'}
          type="button"
          onClick={() => onChange(y)}
          className={\`rounded border px-3 py-1 text-sm \${y === value ? 'border-yellow-500 bg-yellow-400 font-semibold' : 'border-gray-300 bg-white'}\`}
        >
          {y ?? 'All'}
        </button>
      ))}
    </div>
  );
}
`;
// src/lib/filters.ts: both exported, since the query files import them.
export const FILTERS_FILE = `// One DAX filter per choice made on the page, like a slicer's filter on a visual.
export function filters(year?: number): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  return list;
}

// Puts the filters where a query file has its /* filters */ marker. DAX reads /* … */ as a comment,
// so the file still runs as it is, in DAX query view for example.
export function withFilters(dax: string, list: string[]): string {
  return dax.replace('/* filters */ ', list.map((f) => \`\${f}, \`).join(''));
}
`;
export const FILTERS_YEAR_FN = `export function filters(year?: number): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  return list;
}`;
export const FILTERS_BOTH_FN = `export function filters(year?: number, country?: string): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  if (country !== undefined) list.push(\`TREATAS ( { "\${country}" }, 'store'[CountryName] )\`);
  return list;
}`;
export const REPORT = `
// ------------------------------------------------------------ the report
type PageId = 'overview';

const PAGES: Record<PageId, { title: string; Component: () => ReactElement }> = {
  overview: { title: 'Overview', Component: OverviewPage },
};

// The report: a page list on the left, the open page on the right. The open page is state.
export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const { Component } = PAGES[page];
  return (
    <div className="flex">
      <nav className="w-36 shrink-0 space-y-1 p-4">
        {(Object.keys(PAGES) as PageId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            className={\`block w-full rounded px-3 py-2 text-left text-sm \${id === page ? 'bg-yellow-400 font-semibold' : 'bg-white'}\`}
          >
            {PAGES[id].title}
          </button>
        ))}
      </nav>
      <div className="flex-1">
        <Component />
      </div>
    </div>
  );
}
`;

export const YEARS_PAGE = `// A second page: sales by year.
function YearsPage() {
  const result = useSemanticModelQuery(revenueByYear());

  if (result.isLoading) return <p className="p-4">Loading…</p>;
  if (result.error) return <ErrorPanel message={result.error.message} />;
  if (result.data?.status === 'error') return <ErrorPanel message={result.data.error.message} />;
  const years = result.data ? toBars(result.data, 'date[Year]', '[Revenue]') : [];

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1">
        <h1 className="text-2xl font-bold">Sales by year</h1>
      </header>
      <section className="col-span-8 row-span-5 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Revenue by year (2026 runs to 9 November)</h2>
        <BarList rows={years} />
      </section>
    </div>
  );
}

`;

// ---------------------------------------------------------------- Own what the agent wrote
// Written the way an agent writes a page from one prompt, with four problems from earlier lessons.
export const AGENT_PAGE = `import { useEffect, useState } from 'react';
import type { SemanticModelQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { getRayfinClient } from './lib/rayfin-client';

// Added by an agent, from one prompt:
//   "A sales overview: revenue, orders, customers, margin %, and revenue by store country."

// ------------------------------------------------------------ 1. the queries
const totalsQuery = \`
EVALUATE
ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)
\`;

const countriesQuery = \`
EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Orders", [# Orders],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
\`;

const marginQuery = \`
DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )
\`;

// ------------------------------------------------------------ 2. reading results
type Bar = { label: string; value: number };
type Totals = { sales: number; orders: number; customers: number };

function col(result: SemanticModelQueryResult, name: string): number {
  return result.status === 'success' ? result.table.columns.findIndex((c) => c.name === name) : -1;
}

function toTotals(result: SemanticModelQueryResult): Totals {
  if (result.status !== 'success' || result.table.rows.length === 0) return { sales: 0, orders: 0, customers: 0 };
  const row = result.table.rows[0];
  return {
    sales: Number(row[col(result, '[Revenue]')]),
    orders: Number(row[col(result, '[Orders]')]),
    customers: Number(row[col(result, '[Customers]')]),
  };
}

function toMargin(result: SemanticModelQueryResult): number {
  if (result.status !== 'success' || result.table.rows.length === 0) return 0;
  return Number(result.table.rows[0][col(result, '[Margin %]')]);
}

function toBars(result: SemanticModelQueryResult): Bar[] {
  if (result.status !== 'success') return [];
  return result.table.rows.map((row) => ({ label: String(row[0]), value: Number(row[1]) }));
}

// ------------------------------------------------------------ 3. running queries
type RunDax = (query: string) => Promise<SemanticModelQueryResult>;

function useDax(runDax: RunDax, query: string) {
  const [result, setResult] = useState<SemanticModelQueryResult | undefined>();

  useEffect(() => {
    let cancelled = false;
    runDax(query)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setResult({ status: 'error', error: { category: 'unknown', message: String(e) }, requestId: '' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runDax, query]);

  return result;
}

// ------------------------------------------------------------ 4. the visuals
const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percent = (n: number) => n.toLocaleString('en-US', { style: 'percent', maximumFractionDigits: 1 });

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Bars({ rows }: { rows: Bar[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm">
            <span>{r.label}</span>
            <span>{r.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="h-2 rounded bg-yellow-400" style={{ width: \`\${(r.value / max) * 100}%\` }} />
        </li>
      ))}
    </ul>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
      <p className="font-semibold">This page could not load its data.</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}

// ------------------------------------------------------------ 5. the page
export default function SalesOverview() {
  // Runs a DAX query against the model.
  const runDax: RunDax = async (query) => (await getRayfinClient()).connectors.contoso.executeQuery({ query });

  const totalsResult = useDax(runDax, totalsQuery);
  const countriesResult = useDax(runDax, countriesQuery);
  const marginResult = useDax(runDax, marginQuery);

  if (!totalsResult || !countriesResult || !marginResult) return <p className="p-4">Loading…</p>;

  const totals = toTotals(totalsResult);
  const countries = toBars(countriesResult);
  const margin = toMargin(marginResult);

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1">
        <h1 className="text-2xl font-bold">Sales overview (by the agent)</h1>
      </header>
      <div className="col-span-3 row-span-2">
        <Card title="Revenue (USD)" value={compact(totals.sales)} />
      </div>
      <div className="col-span-3 row-span-2">
        <Card title="Orders" value={compact(totals.orders)} />
      </div>
      <section className="col-span-6 row-span-5 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Revenue by store country</h2>
        <Bars rows={countries} />
      </section>
      <div className="col-span-3 row-span-2">
        <Card title="Customers" value={compact(totals.customers)} />
      </div>
      <div className="col-span-3 row-span-2">
        <Card title="Margin %" value={percent(margin)} />
      </div>
    </div>
  );
}
`;

export const AGENT_MARGIN_IN_QUERY = `const marginQuery = \`
DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )
\`;`;

// ================================================================== Chapter 2: Two semantic models

// The first Categories page: a year slicer and the headline.
export const PARETO_PAGE_V1 = `import { useState } from 'react';
import { ErrorPanel } from './components/error-panel';
import { YearSlicer } from './components/year-slicer';
import { useSemanticModelQuery } from './hooks/use-semantic-model-query';
import { toHeadline } from './lib/conversions';
import { paretoHeadline } from './queries';

// A page on the second model: for now, its headline.
export default function ParetoPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const headlineQuery = useSemanticModelQuery(paretoHeadline(year));

  if (headlineQuery.isLoading) return <p className="p-4">Loading…</p>;
  if (headlineQuery.error) return <ErrorPanel message={headlineQuery.error.message} />;
  if (headlineQuery.data?.status === 'error') return <ErrorPanel message={headlineQuery.data.error.message} />;
  const headline = headlineQuery.data ? toHeadline(headlineQuery.data) : { count: 0, text: '' };

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories: the vital few</h1>
        <YearSlicer value={year} onChange={setYear} />
      </header>
      <section className="col-span-6 row-span-2 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">From the pareto model</p>
        <p className="text-xl font-bold">{headline.text}</p>
      </section>
    </div>
  );
}
`;

// The full Categories page: both Revenue cards, the headline and the bars, under one slicer.
export const PARETO_PAGE = `import { useState } from 'react';
import { BarList } from './components/bar-list';
import { ErrorPanel } from './components/error-panel';
import { KpiCard } from './components/kpi-card';
import { YearSlicer } from './components/year-slicer';
import { useSemanticModelQuery } from './hooks/use-semantic-model-query';
import { toHeadline, toPareto, toRevenue } from './lib/conversions';
import { paretoByCategory, paretoHeadline, revenueCard } from './queries';

const percent = (n: number) => n.toLocaleString('en-US', { style: 'percent', maximumFractionDigits: 1 });

// A page on two models: the pareto model for the categories, both models for [Revenue].
export default function ParetoPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const paretoQuery = useSemanticModelQuery(paretoByCategory(year));
  const headlineQuery = useSemanticModelQuery(paretoHeadline(year));
  const contosoRevenue = useSemanticModelQuery(revenueCard('contoso', year));
  const paretoRevenue = useSemanticModelQuery(revenueCard('pareto', year));

  const all = [paretoQuery, headlineQuery, contosoRevenue, paretoRevenue];
  if (all.some((q) => q.isLoading)) return <p className="p-4">Loading…</p>;
  for (const q of all) if (q.error) return <ErrorPanel message={q.error.message} />;
  for (const q of all) if (q.data?.status === 'error') return <ErrorPanel message={q.data.error.message} />;
  const rows = paretoQuery.data ? toPareto(paretoQuery.data) : [];
  const headline = headlineQuery.data ? toHeadline(headlineQuery.data) : { count: 0, text: '' };
  if (rows.length === 0) return <p className="p-4">No data for this page.</p>;

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories: the vital few</h1>
        <YearSlicer value={year} onChange={setYear} />
      </header>
      <div className="col-span-3 row-span-2">
        <KpiCard title="Revenue, contoso model" value={contosoRevenue.data ? toRevenue(contosoRevenue.data) : 0} />
      </div>
      <div className="col-span-3 row-span-2">
        <KpiCard title="Revenue, pareto model" value={paretoRevenue.data ? toRevenue(paretoRevenue.data) : 0} />
      </div>
      <section className="col-span-6 row-span-2 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">From the pareto model</p>
        <p className="text-xl font-bold">{headline.text}</p>
      </section>
      <section className="col-span-12 row-span-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Revenue by category, with the running share</h2>
        <BarList rows={rows.map((r, i) => ({ label: \`\${i < headline.count ? '★ ' : ''}\${r.label} (\${percent(r.cumulative)})\`, value: r.value }))} />
      </section>
    </div>
  );
}
`;

// ================================================================== Chapter 3: Read a lakehouse
// ---------------------------------------------------------------- entities and the connector schema
// Written from metadata.json by the rules on rayfin.ai (Generating entity files): camelCase properties,
// `column:` when the SQL name differs, the decorator from the SQL type, `max` from maxLength, and
// `primaryKey: []` because the metadata has no primary key. Only the columns the app needs (Microsoft Learn).
export const STORE_IMPORTS = `import { entity, int, text } from '@microsoft/rayfin-core';
import { role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';
`;

export const STORE_CLASS = `
@role('authenticated', ['read'])
@entity()
export class Store extends Source({ schema: 'dbo', table: 'store', primaryKey: [] }) {
  @int({ column: 'StoreKey' })
  storeKey!: number;

  @text({ column: 'CountryName', max: 8000 })
  countryName!: string;
}
`;

// The file the "agent" writes.
export const SALES_ENTITY = `import { entity, date, decimal, int } from '@microsoft/rayfin-core';
import { role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class Sales extends Source({ schema: 'dbo', table: 'sales', primaryKey: [] }) {
  @int({ column: 'OrderKey' })
  orderKey!: number;

  @int({ column: 'LineNumber' })
  lineNumber!: number;

  @date({ column: 'OrderDate' })
  orderDate!: Date;

  @int({ column: 'StoreKey' })
  storeKey!: number;

  @int({ column: 'Quantity' })
  quantity!: number;

  @decimal({ column: 'NetPrice', precision: 19, scale: 4 })
  netPrice!: number;
}
`;

export const LAKE_SCHEMA = `import type { GraphQLBackedConnector } from '@microsoft/rayfin-connector-fabric-graphql';
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';

import type { Sales } from './Sales.js';
import type { Store } from './Store.js';

export type { Sales } from './Sales.js';
export type { Store } from './Store.js';

export const connectorConfig = {
  connector: 'fabric-sqlanalytics',
  operations: ['read'],
  entities: {
    Sales: ['orderKey', 'lineNumber', 'orderDate', 'storeKey', 'quantity', 'netPrice'],
    Store: ['storeKey', 'countryName'],
  },
} as const satisfies ConnectorConfig;

export type LakeSchema = GraphQLBackedConnector<
  { Sales: typeof Sales; Store: typeof Store },
  typeof connectorConfig
>;
`;

// ---------------------------------------------------------------- rows on a page
// src/hooks/use-load.ts
export const LAKE_HOOK = `import { useEffect, useState } from 'react';

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'success'; value: T }
  | { status: 'error'; message: string };

// Runs \`load\` again only when \`key\` changes, like the query hook with its query text.
export function useLoad<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    load()
      .then((value) => live && setState({ status: 'success', value }))
      .catch((e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}
`;

// src/lib/lake.ts: the lakehouse reads, plain functions the pages run through useLoad.
export const LAKE_QUERIES = `import { getRayfinClient } from './rayfin-client';

export async function storeKeysIn(country: string) {
  const client = await getRayfinClient();
  const stores = await client.connectors.lake.Store
    .select(['storeKey'])
    .where({ countryName: { eq: country } })
    .execute();
  return stores.map((s) => s.storeKey);
}

export async function latestLines(storeKeys: number[]) {
  const client = await getRayfinClient();
  return client.connectors.lake.Sales
    .select(['orderKey', 'lineNumber', 'orderDate', 'quantity', 'netPrice'])
    .where({ storeKey: { in: storeKeys } })
    .orderBy({ orderDate: 'desc' })
    .first(20)
    .execute();
}
`;

export const LINES_DATE = "{new Date(line.orderDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}";
export const LINES_DATE_SLIP = "{line.orderDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}";

export const LINES_PAGE = `import { ErrorPanel } from './components/error-panel';
import { useLoad } from './hooks/use-load';
import { latestLines, storeKeysIn } from './lib/lake';

// The order lines behind a country's number: the latest 20, newest first.
export default function LinesPage() {
  const country = 'France';
  const lines = useLoad(async () => latestLines(await storeKeysIn(country)), country);

  if (lines.status === 'loading') return <p className="p-4">Loading…</p>;
  if (lines.status === 'error') return <ErrorPanel message={lines.message} />;

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
      <header className="col-span-12 row-span-1">
        <h1 className="text-2xl font-bold">Order lines: {country}</h1>
        <p className="text-sm text-gray-500">From the lakehouse, which holds France's 2023 lines only.</p>
      </header>
      <section className="col-span-8 row-span-5 overflow-auto rounded-lg border border-gray-200 bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th>Order date</th>
              <th>Order</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Net price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.value.map((line) => (
              <tr key={\`\${line.orderKey}-\${line.lineNumber}\`} className="border-t border-gray-100">
                <td>${LINES_DATE}</td>
                <td>{line.orderKey}</td>
                <td className="text-right">{line.quantity}</td>
                <td className="text-right">{line.netPrice.toFixed(2)}</td>
                <td className="text-right">{(line.quantity * line.netPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
`;

// ---------------------------------------------------------------- rows or measures
export const REVENUE_ONE_PAGE = `
export async function revenueFromLines(storeKeys: number[]) {
  const client = await getRayfinClient();
  const lines = await client.connectors.lake.Sales
    .select(['quantity', 'netPrice'])
    .where({ storeKey: { in: storeKeys } })
    .execute();
  return lines.reduce((sum, l) => sum + l.quantity * l.netPrice, 0);
}
`;

export const REVENUE_PAGED = `
// Every matching line, page by page (execute() alone stops at one page), then the sum.
export async function revenueFromLines(storeKeys: number[]) {
  const client = await getRayfinClient();
  const query = client.connectors.lake.Sales
    .select(['quantity', 'netPrice'])
    .where({ storeKey: { in: storeKeys } })
    .orderBy({ orderKey: 'asc', lineNumber: 'asc' })
    .first(100);
  let page = await query.executePaginated();
  const lines = [...page.items];
  while (page.hasNextPage && page.endCursor) {
    page = await query.after(page.endCursor).executePaginated();
    lines.push(...page.items);
  }
  return lines.reduce((sum, l) => sum + l.quantity * l.netPrice, 0);
}
`;

export const REVENUE_HOOK = "  const revenue = useLoad(async () => revenueFromLines(await storeKeysIn(country)), country);\n";

export const REVENUE_CARD = `      <div className="col-span-4 row-span-2">
        <KpiCard title="Revenue (from lines)" value={revenue.status === 'success' ? revenue.value : 0} />
      </div>
`;

// ---------------------------------------------------------------- who runs this query
export const ADD_LINE = `
// A slip on purpose: write a row through the lakehouse connector.
export async function addLine() {
  const client = await getRayfinClient();
  return client.connectors.lake.Sales.create({
    orderKey: 1, lineNumber: 0, orderDate: new Date(), storeKey: 120, quantity: 1, netPrice: 6.293,
  });
}
`;

// ================================================================== Chapter 4: Store your own data
// ---------------------------------------------------------------- model a sales target
export const TARGET_IMPORTS = `import { entity, authenticated, uuid, text, int, decimal, date } from '@microsoft/rayfin-core';
`;

export const TARGET_RULE_ALL = "@authenticated('*')\n";

export const TARGET_CLASS = `
@entity()
${TARGET_RULE_ALL}export class SalesTarget {
  @uuid() id!: string;
  @text({ max: 50 }) country!: string;
  @int({ min: 2023, max: 2030 }) year!: number;
  @decimal({ precision: 18, scale: 2 }) amount!: number;
  @date() updatedAt!: Date;
}
`;

// ---------------------------------------------------------------- register and apply
// packages/data/src/index.ts, with SalesTarget registered (the data-modeling pack's kit/data/schema.ts, shortened).
export const DATA_SCHEMA = `// The app's data schema: its entities, registered in \`schema\`.
import { SalesTarget } from './SalesTarget.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

export type { UniversalAppSchema };
export { SalesTarget };

export const schema = [SalesTarget];
`;

// packages/shared/src/index.ts: the record the browser's client is typed by, kept in step with the entity, with no
// decorated class in it (the data-modeling pack's kit/shared/index.ts).
export const SHARED_SCHEMA = `// The record types the data package and the browser share. Keep each in step with its entity.
export interface SalesTargetRecord {
  id: string;
  country: string;
  year: number;
  amount: number;
  updatedAt: Date;
}

export type UniversalAppSchema = {
  SalesTarget: SalesTargetRecord;
};
`;
export const SHARED_UPDATED = '  updatedAt: Date;\n';
export const SHARED_OWNER = '  owner_id: string;\n';

// ---------------------------------------------------------------- read and write targets

export const TARGETS_LOAD = `import { getRayfinClient } from './rayfin-client';

// The targets of one year, from the app's own database.
export async function loadTargets(year: number) {
  const client = await getRayfinClient();
  return client.data.SalesTarget
    .select(['id', 'country', 'year', 'amount'])
    .where({ year: { eq: year } })
    .orderBy({ country: 'asc' })
    .execute();
}
`;

export const ADD_TARGET = `// A new target. The server makes its id; we send the fields.
export async function addTarget(country: string, year: number, amount: number) {
  const client = await getRayfinClient();
  return client.data.SalesTarget.create({ country, year, amount, updatedAt: new Date() });
}
`;

export const TARGETS_WRITES = `
${ADD_TARGET}
// A new amount: a patch, found by id.
export async function changeTarget(id: string, amount: number) {
  const client = await getRayfinClient();
  return client.data.SalesTarget.update({ id }, { amount, updatedAt: new Date() });
}
`;

const TARGETS_HEAD = `      <header className="col-span-12 row-span-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales targets</h1>
        <YearSlicer value={year} onChange={(y) => y && setYear(y)} />
      </header>
`;

export const TARGETS_PAGE = `import { useState } from 'react';
import { ErrorPanel } from './components/error-panel';
import { YearSlicer } from './components/year-slicer';
import { useLoad } from './hooks/use-load';
import { loadTargets } from './lib/targets';

// Sales targets, one row per country and year, from the app's own database.
export default function TargetsPage() {
  const [year, setYear] = useState(2026);
  const targets = useLoad(() => loadTargets(year), String(year));

  if (targets.status === 'loading') return <p className="p-4">Loading…</p>;
  if (targets.status === 'error') return <ErrorPanel message={targets.message} />;

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
${TARGETS_HEAD}      <section className="col-span-8 row-span-5 overflow-auto rounded-lg border border-gray-200 bg-white p-4">
        {targets.value.length === 0 ? (
          <p className="text-sm text-gray-500">No targets for {year} yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th>Country</th>
                <th className="text-right">Target (USD)</th>
              </tr>
            </thead>
            <tbody>
              {targets.value.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td>{t.country}</td>
                  <td className="text-right">{t.amount.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
`;

export const TARGETS_KEY = '`${year}:${saved}`';
export const TARGETS_ADD_BUTTON = `          <button type="button" className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold" onClick={() => save(() => addTarget(country, year, Number(amount)))}>
            Add
          </button>
`;

export const TARGETS_PAGE_EDIT = `import { Fragment, useState } from 'react';
import { ErrorPanel } from './components/error-panel';
import { YearSlicer } from './components/year-slicer';
import { useLoad } from './hooks/use-load';
import { addTarget, changeTarget, loadTargets } from './lib/targets';

// Sales targets, one row per country and year, from the app's own database.
export default function TargetsPage() {
  const [year, setYear] = useState(2026);
  const [saved, setSaved] = useState(0); // counts the writes, so the list loads again after each one
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('');
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState<{ id: string; amount: string } | undefined>(undefined);
  const targets = useLoad(() => loadTargets(year), ${TARGETS_KEY});

  // Runs a write, then loads the list again. A refused write shows its message.
  async function save(write: () => Promise<unknown>) {
    setMessage('');
    try {
      await write();
      setEditing(undefined);
      setCountry('');
      setAmount('');
      setSaved((n) => n + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  if (targets.status === 'loading') return <p className="p-4">Loading…</p>;
  if (targets.status === 'error') return <ErrorPanel message={targets.message} />;

  return (
    <div className="mx-auto aspect-video w-full max-w-6xl grid grid-cols-12 grid-rows-6 gap-4 p-4">
${TARGETS_HEAD}      <section className="col-span-8 row-span-5 overflow-auto rounded-lg border border-gray-200 bg-white p-4">
        {targets.value.length === 0 ? (
          <p className="text-sm text-gray-500">No targets for {year} yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th>Country</th>
                <th className="text-right">Target (USD)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {targets.value.map((t) => (
                <Fragment key={t.id}>
                  <tr className="border-t border-gray-100">
                    <td>{t.country}</td>
                    <td className="text-right">
                      {editing?.id === t.id ? (
                        <input
                          className="w-32 rounded border border-gray-300 px-1 text-right"
                          value={editing.amount}
                          onChange={(e) => setEditing({ id: t.id, amount: e.target.value })}
                        />
                      ) : (
                        t.amount.toLocaleString('en-US')
                      )}
                    </td>
                    <td className="text-right">
                      {editing?.id === t.id ? (
                        <button type="button" className="rounded border px-2" onClick={() => save(() => changeTarget(t.id, Number(editing.amount)))}>
                          Save
                        </button>
                      ) : (
                        <button type="button" className="rounded border px-2" onClick={() => setEditing({ id: t.id, amount: String(t.amount) })}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                  {editing?.id === t.id && message && (
                    <tr>
                      <td colSpan={3} className="pb-1 text-right text-xs text-red-700">
                        {message}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="col-span-4 row-span-5 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Add a target for {year}</h2>
        <div className="space-y-2">
          <input className="w-full rounded border border-gray-300 px-2 py-1" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
          <input className="w-full rounded border border-gray-300 px-2 py-1" placeholder="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
${TARGETS_ADD_BUTTON}        </div>
        {!editing && message && <p className="mt-2 text-sm text-red-700">{message}</p>}
      </section>
    </div>
  );
}
`;

// ---------------------------------------------------------------- change the model
export const NOTE_FIELD = '  @text({ optional: true, max: 500 }) note?: string;\n';
export const NOTE_FIELD_SLIP = '  @text({ max: 500 }) note?: string;\n';

// ================================================================== Chapter 5: Who is using it
// ---------------------------------------------------------------- signed in as
export const SESSION_READ = `import { getRayfinClient } from './rayfin-client';

// Who is signed in, read once.
export async function signedInEmail(): Promise<string> {
  const session = (await getRayfinClient()).auth.getSession();
  return session.isAuthenticated && session.user ? session.user.email : 'Not signed in';
}
`;

// src/hooks/use-session.ts
export const USE_SESSION = `import { useEffect, useState } from 'react';
import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { getRayfinClient } from '../lib/rayfin-client';

// The session as state: the page draws again at each sign-in, sign-out or refresh. Undefined until the client is ready.
export function useSession() {
  const [session, setSession] = useState<OpaqueSession | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let stop: (() => void) | undefined;
    getRayfinClient().then((client) => {
      if (!live) return;
      setSession(client.auth.getSession());
      stop = client.auth.onSessionChange(() => setSession(client.auth.getSession()));
    });
    return () => {
      live = false;
      stop?.();
    };
  }, []);
  return session;
}
`;

// The page list is narrow: a long email wraps onto a second line (wrap-anywhere) instead of being cut short.
// Read once: signedInEmail() is async, so the page asks after its first draw and keeps the text in state.
export const SESSION_ONCE_STATE = "  const [email, setEmail] = useState('');\n  useEffect(() => {\n    signedInEmail().then(setEmail);\n  }, []);\n";
export const SIGNED_IN_ONCE =
  '        <p className="px-3 pb-2 text-xs text-gray-500 wrap-anywhere">Signed in as {email}</p>\n';
export const SIGNED_IN_STATE =
  "  const signedIn = session?.isAuthenticated && session.user ? `Signed in as ${session.user.email}` : 'Not signed in';\n";
export const SIGNED_IN_LIVE = '        <p className="px-3 pb-2 text-xs text-gray-500 wrap-anywhere">{signedIn}</p>\n';

// ---------------------------------------------------------------- my rows only
export const OWNER_FIELD = '  @text({ max: 128 }) owner_id!: string;\n';

export const ADD_TARGET_STAMPED = `// A new target, stamped with who added it: the id policies compare as claims.sub.
export async function addTarget(country: string, year: number, amount: number) {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) throw new Error('Sign in before adding a target.');
  return client.data.SalesTarget.create({ country, year, amount, updatedAt: new Date(), owner_id: session.user.id });
}
`;

export const OWNER_RULES = `@authenticated(['read', 'create'])
@authenticated(['update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
`;

// ---------------------------------------------------------------- two identities (read only)
export const IDENTITIES_FUNCTION = `import { AudienceType, UserDataFunctions, type RayfinContext } from '@microsoft/fabric-user-data-functions';

export type AppSchema = {
  SalesTarget: { id: string; country: string };
};

const udf = new UserDataFunctions();

udf.func(
  'targetsAndWorkspaces',
  async (ctx: RayfinContext<AppSchema, AudienceType.Fabric>): Promise<{ targets: number; workspaces: number }> => {
    // Runs as the signed-in caller: SalesTarget's policies apply.
    const targets = await ctx.getDataClient().SalesTarget.select(['id']).execute();

    // Runs as the app identity, the owner of the Fabric app item: it needs access in Fabric.
    const response = await fetch('https://api.fabric.microsoft.com/v1/workspaces', {
      headers: { Authorization: \`Bearer \${ctx.Tokens.Fabric}\` },
    });
    if (!response.ok) throw new Error(\`Fabric API returned \${response.status}\`);
    const body = (await response.json()) as { value: unknown[] };
    return { targets: targets.length, workspaces: body.value.length };
  },
  [],
);`;

// ---------------------------------------------------------------- roles the business knows
export const DYNAMIC_CLAIMS_YML = '    dynamicClaims:\n      enabled: true\n';

export const CLAIMS_RETURN = 'Promise<{ salesRole: string; country: string }>';
export const CLAIMS_RETURN_SLIP = 'Promise<{ role: string; country: string }>';
export const CLAIMS_VALUE = 'return { salesRole: entitlement.salesRole, country: entitlement.country };';
export const CLAIMS_VALUE_SLIP = 'return { role: entitlement.salesRole, country: entitlement.country };';

export const CLAIMS_FUNCTION = `import { UserDataFunctions, type AuthClaimsContext } from '@microsoft/fabric-user-data-functions';

const udf = new UserDataFunctions();

// Who manages what. A real app reads this from its entitlement source: an HR system, a group, a table.
const ENTITLEMENTS: Record<string, { salesRole: 'director' | 'countryManager'; country: string }> = {
  'alice@contoso.example': { salesRole: 'countryManager', country: 'Germany' },
  'carol@contoso.example': { salesRole: 'countryManager', country: 'France' },
  'bob@contoso.example': { salesRole: 'director', country: 'All' },
};

// Rayfin calls this at each sign-in and refresh, and adds what it returns to the person's token.
udf.authClaims(
  async (ctx: AuthClaimsContext): ${CLAIMS_RETURN} => {
    const entitlement = ENTITLEMENTS[ctx.auth.email.toLowerCase()];
    if (!entitlement) ctx.denySignIn('You have no sales role in this app. Ask your administrator.');
    ${CLAIMS_VALUE}
  },
);
`;

// ---------------------------------------------------------------- each country, its own targets
export const COUNTRY_READ_RULE = `@authenticated('read', {
  policy: (claims, item) => claims.country.eq(item.country).or(claims.salesRole.eq('director')),
})
`;
export const COUNTRY_READ_RULE_SLIP = `@authenticated('read', {
  policy: (claims, item) => claims.country.eq(item.country),
})
`;
export const COUNTRY_RULES = `${COUNTRY_READ_RULE}@authenticated(['create', 'update', 'delete'], {
  policy: (claims) => claims.salesRole.eq('director'),
})
`;

export const IS_DIRECTOR = `
// A hint for what to show. In the browser, claims come back as text; the policies on the server decide.
export async function isDirector(): Promise<boolean> {
  const claims = await (await getRayfinClient()).auth.getClaims();
  return claims.salesRole === 'director';
}
`;

export const TARGETS_KEY_SESSION = "`${year}:${saved}:${session?.user?.id ?? ''}`";
export const DIRECTOR_STATE = `  const [director, setDirector] = useState(false);
  useEffect(() => {
    isDirector().then(setDirector, () => setDirector(false));
  }, [session]);
`;

// Lines the lessons of these chapters edit.
export const COUNTRY_TEXT = '  @text({ max: 50 }) country!: string;\n';
export const COUNTRY_TEXT_SLIP = '  @text() country!: string;\n';
export const TARGETS_ADD_BUTTON_DIRECTOR = `          {director && (
            <button type="button" className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold" onClick={() => save(() => addTarget(country, year, Number(amount)))}>
              Add
            </button>
          )}
`;
