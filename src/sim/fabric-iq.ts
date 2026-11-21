// Simulated Fabric IQ connector (Rayfin 2.0, @microsoft/rayfin-connector-fabric-iq-mcp): `ask()`
// answers a fixed set of questions with replayed answers. No AI runs here. Every answer is composed
// only from the saved model snapshots in data/snapshots.json (the queries in data/catalog.json, run
// once on the owner's Contoso model in Power BI Desktop), and every answer text starts with
// "Playground: replayed answer". A question outside the set gets `isError: true` with a plain
// message, never an invented answer.
//
// Mirrored from the docs and the installed 2.0.0 package (connector.js):
// - ask(artifactId, messages, options) resolves to { result, messages }, where messages is the
//   whole history followed by { role: 'assistant', content: result }:
//   https://rayfin.ai/docs/connectors/fabric-iq#ask-a-question
// - The checks before any request, with the package's own messages: artifactId a nonzero GUID;
//   messages non-empty, every entry user text or assistant text/tool result, the last a nonempty
//   user message; the question at most 20,000 characters and the serialized earlier history at most
//   40,000 (FabricIqMcpAdapterError, history never truncated):
//   https://rayfin.ai/docs/reference/sdk/rayfin-connector-fabric-iq-mcp#conversation-wrapper
// - The service keeps no memory: the history passed is the only context
//   (https://rayfin.ai/docs/connectors/fabric-iq#continue-the-conversation). Here, the earlier user
//   questions in the history are re-read to know what "What about 2025?" refers to; without the
//   history it refers to nothing, and the answer covers every country.
// - A tool failure resolves with result.isError: true rather than throwing
//   (https://rayfin.ai/docs/reference/sdk/rayfin-connector-fabric-iq-mcp#conversation-types).
// - Aborting the signal rejects with an AbortError (#progress-and-cancellation); close() makes later
//   calls throw FabricIqMcpAdapterError ("Fabric IQ MCP connector is closed.", installed connector.js).
// - Mode 'not-enabled': "authoring support does not guarantee that the Fabric IQ backend adapter is
//   enabled in your Fabric environment"; then every question fails
//   (https://rayfin.ai/docs/connectors/fabric-iq#troubleshoot-fabric-iq). NOT DOCUMENTED: what a
//   real environment answers then (status and message). Here: a FabricIqMcpAdapterError, which is
//   what the wrapper throws for a non-2xx answer from the Rayfin backend, with playground wording.
// - Runs as the signed-in user (delegated only): https://rayfin.ai/docs/connectors/fabric-iq#add-the-connector
//
// NOT DOCUMENTED, chosen here: the tools listTools() returns besides AskPowerBI (here: AskPowerBI
// only), the task statuses onTaskUpdate receives (here: 'working', then 'completed', the MCP Tasks
// names; the package treats completed, failed and cancelled as terminal), and the shape of a real
// answer's structuredContent (here: the snapshot id, its DAX and its table, marked as playground).
//
// CONFLICT, not resolved here: Learn says Fabric IQ MCP "doesn't expose a natural-language answering
// tool" (https://learn.microsoft.com/fabric/iq/connectors/fabric-iq-mcp), while Rayfin's wrapper
// sends questions to an `AskPowerBI` tool (https://rayfin.ai/docs/connectors/fabric-iq#ask-a-question).

import catalog from '../../data/catalog.json';
import snapshotFile from '../../data/snapshots.json';
import { PLACEHOLDER } from '../project.mjs';
import { pg, wait } from './playground';

// ---------------------------------------------------------------- types (as in the package)

export type FabricIqMcpToolResult = {
  readonly content: readonly unknown[];
  readonly isError?: boolean;
  readonly structuredContent?: unknown;
  readonly _meta?: unknown;
  readonly resources?: unknown;
};
export type FabricIqMcpChatMessage =
  | { readonly role: 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly content: string | FabricIqMcpToolResult };
