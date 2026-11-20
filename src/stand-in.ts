// The simulated connector. Answers a query with a saved result (snapshot) from the Contoso model,
// in the shape the Rayfin 2.0 semantic model connector returns. No DAX runs here.
import catalog from '../data/catalog.json';
import snapshotFile from '../data/snapshots.json';

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
