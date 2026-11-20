// Builds data/catalog.json: every DAX query the simulated connector can answer.
// Run `npm run catalog`, then `npm run snapshots` with the Contoso measures model open in
// Power BI Desktop (gold-layer-examples: examples/default_measures/gold-layer-data-contoso-measures.pbip).
//
// The queries use that model's own measures (table _Measures), as a real app's queries do:
//   [Revenue]     = SUMX ( sales, sales[Quantity] * sales[NetPrice] )
//   [# Orders]    = DISTINCTCOUNT ( sales[OrderKey] )
//   [# Customers] = DISTINCTCOUNT ( sales[CustomerKey] )
//   [Margin %]    = DIVIDE ( [Margin], [Revenue] )
// The "Measure or query" lesson also has a query that writes its own measure (DEFINE MEASURE),
// to compare the two.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const YEARS = [2023, 2024, 2025, 2026];
const COUNTRIES = [
  'Australia', 'Canada', 'France', 'Germany', 'Italy',
  'Netherlands', 'Online', 'United Kingdom', 'United States',
];

// The same text is written into the lessons, so keep both in step (tools/check-lessons.mjs checks it).
export const q = {
  salesByCountry: () => `EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,

  // The "Failure" lesson: a typo ('store'[Country] does not exist). Saved with the error the model returns.
  salesByCountryTypo: () => `EVALUATE
SUMMARIZECOLUMNS (
    'store'[Country],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,

  // "Measure or query": the model's measure, versus the same formula written in the query.
  marginFromModel: (measure = '[Margin %]') => `EVALUATE
ROW ( "Margin %", ${measure} )`,

  marginInQuery: (price = 'NetPrice') => `DEFINE
    MEASURE '_Measures'[App Margin %] =
        DIVIDE (
            SUMX ( sales, sales[Quantity] * ( sales[${price}] - sales[UnitCost] ) ),
            SUMX ( sales, sales[Quantity] * sales[NetPrice] )
        )
EVALUATE
ROW ( "Margin %", [App Margin %] )`,

  salesByCountryWithOrders: () => `EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    "Orders", [# Orders],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,

  totals: () => `EVALUATE
ROW (
    "Revenue", [Revenue],
    "Orders", [# Orders],
    "Customers", [# Customers]
)`,

  salesByCategory: () => `EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,

  salesByYear: () => `EVALUATE
SUMMARIZECOLUMNS (
    'date'[Year],
    "Revenue", [Revenue],
    "Orders", [# Orders]
)
ORDER BY 'date'[Year]`,

  salesByMonth: () => `EVALUATE
SUMMARIZECOLUMNS (
    'date'[YearMonthNumber],
    'date'[YearMonthShort],
    "Revenue", [Revenue]
)
ORDER BY 'date'[YearMonthNumber]`,

  // The connector's first test (Set up the project): one measure, one value.
  revenue: () => `EVALUATE
ROW ( "Revenue", [Revenue] )`,

  // With a year and/or a store country picked on the page: the same queries, filtered.
  // The learner's code builds this text the same way (a TREATAS filter per choice), and the
  // simulated connector compares queries ignoring spacing and letter case.
  totalsFiltered: (year, country) => `EVALUATE
CALCULATETABLE (
    ROW (
        "Revenue", [Revenue],
        "Orders", [# Orders],
        "Customers", [# Customers]
    ),
    ${filters(year, country).join(',\n    ')}
)`,

  salesByCountryForYear: (year) => `EVALUATE
SUMMARIZECOLUMNS (
    'store'[CountryName],
    ${filters(year).join(',\n    ')},
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,

  salesByCategoryFiltered: (year, country) => `EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    ${filters(year, country).join(',\n    ')},
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC`,
};

function filters(year, country) {
  const list = [];
  if (year !== undefined) list.push(`TREATAS ( { ${year} }, 'date'[Year] )`);
  if (country !== undefined) list.push(`TREATAS ( { "${country}" }, 'store'[CountryName] )`);
  return list;
}

// Every (year, country) choice except "all years, all countries", which is the plain query.
const CHOICES = [
  ...YEARS.map((y) => [y, undefined]),
  ...COUNTRIES.map((c) => [undefined, c]),
  ...YEARS.flatMap((y) => COUNTRIES.map((c) => [y, c])),
];
const label = (y, c) => [y, c].filter((x) => x !== undefined).join(', ');
const idOf = (base, y, c) => [base, y, c && slug(c)].filter((x) => x !== undefined).join('-');

const catalog = [
  { id: 'revenue', group: 'Basics', title: 'Revenue, one value', query: q.revenue() },
  { id: 'sales-by-country', group: 'Basics', title: 'Sales by store country', query: q.salesByCountry() },
  { id: 'sales-by-country-with-orders', group: 'Basics', title: 'Sales by store country, with orders', query: q.salesByCountryWithOrders() },
  { id: 'totals', group: 'Basics', title: 'Totals: sales, orders, customers', query: q.totals() },
  { id: 'sales-by-category', group: 'Basics', title: 'Sales by product category', query: q.salesByCategory() },
  { id: 'sales-by-year', group: 'Basics', title: 'Sales and orders by year', query: q.salesByYear() },
  { id: 'sales-by-month', group: 'Basics', title: 'Sales by month', query: q.salesByMonth() },
  ...YEARS.map((y) => ({ id: `sales-by-country-${y}`, group: 'Store countries, per year', title: `Sales by store country, ${y}`, query: q.salesByCountryForYear(y) })),
  ...CHOICES.map(([y, c]) => ({ id: idOf('totals', y, c), group: 'Totals, filtered', title: `Totals, ${label(y, c)}`, query: q.totalsFiltered(y, c) })),
  ...CHOICES.map(([y, c]) => ({ id: idOf('sales-by-category', y, c), group: 'Categories, filtered', title: `Sales by category, ${label(y, c)}`, query: q.salesByCategoryFiltered(y, c) })),
  { id: 'margin-from-model', group: 'Measure or query', title: "Margin %: the model's measure", query: q.marginFromModel() },
  { id: 'margin-in-query', group: 'Measure or query', title: 'Margin %: written in the query', query: q.marginInQuery() },
  { id: 'margin-in-query-list-price', group: 'Measure or query', title: 'Margin %: written in the query, with a slip (list price)', query: q.marginInQuery('UnitPrice') },
  { id: 'typo-store-country', group: 'Saved errors', title: "Sales by 'store'[Country] (no such column)", query: q.salesByCountryTypo(), expectError: true },
  { id: 'typo-margin-measure', group: 'Saved errors', title: 'Margin % with a mistyped measure name, [Margin Pct]', query: q.marginFromModel('[Margin Pct]'), expectError: true },
];

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(root, 'data', 'catalog.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ years: YEARS, countries: COUNTRIES, queries: catalog }, null, 2) + '\n');
  console.log(`catalog: ${catalog.length} queries -> ${out}`);
}
