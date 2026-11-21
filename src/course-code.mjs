// The longer pieces of code the lessons paste, as text. lesson-list.mjs uses them in steps
// (snippets and exact edits); tools/check-lessons.mjs type-checks the project after every step.

// ---------------------------------------------------------------- Set up: the client
export const CLIENT_IMPORTS = `import { RayfinClient } from '@microsoft/rayfin-client';
import { browserSession } from '@microsoft/rayfin-auth';
import { connectorsService } from '@microsoft/rayfin-connectors';
import { fabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { connectorConfig as contosoConfig, type ContosoSchema } from '../../rayfin/connectors/contoso/schema';
`;

export const CLIENT_SCHEMA = `
// One entry per connector: the name from rayfin.yml, and its generated type.
type AppConnectorsSchema = {
  contoso: ContosoSchema;
};
`;

export const CLIENT_CREATE = `
export const rayfinClient = RayfinClient.create({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL,
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
  auth: browserSession({ storage: true }),
  services: {
    connectors: connectorsService<AppConnectorsSchema>({
      configs: { contoso: contosoConfig },
      runtime: { contoso: fabricSemanticModel() },
    }),
  },
});
`;

export const CLIENT_ENV_FROM = `export const rayfinClient = RayfinClient.create({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL,
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
`;

export const CLIENT_ENV_TO = `// rayfin dev writes these to .env.local. The template marks them as possibly missing, so check first.
const apiUrl = import.meta.env.VITE_RAYFIN_API_URL;
const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;
if (!apiUrl || !publishableKey) {
  throw new Error("Missing VITE_RAYFIN_API_URL or VITE_RAYFIN_PUBLISHABLE_KEY: run 'npm run dev'");
}

export const rayfinClient = RayfinClient.create({
  baseUrl: apiUrl,
  publishableKey,
`;

