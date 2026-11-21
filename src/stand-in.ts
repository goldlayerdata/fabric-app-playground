// The simulated connector. Answers a query with a saved result (snapshot) from the Contoso model,
// in the shape the Rayfin 2.0 semantic model connector returns. No DAX runs here.
import catalog from '../data/catalog.json';
import snapshotFile from '../data/snapshots.json';
import lakehouse from '../data/lakehouse.json';

export type CatalogEntry = { id: string; group: string; title: string; query: string };
type Column = { name: string; dataType: string };
type Table = { columns: Column[]; rows: unknown[][] };
export type Result =
  | { status: 'success'; table: Table; requestId: string }
  | { status: 'error'; error: { category: string; message: string }; requestId: string };

export const entries: CatalogEntry[] = catalog.queries;
export const snapshotsTakenAt: string = snapshotFile.takenAt;
type Saved =
  | { status: 'success'; table: Table }
  | { status: 'error'; error: { category: string; message: string } };
const snapshots = snapshotFile.snapshots as unknown as Record<string, Saved>;

/** How the simulated connector answers: normally, or as if the network were down. */
export type Mode = 'normal' | 'network';

/** Queries match when they are the same text, ignoring spacing and letter case. */
export const normalize = (q: string) => q.replace(/\s+/g, ' ').trim().toLowerCase();
const byText = new Map(entries.map((e) => [normalize(e.query), e]));

export function findEntry(query: string): CatalogEntry | undefined {
  return byText.get(normalize(query));
}

export function savedResult(id: string): Saved | undefined {
  return snapshots[id];
}

const requestId = () => `simulated-${crypto.randomUUID()}`;

export type Answer = { entry?: CatalogEntry; result?: Result; thrown?: string };

export function answer(query: string, limit: unknown, mode: Mode): Answer {
  if (mode === 'network') {
    // In a browser app (Rayfin 2.0), a request that can't reach the app's backend makes the call
    // throw a NetworkError ("Network error: …", rayfin-lib ApiClient). Only the CLI path
    // (`connector invoke`) turns that into an error result with category 'network'.
    return { thrown: 'Network error: Failed to fetch (simulated: Network down is on)' };
  }
  const entry = findEntry(query);
  if (!entry) {
    return {
      result: {
        status: 'error',
        error: {
          category: 'query',
          message:
            'This query is not in the playground\'s saved results. There is no live model here: only the queries in the Queries tab can be answered (compared ignoring spacing and letter case).',
        },
        requestId: requestId(),
      },
    };
  }
  const saved = snapshots[entry.id];
  if (saved.status === 'error') {
    // An error saved from the model on purpose, with the engine's own message.
    return { entry, result: { status: 'error', error: { ...saved.error }, requestId: requestId() } };
  }
  const table = saved.table;
  // Like the connector, a limit that is not a positive integer is ignored.
  if (typeof limit === 'number' && Number.isInteger(limit) && limit > 0 && table.rows.length > limit) {
    return {
      entry,
      result: {
        status: 'error',
        error: {
          category: 'overflow',
          message: `Simulated: the result has ${table.rows.length} rows, more than resultSetRowCountLimit (${limit}).`,
        },
        requestId: requestId(),
      },
    };
  }
  return {
    entry,
    result: {
      status: 'success',
      // A copy, so a page that changes the rows cannot change the saved snapshot.
      table: structuredClone(table),
      requestId: requestId(),
    },
  };
}

// ---------------------------------------------------------------- the lakehouse
// Reads from the lakehouse connector, answered from a small table of Contoso rows (data/lakehouse.json).
// Playground: the real client sends a GraphQL query to the app's backend, which reads the lakehouse's
// SQL analytics endpoint; here the rows are filtered, sorted and cut into pages in the browser.
// Entities are matched to tables by name (Sales -> sales), properties to columns by camelCase
// (OrderKey -> orderKey), as the entity files map them. Dates come back as text ('2023-01-01').

