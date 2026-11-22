// The Visuals page's stand-in for the model. Answers DAX queries from saved Contoso answers (see
// tools/visuals-answers.mjs), and remembers which answer each visual got, so the page can say where its
// numbers come from.
import book from 'virtual:answers';
import type { CachedQueryResult, QueryTable } from '../app/hooks/use-semantic-model-query';

export interface AnswerSource {
  kind: 'saved' | 'derived';
  ids: string[];
  note?: string;
}
interface Entry {
  connection: string;
  group: string;
  query: string;
  table: QueryTable;
  source: AnswerSource;
}

const entries = book.entries as Entry[];
export const answerBookInfo = { source: book.source as string, takenAt: book.takenAt as string, check: book.check };

const norm = (s: string) => s.replace(/\r\n/g, '\n').trim();

type Listener = () => void;
const listeners = new Set<Listener>();
let used: Record<string, { query: string; source: AnswerSource | null }> = {};

export function subscribeAnswers(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function usedAnswers() {
  return used;
}
export function resetUsedAnswers() {
  used = {};
  listeners.forEach((l) => l());
}

export async function answerQuery(connection: string, query: string): Promise<CachedQueryResult> {
  await new Promise((r) => setTimeout(r, 60)); // a little latency, like a real query
  const hit = entries.find((e) => e.connection === connection && e.query === norm(query));
  const group = hit?.group ?? 'unknown';
  used = { ...used, [group]: { query: norm(query), source: hit?.source ?? null } };
  listeners.forEach((l) => l());
  if (!hit) {
    return { status: 'error', error: { message: 'No saved answer for this query text.' } };
  }
  return { status: 'success', table: hit.table, fromCache: false };
}