export type FabricIqMcpChatResponse = { readonly result: FabricIqMcpToolResult; readonly messages: readonly FabricIqMcpChatMessage[] };
export type FabricIqMcpTaskUpdate = { readonly status: string };
export type FabricIqMcpToolCallOptions = {
  readonly signal?: AbortSignal;
  readonly onTaskUpdate?: (update: FabricIqMcpTaskUpdate) => void;
  readonly onTaskProgress?: (progress: FabricIqMcpTaskUpdate & Record<string, unknown>) => void;
};
export type FabricIqMcpToolsResult = { readonly tools: readonly { readonly name: string; readonly [key: string]: unknown }[] };

/** The package's adapter error (invalid input, closed wrapper, non-2xx answer from the backend). */
export class FabricIqMcpAdapterError extends Error {
  override readonly name = 'FabricIqMcpAdapterError';
}

// ---------------------------------------------------------------- the recording

export const REPLAY_LABEL = 'Playground: replayed answer';
/** The artifact the saved answers belong to: the course's placeholder id for the Contoso model. */
export const CONTOSO_ARTIFACT_ID: string = PLACEHOLDER.itemId;

type Table = { columns: { name: string; dataType: string }[]; rows: unknown[][] };
type Saved = { status: 'success'; table: Table } | { status: 'error'; error: { category: string; message: string } };
const snapshots = snapshotFile.snapshots as unknown as Record<string, Saved>;
const queries = new Map(catalog.queries.map((q) => [q.id, q.query]));
const YEARS: number[] = catalog.years;
const COUNTRIES: string[] = catalog.countries;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

type Measure = 'revenue' | 'orders' | 'customers' | 'categories' | 'ranking' | 'by-year' | 'margin';
type Slots = { measure: Measure; country?: string; year?: number };
/** A full question sets every slot; a follow-up changes some and keeps the rest from the history. */
type FollowChange = Partial<Slots> & { allCountries?: true; allYears?: true };
type Intent = { kind: 'full'; slots: Slots } | { kind: 'follow-up'; change: FollowChange };

/** Questions match ignoring case, spacing, curly quotes and a final ? . or !. */
export const normalizeQuestion = (q: string) =>
  q.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '').trim().toLowerCase();

const intents = new Map<string, Intent>();
/** First questions, in the order the lesson suggests them. */
const suggested: string[] = [];
/** Follow-ups, which need the history to mean anything specific. */
const followUps: string[] = [];

function full(text: string, slots: Slots, suggest = false) {
  intents.set(normalizeQuestion(text), { kind: 'full', slots });
  if (suggest) suggested.push(text);
}
function follow(text: string, change: FollowChange, list = true) {
  intents.set(normalizeQuestion(text), { kind: 'follow-up', change });
  if (list) followUps.push(text);
}

full('What was total revenue?', { measure: 'revenue' }, true);
full('Which store country had the most revenue?', { measure: 'ranking' }, true);
full('Which store country had the most revenue in 2024?', { measure: 'ranking', year: 2024 });
full('How did revenue change by year?', { measure: 'by-year' }, true);
full('What is the margin %?', { measure: 'margin' }, true);
full('What were the top product categories?', { measure: 'categories' }, true);
for (const y of YEARS) {
  full(`What was revenue in ${y}?`, { measure: 'revenue', year: y });
  full(`What were the top product categories in ${y}?`, { measure: 'categories', year: y });
  follow(`What about ${y}?`, { year: y }, y === 2025);
  follow(`And in ${y}?`, { year: y }, false);
}
for (const c of COUNTRIES) {
  for (const prep of ['in', 'for']) {
    full(`What was revenue ${prep} ${c}?`, { measure: 'revenue', country: c });
    full(`What were the top product categories ${prep} ${c}?`, { measure: 'categories', country: c });
    for (const y of YEARS) {
      full(`What was revenue ${prep} ${c} in ${y}?`, { measure: 'revenue', country: c, year: y }, prep === 'in' && c === 'Germany' && y === 2024);
      full(`What were the top product categories ${prep} ${c} in ${y}?`, { measure: 'categories', country: c, year: y });
    }
  }
  follow(`What about ${c}?`, { country: c }, c === 'France');
  follow(`And in ${c}?`, { country: c }, false);
}
follow('How many orders was that?', { measure: 'orders' });
follow('How many customers was that?', { measure: 'customers' });
follow('Break that down by category.', { measure: 'categories' });
follow('What about all countries?', { allCountries: true });
follow('What about all years?', { allYears: true }, false);