export type ReadState = { select?: string[]; where?: unknown; orderBy?: Record<string, string>; first?: number; after?: string };
export type ReadRequest = { connector: string; entity: string; kind: 'execute' | 'paged' | 'first'; state: ReadState };
export type ReadAnswer = { result?: unknown; rows?: number; thrown?: string };

const camel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const tables = lakehouse.rows as Record<string, { columns: string[]; rows: unknown[][] }>;

/** The default page size of a read, and the largest `first` accepted (rayfin.ai: Known limitations). */
const PAGE = 100;
const MAX_PAGE = 100_000;

type Row = Record<string, unknown>;

function matches(row: Row, where: unknown): boolean {
  if (!where || typeof where !== 'object') return true;
  for (const [key, cond] of Object.entries(where as Record<string, unknown>)) {
    if (key === 'and') {
      if (!(cond as unknown[]).every((w) => matches(row, w))) return false;
      continue;
    }
    if (key === 'or') {
      if (!(cond as unknown[]).some((w) => matches(row, w))) return false;
      continue;
    }
    if (!(key in row)) throw new Error(`Playground: the read filters on "${key}", which is not a field of this entity.`);
    const v = row[key] as never;
    const ops = cond && typeof cond === 'object' && !Array.isArray(cond) ? (cond as Record<string, never>) : { eq: cond as never };
    for (const [op, x] of Object.entries(ops)) {
      const ok =
        op === 'eq' ? v === x
        : op === 'neq' ? v !== x
        : op === 'gt' ? v > x
        : op === 'gte' ? v >= x
        : op === 'lt' ? v < x
        : op === 'lte' ? v <= x
        : op === 'in' ? (x as unknown[]).includes(v)
        : op === 'contains' ? String(v).includes(x)
        : op === 'notContains' ? !String(v).includes(x)
        : op === 'startsWith' ? String(v).startsWith(x)
        : op === 'endsWith' ? String(v).endsWith(x)
        : op === 'isNull' ? (v === null) === Boolean(x)
        : undefined;
      if (ok === undefined) throw new Error(`Playground: the filter operator "${op}" is not simulated here.`);
      if (!ok) return false;
    }
  }
  return true;
}

/** Answer one read, as the app's backend would. `mode: 'network'` throws, as a failed request does. */
export function readLakehouse(req: ReadRequest, mode: Mode): ReadAnswer {
  if (mode === 'network') return { thrown: 'Network error: Failed to fetch (simulated: Network down is on)' };
  try {
    const table = tables[req.entity.toLowerCase()];
    if (!table) return { thrown: `Playground: the lakehouse has no table for an entity named "${req.entity}" (it has: ${Object.keys(tables).join(', ')}).` };
    const props = table.columns.map(camel);
    let rows: Row[] = table.rows.map((r) => Object.fromEntries(props.map((p, i) => [p, r[i]])));
    const select = req.state.select ?? [];
    for (const f of select) if (!props.includes(f)) return { thrown: `Playground: "${f}" is not a field of ${req.entity}.` };
    rows = rows.filter((r) => matches(r, req.state.where));
    const order = Object.entries(req.state.orderBy ?? {});
    if (order.length) {
      rows = [...rows].sort((a, b) => {
        for (const [k, dir] of order) {
          const x = a[k] as never;
          const y = b[k] as never;
          if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
        }
        return 0;
      });
    }
    const size = Math.min(req.state.first ?? PAGE, MAX_PAGE);
    // Playground: a made-up cursor (the offset, in base 64). The real one is opaque too.
    const start = req.state.after ? Number(atob(req.state.after)) || 0 : 0;
    const page = rows.slice(start, start + size).map((r) => Object.fromEntries(select.map((f) => [f, r[f]])));
    if (req.kind === 'first') return { result: page[0] ?? null, rows: page.length };
    if (req.kind === 'execute') return { result: page, rows: page.length };
    const end = start + page.length;
    return {
      result: { items: page, hasNextPage: end < rows.length, ...(page.length ? { endCursor: btoa(String(end)) } : {}) },
      rows: page.length,
    };
  } catch (e) {
    return { thrown: String((e as Error).message ?? e) };
  }
}