export const TEST_PAGE = `import { useEffect, useState } from 'react';
import { rayfinClient } from './services/rayfinClient';

// A first test: one query, one number. The next module replaces it with a real page.
export default function App() {
  const [text, setText] = useState('Asking the model…');

  useEffect(() => {
    rayfinClient.connectors.contoso
      .executeQuery({ query: 'EVALUATE ROW ( "Revenue", [Revenue] )' })
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
export const DATA_START = `import { useEffect, useState } from 'react';
import type { SemanticModelQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { rayfinClient } from './services/rayfinClient';

// ------------------------------------------------------------ running queries
export type RunDax = (query: string) => Promise<SemanticModelQueryResult>;

// Runs a DAX query against the model. Made once, here, outside any page.
export const runDax: RunDax = (query) => rayfinClient.connectors.contoso.executeQuery({ query });

// Runs a query when the page first draws, and again when the query text changes.
// Like a visual loading its data: undefined while it loads, then the model's result.
export function useDax(runDax: RunDax, query: string) {
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
`;

export const COUNTRY_QUERY = `
// ------------------------------------------------------------ the queries
// The DAX uses the model's own measures, such as [Revenue], as a report visual does.
export const salesByCountryQuery = \`
EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
\`;

// ------------------------------------------------------------ reading results
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

export const BAR_LIST = `
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

export const TOTALS = `

export const totalsQuery = \`
EVALUATE
ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)
\`;

export type Totals = { revenue: number; orders: number; customers: number };

export function toTotals(result: SemanticModelQueryResult): Totals {
  if (result.status !== 'success' || result.table.rows.length === 0) return { revenue: 0, orders: 0, customers: 0 };
  const { columns, rows } = result.table;
  const at = (name: string) => columns.findIndex((c) => c.name === name);
  const row = rows[0];
  return { revenue: Number(row[at('[Revenue]')]), orders: Number(row[at('[Orders]')]), customers: Number(row[at('[Customers]')]) };
}`;

export const MARGIN_IN_QUERY = `

// Margin %, with its formula written into the query (DEFINE MEASURE).
export const marginQuery = \`
DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )
\`;

export function toPercent(result: SemanticModelQueryResult): number {
  if (result.status !== 'success' || result.table.rows.length === 0) return 0;
  const at = result.table.columns.findIndex((c) => c.name === '[Margin %]');
  return Number(result.table.rows[0][at]);
}`;

export const MARGIN_IN_QUERY_TEXT = `// Margin %, with its formula written into the query (DEFINE MEASURE).
export const marginQuery = \`
DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )
\`;`;

export const MARGIN_FROM_MODEL_TEXT = `// Margin %: the model's own measure. The formula lives in the model.
export const marginQuery = \`
EVALUATE
ROW ( "Margin %", [Margin %] )
\`;`;

export const ERROR_PANEL = `
// What a visual shows when its query fails: the model's own message.
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
export const YEAR_SLICER = `
// A slicer: it shows the selected year and reports clicks. It does not keep the year itself.
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

export const FILTERS_YEAR = `
// One DAX filter per choice made on the page, like a slicer's filter on a visual.
function filters(year?: number): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  return list;
}
`;

export const TOTALS_QUERY_CONST = `export const totalsQuery = \`
EVALUATE
ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)
\`;`;

export const TOTALS_QUERY_FN = `// With a year picked, the same ROW, inside CALCULATETABLE with the filter.
export function totalsQuery(year?: number) {
  const row = \`ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)\`;
  const f = filters(year);
  if (f.length === 0) return \`EVALUATE \${row}\`;
  return \`EVALUATE CALCULATETABLE ( \${row}, \${f.join(', ')} )\`;
}`;

export const COUNTRY_QUERY_CONST = `export const salesByCountryQuery = \`
EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
\`;`;

export const COUNTRY_QUERY_FN = `export function salesByCountryQuery(year?: number) {
  return \`EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    \${[...filters(year), '"Revenue", [Revenue]'].join(', ')}
)
ORDER BY [Revenue] DESC\`;
}`;

export const FILTERS_YEAR_FN = `function filters(year?: number): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  return list;
}`;

export const FILTERS_BOTH_FN = `function filters(year?: number, country?: string): string[] {
  const list: string[] = [];
  if (year !== undefined) list.push(\`TREATAS ( { \${year} }, 'date'[Year] )\`);
  if (country !== undefined) list.push(\`TREATAS ( { "\${country}" }, 'store'[CountryName] )\`);
  return list;
}`;

export const CATEGORY_QUERY_FN = `

export function salesByCategoryQuery(year?: number, country?: string) {
  return \`EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    \${[...filters(year, country), '"Revenue", [Revenue]'].join(', ')}
)
ORDER BY [Revenue] DESC\`;
}`;

export const YEARS_QUERY = `

export const salesByYearQuery = \`
EVALUATE
SUMMARIZECOLUMNS (
    'date'[Year],
    "Revenue", [Revenue],
    "Orders", [# Orders]
)
ORDER BY 'date'[Year]
\`;`;

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
  const result = useDax(runDax, salesByYearQuery);

  if (!result) return <p className="p-4">Loading…</p>;
  if (result.status === 'error') return <ErrorPanel message={result.error.message} />;
  const years = toBars(result, 'date[Year]', '[Revenue]');

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
import { rayfinClient } from './services/rayfinClient';

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
  const runDax: RunDax = (query) => rayfinClient.connectors.contoso.executeQuery({ query });

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

// ================================================================== Chapter 2: Read a lakehouse
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
export const LAKE_HOOK = `import { useEffect, useState } from 'react';

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'success'; value: T }
  | { status: 'error'; message: string };

// Runs \`load\` again only when \`key\` changes, like useDax with its query text.
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

export const LAKE_QUERIES = `
// ------------------------------------------------------------ lakehouse queries
import { rayfinClient } from './services/rayfinClient';

export async function storeKeysIn(country: string) {
  const stores = await rayfinClient.connectors.lake.Store
    .select(['storeKey'])
    .where({ countryName: { eq: country } })
    .execute();
  return stores.map((s) => s.storeKey);
}

export function latestLines(storeKeys: number[]) {
  return rayfinClient.connectors.lake.Sales
    .select(['orderKey', 'lineNumber', 'orderDate', 'quantity', 'netPrice'])
    .where({ storeKey: { in: storeKeys } })
    .orderBy({ orderDate: 'desc' })
    .first(20)
    .execute();
}
`;

export const LINES_DATE = "{new Date(line.orderDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}";
export const LINES_DATE_SLIP = "{line.orderDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}";

export const LINES_PAGE = `import { ErrorPanel } from './components';
import { latestLines, storeKeysIn, useLoad } from './lake';

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
  const lines = await rayfinClient.connectors.lake.Sales
    .select(['quantity', 'netPrice'])
    .where({ storeKey: { in: storeKeys } })
    .execute();
  return lines.reduce((sum, l) => sum + l.quantity * l.netPrice, 0);
}
`;

export const REVENUE_PAGED = `
// Every matching line, page by page (execute() alone stops at one page), then the sum.
export async function revenueFromLines(storeKeys: number[]) {
  const query = rayfinClient.connectors.lake.Sales
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
export function addLine() {
  return rayfinClient.connectors.lake.Sales.create({
    orderKey: 1, lineNumber: 0, orderDate: new Date(), storeKey: 120, quantity: 1, netPrice: 6.293,
  });
}
`;

// ================================================================== Store your own data
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
export const DATA_SCHEMA = `import { SalesTarget } from './SalesTarget.js';

export type AppSchema = {
  SalesTarget: SalesTarget;
};

export const schema = [SalesTarget];
`;

// ---------------------------------------------------------------- read and write targets
export const CLIENT_DATA_IMPORTS = `import { dataService } from '@microsoft/rayfin-data';
import type { AppSchema } from '../../rayfin/data/schema';
`;

export const TARGETS_LOAD = `import { rayfinClient } from './services/rayfinClient';

// The targets of one year, from the app's own database.
export function loadTargets(year: number) {
  return rayfinClient.data.SalesTarget
    .select(['id', 'country', 'year', 'amount'])
    .where({ year: { eq: year } })
    .orderBy({ country: 'asc' })
    .execute();
}
`;

export const ADD_TARGET = `// A new target. The server makes its id; we send the fields.
export function addTarget(country: string, year: number, amount: number) {
  return rayfinClient.data.SalesTarget.create({ country, year, amount, updatedAt: new Date() });
}
`;

export const TARGETS_WRITES = `
${ADD_TARGET}
// A new amount: a patch, found by id.
export function changeTarget(id: string, amount: number) {
  return rayfinClient.data.SalesTarget.update({ id }, { amount, updatedAt: new Date() });
}
`;

const TARGETS_HEAD = `      <header className="col-span-12 row-span-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales targets</h1>
        <YearSlicer value={year} onChange={(y) => y && setYear(y)} />
      </header>
`;

export const TARGETS_PAGE = `import { useState } from 'react';
import { ErrorPanel, YearSlicer } from './components';
import { useLoad } from './lake';
import { loadTargets } from './targets';

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
import { ErrorPanel, YearSlicer } from './components';
import { useLoad } from './lake';
import { addTarget, changeTarget, loadTargets } from './targets';

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

// ================================================================== Who is using it
// ---------------------------------------------------------------- signed in as
export const SESSION_READ = `import { useEffect, useState } from 'react';
import { rayfinClient } from './services/rayfinClient';

// Who is signed in, read once.
export function signedInEmail(): string {
  const session = rayfinClient.auth.getSession();
  return session.isAuthenticated && session.user ? session.user.email : 'Not signed in';
}
`;

export const USE_SESSION = `
// The session as state: the page draws again at each sign-in, sign-out or refresh.
export function useSession() {
  const [session, setSession] = useState(() => rayfinClient.auth.getSession());
  useEffect(() => rayfinClient.auth.onSessionChange(() => setSession(rayfinClient.auth.getSession())), []);
  return session;
}
`;

// Cut short to fit the page list; the whole line shows on hover.
export const SIGNED_IN_ONCE =
  '        <p className="truncate px-3 pb-2 text-xs text-gray-500" title={`Signed in as ${signedInEmail()}`}>Signed in as {signedInEmail()}</p>\n';
export const SIGNED_IN_STATE =
  "  const signedIn = session.isAuthenticated && session.user ? `Signed in as ${session.user.email}` : 'Not signed in';\n";
export const SIGNED_IN_LIVE = '        <p className="truncate px-3 pb-2 text-xs text-gray-500" title={signedIn}>{signedIn}</p>\n';

// ---------------------------------------------------------------- my rows only
export const OWNER_FIELD = '  @text({ max: 128 }) owner_id!: string;\n';

export const ADD_TARGET_STAMPED = `// A new target, stamped with who added it: the id policies compare as claims.sub.
export function addTarget(country: string, year: number, amount: number) {
  const session = rayfinClient.auth.getSession();
  if (!session.isAuthenticated || !session.user) throw new Error('Sign in before adding a target.');
  return rayfinClient.data.SalesTarget.create({ country, year, amount, updatedAt: new Date(), owner_id: session.user.id });
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
  const claims = await rayfinClient.auth.getClaims();
  return claims.salesRole === 'director';
}
`;

export const TARGETS_KEY_SESSION = "`${year}:${saved}:${session.user?.id ?? ''}`";
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