/** Questions to offer as buttons: first questions, then follow-ups. Anything else is "not in the recording". */
export const SUGGESTED_QUESTIONS: readonly string[] = suggested;
export const FOLLOW_UP_QUESTIONS: readonly string[] = followUps;
/** Every question with a replayed answer (normalized), for the checker. */
export const allQuestions = (): string[] => [...intents.keys()];

function apply(slots: Slots | undefined, intent: Intent): Slots {
  if (intent.kind === 'full') return { ...intent.slots };
  const next: Slots = { measure: 'revenue', ...slots };
  const { allCountries, allYears, ...change } = intent.change;
  Object.assign(next, change);
  if (allCountries) delete next.country;
  if (allYears) delete next.year;
  return next;
}

/** The snapshot that answers these slots, if one was saved. */
function snapshotFor(s: Slots): string | undefined {
  const parts = (base: string) => [base, s.year, s.country && slug(s.country)].filter(Boolean).join('-');
  let id: string;
  switch (s.measure) {
    case 'revenue':
    case 'orders':
    case 'customers':
      id = s.year || s.country ? parts('totals') : 'totals';
      break;
    case 'categories':
      id = parts('sales-by-category');
      break;
    case 'ranking':
      if (s.country) return undefined;
      id = s.year ? `sales-by-country-${s.year}` : 'sales-by-country';
      break;
    case 'by-year':
      if (s.country || s.year) return undefined;
      id = 'sales-by-year';
      break;
    case 'margin':
      if (s.country || s.year) return undefined;
      id = 'margin-from-model';
      break;
  }
  return snapshots[id]?.status === 'success' ? id : undefined;
}

const money = (n: unknown) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = (n: unknown) => Number(n).toLocaleString('en-US');
const where = (s: Slots) =>
  `${s.country ? (s.country === 'Online' ? 'the Online store' : s.country) : 'all store countries'}, ${s.year ?? 'all years'}`;

function compose(s: Slots, table: Table): string {
  const r = table.rows;
  switch (s.measure) {
    case 'revenue':
      return `Revenue (${where(s)}): ${money(r[0][0])}.`;
    case 'orders':
      return `Orders (${where(s)}): ${count(r[0][1])}.`;
    case 'customers':
      return `Customers (${where(s)}): ${count(r[0][2])}.`;
    case 'categories':
      return [`Revenue by product category (${where(s)}):`, ...r.map((row, i) => `${i + 1}. ${row[0]}: ${money(row[1])}`)].join('\n');
    case 'ranking':
      return [`Revenue by store country (${s.year ?? 'all years'}), highest first:`, ...r.map((row, i) => `${i + 1}. ${row[0]}: ${money(row[1])}`)].join('\n');
    case 'by-year':
      return ['Revenue and orders by year:', ...r.map((row) => `${row[0]}: ${money(row[1])} (${count(row[2])} orders)`)].join('\n');
    case 'margin':
      return `Margin % (all store countries, all years): ${(Number(r[0][0]) * 100).toFixed(1)}%.`;
  }
}

function errorResult(text: string): FabricIqMcpToolResult {
  return { content: [{ type: 'text', text: pg(text) }], isError: true };
}

