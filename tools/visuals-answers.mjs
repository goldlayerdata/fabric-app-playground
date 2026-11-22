// Builds the answer book the Visuals page's stand-in query hook uses: the playground's saved Contoso
// answers (data/snapshots.json, captured in Power BI Desktop, listed in data/catalog.json), plus a few
// answers DERIVED from them, each marked as such. Also checks that the app code's .dax files
// (src/visuals/app/queries/sales) send exactly the query text the saved answers were captured with:
// it throws if not, which stops both `npm run build` and `npm run check`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const YEARS = [2023, 2024, 2025, 2026];
const norm = (s) => s.replace(/\r\n/g, '\n').trim();

/** `root`: the repository folder. */
export function buildAnswers(root) {
  const data = join(root, 'data');
  const snapshots = JSON.parse(readFileSync(join(data, 'snapshots.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(data, 'catalog.json'), 'utf8'));
  const salesDir = join(root, 'src/visuals/app/queries/sales');
  const dax = (f) => norm(readFileSync(join(salesDir, f), 'utf8'));

  const saved = (id) => {
    const q = catalog.queries.find((x) => x.id === id && x.connector === 'contoso');
    const s = snapshots.snapshots[id];
    if (!q || !s || s.status !== 'success') throw new Error(`no saved answer for ${id}`);
    return { query: norm(q.query), table: s.table };
  };
  const same = (label, mine, theirs) => {
    if (mine !== theirs) throw new Error(`${label}: the app's DAX differs from the saved query text`);
  };

  const entries = [];
  const add = (group, query, table, kind, ids, note) =>
    entries.push({ connection: 'contoso', group, query: norm(query), table, source: { kind, ids, note } });

  // Saved answers, and a check that the app sends the same text.
  const all = saved('sales-by-category');
  same('revenue-by-category.dax', dax('revenue-by-category.dax'), all.query);
  add('revenue-by-category', all.query, all.table, 'saved', ['sales-by-category']);

  const forYears = dax('revenue-by-category-for-years.dax');
  const perYear = {};
  for (const y of YEARS) {
    const s = saved(`sales-by-category-${y}`);
    same(`revenue-by-category-for-years.dax (${y})`, forYears.replace('__YEARS__', String(y)), s.query);
    perYear[y] = s.table;
    add('revenue-by-category', s.query, s.table, 'saved', [`sales-by-category-${y}`]);
  }

  const byYear = saved('sales-by-year');
  same('sales-by-year.dax', dax('sales-by-year.dax'), byYear.query);
  add('sales-by-year', byYear.query, byYear.table, 'saved', ['sales-by-year']);

  // The other gallery visuals: saved answers, each checked against the app's .dax text.
  for (const [file, id] of [
    ['revenue-by-month.dax', 'sales-by-month'],
    ['revenue-by-store-country.dax', 'sales-by-country'],
    ['orders-and-revenue-by-store-country.dax', 'sales-by-country-with-orders'],
    ['revenue.dax', 'revenue'],
    ['margin-pct.dax', 'margin-from-model'],
  ]) {
    const s = saved(id);
    same(file, dax(file), s.query);
    add(file.replace('.dax', ''), s.query, s.table, 'saved', [id]);
  }

  // Answers captured for the Visuals page only (data/visuals-extra-answers.json). Same check, the other way
  // round: an extra answer must be the exact text of one of the app's .dax files.
  const extraFile = join(data, 'visuals-extra-answers.json');
  const extras = existsSync(extraFile) ? JSON.parse(readFileSync(extraFile, 'utf8')).answers : [];
  const daxFiles = readdirSync(salesDir).filter((f) => f.endsWith('.dax'));
  for (const x of extras) {
    const file = daxFiles.find((f) => dax(f) === norm(x.query));
    if (!file) throw new Error(`extra answer ${x.id}: no .dax file in src/visuals/app sends this query text`);
    if (!x.model || !x.capturedAt || !x.table?.rows) throw new Error(`extra answer ${x.id}: model, capturedAt and table are required`);
    add(file.replace('.dax', ''), x.query, x.table, 'saved', [`${x.id} (${x.model}, ${x.capturedAt}, ${x.how ?? 'captured in Power BI Desktop'})`]);
  }

  // Derived 1: more than one year picked. Revenue is a SUMX over sales rows and the years don't
  // overlap, so the answer for {2023, 2024} is the sum of the two saved per-year answers.
  const subsets = [];
  for (let mask = 1; mask < 1 << YEARS.length; mask++) {
    const ys = YEARS.filter((_, i) => mask & (1 << i));
    if (ys.length > 1) subsets.push(ys);
  }
  for (const ys of subsets) {
    const sum = new Map();
    for (const y of ys) for (const [cat, rev] of perYear[y].rows) sum.set(cat, (sum.get(cat) ?? 0) + rev);
    const rows = [...sum].sort((a, b) => b[1] - a[1]).map(([c, r]) => [c, Math.round(r * 1e4) / 1e4]);
    add('revenue-by-category', forYears.replace('__YEARS__', ys.join(', ')),
      { columns: perYear[ys[0]].columns, rows }, 'derived', ys.map((y) => `sales-by-category-${y}`),
      'Not captured as one query: the sum of the saved per-year answers.');
  }

  // Derived 2: category by year, as one query would return it, stacked from the four per-year answers.
  const rows = YEARS.flatMap((y) => perYear[y].rows.map(([cat, rev]) => [cat, y, rev]))
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || a[1] - b[1]);
  add('revenue-by-category-and-year', dax('revenue-by-category-and-year.dax'), {
    columns: [
      { name: 'product[CategoryName]', dataType: 'String' },
      { name: 'date[Year]', dataType: 'Int64' },
      { name: '[Revenue]', dataType: 'Decimal' },
    ],
    rows,
  }, 'derived', YEARS.map((y) => `sales-by-category-${y}`),
  'Not captured as one query: the four saved per-year answers, stacked.');

  // Consistency: the four years add up to the all-years answer.
  let worst = 0;
  for (const [cat, total] of all.table.rows) {
    const s = YEARS.reduce((acc, y) => acc + (perYear[y].rows.find((r) => r[0] === cat)?.[1] ?? 0), 0);
    worst = Math.max(worst, Math.abs(s - total));
  }
  const check = { yearsSumToAllYears: worst < 0.01, largestDifference: worst };
  return { entries, check, source: snapshots.source, takenAt: snapshots.takenAt };
}