/** Answers one question with the earlier messages as context. Never invents data. */
export function replay(artifactId: string, query: string, context: readonly FabricIqMcpChatMessage[]): FabricIqMcpToolResult {
  if (artifactId.toLowerCase() !== CONTOSO_ARTIFACT_ID.toLowerCase()) {
    return errorResult(`answers were saved only for the Contoso model (artifact ${CONTOSO_ARTIFACT_ID}). No other model can be asked here.`);
  }
  let slots: Slots | undefined;
  for (const m of context) {
    if (m.role !== 'user') continue;
    const earlier = intents.get(normalizeQuestion(m.content));
    if (earlier) slots = apply(slots, earlier);
  }
  const intent = intents.get(normalizeQuestion(query));
  if (!intent) {
    return errorResult(
      'this question is not in the recording. No AI runs in the playground: only the suggested questions and follow-ups have replayed answers, composed from saved query results.',
    );
  }
  const now = apply(slots, intent);
  const id = snapshotFor(now);
  if (!id) return errorResult(`no saved query result answers this (${now.measure}, ${where(now)}), so there is no replayed answer.`);
  const table = (snapshots[id] as Extract<Saved, { status: 'success' }>).table;
  return {
    content: [{ type: 'text', text: `${REPLAY_LABEL}.\n${compose(now, table)}` }],
    structuredContent: {
      playground: `${REPLAY_LABEL}: composed from the saved result of one DAX query; the shape of a real answer's structured content is not documented.`,
      snapshot: id,
      dax: queries.get(id),
      table: structuredClone(table),
    },
  };
}

// ---------------------------------------------------------------- the wrapper

export type FabricIqMode = 'normal' | 'not-enabled';

export type FabricIqSimOptions = {
  /** Read at each call: 'not-enabled' makes every question fail, as when the backend adapter is off. */
  mode?: () => FabricIqMode;
  /** Simulated time per answer, in milliseconds (0 in tests). */
  delayMs?: number;
  /** Called after each ask, for the Log. `runsAs` is always the signed-in user (delegated). */
  onAsk?: (entry: { artifactId: string; question: string; historyLength: number; isError: boolean; snapshot?: string }) => void;
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The checks `ask` makes before any request, with the installed package's messages. */
export function validateAsk(artifactId: unknown, messages: unknown): { query: string; context: string; snapshot: FabricIqMcpChatMessage[] } {
  if (typeof artifactId !== 'string' || !GUID.test(artifactId) || artifactId === '00000000-0000-0000-0000-000000000000') {
    throw new FabricIqMcpAdapterError('AskPowerBI requires a nonempty artifact GUID as a tool argument.');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new FabricIqMcpAdapterError('Supply the complete conversation ending with a user message.');
  }
  for (const m of messages as FabricIqMcpChatMessage[]) {
    if (
      !m ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      (typeof m.content !== 'string' && (m.role !== 'assistant' || !m.content || !Array.isArray((m.content as FabricIqMcpToolResult).content)))
    ) {
      throw new FabricIqMcpAdapterError('Conversation entries must contain user text or assistant text/tool results.');
    }
  }
  const current = messages[messages.length - 1] as FabricIqMcpChatMessage;
  if (current.role !== 'user' || !current.content.trim()) {
    throw new FabricIqMcpAdapterError('The last conversation entry must be a nonempty user message.');
  }
  const snapshot = structuredClone(messages) as FabricIqMcpChatMessage[];
  const query = current.content;
  const context = JSON.stringify(snapshot.slice(0, -1));
  if (query.length > 20_000 || context.length > 40_000) {
    throw new FabricIqMcpAdapterError(
      'AskPowerBI accepts at most 20000 query characters and 40000 context characters. Start a new conversation; history was not truncated.',
    );
  }
  return { query, context, snapshot };
}

const NOT_ENABLED = pg(
  'every question fails here, as it does when the Fabric IQ backend adapter is not enabled in a Fabric environment. Check availability with your Fabric administrator. What a real environment answers then is not documented.',
);

/** The simulated FabricIqMcpConnectorClient. */
export class SimFabricIqClient {
  #closed = false;
  constructor(private readonly options: FabricIqSimOptions = {}) {}

  #assertOpen() {
    if (this.#closed) throw new FabricIqMcpAdapterError('Fabric IQ MCP connector is closed.');
  }

  /** The "request": the backend check, the simulated task, then the replayed answer. */
  async #run(artifactId: string, query: string, context: readonly FabricIqMcpChatMessage[], options: FabricIqMcpToolCallOptions) {
    if ((this.options.mode?.() ?? 'normal') === 'not-enabled') throw new FabricIqMcpAdapterError(NOT_ENABLED);
    options.onTaskUpdate?.({ status: 'working' });
    await wait(this.options.delayMs ?? 600, options.signal);
    const result = replay(artifactId, query, context);
    options.onTaskUpdate?.({ status: 'completed' });
    return result;
  }

  async ask(artifactId: string, messages: readonly FabricIqMcpChatMessage[], options: FabricIqMcpToolCallOptions = {}): Promise<FabricIqMcpChatResponse> {
    this.#assertOpen();
    options.signal?.throwIfAborted();
    const { query, snapshot } = validateAsk(artifactId, messages);
    const result = await this.#run(artifactId, query, snapshot.slice(0, -1), options);
    const sc = result.structuredContent as { snapshot?: string } | undefined;
    this.options.onAsk?.({ artifactId, question: query, historyLength: snapshot.length - 1, isError: result.isError === true, snapshot: sc?.snapshot });
    return { result, messages: [...snapshot, { role: 'assistant', content: structuredClone(result) }] };
  }

  async callTool(name: string, args: Record<string, unknown> = {}, options: FabricIqMcpToolCallOptions = {}): Promise<FabricIqMcpToolResult> {
    this.#assertOpen();
    options.signal?.throwIfAborted();
    if (typeof args !== 'object' || args === null || Array.isArray(args)) throw new FabricIqMcpAdapterError('Tool arguments must be an object.');
    if (name !== 'AskPowerBI') {
      if ((this.options.mode?.() ?? 'normal') === 'not-enabled') throw new FabricIqMcpAdapterError(NOT_ENABLED);
      return errorResult(`the tool "${name}" is not in the recording; only AskPowerBI is simulated.`);
    }
    let context: FabricIqMcpChatMessage[] = [];
    try {
      context = typeof args.context === 'string' && args.context ? JSON.parse(args.context) : [];
    } catch {
      context = [];
    }
    return this.#run(String(args.artifactId ?? ''), String(args.query ?? ''), Array.isArray(context) ? context : [], options);
  }

  async listTools(): Promise<FabricIqMcpToolsResult> {
    this.#assertOpen();
    if ((this.options.mode?.() ?? 'normal') === 'not-enabled') throw new FabricIqMcpAdapterError(NOT_ENABLED);
    return { tools: [{ name: 'AskPowerBI', description: pg('the only tool simulated here. Which other tools Fabric IQ lists is not documented.') }] };
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}

/**
 * The module the preview can serve as '@microsoft/rayfin-connector-fabric-iq-mcp': the wrapper
 * factory, the runtime marker and the error classes. The connector passed in must have
 * `executeQuery` (it is `client.connectors.<name>`); the answers come from the simulation.
 */
export function fabricIqPackage(options: FabricIqSimOptions = {}) {
  const FABRIC_IQ_RUNTIME = Symbol.for('playground.fabricIqMcp');
  return {
    fabricIqMcp: () => ({ operations: { executeQuery: {} }, [FABRIC_IQ_RUNTIME]: true }),
    createFabricIqMcpConnectorClient(connector: { executeQuery?: unknown }) {
      if (!connector || typeof connector.executeQuery !== 'function') {
        throw new TypeError(pg('createFabricIqMcpConnectorClient needs client.connectors.<name>, which has executeQuery.'));
      }
      return new SimFabricIqClient(options);
    },
    FabricIqMcpAdapterError,
    FABRIC_IQ_MCP_INVOKE_TIMEOUT_MS: 300_000,
    FABRIC_IQ_RUNTIME,
  };
}
